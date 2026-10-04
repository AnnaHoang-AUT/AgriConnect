// A cancellable speak -> listen -> spoken-confirmation conversation.
export class VoiceStopped extends Error {}
export const normaliseVoice = (text) => text.toLowerCase().trim().replace(/[.!?,]/g, '').replace(/\s+/g, ' ')
export function yesNoVoice(text) {
  const t = normaliseVoice(text)
  if (/^(yes|yeah|yep|correct|confirm|confirmed|that's correct|that is correct|yes confirm|i agree|agree)$/.test(t)) return 'yes'
  if (/^(no|nope|incorrect|wrong|change|change it|try again|not correct)$/.test(t)) return 'no'
  return null
}
export function ruleAnswerVoice(text) {
  if (/^(not sure|unsure|i am not sure|i'm not sure|i don't know|do not know)$/.test(normaliseVoice(text))) return 'unsure'
  const t=normaliseVoice(text)
  if (/^(yes|yeah|yep)$/.test(t)) return 'yes'
  if (/^(no|nope)$/.test(t)) return 'no'
  return null
}
export function numberVoice(text) {
  const t = text.toLowerCase().trim().replace(/[$,!?]/g, '').replace(/\.(?=\s|$)/g, '').replace(/(?:kilograms?|kilos?|kg|days?|dollars?|cents|bales?|cubic metres?)\b/g, '').trim()
  if (/^\d+(?:\s*point\s*|\.)\d+$/.test(t)) return Number(t.replace(/\s*point\s*/, '.'))
  if (/^\d+$/.test(t)) return Number(t)
  const small = {zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90}
  const parts=t.split(' point ')
  let total=0,group=0,has=false
  for(const word of parts[0].replace(/-/g,' ').split(' ')) {
    if(word==='and' || word==='') continue
    if(word in small){group+=small[word];has=true}
    else if(word==='hundred'){group=(group||1)*100;has=true}
    else if(word==='thousand'){total+=(group||1)*1000;group=0;has=true}
    else return null
  }
  if(!has) return null
  let result=total+group
  if(parts.length>2) return null
  if(parts[1]) {
    let digits=''
    for(const word of parts[1].split(' ')) {
      if(word in small && small[word]<10) digits+=small[word]
      else if(/^\d+$/.test(word)) digits+=word
      else return null
    }
    result+=Number('0.'+digits)
  }
  return result
}
export class VoiceConversation {
  constructor({ onStatus, onListening, onNavigate }) {
    this.onStatus=onStatus; this.onListening=onListening; this.onNavigate=onNavigate
    this.generation=0; this.pending=null; this.recognition=null; this.timer=null
  }
  setNavigate(callback) { this.onNavigate = callback }
  get supported() { return !!(window.speechSynthesis && (window.SpeechRecognition || window.webkitSpeechRecognition)) }
  stop() {
    this.generation++
    const reject=this.pending;this.pending=null
    clearTimeout(this.timer);this.timer=null
    if(this.recognition){this.recognition.onend=null;this.recognition.onerror=null;this.recognition.onresult=null;this.recognition.abort();this.recognition=null}
    window.speechSynthesis?.cancel();this.onListening(false)
    reject?.(new VoiceStopped('Voice stopped'))
  }
  say(text) {
    this.onStatus(text);this.onListening(false)
    const generation=this.generation
    return new Promise((resolve,reject)=>{
      this.pending=reject
      const u=new SpeechSynthesisUtterance(text);u.lang='en-NZ';u.rate=0.95
      const finish=(err)=>{
        if(generation!==this.generation) return
        clearTimeout(this.timer);this.pending=null
        if (err) reject(err); else resolve()
      }
      u.onend=()=>finish();u.onerror=()=>finish(new Error('Audio playback unavailable. Tap Resume voice, or use the on-screen controls.'))
      // Long utterances must not leave the microphone waiting indefinitely.
      this.timer=setTimeout(()=>finish(new Error('Audio timed out. Tap Resume voice to continue.')),60000)
      window.speechSynthesis.speak(u)
    })
  }
  hear() {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition
    const generation=this.generation
    return new Promise((resolve,reject)=>{
      let finished=false
      const rec=new SR();this.recognition=rec;this.pending=reject
      rec.lang='en-NZ';rec.interimResults=false;rec.maxAlternatives=1
      const finish=(value,error)=>{
        if(finished || generation!==this.generation) return
        finished=true;clearTimeout(this.timer);this.pending=null;this.recognition=null;this.onListening(false)
        rec.onend=null;rec.onerror=null;rec.onresult=null;rec.abort()
        if (error) reject(error); else resolve(value)
      }
      rec.onstart=()=>this.onListening(true)
      rec.onresult=e=>finish(e.results[0][0].transcript)
      rec.onerror=e=>finish(null,new Error(e.error==='not-allowed' || e.error==='service-not-allowed' ? 'Microphone permission was blocked. Allow microphone access, then tap Resume voice.' : 'Speech recognition unavailable. Tap Resume voice or use the on-screen controls.'))
      rec.onend=()=>finish('')
      this.timer=setTimeout(()=>finish(''),20000)
      try {rec.start()} catch {finish(null,new Error('Could not start listening. Tap Resume voice or use the on-screen controls.'))}
    })
  }
  async input(prompt,parse=x=>x) {
    for(let attempt=0;attempt<3;attempt++) {
      await this.say(attempt ? `Let's try again. ${prompt}` : prompt)
      const raw=await this.hear();const command=normaliseVoice(raw)
      if(/^(stop|stop voice|pause|pause voice|cancel voice)$/.test(command)) throw new VoiceStopped('Voice paused. Tap Resume voice when ready.')
      if(/^(repeat|repeat question|say that again)$/.test(command)){attempt--;continue}
      if(/^(home|go home|back|go back)$/.test(command)) {
        const home=command.includes('home')
        const confirmed=await this.input(home ? 'Going home will clear this demo trade. Say yes to confirm, or no to stay.' : 'Go back? Say yes or no.',yesNoVoice)
        if(confirmed==='yes'){this.onNavigate(home?'home':'back');throw new VoiceStopped('Navigation requested')}
        attempt--;continue
      }
      const value=parse(raw)
      if(value!==null && value!==undefined && value!=='') return value
    }
    throw new Error('I could not understand the answer. Voice is paused. Tap Resume voice to try again, or use the screen.')
  }
  async confirmed(prompt,parse=x=>x,label=x=>String(x)) {
    for(let attempt=0;attempt<3;attempt++) {
      const value=await this.input(prompt,parse)
      const confirmation=await this.input(`I heard ${label(value)}. Is that correct? Say yes to confirm, or no to answer again.`,yesNoVoice)
      if(confirmation==='yes') return value
    }
    throw new Error('Answer not confirmed. Voice is paused. Tap Resume voice to continue.')
  }
}
