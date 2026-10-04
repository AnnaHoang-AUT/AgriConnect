// DEMO ONLY: accounts live in this browser's localStorage. A real launch needs a hosted
// auth service (e.g. Supabase, Firebase Auth or Auth0) and a database.
const USERS = 'agri_users', SESSION = 'agri_session'
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const hash = async (p) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('')

export function currentUser() {
  const e = read(SESSION, null)
  return e ? read(USERS, {})[e] ?? null : null
}
export async function signUp({ name, farm, nzbn, email, password }) {
  const users = read(USERS, {}), key = email.trim().toLowerCase()
  if (users[key]) throw new Error('An account with this email already exists. Log in instead.')
  const user = { name: name.trim(), farm: farm.trim(), nzbn: nzbn.replace(/\s/g, ''), email: key, pass: await hash(password), member: false, interests: [] }
  users[key] = user
  localStorage.setItem(USERS, JSON.stringify(users))
  localStorage.setItem(SESSION, JSON.stringify(key))
  return user
}
export async function logIn(email, password) {
  const key = email.trim().toLowerCase(), user = read(USERS, {})[key]
  if (!user || user.pass !== (await hash(password))) throw new Error('Email or password is incorrect.')
  localStorage.setItem(SESSION, JSON.stringify(key))
  return user
}
export function saveUser(user) {
  const users = read(USERS, {})
  users[user.email] = user
  localStorage.setItem(USERS, JSON.stringify(users))
  return user
}
export const logOut = () => localStorage.removeItem(SESSION)
