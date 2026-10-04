import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyPortfolio, matching, approveAlerts, alertRecipients, metrics, weeksFor, impactFor, visibleListings } from '../src/portfolio.js'
import { settle } from '../src/engine.js'
const supply={id:'mine',type:'Supply',owner:'seller',business:'Farm',material:'Apples',cat:'plant',unit:'kg',quantity:400,price:.15,location:'Northland',status:'Live',from:'2026-10-04',until:'2026-10-11',flags:{hold:false,nofeed:false,unsure:[]}}
test('matches enforce full quantity, price, dates, distance, category and feed restrictions',()=>{
 const p=emptyPortfolio(),m=matching(supply,p);assert.ok(m.some(x=>x.d.id==='d1'));assert.ok(m.some(x=>x.d.id==='d2'))
 assert.ok(!matching({...supply,flags:{...supply.flags,nofeed:true}},p).some(x=>x.d.use==='feed'))
 assert.equal(matching({...supply,flags:{hold:true}},p).length,0)
 assert.equal(matching({...supply,unit:'m³'},p).length,0)
 assert.equal(matching({...supply,price:999},p).length,0)
 assert.equal(matching({...supply,from:'2030-01-01',until:'2030-01-05'},p).length,0)
})
test('alerts require explicit approval; decline sends nothing, later approval is idempotent',()=>{
 let p={...emptyPortfolio(),listings:[{...supply,unit:'m³'}]};const l=p.listings[0]
 assert.ok(alertRecipients(l,p).length>0);assert.equal(p.notifications.length,0)
 p=approveAlerts(p,l,'decline');assert.equal(p.notifications.length,0);assert.equal(p.listings[0].alertChoice,'declined')
 p=approveAlerts(p,l,'send');assert.equal(p.notifications.length,1);assert.equal(p.listings[0].alertChoice,'sent')
 assert.equal(approveAlerts(p,l,'send').notifications.length,1)
 const held={...emptyPortfolio(),listings:[{...supply,flags:{hold:true}}]};assert.equal(approveAlerts(held,supply,'send').notifications.length,0)
})
test('completed actual delivery counts once, pending and cancelled trades do not count',()=>{
 const done={id:'t',listingId:supply.id,status:'Completed',listing:supply,quantity:320,km:34,settlement:settle(60,52,400,350,320),completedAt:'2026-10-04T12:00:00Z'}
 const p={...emptyPortfolio(),listings:[supply],transactions:[done,{...done,id:'pending',status:'Dispatched'},{...done,id:'cancelled',status:'Cancelled'}]}
 const m=metrics(p.listings,p.transactions);assert.equal(m.kg,320);assert.equal(m.value,48);assert.equal(m.sales,47.04);assert.equal(m.done.length,1);assert.equal(m.open.length,1)
 assert.equal(visibleListings(p).find(l=>l.id===supply.id).status,'Completed');assert.equal(matching(supply,p).length,0)
 const w=weeksFor(p.transactions,new Date('2026-10-04T12:00:00Z'));assert.equal(w.reduce((a,x)=>a+x.kg,0),320)
})
test('impact excludes unweighed volume and preserves negative transport scenarios',()=>{
 assert.equal(impactFor(10,34,'m³').excluded,true);assert.equal(impactFor(10,34,'m³').kg,0)
 assert.ok(impactFor(1,100,'kg').co2<0)
})
