import { useState } from 'react'
import './App.css'
import { useRuleVoice } from './useRuleVoice'
import { useListingConversation } from './useListingConversation'
import { categories, declarations, deliveryRules, farms, FEE } from './data'
import { AuthPanel, AccountPanel } from './Account'
import { LegalModal } from './Legal'
import { currentUser, logOut } from './auth'
import { parseListing, evaluate, findMatches, nearbyBuyers, settle, money, disposalSaving } from './engine'

const STEPS = ['Describe', 'Check rules', 'Match', 'Pay', 'Deliver']
const TRACK = ['Funds held', 'Dispatched', 'Delivered', 'Paid out']

export default function App() {
  const [step, setStep] = useState(0)
  const [text, setText] = useState('')
  const [listing, setListing] = useState(null)
  const [answers, setAnswers] = useState({})
  const [agreed, setAgreed] = useState([])
  const [matches, setMatches] = useState([])
  const [flags, setFlags] = useState(null)
  const [sel, setSel] = useState(null)
  const [role, setRole] = useState('seller')
  const [paid, setPaid] = useState({ seller: false, buyer: false })
  const [stage, setStage] = useState(0) // 0 funded, 1 dispatched, 2 delivered, 3 paid
  const [change, setChange] = useState(null) // {qty,note,status}
  const [draftQty, setDraftQty] = useState('')
  const [draftNote, setDraftNote] = useState('')
  const [listening, setListening] = useState(false)
  const [user, setUser] = useState(currentUser)
  const [overlay, setOverlay] = useState(null) // null | 'auth' | 'account'
  const [legal, setLegal] = useState(null) // null | 'terms' | 'privacy'
  const [authMode, setAuthMode] = useState('signup')
  const [voiceMode, setVoiceMode] = useState(false)
  const [allVoice, setAllVoice] = useState(false)
  const [pickup, setPickup] = useState(null)
  const [delivery, setDelivery] = useState(null)
  const [actualQty, setActualQty] = useState('')
  const [carrierNote, setCarrierNote] = useState('')
  const [qualityIssue, setQualityIssue] = useState(false)
  const [qualityAccepted, setQualityAccepted] = useState(false)
  const [pin, setPin] = useState('')
  const [notices, setNotices] = useState([])
  const [pending, setPending] = useState(false)

  const cat = listing && categories[listing.cat]
  const voice = useRuleVoice(cat?.questions || [], (id, value) => setAnswers((a) => ({ ...a, [id]: value })))
  const allAnswered = cat && cat.questions.every((q) => answers[q.id])
  const ready = allAnswered && agreed.length === declarations.length && listing.quantity > 0 && Number.isFinite(listing.quantity) && listing.price >= 0 && Number.isFinite(listing.price) && listing.collectDays > 0 && listing.material.trim()
  const agreedQty = change?.status === 'accepted' ? change.qty : listing?.quantity
  const goods = sel ? Math.round(listing.quantity * listing.price * 100) / 100 : 0
  const s = sel ? settle(goods, sel.route.cost, listing.quantity, pickup?.qty ?? agreedQty, delivery?.qty ?? pickup?.qty ?? agreedQty) : null
  const funded = paid.seller && paid.buyer

  function speak() { voice.stop(); setVoiceMode(true); assistant.start() }

  function start() {
    if (!text.trim()) return alert('Please tell AgriReuse what you have first.')
    if (!user) { setAuthMode('signup'); setPending(true); return setOverlay('auth') }
    begin()
  }

  function begin() { setListing(parseListing(text)); setAnswers({}); setAgreed([]); setStep(1) }

  function submitListing() {
    voice.stop()
    const f = evaluate(listing, answers)
    setFlags(f)
    setMatches(f.hold ? [] : findMatches(listing, f))
    setStep(2)
  }

  function signedIn(u) {
    setUser(u)
    setOverlay(null)
    if (pending && text.trim()) begin()
    setPending(false)
  }
  const openAuth = (mode) => { assistant.stop(); setAllVoice(false); voice.stop(); setAuthMode(mode); setPending(false); setOverlay('auth') }
  const inProgress = (step === 1 && Object.keys(answers).length > 0) || (step >= 3 && (paid.seller || paid.buyer) && stage < 3)
  const canBack = !!overlay || step === 1 || step === 2 || (step === 3 && !paid.seller && !paid.buyer) || step === 4
  function goHome() {
    assistant.stop(); voice.stop()
    if (inProgress && !window.confirm('Leave this page? Your progress on this listing or trade will be lost in the demo.')) return
    setOverlay(null); reset()
  }
  function goBack() { assistant.stop(); voice.stop(); if (overlay) setOverlay(null); else setStep(step - 1) }
  function leave() { logOut(); setUser(null); setOverlay(null); reset() }

  const update = (k, v) => { if (allVoice) assistant.stop(); setListing({ ...listing, [k]: v }) }
  const reset = (keepVoice = false) => { assistant.stop(); setAllVoice(keepVoice === true); if (keepVoice === true) assistant.resume(); voice.stop(); setRole('seller'); setPickup(null); setDelivery(null); setActualQty(''); setCarrierNote(''); setQualityIssue(false); setQualityAccepted(false); setPin(''); setNotices([]); setDraftQty(''); setDraftNote(''); setStep(0); setText(''); setSel(null); setPaid({ seller: false, buyer: false }); setStage(0); setChange(null); setListing(null) }

  function recordCarrier(delivered = false) {
    const qty = Number(actualQty)
    const limit = delivered ? pickup?.qty : agreedQty
    if (actualQty === '' || !Number.isFinite(qty) || qty < 0 || qty > limit) return alert(`Enter a quantity from 0 to ${limit} ${listing.unit}. Excess goods need a new agreement.`)
    if ((qty !== limit || qualityIssue) && !carrierNote.trim()) return alert('Explain the quantity or quality difference for both parties.')
    if (delivered && pin !== '4821') return alert('Enter the correct buyer PIN to confirm arrival.')
    const report = { qty, note: carrierNote.trim(), quality: qualityIssue }
    if (delivered) { setDelivery(report); setStage(2) } else { setPickup(report); setStage(1) }
    setNotices((n) => [...n, { ...report, event: delivered ? 'Delivery' : 'Pickup', time: new Date().toLocaleTimeString() }])
    if (qualityIssue) setQualityAccepted(false)
    setActualQty(''); setCarrierNote(''); setQualityIssue(false); setPin('')
  }
  const disputedQuality = (pickup?.quality || delivery?.quality) && !qualityAccepted

  const assistant = useListingConversation({
    enabled: allVoice, step, overlay, user, listing, answers, agreed, matches, flags,
    role, paid, funded, stage, change, pickup, delivered: delivery, qualityAccepted,
    agreedQty, settlement: s,
  }, {
    setListening,
    enable: () => setAllVoice(true),
    navigate: (command) => { if (command === 'home') reset(); else { assistant.stop(); if (canBack) { if (overlay) setOverlay(null); else setStep((n) => Math.max(0, n - 1)) } } },
    openSignup: () => { setPending(true); setAuthMode('signup'); setOverlay('auth') },
    describe: (description, parsed) => { setText(description); setListing(parsed); setAnswers({}); setAgreed([]); setStep(1) },
    edit: (l) => { setListing(l); setAnswers({}); setAgreed([]) },
    answer: (id, value) => setAnswers((a) => ({ ...a, [id]: value })),
    agree: (i) => setAgreed((a) => a.includes(i) ? a : [...a, i]),
    publish: (l, a, f, m) => { setListing(l); setAnswers(a); setFlags(f); setMatches(m); setStep(2) },
    review: () => { setAnswers({}); setAgreed([]); setStep(1) },
    reset,
    select: (m) => { setSel(m); setStep(3) },
    role: setRole,
    pay: (r) => { const n = { ...paid, [r]: true }; setPaid(n); if (n.seller && n.buyer) setStep(4) },
    delivery: () => setStep(4),
    acceptChange: () => setChange({ ...change, status: 'accepted' }),
    acceptQuality: () => setQualityAccepted(true),
    carrier: (report, delivered) => {
      if (delivered) { setDelivery(report); setStage(2) } else { setPickup(report); setStage(1) }
      setNotices((n) => [...n, { ...report, event: delivered ? 'Delivery' : 'Pickup', time: new Date().toLocaleTimeString() }])
      if (report.quality) setQualityAccepted(false)
    },
    release: () => { if (funded && stage === 2 && role === 'carrier' && !disputedQuality) setStage(3) },
  })

  return (
    <div className="app">
      <header className="header">
        <button className="brand" onClick={goHome} aria-label="AgriReuse home"><span className="logo">🌱</span><span className="brand-text">AgriReuse<small>List it. Match it. Reuse it.</small></span></button>
        <nav className="acct" aria-label="Main navigation">
          <button className="link" onClick={goHome}>Home</button>
          {canBack && <button className="link" onClick={goBack}>← Back</button>}
          {!overlay && step > 0 && <span className="nav-status">{STEPS[step]}</span>}
          {user ? (
            <button className="demo-badge" onClick={() => { voice.stop(); setOverlay('account') }}>{user.member ? '🔔 ' : ''}{user.farm}</button>
          ) : (
            <>
              <button className="link" onClick={() => openAuth('login')}>Log in</button>
              <button className="demo-badge" onClick={() => openAuth('signup')}>Sign up free</button>
            </>
          )}
        </nav>
      </header>

      <main className="main">
        {allVoice && <section className="conversation-bar" aria-label="Voice conversation">
          <strong>{listening ? '🎙️ Listening…' : assistant.paused ? 'Voice paused' : '🔊 Voice conversation'}</strong>
          <p role="status" aria-live="polite">{assistant.status}</p>
          <div className="row">
            {assistant.paused ? <button className="match-button" onClick={assistant.resume}>Resume voice</button> : <button className="match-button" onClick={assistant.stop}>Pause voice</button>}
            <button className="link" onClick={() => { assistant.stop(); setAllVoice(false); setVoiceMode(false) }}>Use screen instead</button>
          </div>
          <small>Speak after the question finishes. Say repeat, pause, back, or home. Passwords and photos use the screen.</small>
        </section>}
        {(overlay || step > 0) && (
          <div className="navrow">
            {canBack && <button className="link" onClick={goBack}>← Back</button>}
            <button className="link" onClick={goHome}>⌂ Home</button>
          </div>
        )}
        {overlay === 'auth' && <AuthPanel key={authMode} initialMode={authMode} onLegal={setLegal} onDone={signedIn} note={pending && text.trim() ? 'Create a free account to publish your listing. We kept what you typed.' : ''} />}
        {overlay === 'account' && user && <AccountPanel user={user} onChange={setUser} onBack={() => setOverlay(null)} onLogout={leave} />}
        {!overlay && step > 0 && (
          <ol className="steps">
            {STEPS.map((n, i) => (
              <li key={n} className={i === step ? 'on' : i < step ? 'done' : ''}>{i < step ? '✓' : i + 1} {n}</li>
            ))}
          </ol>
        )}

        {!overlay && step === 0 && (
          <>
            <section className="hero">
              <p className="eyebrow">AI-POWERED FARM RESOURCE EXCHANGE</p>
              <h1>Turn farm waste into<span> opportunity.</span></h1>
              <p className="subtitle">Tell AgriReuse what you have left over. Our AI helps find who can use it and whether the exchange makes sense.</p>
            </section>
            <section className="agent-card">
              <div className="agent-icon">🎙️</div>
              <h2>What do you have?</h2>
              <p>Speak naturally. Tell us what you have, how much, and when it needs to be collected.</p>
              <button className="voice-button" onClick={speak}>{listening ? '🔴 Listening…' : '🎙️ Create a listing by voice'}</button>
              <div className="divider"><span>or type instead</span></div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. I've got 300kg of overripe bananas that need collecting within 3 days..." />
              <div className="chips">
                <button onClick={() => setText("I've got 300kg of overripe bananas that need collecting within 3 days")}>Try: bananas</button>
                <button onClick={() => setText("I have 10 m3 of spent mushroom compost to collect within 7 days")}>Try: compost (no match)</button>
              </div>
              <button className="match-button" onClick={start}>Create my listing →</button>
            </section>
            <section className="features">
              <div><span>♻️</span><strong>Reduce waste</strong><p>Turn farm byproducts into useful resources.</p></div>
              <div><span>🔒</span><strong>Safe payments</strong><p>Money is held until the carrier confirms delivery.</p></div>
              <div><span>🌍</span><strong>Track impact</strong><p>Estimate waste diverted and climate benefit.</p></div>
            </section>
          </>
        )}

        {!overlay && step === 1 && (
          <section className="panel">
            <h2>Check your listing</h2>
            <p className="muted">We read this from what you said. Fix anything that looks wrong.</p>
            <div className="form-grid">
              <label>What is it<input value={listing.material} onChange={(e) => update('material', e.target.value)} /></label>
              <label className="category-field">Category
                <select value={listing.cat} onChange={(e) => { voice.stop(); update('cat', e.target.value); setAnswers({}); setAgreed([]) }}>
                  {Object.entries(categories).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                </select>
              </label>
              <label>Amount ({listing.unit})<input type="number" value={listing.quantity} onChange={(e) => update('quantity', +e.target.value)} /></label>
              <label>Price per {listing.unit} ($)<input type="number" step="0.01" value={listing.price} onChange={(e) => update('price', +e.target.value)} /></label>
              <label>Collect within (days)<input type="number" value={listing.collectDays} onChange={(e) => update('collectDays', +e.target.value)} /></label>
              <label>Photos<input type="file" accept="image/*" multiple /></label>
            </div>
            <p className="muted">Asking total: <strong>{money(listing.quantity * listing.price)}</strong> · Suggested: {money(cat.price)}/{listing.unit} based on similar listings.</p>

            <h3>NZ rules for {cat.label.toLowerCase()}</h3>
            <div className="voice-tools">
              <label className="check"><input type="checkbox" checked={voiceMode} onChange={(e) => { setVoiceMode(e.target.checked); if (!e.target.checked) { voice.stop(); assistant.stop(); setAllVoice(false) } }} /><span>Use voice for the NZ rules questions</span></label>
              {voiceMode && !allVoice && <>
                <button className="match-button" onClick={() => voice.read(0)}>🎙️ Read questions aloud</button>
                {voice.active >= 0 && <div className="row"><button className="match-button" onClick={() => voice.read(voice.active)}>Repeat question</button><button className="match-button" onClick={voice.listen}>Speak my answer</button><button className="link" onClick={voice.stop}>Stop voice</button></div>}
                {voice.heard && <button className="accept-button" onClick={() => voice.answer(voice.active, voice.heard)}>Confirm: {voice.heard === 'unsure' ? 'Not sure' : voice.heard}</button>}
                <p className="muted small" role="status">{voice.status || 'Questions are read one at a time. Confirm each spoken answer or select it below.'}</p>
              </>}
            </div>
            <p className="muted">Answer honestly. Buyers see your answers, and some answers stop a listing going live.</p>
            {cat.questions.map((q, index) => (
              <div className={"q " + ((allVoice ? assistant.question : voice.active) === index ? "voice-active" : "")} key={q.id}>
                <p>{q.text}<small>{q.law}</small>{answers[q.id] === 'yes' && q.help && <em>{q.help}</em>}</p>
                <div className="seg">
                  {['no', 'unsure', 'yes'].map((v) => (
                    <button key={v} className={answers[q.id] === v ? 'on ' + v : ''} onClick={() => { if (allVoice) assistant.stop(); voice.answer(index, v) }}>{v === 'unsure' ? 'Not sure' : v[0].toUpperCase() + v.slice(1)}</button>
                  ))}
                </div>
              </div>
            ))}

            <h3>Your responsibilities</h3>
            {declarations.map((d, i) => (
              <label className="check" key={i}>
                <input type="checkbox" checked={agreed.includes(i)} onChange={() => { if (allVoice) assistant.stop(); setAgreed(agreed.includes(i) ? agreed.filter((x) => x !== i) : [...agreed, i]) }} />
                <span>{d}</span>
              </label>
            ))}
            <p className="muted small">General guidance only, not legal advice. See biosecurity.govt.nz and mpi.govt.nz for the full rules.</p>
            <button className="voice-button" disabled={!ready} onClick={submitListing}>{ready ? 'Publish listing and find matches' : 'Answer every question and tick each box'}</button>
          </section>
        )}

        {!overlay && step === 2 && flags.hold && (
          <section className="panel">
            <span className="tag red">Listing on hold</span>
            <h2>This can't be listed yet</h2>
            <p>Based on your answers, moving this material may break NZ biosecurity or chemical rules. It has been saved as a draft and not shown to buyers.</p>
            <ul className="list">
              <li>Suspected pest or disease: call MPI on <strong>0800 80 99 66</strong>.</li>
              <li>Chemical or withholding period: wait until it has passed, then update your answers.</li>
              <li>Movement controls: check with MPI before moving anything off the property.</li>
            </ul>
            <button className="match-button" onClick={() => setStep(1)}>Review my answers</button>
          </section>
        )}

        {!overlay && step === 2 && !flags.hold && (
          <section className="match-result">
            <div className="result-heading">
              <div>
                <span className="tag green">Listing live</span>
                <h2>{listing.quantity} {listing.unit} {listing.material}</h2>
                <p>{money(listing.quantity * listing.price)} · Pickup within {listing.collectDays} days{flags.nofeed ? ' · Not for animal feed' : ''}</p>
              </div>
            </div>
            {matches.length > 0 ? (
              <>
                <p className="muted">{matches.length} nearby {matches.length === 1 ? 'buyer wants' : 'buyers want'} this.</p>
                {matches.map((m) => (
                  <article className="match-card compact" key={m.d.id}>
                    <div className="mrow">
                      <div className="farm-icon">🚜</div>
                      <div className="grow">
                        <h3>{m.buyer.name}</h3>
                        <p className="muted">{m.d.pathway} · ★ {m.buyer.rating} · {m.route.km} km, {m.route.min} min</p>
                      </div>
                      <span className="match-score">{m.score}%</span>
                    </div>
                    <div className="figures">
                      <div><small>Buyer pays</small><strong>{money(m.goods)}</strong></div>
                      <div><small>Transport</small><strong>{money(m.route.cost)}</strong></div>
                      <div><small>You avoid disposal</small><strong>~${m.sellerSaving}</strong></div>
                      {m.co2 > 0 && <div><small>CO₂e avoided</small><strong>~{m.co2} kg</strong></div>}
                    </div>
                    {m.verify && <p className="warning">Buyer must confirm the material suits their use before it is used as feed.</p>}
                    <details><summary>Why this match</summary>
                      <ul className="list">
                        <li>Wants {categories[m.d.cat].label.toLowerCase()}, {m.d.min}–{m.d.max} {m.d.unit}</li>
                        <li>{m.route.km} km is inside their {m.d.maxKm} km pickup range</li>
                        <li>Buyer saves ~${m.buyerSaving} against buying similar</li>
                      </ul>
                    </details>
                    <button className="accept-button" onClick={() => { setSel(m); setStep(3) }}>Trade with {m.buyer.name}</button>
                  </article>
                ))}
                <p className="demo-note">Estimates from synthetic demo data.</p>
              </>
            ) : (
              <div className="match-card compact">
                <h3>No match yet, but your listing is live</h3>
                <p className="muted">We've alerted {nearbyBuyers(listing.cat).length} nearby subscribed members who follow this category.</p>
                {nearbyBuyers(listing.cat).map((f) => (
                  <div className="notice" key={f.id}>
                    <strong>{f.name}</strong> <small>{f.type} · {f.km} km away</small>
                    <p>“{listing.quantity} {listing.unit} of {listing.material} is available near you for {money(listing.quantity * listing.price)}. Could suit: {cat.uses[0].toLowerCase()}. {cat.benefit}”</p>
                  </div>
                ))}
                <p className="muted small">Likely uses: {cat.uses.join('; ')}. We'll message you when someone replies.</p>
                <button className="match-button" onClick={reset}>Create another listing</button>
              </div>
            )}
          </section>
        )}

        {!overlay && step >= 3 && sel && (
          <section className="panel">
            <div className="rolebar">
              <span>Demo view:</span>
              {['seller', 'buyer', 'carrier'].map((r) => (
                <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>{r === 'seller' ? '🧑‍🌾 Seller' : r === 'buyer' ? '🚜 Buyer' : '🚚 Carrier'}</button>
              ))}
            </div>

            <h2>{!overlay && step === 3 ? 'Agree and pay' : 'Delivery'}: {listing.quantity} {listing.unit} {listing.material}</h2>
            <p className="muted">{farms[0].name} → {sel.buyer.name} · {sel.route.km} km</p>

            <div className="ledger">
              <div><span>Buyer goods payment originally held</span><strong>{money(s.buyerPays)}</strong></div>
              <div><span>Seller pays transport (held, refunded)</span><strong>{money(s.transport)}</strong></div>
              <div><span>AgriReuse fee ({FEE.rate * 100}% of released goods)</span><strong>−{money(s.fee)}</strong></div>
              {(pickup || delivery || change?.status === 'accepted') && <><div><span>Eligible quantity · {s.releasePercent.toFixed(1)}% of original</span><strong>{s.quantity} {listing.unit}</strong></div><div><span>Goods payment eligible for release</span><strong>{money(s.releasedGoods)}</strong></div><div><span>Unused goods payment refunded to buyer</span><strong>{money(s.buyerRefund)}</strong></div></>}
              <div className="total"><span>Seller receives after delivery</span><strong>{money(s.sellerGets)} + {money(s.transport)} refund</strong></div>
            </div>

            {!overlay && step === 3 && (
              <>
                <ul className="list">{deliveryRules.map((r) => <li key={r}>{r}</li>)}</ul>
                <div className="paygrid">
                  <div className={paid.seller ? 'paid' : ''}><strong>Seller</strong><span>{paid.seller ? '✓ Transport paid' : money(s.transport) + ' due'}</span></div>
                  <div className={paid.buyer ? 'paid' : ''}><strong>Buyer</strong><span>{paid.buyer ? '✓ Goods paid' : money(s.buyerPays) + ' due'}</span></div>
                </div>
                {funded && <button className="match-button" onClick={() => setStep(4)}>Continue to delivery</button>}
                {role === 'carrier' && <p className="muted">Carriers see the job once both payments are held.</p>}
                {role !== 'carrier' && !paid[role] && (
                  <button className="voice-button" onClick={() => { const n = { ...paid, [role]: true }; setPaid(n); if (n.seller && n.buyer) setStep(4) }}>
                    Accept terms and pay {money(role === 'seller' ? s.transport : s.buyerPays)}
                  </button>
                )}
                {role !== 'carrier' && paid[role] && !funded && <p className="muted">Waiting for the {role === 'seller' ? 'buyer' : 'seller'}. Switch the demo view to continue.</p>}
              </>
            )}

            {!overlay && step === 4 && funded && (
              <>
                <ol className="track">{TRACK.map((t, i) => <li key={t} className={i <= stage ? 'done' : ''}>{i <= stage ? '✓' : ''} {t}</li>)}</ol>

                {stage === 0 && change?.status === 'pending' && (
                  <div className="notice">
                    <strong>Seller reports a change</strong>
                    <p>New amount: {change.qty} {listing.unit}. “{change.note}”</p>
                    {role === 'buyer' ? (
                      <div className="row">
                        <button className="accept-button" onClick={() => setChange({ ...change, status: 'accepted' })}>Accept change</button>
                        <button className="match-button" onClick={() => { alert('Trade cancelled. Both payments refunded in full.'); reset() }}>Cancel and refund</button>
                      </div>
                    ) : <p className="muted">Waiting for buyer to respond.</p>}
                  </div>
                )}
                {change?.status === 'accepted' && <p className="tag green">Change accepted. Eligible goods value: {money(change.qty * listing.price)}. Original held payment remains {money(goods)}; any difference is refunded at settlement.</p>}

                {stage === 0 && role === 'seller' && change?.status !== 'pending' && (
                  <>
                    <details><summary>Amount or quality changed? Tell the buyer before dispatch</summary>
                      <div className="form-grid">
                        <label>New amount ({listing.unit})<input type="number" value={draftQty} onChange={(e) => setDraftQty(e.target.value)} /></label>
                        <label>What changed<input value={draftNote} onChange={(e) => setDraftNote(e.target.value)} /></label>
                      </div>
                      <button className="match-button" disabled={!draftQty || !draftNote.trim() || +draftQty <= 0 || +draftQty > listing.quantity} onClick={() => setChange({ qty: +draftQty, note: draftNote, status: 'pending' })}>Send change notice</button>
                    </details>
                    <p className="muted">The carrier records the actual quantity at handover. Switch to Carrier to continue.</p>
                  </>
                )}
                {stage === 0 && role === 'buyer' && change?.status !== 'pending' && <p className="muted">Waiting for the seller to hand over the goods.</p>}

                {notices.length > 0 && <div className="notice" role="status"><strong>Carrier updates shared with seller and buyer</strong>{notices.map((n, i) => <p key={i}>{n.event} · {n.qty} {listing.unit} · {n.time}{n.note ? ` — ${n.note}` : ' — Quantity confirmed'}{n.quality ? ' · Quality review required' : ''}</p>)}<small>In-app demo notifications; no external messages are sent.</small></div>}
                {(stage === 0 || stage === 1) && role === 'carrier' && change?.status !== 'pending' && <div className="notice">
                  <h3>{stage === 0 ? 'Record actual pickup' : 'Record actual delivery'}</h3>
                  <p className="muted">Agreed: {agreedQty} {listing.unit}{pickup ? ` · Picked up: ${pickup.qty} ${listing.unit}` : ''}. Payment uses the lower picked-up and delivered quantity, capped at the agreement.</p>
                  <div className="form-grid"><label>Actual {stage === 0 ? 'picked-up' : 'delivered'} quantity ({listing.unit})<input type="number" min="0" max={stage === 0 ? agreedQty : pickup.qty} step="any" value={actualQty} onChange={(e) => setActualQty(e.target.value)} /></label><label>Difference or condition notes<input value={carrierNote} onChange={(e) => setCarrierNote(e.target.value)} /></label></div>
                  <label className="check"><input type="checkbox" checked={qualityIssue} onChange={(e) => setQualityIssue(e.target.checked)} /><span>Quality differs from the agreed description — hold release for buyer review</span></label>
                  {stage === 1 && <label>Buyer delivery PIN<input inputMode="numeric" maxLength="4" value={pin} onChange={(e) => setPin(e.target.value)} /></label>}
                  <button className="voice-button" onClick={() => recordCarrier(stage === 1)}>{stage === 0 ? 'Confirm pickup and notify both parties' : 'Confirm delivery and notify both parties'}</button>
                </div>}
                {stage === 1 && role !== 'carrier' && <p className="muted">On its way. {role === 'buyer' ? 'Your delivery PIN is 4821. Give it to the carrier on arrival.' : 'Waiting for carrier delivery measurements.'}</p>}
                {disputedQuality && <div className="warning"><strong>Payment release paused: quality review</strong><p>Review the carrier condition notes. Weight alone does not resolve a quality concern.</p>{role === 'buyer' ? <button className="match-button" onClick={() => setQualityAccepted(true)}>Accept reported condition at the agreed unit price</button> : <p>Waiting for the buyer to accept the reported condition. Otherwise funds remain held for dispute resolution.</p>}</div>}
                {stage === 2 && <button className="voice-button" disabled={role !== 'carrier' || disputedQuality} onClick={() => setStage(3)}>{disputedQuality ? 'Payment held for quality review' : role !== 'carrier' ? 'Carrier must release confirmed payments' : 'Release payments and refund unused balance'}</button>}

                {stage === 3 && (
                  <div className="match-card compact">
                    <h3>✅ Trade complete</h3>
                    <p>{role === 'buyer' ? `You paid ${money(s.releasedGoods)} for ${s.quantity} ${listing.unit}. Refunded: ${money(s.buyerRefund)}.` : `Seller received ${money(s.sellerGets)} and ${money(s.transport)} transport refunded.`}</p>
                    <p className="muted small">Saved ~${disposalSaving({ ...listing, quantity: s.quantity })} disposal · ~{Math.round(s.quantity * 0.45)} kg CO₂e avoided (estimate). Please rate each other.</p>
                    <button className="match-button" onClick={reset}>Start a new listing</button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      <footer className="foot">
        <button className="link" onClick={() => setLegal('terms')}>Terms of Use</button>
        <button className="link" onClick={() => setLegal('privacy')}>Privacy Policy</button>
        <span>Demo prototype</span>
      </footer>
      {legal && <LegalModal tab={legal} setTab={setLegal} onClose={() => setLegal(null)} />}
    </div>
  )
}
