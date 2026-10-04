import { useEffect, useRef, useState } from 'react'
import { VoiceConversation, VoiceStopped, yesNoVoice, ruleAnswerVoice, numberVoice, normaliseVoice } from './voiceConversation'
import { shortRuleQuestions, shortResponsibilities } from './voicePrompts'
import { categories } from './data'
import { parseSpokenListing, evaluate, findMatches, money } from './engine'

const labelAnswer = v => v === 'unsure' ? 'not sure' : v
const categoryKeys = Object.keys(categories)
function categoryVoice(raw) {
  const t=normaliseVoice(raw)
  const number=numberVoice(t)
  if(number>=1 && number<=categoryKeys.length && Number.isInteger(number)) return categoryKeys[number-1]
  if(/plant|fruit|vegetable|crop/.test(t)) return 'plant'
  if(/wood|sawdust/.test(t)) return 'wood'
  if(/wool|fleece/.test(t)) return 'wool'
  if(/egg/.test(t)) return 'eggshell'
  if(/compost|manure|organic/.test(t)) return 'organic'
  if(/animal|by.?product/.test(t)) return 'animal'
  return null
}
const roleVoice = raw => ['seller','buyer','carrier'].find(r=>normaliseVoice(raw).includes(r)) || null

export function useListingConversation(state, actions) {
  const latest=useRef({state,actions})
  const [status,setStatus]=useState('')
  const [paused,setPaused]=useState(false)
  const [revision,setRevision]=useState(0)
  const [question,setQuestion]=useState(-1)
  const [engine]=useState(() => new VoiceConversation({onStatus:setStatus,onListening:actions.setListening,onNavigate:()=>{}}))
  useEffect(() => { latest.current={state,actions}; engine.setNavigate(actions.navigate) })
  const stop=()=>{engine.stop();setPaused(true);setStatus('Voice paused. Tap Resume voice or use the screen.')}
  const resume=()=>{setPaused(false);setRevision(n=>n+1)}
  const start=()=>{engine.stop();setPaused(false);actions.enable();setRevision(n=>n+1)}
  useEffect(()=>{
    const v=engine
    if(!state.enabled || paused || (state.overlay && state.overlay!=='auth')) return
    if(!v.supported){queueMicrotask(() => { setStatus('This browser does not support the full voice conversation. Please use the on-screen controls.');setPaused(true) });return}
    let alive=true
    const act=latest.current.actions
    const s=latest.current.state
    const confirmed=(prompt,parse,label)=>v.confirmed(prompt,parse,label)
    const yes=prompt=>confirmed(prompt+' Say yes or no.',yesNoVoice,labelAnswer)
    const number=(prompt,min,max=Infinity)=>confirmed(prompt,raw=>{
      const n=numberVoice(raw);return n!==null && Number.isFinite(n) && n>=min && n<=max ? n : null
    })
    async function run() {
      if(s.overlay==='auth' || !s.user){
        if(!s.overlay){act.openSignup();return}
        await v.say('Please log in or create your account using the secure form on screen. Do not speak your password. The listing voice conversation will resume when you are signed in.')
        return
      }
      if(s.step===0){
        const description=await confirmed('Tell me what you have, the amount, and when it should be collected.',raw=>raw.trim())
        act.describe(description,parseSpokenListing(description));return
      }
      if(s.step===1){
        let l={...s.listing};let a={...s.answers};let agreed=[...s.agreed]
        for(let attempts=0;attempts<3;attempts++){
          const correct=await yes(`Your listing is ${l.quantity} ${l.unit} of ${l.material}. Category: ${categories[l.cat].label}. Price: ${money(l.price)} per ${l.unit}. Collect within ${l.collectDays} days. Is this correct?`)
          if(correct==='yes') break
          l.material=await confirmed('What is the material?',raw=>raw.trim())
          const options=categoryKeys.map((k,i)=>`${i+1}, ${categories[k].label}`).join('. ')
          l.cat=await confirmed(`Choose a category by name or number. ${options}.`,categoryVoice,k=>categories[k].label)
          l.quantity=await number(`How many ${l.unit}?`,0.000001)
          l.price=await number(`What is the price in dollars per ${l.unit}? Say zero for free.`,0)
          l.collectDays=await number('Within how many days should it be collected?',1)
          a={};agreed=[];act.edit(l)
          if(attempts===2) throw new Error('Listing review paused. Tap Resume voice to check the revised details.')
        }
        await v.say('Now answer the main checks. Say yes, no, or not sure. I will ask you to confirm each answer. The full rules stay on screen.')
        const qs=categories[l.cat].questions
        for(let i=0;i<qs.length;i++){
          if(a[qs[i].id]) continue
          setQuestion(i)
          const value=await confirmed((l.cat === 'wood' && qs[i].id === 'pest' ? 'Do you suspect pests or disease, contaminated soil, or movement restrictions?' : shortRuleQuestions[qs[i].id] || qs[i].text),ruleAnswerVoice,labelAnswer)
          a[qs[i].id]=value;act.answer(qs[i].id,value)
        }
        setQuestion(-1)
        for(let i=0;i<shortResponsibilities.length;i++){
          if(agreed.includes(i)) continue
          const value=await yes(shortResponsibilities[i])
          if(value!=='yes'){await v.say('That responsibility must be accepted before publishing. Your listing has not been published.');throw new VoiceStopped('Responsibility declined; listing remains on screen.')}
          agreed.push(i);act.agree(i)
        }
        if(await yes(`Publish your listing for ${money(l.quantity*l.price)} and find matches?`)!=='yes') throw new VoiceStopped('Listing saved on this screen. Publishing was not confirmed.')
        const f=evaluate(l,a);act.publish(l,a,f,f.hold?[]:findMatches(l,f));return
      }
      if(s.step===2){
        if(s.flags.hold){
          await v.say('Your listing is on hold because of a risk or an uncertain answer. It is not visible to buyers. Check the guidance on screen before moving goods.')
          if(await yes('Would you like to review your answers?')==='yes'){act.review();return}
          throw new VoiceStopped('Listing remains on hold.')
        }
        if(!s.matches.length){
          await v.say('Your listing is live, but there is no match yet.')
          if(!s.alertChoice && s.alertCount>0){
            const choice=await yes(`Would you like to send demo buyer alerts to ${s.alertCount} potential nearby buyers?`)
            act.alert(choice==='yes'?'send':'decline')
            await v.say(choice==='yes'?'Buyer alerts recorded in this demo. No external messages are sent.':'No alerts sent. Your listing stays live.')
          } else if(!s.alertCount) await v.say('No nearby alert recipients are available yet.')
          if(await yes('Would you like to create another listing?')==='yes'){act.reset(true);return}
          throw new VoiceStopped('Listing complete. Waiting for a match.')
        }
        await v.say(`Your listing is live. ${s.matches.length} nearby buyers match.`)
        const options=s.matches.map((m,i)=>`Option ${i+1}: ${m.buyer.name}, ${m.route.km} kilometres away. Goods ${money(m.goods)}, transport ${money(m.route.cost)}.`).join(' ')
        const index=await confirmed(`${options} Say a buyer name or option number, or say wait to leave the listing live.`,raw=>{
          const t=normaliseVoice(raw);if(t==='wait')return -1
          const n=numberVoice(t.replace(/^option /,''));if(Number.isInteger(n)&&n>=1&&n<=s.matches.length)return n-1
          const i=s.matches.findIndex(m=>t.includes(m.buyer.name.toLowerCase()));return i>=0?i:null
        },i=>i<0?'wait for now':s.matches[i].buyer.name)
        if(index<0)throw new VoiceStopped('Listing stays live. No trade selected.')
        const chosen=s.matches[index]
        if(chosen.verify && await yes('Have you reviewed the source and condition and confirmed suitability for the buyer’s intended use?')!=='yes') throw new VoiceStopped('Suitability must be confirmed before trading.')
        if(await yes(`Proceed to the demo trade with ${chosen.buyer.name}?`)==='yes'){act.select({...chosen,buyerVerified:true});return}
        throw new VoiceStopped('Trade was not confirmed.')
      }
      if(s.step===3){
        if(s.funded){act.delivery();return}
        if(s.role==='carrier' || s.paid[s.role]){
          const role=await confirmed('Which demo view next? Say seller, buyer, or carrier.',roleVoice)
          if(role===s.role)throw new VoiceStopped('This view has no payment action. Choose another view or resume when ready.')
          act.role(role);return
        }
        const amount=s.role==='seller'?s.settlement.transport:s.settlement.buyerPays
        await v.say(`This is a simulated ${s.role} payment. The seller transport hold is refunded after delivery. The buyer pays for goods; actual quantities determine release and any refund. A two percent fee applies to released goods. The full terms are on screen.`)
        if(await yes(`In ${s.role} view, accept the terms and simulate paying ${money(amount)}?`)==='yes'){act.pay(s.role);return}
        throw new VoiceStopped('Payment not confirmed.')
      }
      if(s.step===4){
        if(s.stage===3){await v.say(`Trade complete. Seller goods payout ${money(s.settlement.sellerGets)}. Buyer refund ${money(s.settlement.buyerRefund)}. Seller transport refund ${money(s.settlement.transport)}.`);throw new VoiceStopped('Trade complete.')}
        if(s.change?.status==='pending'){
          if(s.role!=='buyer'){const role=await confirmed('A seller change is awaiting buyer review. Say buyer to review it.',roleVoice);act.role(role);return}
          if(await yes(`The seller reports ${s.change.qty} ${s.listing.unit}. ${s.change.note}. Accept this change?`)==='yes'){act.acceptChange();return}
          if(await yes('Cancel the trade and refund both demo payments?')==='yes'){act.cancel();return}
          throw new VoiceStopped('Change remains pending.')
        }
        if((s.pickup?.quality||s.delivered?.quality)&&!s.qualityAccepted){
          if(s.role!=='buyer'){await v.say('A quality change is holding payment release.');const role=await confirmed('Say buyer to review, or carrier or seller to change view.',roleVoice);if(role===s.role)throw new VoiceStopped('Waiting for buyer quality review.');act.role(role);return}
          const notes=[s.pickup,s.delivered].filter(r=>r?.quality).map(r=>r.note).join('. ')
          if(await yes(`Reported condition change: ${notes}. Accept this condition at the agreed unit price?`)==='yes'){act.acceptQuality();return}
          throw new VoiceStopped('Quality not accepted. Funds remain held for dispute resolution.')
        }
        if(s.role!=='carrier'){
          const role=await confirmed('The carrier must record measurements and confirm delivery. Say carrier to continue the demo, or seller or buyer to change view.',roleVoice)
          if(role===s.role)throw new VoiceStopped('Waiting for carrier action.')
          act.role(role);return
        }
        if(s.stage===0 || s.stage===1){
          const delivered=s.stage===1
          const limit=delivered?s.pickup.qty:s.agreedQty
          const qty=await number(`What is the actual ${delivered?'delivered':'picked-up'} quantity in ${s.listing.unit}? It must be between zero and ${limit}.`,0,limit)
          const quality=await yes('Does the quality differ from the agreed description?')==='yes'
          let note='Quantity and condition confirmed by carrier'
          if(qty!==limit||quality)note=await confirmed('Briefly explain the quantity or condition difference for both parties.',raw=>raw.trim())
          if(delivered){
            await confirmed('What is the buyer delivery PIN?',raw=>{
              const t=normaliseVoice(raw).replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/g,w=>({zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9}[w])).replace(/\s/g,'')
              return t==='4821'?t:null
            },x=>x.split('').join(' '))
          }
          if(await yes(`Confirm ${delivered?'delivery':'pickup'} of ${qty} ${s.listing.unit} and notify both parties?`)==='yes'){act.carrier({qty,note,quality},delivered);return}
          throw new VoiceStopped('Carrier report not confirmed.')
        }
        const p=s.settlement
        if(await yes(`Release ${money(p.releasedGoods)} for goods, deduct the ${money(p.fee)} fee, refund ${money(p.buyerRefund)} to the buyer, and refund ${money(p.transport)} transport to the seller?`)==='yes'){act.release();return}
        throw new VoiceStopped('Payments remain held.')
      }
    }
    run().catch(err=>{
      if(!alive)return
      v.stop();setPaused(true);setQuestion(-1);setStatus(err.message || 'Voice paused.')
      if(!(err instanceof VoiceStopped)) console.warn('Voice conversation paused:',err.message)
    })
    return ()=>{alive=false;v.stop()}
    // Only navigation/transaction milestones restart the script; field updates do not.
  },[engine,state.enabled,state.step,state.overlay,state.user?.email,state.stage,state.role,state.paid.seller,state.paid.buyer,state.change?.status,state.qualityAccepted,paused,revision])
  useEffect(()=>()=>engine.stop(),[engine])
  return {status,paused,question,start,stop,resume}
}
