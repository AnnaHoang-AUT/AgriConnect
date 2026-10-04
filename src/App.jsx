import { useState } from 'react'
import './App.css'
import { categories, declarations, deliveryRules, farms, FEE } from './data'
import { AuthPanel, AccountPanel } from './Account'
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

  const cat = listing && categories[listing.cat]
  const allAnswered = cat && cat.questions.every((q) => answers[q.id])
  const ready = allAnswered && agreed.length === declarations.length
  const goods = sel ? Math.round((change?.status === 'accepted' ? change.qty : listing.quantity) * listing.price * 100) / 100 : 0
  const s = sel ? settle(goods, sel.route.cost) : null
  const funded = paid.seller && paid.buyer

  function speak() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return alert('Voice input is not supported in this browser. Please type instead.')
    const rec = new SR()
    rec.lang = 'en-NZ'
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onresult = (e) => setText(e.results[0][0].transcript)
    rec.start()
  }

  function start() {
    if (!text.trim()) return alert('Please tell AgriReuse what you have first.')
    if (!user) return setOverlay('auth')
    setListing(parseListing(text)); setAnswers({}); setAgreed([]); setStep(1)
  }

  function submitListing() {
    const f = evaluate(listing, answers)
    setFlags(f)
    setMatches(f.hold ? [] : findMatches(listing, f))
    setStep(2)
  }

  function signedIn(u) {
    setUser(u)
    setOverlay(null)
    if (text.trim() && !listing) { setListing(parseListing(text)); setAnswers({}); setAgreed([]); setStep(1) }
  }
  function leave() { logOut(); setUser(null); setOverlay(null); reset() }

  const update = (k, v) => setListing({ ...listing, [k]: v })
  const reset = () => { setStep(0); setText(''); setSel(null); setPaid({ seller: false, buyer: false }); setStage(0); setChange(null) }

  return (
    <div className="app">
      <header className="header">
        <div className="brand"><span className="logo">🌱</span><span>AgriReuse</span></div>
        <nav className="acct">
          {user ? (
            <button className="demo-badge" onClick={() => setOverlay('account')}>{user.member ? '🔔 ' : ''}{user.farm}</button>
          ) : (
            <>
              <button className="link" onClick={() => setOverlay('auth')}>Log in</button>
              <button className="demo-badge" onClick={() => setOverlay('auth')}>Sign up free</button>
            </>
          )}
        </nav>
      </header>

      <main className="main">
        {overlay === 'auth' && <AuthPanel onDone={signedIn} note={text.trim() && !user ? 'Create a free account to publish your listing. We kept what you typed.' : ''} />}
        {overlay === 'account' && user && <AccountPanel user={user} onChange={setUser} onBack={() => setOverlay(null)} onLogout={leave} />}
        {!overlay && step > 0 && (
          <ol className="steps">
            {STEPS.map((n, i) => (
              <li key={n} className={i === step - 1 ? 'on' : i < step - 1 ? 'done' : ''}>{i < step - 1 ? '✓' : i + 1} {n}</li>
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
              <button className="voice-button" onClick={speak}>{listening ? '🔴 Listening…' : '🎙️ Talk to AgriReuse'}</button>
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
              <label>Type
                <select value={listing.cat} onChange={(e) => { update('cat', e.target.value); setAnswers({}) }}>
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
            <p className="muted">Answer honestly. Buyers see your answers, and some answers stop a listing going live.</p>
            {cat.questions.map((q) => (
              <div className="q" key={q.id}>
                <p>{q.text}<small>{q.law}</small>{answers[q.id] === 'yes' && q.help && <em>{q.help}</em>}</p>
                <div className="seg">
                  {['no', 'unsure', 'yes'].map((v) => (
                    <button key={v} className={answers[q.id] === v ? 'on ' + v : ''} onClick={() => setAnswers({ ...answers, [q.id]: v })}>{v === 'unsure' ? 'Not sure' : v[0].toUpperCase() + v.slice(1)}</button>
                  ))}
                </div>
              </div>
            ))}

            <h3>Your responsibilities</h3>
            {declarations.map((d, i) => (
              <label className="check" key={i}>
                <input type="checkbox" checked={agreed.includes(i)} onChange={() => setAgreed(agreed.includes(i) ? agreed.filter((x) => x !== i) : [...agreed, i])} />
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
              <div><span>Buyer pays for goods (held)</span><strong>{money(s.buyerPays)}</strong></div>
              <div><span>Seller pays transport (held, refunded)</span><strong>{money(s.transport)}</strong></div>
              <div><span>AgriReuse fee ({FEE.rate * 100}% of goods)</span><strong>−{money(s.fee)}</strong></div>
              <div className="total"><span>Seller receives after delivery</span><strong>{money(s.sellerGets)} + {money(s.transport)} refund</strong></div>
            </div>

            {!overlay && step === 3 && (
              <>
                <ul className="list">{deliveryRules.map((r) => <li key={r}>{r}</li>)}</ul>
                <div className="paygrid">
                  <div className={paid.seller ? 'paid' : ''}><strong>Seller</strong><span>{paid.seller ? '✓ Transport paid' : money(s.transport) + ' due'}</span></div>
                  <div className={paid.buyer ? 'paid' : ''}><strong>Buyer</strong><span>{paid.buyer ? '✓ Goods paid' : money(s.buyerPays) + ' due'}</span></div>
                </div>
                {role === 'carrier' && <p className="muted">Carriers see the job once both payments are held.</p>}
                {role !== 'carrier' && !paid[role] && (
                  <button className="voice-button" onClick={() => { const n = { ...paid, [role]: true }; setPaid(n); if (n.seller && n.buyer) setStep(4) }}>
                    Accept terms and pay {money(role === 'seller' ? s.transport : s.buyerPays)}
                  </button>
                )}
                {role !== 'carrier' && paid[role] && <p className="muted">Waiting for the {role === 'seller' ? 'buyer' : 'seller'}. Switch the demo view to continue.</p>}
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
                {change?.status === 'accepted' && <p className="tag green">Change accepted. Goods total updated to {money(goods)}.</p>}

                {stage === 0 && role === 'seller' && change?.status !== 'pending' && (
                  <>
                    <details><summary>Amount or quality changed? Tell the buyer before dispatch</summary>
                      <div className="form-grid">
                        <label>New amount ({listing.unit})<input type="number" value={draftQty} onChange={(e) => setDraftQty(e.target.value)} /></label>
                        <label>What changed<input value={draftNote} onChange={(e) => setDraftNote(e.target.value)} /></label>
                      </div>
                      <button className="match-button" disabled={!draftQty || !draftNote} onClick={() => setChange({ qty: +draftQty, note: draftNote, status: 'pending' })}>Send change notice</button>
                    </details>
                    <button className="voice-button" onClick={() => setStage(1)}>Hand goods to carrier</button>
                  </>
                )}
                {stage === 0 && role !== 'seller' && change?.status !== 'pending' && <p className="muted">Waiting for the seller to hand over the goods.</p>}

                {stage === 1 && (role === 'carrier'
                  ? <button className="voice-button" onClick={() => setStage(2)}>Enter buyer PIN 4821 and confirm delivery</button>
                  : <p className="muted">On its way. {role === 'buyer' ? 'Your delivery PIN is 4821. Give it to the carrier on arrival.' : 'Waiting for the carrier to confirm delivery.'}</p>)}

                {stage === 2 && <button className="voice-button" onClick={() => setStage(3)}>Release payments</button>}

                {stage === 3 && (
                  <div className="match-card compact">
                    <h3>✅ Trade complete</h3>
                    <p>{role === 'buyer' ? `You paid ${money(s.buyerPays)} for ${change?.status === 'accepted' ? change.qty : listing.quantity} ${listing.unit}.` : `Seller received ${money(s.sellerGets)} and ${money(s.transport)} transport refunded.`}</p>
                    <p className="muted small">Saved ~${disposalSaving(listing)} disposal · ~{Math.round(listing.quantity * 0.45)} kg CO₂e avoided (estimate). Please rate each other.</p>
                    <button className="match-button" onClick={reset}>Start a new listing</button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
