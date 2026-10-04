import { numberVoice } from './voiceConversation.js'
import { categories, demand, farms, routes, FEE } from './data.js'

export const money = (n) => '$' + n.toFixed(2)
const r2 = (n) => Math.round(n * 100) / 100

export function parseListing(text) {
  const t = text.toLowerCase()
  const m = t.match(/(\d[\d,.]*)\s*(kg|kilos?|tonnes?|tons?|t\b|m3|m³|bales?)/)
  let quantity = 300, unit = 'kg'
  if (m) {
    quantity = parseFloat(m[1].replace(/,/g, ''))
    if (/^(tonne|ton|t$)/.test(m[2])) quantity *= 1000
    else if (/^bale/.test(m[2])) unit = 'bales'
    else if (m[2].startsWith('m')) unit = 'm³'
  }
  const d = t.match(/(\d+)\s*days?/)
  const mat = t.match(/(?:\bof\s+|(?:kg|kilos?|tonnes?|tons?|m3|m³|bales?)\s+)([a-z\s-]+?)(?:\s+(?:that|which|needing|need|to be|to collect)|[,.]|$)/)
  const cat = /eggshell|egg shell/.test(t) ? 'eggshell' : /wool|fleece/.test(t) ? 'wool' : /wood|sawdust|shavings/.test(t) ? 'wood' : /manure|compost|effluent|mulch/.test(t) ? 'organic' : /meat|bone|blood|offal|whey|fish/.test(t) ? 'animal' : 'plant'
  const base = categories[cat].price
  return {
    material: mat ? mat[1].trim().replace(/^of\s+/, '') : 'surplus material', cat, quantity, unit,
    collectDays: d ? +d[1] : 7,
    price: unit === 'm³' ? 25 : unit === 'bales' ? 20 : base,
  }
}

export const disposalSaving = (l) =>
  Math.round(l.quantity * (l.unit === 'kg' ? categories[l.cat].disposal : l.unit === 'm³' ? 30 : 15) / 5) * 5

export function evaluate(l, answers) {
  const qs = categories[l.cat].questions
  const flags = { hold: false, nofeed: false, unsure: [] }
  qs.forEach((q) => {
    const a = answers[q.id]
    if (a === 'yes') flags[q.risk] = true
    if (a === 'unsure') { flags.unsure.push(q.id); if (q.risk === 'hold') flags.hold = true; else flags.nofeed = true }
  })
  return flags
}

export function findMatches(l, flags) {
  return demand
    .filter((d) => d.cat === l.cat && d.unit === l.unit && l.quantity >= d.min && l.quantity <= d.max)
    .filter((d) => !(d.use === 'feed' && flags.nofeed))
    .map((d) => {
      const buyer = farms.find((f) => f.id === d.farmId)
      const route = routes[d.farmId]
      if (!route || route.km > d.maxKm) return null
      const goods = r2(l.quantity * l.price)
      const score = Math.min(98, Math.round(55 + 25 * (1 - route.km / d.maxKm) + buyer.rating * 3))
      const unsure = flags.unsure.length > 0
      return {
        d, buyer, route, goods, score,
        verify: d.verify || unsure,
        sellerSaving: disposalSaving(l),
        buyerSaving: l.unit === 'kg' ? Math.max(0, Math.round(l.quantity * (d.marketRate - l.price))) : 0,
        co2: l.unit === 'kg' ? Math.round(l.quantity * 0.45) : 0,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
}

export const nearbyBuyers = (cat) =>
  farms.filter((f) => f.interests?.includes(cat) && f.km).sort((a, b) => a.km - b.km)

// Settle in cents, preserving the original buyer hold. Never charge for excess weight.
export function settle(goods, transport, declared = 1, picked = declared, delivered = picked) {
  if (![goods, transport, declared, picked, delivered].every(Number.isFinite) || goods < 0 || transport < 0 || declared <= 0 || picked < 0 || delivered < 0 || delivered > picked) throw new Error('Invalid settlement quantities')
  const heldCents = Math.round(goods * 100)
  const quantity = Math.min(declared, picked, delivered)
  const releaseCents = Math.round(heldCents * quantity / declared)
  const feeCents = Math.round(releaseCents * FEE.rate)
  return { fee: feeCents / 100, sellerGets: (releaseCents - feeCents) / 100, transport, buyerPays: heldCents / 100, releasedGoods: releaseCents / 100, buyerRefund: (heldCents - releaseCents) / 100, quantity, releasePercent: quantity / declared * 100 }
}

// Recognition can return written number words instead of digits.
export function parseSpokenListing(text) {
  const numberWords = '(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|and|point)'
  const pattern = new RegExp(`\\b(${numberWords}(?:[ -]+${numberWords})*)\\s+(?=kilograms?\\b|kilos?\\b|kg\\b|tonnes?\\b|tons?\\b|days?\\b|bales?\\b)`, 'gi')
  return parseListing(text.replace(pattern, (whole, words) => {
    const n = numberVoice(words)
    return n === null ? whole : `${n} `
  }).replace(/kilograms?/gi, 'kg'))
}
