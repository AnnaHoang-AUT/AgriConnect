import { useState } from 'react'
import { categories, FEE } from './data'
import { signUp, logIn, saveUser } from './auth'

export function AuthPanel({ onDone, note }) {
  const [mode, setMode] = useState('signup')
  const [f, setF] = useState({ name: '', farm: '', email: '', password: '', terms: false })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF({ ...f, [k]: v })
  const up = mode === 'signup'

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (up && (!f.name.trim() || !f.farm.trim())) return setErr('Enter your name and farm or business name.')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email address.')
    if (f.password.length < 8) return setErr('Password must be at least 8 characters.')
    if (up && !f.terms) return setErr('Please accept the terms to continue.')
    setBusy(true)
    try { onDone(up ? await signUp(f) : await logIn(f.email, f.password)) } catch (x) { setErr(x.message) }
    setBusy(false)
  }

  return (
    <section className="panel narrow">
      <h2>{up ? 'Create your free account' : 'Welcome back'}</h2>
      <p className="muted">{note || (up ? 'Free to join. You only pay 2% when a trade completes.' : 'Log in to create and manage listings.')}</p>
      <form onSubmit={submit}>
        {up && (
          <div className="form-grid">
            <label>Your name<input value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" /></label>
            <label>Farm or business<input value={f.farm} onChange={(e) => set('farm', e.target.value)} /></label>
          </div>
        )}
        <div className="form-grid one">
          <label>Email<input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /></label>
          <label>Password (8+ characters)<input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete={up ? 'new-password' : 'current-password'} /></label>
        </div>
        {up && (
          <label className="check">
            <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} />
            <span>I agree to the Terms of Use and Privacy Policy. My details are used only to run my AgriReuse account (Privacy Act 2020).</span>
          </label>
        )}
        {err && <p className="error" role="alert">{err}</p>}
        <button className="voice-button" disabled={busy}>{busy ? 'Please wait…' : up ? 'Create account' : 'Log in'}</button>
      </form>
      <p className="muted small center">
        {up ? 'Already have an account? ' : 'New here? '}
        <button className="link" onClick={() => { setMode(up ? 'login' : 'signup'); setErr('') }}>{up ? 'Log in' : 'Create a free account'}</button>
      </p>
      <p className="muted small center">Demo: accounts are stored in this browser only.</p>
    </section>
  )
}

export function AccountPanel({ user, onChange, onBack, onLogout }) {
  const [picks, setPicks] = useState(user.interests.length ? user.interests : [])
  const toggle = (k) => setPicks(picks.includes(k) ? picks.filter((x) => x !== k) : [...picks, k])
  const subscribe = () => onChange(saveUser({ ...user, member: true, interests: picks }))
  const cancel = () => onChange(saveUser({ ...user, member: false, interests: [] }))
  const first = picks[0] && categories[picks[0]]

  return (
    <section className="panel">
      <div className="mrow">
        <div className="grow"><h2>{user.farm}</h2><p className="muted">{user.name} · {user.email}</p></div>
        <span className={'tag ' + (user.member ? 'green' : 'grey')}>{user.member ? 'Subscribed member' : 'Free account'}</span>
      </div>

      <h3>Listing alerts</h3>
      <p className="muted">
        {user.member
          ? 'You get a message when a new listing near you matches the categories below.'
          : `Subscribe for $${FEE.membership}/year to be alerted about new listings in the categories you choose. Listing and trading stay free to join.`}
      </p>
      {Object.entries(categories).map(([k, c]) => (
        <label className="check" key={k}>
          <input type="checkbox" checked={picks.includes(k)} onChange={() => toggle(k)} />
          <span>{c.label}</span>
        </label>
      ))}

      {first && (
        <div className="notice">
          <strong>Sample alert</strong>
          <p>“New near you: 300 kg overripe bananas, 18 km away, $45.00. Could suit: {first.uses[0].toLowerCase()}.”</p>
        </div>
      )}

      {user.member ? (
        <div className="row">
          <button className="match-button" disabled={!picks.length} onClick={subscribe}>Save categories</button>
          <button className="match-button" onClick={cancel}>Cancel subscription</button>
        </div>
      ) : (
        <button className="voice-button" disabled={!picks.length} onClick={subscribe}>
          {picks.length ? `Subscribe for $${FEE.membership}/year` : 'Choose at least one category'}
        </button>
      )}
      <p className="muted small">Demo: no card is charged. Real payments need a licensed NZ payment provider.</p>
      <div className="row">
        <button className="link" onClick={onBack}>← Back</button>
        <button className="link" onClick={onLogout}>Log out</button>
      </div>
    </section>
  )
}
