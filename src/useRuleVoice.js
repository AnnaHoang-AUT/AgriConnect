import { useEffect, useRef, useState } from 'react'
export function useRuleVoice(questions, onAnswer) {
  const [active, setActive] = useState(-1)
  const [status, setStatus] = useState('')
  const [heard, setHeard] = useState(null)
  const recognition = useRef(null)
  const generation = useRef(0)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  function stop() {
    generation.current++
    recognition.current?.abort(); recognition.current = null
    window.speechSynthesis?.cancel()
    setActive(-1); setHeard(null); setStatus('')
  }
  useEffect(() => () => {
    generation.current++; recognition.current?.abort(); window.speechSynthesis?.cancel()
  }, [])
  function read(index) {
    stop()
    if (!supported) { setStatus('Voice reading is unavailable. Please use the questions below.'); return }
    if (index >= questions.length) { setStatus('Questions complete. Review your answers and responsibilities below.'); return }
    setActive(index)
    const id = generation.current
    const q = questions[index]
    const utterance = new SpeechSynthesisUtterance(`Question ${index + 1} of ${questions.length}. ${q.text} ${q.law}. ${q.help || ''} Answer yes, no, or not sure. You can also select an answer on screen.`)
    utterance.lang = 'en-NZ'
    setStatus('Reading question…')
    utterance.onend = () => { if (generation.current === id) setStatus('Choose an answer or press Speak my answer.') }
    utterance.onerror = () => { if (generation.current === id) setStatus('Could not read this question. Please use the text below.') }
    window.speechSynthesis.speak(utterance)
  }
  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setStatus('Speech recognition is unavailable. Select an answer below.'); return }
    window.speechSynthesis.cancel(); recognition.current?.abort()
    const id = ++generation.current
    const rec = new SR(); recognition.current = rec; rec.lang = 'en-NZ'
    rec.onstart = () => setStatus('Listening for yes, no, or not sure…')
    rec.onresult = (event) => {
      if (generation.current !== id) return
      const transcript = event.results[0][0].transcript.toLowerCase().trim().replace(/[.!?]/g, '')
      const value = /^(not sure|unsure|i am not sure|i don't know)$/.test(transcript) ? 'unsure' : /^(yes|yeah|yes it has)$/.test(transcript) ? 'yes' : /^(no|no it has not)$/.test(transcript) ? 'no' : null
      setHeard(value)
      setStatus(value ? `Heard “${transcript}”. Confirm your answer to continue.` : `Heard “${transcript}”. Please say yes, no, or not sure, or select an answer.`)
    }
    rec.onerror = () => { if (generation.current === id) setStatus('Microphone unavailable or speech not recognised. Please select an answer.') }
    rec.onend = () => { if (generation.current === id) recognition.current = null }
    try { rec.start() } catch { setStatus('Could not start the microphone. Please select an answer.') }
  }
  function answer(index, value) {
    onAnswer(questions[index].id, value)
    if (active === index) read(index + 1)
  }
  return { active, status, heard, supported, read, stop, listen, answer }
}
