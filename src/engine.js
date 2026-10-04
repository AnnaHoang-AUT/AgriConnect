import { categories, demand, farms, routes, FEE } from './data'

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
  const mat = t.match(/\bof\s+([a-z\s-]+?)(?:\s+(?:that|which|needing|need|to be)|[,.]|$)/)
  const cat = /manure|compost|effluent|mulch/.test(t) ? 'organic' : /meat|bone|blood|offal|whey|fish/.test(t) ? 'animal' : 'plant'
  const base = categories[cat].price
  return {
    material: mat ? mat[1].trim() : 'surplus material', cat, quantity, unit,
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
    if (a === 'unsure') flags.unsure.push(q.id)
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

export function settle(goods, transport) {
  const fee = r2(goods * FEE.rate)
  return { fee, sellerGets: r2(goods - fee), transport, buyerPays: goods }
}
