import test from 'node:test'
import assert from 'node:assert/strict'
import { settle, parseListing, evaluate } from '../src/engine.js'
test('400kg agreed, 350kg picked up, 320kg delivered: release 80%, conserve held funds', () => {
  const s = settle(60, 52, 400, 350, 320)
  assert.equal(s.releasePercent, 80)
  assert.equal(s.releasedGoods, 48)
  assert.equal(s.buyerRefund, 12)
  assert.equal(s.fee, 0.96)
  assert.equal(s.sellerGets, 47.04)
  assert.equal(s.transport, 52)
  assert.equal(s.sellerGets + s.fee + s.buyerRefund, 60)
})
test('full delivery, zero delivery, fractional weights, and excess cap', () => {
  assert.equal(settle(60, 52, 400, 400, 400).buyerRefund, 0)
  assert.equal(settle(60, 52, 400, 0, 0).buyerRefund, 60)
  const fraction = settle(10.01, 31, 3, 2.7, 2.2)
  assert.equal(Math.round((fraction.sellerGets + fraction.fee + fraction.buyerRefund) * 100), 1001)
  assert.equal(settle(60, 52, 400, 450, 450).releasedGoods, 60)
})
test('invalid quantities are rejected', () => {
  for (const args of [[60,52,400,300,350], [60,52,400,-1,0], [60,52,0,0,0], [NaN,52,400,400,400]]) assert.throws(() => settle(...args))
})
test('parse apples without of; unsure movement controls holds listing', () => {
  assert.equal(parseListing('400kg apples').material, 'apples')
  assert.equal(parseListing('400kg apples').cat, 'plant')
  assert.equal(evaluate({cat: 'plant'}, {move:'unsure'}).hold, true)
})

test('named bananas stay specific and missing descriptions use category-specific fallbacks', () => {
  assert.equal(parseListing('banana').material, 'banana')
  assert.equal(parseListing('I have overripe bananas').material, 'overripe bananas')
  for (const [description,expected] of [
    ['plant waste','surplus plant material'],['animal product','surplus animal product'],
    ['wood','surplus untreated wood material'],['wool','surplus wool material'],
    ['eggshell','surplus eggshell material'],['organic compost','surplus organic material']
  ]) assert.equal(parseListing(description).material, expected)
})
