import test from 'node:test'
import assert from 'node:assert/strict'
import { VoiceConversation, VoiceStopped, numberVoice, ruleAnswerVoice } from '../src/voiceConversation.js'
import { parseSpokenListing } from '../src/engine.js'

test('spoken numbers, decimal prices and listing quantities', () => {
  assert.equal(numberVoice('0.15'),0.15)
  assert.equal(numberVoice('zero point one five'),0.15)
  assert.equal(numberVoice('four hundred kilograms'),400)
  assert.equal(numberVoice('three hundred and twenty'),320)
  assert.equal(numberVoice('not sure'),null)
  assert.equal(ruleAnswerVoice('not sure'),'unsure')
  const l=parseSpokenListing('I have four hundred kilograms of apples to collect within three days')
  assert.equal(l.quantity,400);assert.equal(l.material,'apples');assert.equal(l.collectDays,3)
})
function mockSpeech(answers, spoken) {
  globalThis.SpeechSynthesisUtterance=class { constructor(text){this.text=text} }
  globalThis.window={
    speechSynthesis:{cancel(){},speak(u){spoken.push(u.text);queueMicrotask(()=>u.onend?.())}},
    SpeechRecognition:class {
      start(){queueMicrotask(()=>{this.onstart?.();assert.ok(answers.length,'Unexpected microphone turn');this.onresult?.({results:[[{transcript:answers.shift()}]]})})}
      abort(){}
    },
  }
}
const controller=()=>new VoiceConversation({onStatus(){},onListening(){},onNavigate(){}})
test('spoken confirmation rejects an incorrect recognition before accepting another answer',async()=>{
  const spoken=[];mockSpeech(['yes','no','not sure','yes'],spoken)
  const v=controller()
  assert.equal(await v.confirmed('Any contamination?',ruleAnswerVoice), 'unsure')
  assert.equal(spoken.filter(x=>x.includes('Is that correct')).length,2)
  v.stop()
})
test('pause stops a conversation without accepting an answer',async()=>{
  mockSpeech(['pause'],[])
  const v=controller()
  await assert.rejects(v.confirmed('Any disease?',ruleAnswerVoice),VoiceStopped)
  v.stop()
})
test('stop cancels a pending utterance and does not start listening',async()=>{
  globalThis.window={speechSynthesis:{cancel(){},speak(){}},SpeechRecognition:class {start(){throw Error('Should not listen')}abort(){}}}
  const v=controller();const pending=v.say('Question');v.stop()
  await assert.rejects(pending,VoiceStopped)
})
test('repeat asks the same question again; no answer is inferred from silence',async()=>{
  const spoken=[];mockSpeech(['repeat','no','yes'],spoken)
  const v=controller();assert.equal(await v.confirmed('Any mould?',ruleAnswerVoice),'no')
  assert.equal(spoken.filter(x=>x.includes('Any mould?')).length,2);v.stop()
})
