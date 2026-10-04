import reference from './referenceSeed.json' with { type: 'json' }
import { categories, demand, farms, routes } from './data.js'
import { disposalSaving, settle } from './engine.js'
export const TABS=['Create Listing','Dashboard','Marketplace','Matches','Transactions','Impact']
export const PLACES=['Northland','Whangarei','Auckland','Pukekohe','Hamilton','Cambridge','Tauranga','Rotorua','Hastings','Palmerston North','Nelson']
const CITY={Northland:[-35.73,174.32],Whangarei:[-35.73,174.32],Auckland:[-36.85,174.76],Pukekohe:[-37.2,174.95],Hamilton:[-37.78,175.28],Cambridge:[-37.89,175.47],Tauranga:[-37.69,176.17],Rotorua:[-38.14,176.25],Hastings:[-39.64,176.84],'Palmerston North':[-40.36,175.61],Nelson:[-41.27,173.28]}
export const uid=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
export const round=n=>Math.round(n*100)/100
export const dateLabel=d=>new Date(d).toLocaleDateString('en-NZ',{day:'numeric',month:'short'})
export function roadKm(a,b) {
  if(!CITY[a]||!CITY[b])return null
  const [lat1,lng1]=CITY[a], [lat2,lng2]=CITY[b], rad=Math.PI/180
  const h=Math.sin((lat2-lat1)*rad/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin((lng2-lng1)*rad/2)**2
  return Math.max(5,Math.round(6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))*1.3))
}
export function impactFor(quantity,km=0,unit='kg') {
  if(unit!=='kg')return {kg:0,co2:0,low:0,high:0,excluded:true}
  // Imported illustrative factors: disposal 450 kg/t, alternative 60 kg/t,
  // substitution .7, processing 20 kg/t, truck .9 kg/km for one trip.
  const t=quantity/1000,co2=t*(450+60*.7-20)-km*.9
  return {kg:quantity,co2:round(co2),low:round(t*(450-20)-km*.9),high:round(t*(450+60-20)-km*.9),excluded:false}
}
export const SAMPLE_LISTINGS=reference.L.map(l=>({
  id:'sample-'+l.id,type:l.type,owner:null,business:l.biz,material:l.mat,cat:'plant',unit:'kg',
  quantity:round(l.type==='Supply'?(l.qty-l.done)*1000:l.max*1000),price:l.type==='Supply'?l.price/1000:l.maxPrice/1000,
  min:l.type==='Demand'?l.min*1000:undefined,max:l.type==='Demand'?l.max*1000:undefined,
  maxKm:l.type==='Demand'?l.maxKm:undefined,marketRate:l.type==='Demand'?l.alt/1000:undefined,
  use:l.type==='Demand'?l.use1:l.use?.join(', '),location:l.loc,condition:l.cond,
  collectDays:7,from:l.from,until:l.to,createdAt:'2026-10-03T12:00:00.000Z',archived:!!l.arch,
  status:l.moveR?'On hold':l.chem==='unknown'?'Needs review':'Live',
  flags:{hold:!!l.moveR,nofeed:l.chem==='unknown',unsure:l.chem==='unknown'?['chemical']:[]},answers:{},sample:true,
}))
const seedTx=reference.T.map(t=>{
  const source=reference.L.find(l=>l.id===t.s),buyer=reference.L.find(l=>l.id===t.d),qty=t.q*1000,km=roadKm(source.loc,buyer.loc)
  return {id:'sample-'+t.id,listingId:'sample-'+t.s,owner:null,listing:{material:source.mat,cat:'plant',quantity:qty,price:t.price/1000,unit:'kg'},buyer:buyer.biz,location:source.loc,stage:3,status:'Completed',paid:{seller:true,buyer:true},quantity:qty,km,settlement:settle(qty*t.price/1000,52,qty),createdAt:'2026-09-20T12:00:00.000Z',completedAt:'2026-09-20T12:00:00.000Z',log:[{text:'Imported completed example (fictional)',at:'2026-09-20T12:00:00.000Z'}],sample:true}
})
export function emptyPortfolio(){return {listings:[],transactions:[],notifications:[],offers:[]}}
export function visibleListings(p){return [...p.listings,...BASE_REQUESTS,...SAMPLE_LISTINGS].map(l=>p.transactions.some(t=>t.listingId===l.id&&t.status!=='Cancelled')?{...l,status:p.transactions.some(t=>t.listingId===l.id&&t.status==='Completed')?'Completed':'In trade'}:l)}
export function visibleTransactions(p){return [...p.transactions,...seedTx]}
export function matching(l,p) {
  if(p.transactions.some(t=>t.listingId===l.id&&t.status!=='Cancelled') || l.archived || l.flags?.hold || ['Completed','Deleted','On hold','In trade'].includes(l.status))return []
  const base=[]
  const counterpart=visibleListings(p).filter(r=>r.type!==l.type && !r.archived && r.status==='Live' && !(r.owner && r.owner===l.owner))
  const extras=[]
  for(const r of counterpart){
    const supply=l.type==='Supply'?l:r,request=l.type==='Demand'?l:r
    if(p.transactions.some(t=>t.listingId===supply.id&&t.status!=='Cancelled'))continue
    if(supply.cat!==request.cat||supply.unit!==request.unit||supply.flags?.hold)continue
    if(supply.quantity<request.min||supply.quantity>request.max||supply.price>request.price)continue
    if(request.use==='feed'&&(supply.flags?.nofeed||supply.flags?.unsure?.length))continue
    if(supply.until && request.from && supply.until<request.from)continue
    if(request.until && supply.from && request.until<supply.from)continue
    const km=request.route&&(supply.location==='Northland'||!supply.location)?request.route.km:roadKm(supply.location,request.location)
    if(km===null||km>request.maxKm)continue
    const route=request.route&&(supply.location==='Northland'||!supply.location)?request.route:{km,min:Math.round(km/60*60),cost:round(40+km*2.2)}
    const d={id:request.id,cat:request.cat,unit:request.unit,min:request.min,max:request.max,maxKm:request.maxKm,marketRate:request.marketRate,use:request.use,pathway:request.use==='feed'?'Potential livestock feed':request.use,source:request}
    const buyer={id:request.id,name:request.business,rating:4.7}
    extras.push({d,buyer,route,goods:round(supply.quantity*supply.price),score:request.id==='d1'?92:request.id==='d2'?88:Math.min(86,Math.round(85-20*km/request.maxKm)),verify:request.use==='feed'||!!supply.flags?.unsure?.length,sellerSaving:disposalSaving(supply),buyerSaving:Math.max(0,Math.round(supply.quantity*(request.marketRate-supply.price))),co2:Math.round(supply.quantity*.45),supply,request})
  }
  return [...base,...extras].sort((a,b)=>b.score-a.score)
}
export function nearMisses(l,p){
  if(l.type!=='Supply'||l.flags?.hold||l.archived)return []
  const requests=visibleListings(p).filter(r=>r.type==='Demand'&&!r.archived&&r.status==='Live'&&r.cat===l.cat&&r.unit===l.unit&&!(r.owner&&r.owner===l.owner))
  return requests.map(r=>{
    const km=roadKm(l.location,r.location),reasons=[]
    if(km===null||km>r.maxKm)reasons.push('distance')
    if(l.quantity<r.min||l.quantity>r.max)reasons.push('quantity')
    if(l.price>r.price)reasons.push('price')
    if(r.use==='feed'&&(l.flags?.nofeed||l.flags?.unsure?.length))reasons.push('feed suitability')
    if(l.until&&r.from&&l.until<r.from||r.until&&l.from&&r.until<l.from)reasons.push('availability dates')
    return {request:r,reasons,km}
  }).filter(x=>x.reasons.length&&x.reasons.every(r=>['price','quantity'].includes(r))).slice(0,4)
}
export function alertRecipients(l,p){
  if(l.flags?.hold||l.type!=='Supply')return []
  const old=l.location==='Northland'?farms.filter(f=>f.interests?.includes(l.cat)&&f.km).map(f=>({id:f.id,name:f.name,km:f.km,type:f.type})):[]
  const extra=visibleListings(p).filter(r=>r.type==='Demand'&&r.cat===l.cat&&r.status==='Live'&&!r.archived&&!(r.owner&&r.owner===l.owner)).map(r=>({id:r.id,name:r.business,km:roadKm(l.location,r.location),type:r.use})).filter(r=>r.km!==null&&r.km<=50)
  return [...old,...extra].sort((a,b)=>a.km-b.km)
}
export function approveAlerts(p,l,choice){
  const record=p.listings.find(x=>x.id===l.id)
  if(!record||record.alertChoice==='sent'||record.flags?.hold)return p
  const recipients=choice==='send'?alertRecipients(record,p):[]
  const state=choice==='send'?(recipients.length?'sent':'none'):'declined'
  return {...p,listings:p.listings.map(x=>x.id===l.id?{...x,alertChoice:state,alertedAt:new Date().toISOString()}:x),notifications:recipients.length?[{id:uid(),text:`Alert simulation: ${record.material} suggested to ${recipients.length} nearby buyers.`,listingId:l.id,tab:'Matches',read:false,createdAt:new Date().toISOString(),recipients},...p.notifications]:p.notifications}
}
export function metrics(listings,transactions){
  const done=transactions.filter(t=>t.status==='Completed'),active=listings.filter(l=>!l.archived&&l.status==='Live')
  const kg=done.reduce((a,t)=>a+impactFor(t.quantity,t.km,t.listing.unit).kg,0)
  const net=done.reduce((a,t)=>a+impactFor(t.quantity,t.km,t.listing.unit).co2,0)
  const value=done.reduce((a,t)=>a+(t.settlement?.releasedGoods||0),0)
  const open=transactions.filter(t=>!['Completed','Cancelled'].includes(t.status))
  return {done,active,open,kg,net:round(net),value:round(value),sales:round(done.reduce((a,t)=>a+(t.settlement?.sellerGets||0),0)),savings:round(done.reduce((a,t)=>a+disposalSaving({...t.listing,quantity:t.quantity}),0)),businesses:new Set(listings.map(l=>l.business)).size}
}
export function weeksFor(transactions,now=new Date()){
  const end=new Date(now);end.setUTCHours(0,0,0,0);end.setUTCDate(end.getUTCDate()-((end.getUTCDay()+6)%7))
  return Array.from({length:8},(_,i)=>{
    const start=new Date(end);start.setUTCDate(start.getUTCDate()-(7-i)*7)
    const finish=new Date(start);finish.setUTCDate(finish.getUTCDate()+7)
    const done=transactions.filter(t=>t.status==='Completed'&&new Date(t.completedAt)>=start&&new Date(t.completedAt)<finish)
    return {label:dateLabel(start),kg:round(done.reduce((a,t)=>a+impactFor(t.quantity,t.km,t.listing.unit).kg,0)),co2:round(done.reduce((a,t)=>a+impactFor(t.quantity,t.km,t.listing.unit).co2,0))}
  })
}
// Original local demo requests remain visible alongside the imported marketplace.
export const BASE_REQUESTS=demand.map(d=>({...d,type:'Demand',id:d.id,business:farms.find(f=>f.id===d.farmId).name,material:'Plant material',cat:d.cat,quantity:d.max,price:d.marketRate,marketRate:d.marketRate,location:'Northland',until:'2027-12-31',from:'2026-01-01',status:'Live',sample:true,owner:null,route:routes[d.farmId]}))
export {categories}
