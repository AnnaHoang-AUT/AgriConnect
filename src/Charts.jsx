import { useId } from 'react'
const COLORS=['#357447','#8ab798','#d8e8da','#dca970','#a2bdcd','#baa9c7']
const fmt=n=>new Intl.NumberFormat('en-NZ',{maximumFractionDigits:1}).format(n)
function DataTable({data,unit}){return <details className="chart-data"><summary>View chart data</summary><table><thead><tr><th>Label</th><th>Value {unit?`(${unit})`:''}</th></tr></thead><tbody>{data.map((d,i)=><tr key={i}><td>{d.label}</td><td>{fmt(d.value)}</td></tr>)}</tbody></table></details>}
export function BarChart({title,description,data,unit=''}){
  const max=Math.max(1,...data.map(d=>d.value))
  return <section className="hub-card chart-card"><h3>{title}</h3><p className="muted small">{description}</p>{data.length?<div className="bar-chart" role="img" aria-label={`${title}: ${data.map(d=>`${d.label} ${fmt(d.value)} ${unit}`).join('; ')}`}>{data.map((d,i)=><div className="bar-row" key={d.label}><span>{d.label}</span><div className="bar-track"><div style={{width:`${Math.max(0,d.value)/max*100}%`,background:COLORS[i%COLORS.length]}} title={`${d.label}: ${fmt(d.value)} ${unit}`} /></div><strong>{fmt(d.value)}</strong></div>)}</div>:<p className="chart-empty">No activity in this view yet.</p>}<DataTable data={data} unit={unit}/></section>
}
export function LineChart({title,description,data,unit=''}){
  const id=useId(),w=520,h=215,left=48,right=18,top=22,bottom=42
  const min=Math.min(0,...data.map(d=>d.value)),max=Math.max(1,...data.map(d=>d.value)),span=max-min
  const x=i=>left+i*(w-left-right)/Math.max(1,data.length-1),y=v=>top+(max-v)/span*(h-top-bottom)
  const path=data.map((d,i)=>`${i?'L':'M'} ${x(i)} ${y(d.value)}`).join(' ')
  return <section className="hub-card chart-card"><h3>{title}</h3><p className="muted small">{description}</p><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={id} className="line-chart"><title id={id}>{title} ({unit}). {data.map(d=>`${d.label}: ${fmt(d.value)}`).join('; ')}</title>{Array.from({length:4},(_,i)=>{const val=min+span*i/3;return <g key={i}><line x1={left} x2={w-right} y1={y(val)} y2={y(val)} stroke="#e6ece7"/><text x={left-8} y={y(val)+4} textAnchor="end">{fmt(val)}</text></g>})}<path d={path} fill="none" stroke={COLORS[0]} strokeWidth="2.5"/>{data.map((d,i)=><g key={i}><circle cx={x(i)} cy={y(d.value)} r="4" fill={COLORS[0]}><title>{d.label}: {fmt(d.value)} {unit}</title></circle><text x={x(i)} y={h-14} textAnchor="middle">{d.label}</text></g>)}</svg><DataTable data={data} unit={unit}/></section>
}
export function DonutChart({title,description,data}){
  const total=data.reduce((s,d)=>s+d.value,0),radius=52,circ=2*Math.PI*radius
  return <section className="hub-card chart-card"><h3>{title}</h3><p className="muted small">{description}</p><div className="donut-layout"><svg viewBox="0 0 150 150" role="img" aria-label={`${title}: ${data.map(d=>`${d.label} ${d.value}`).join('; ')}`}><circle cx="75" cy="75" r={radius} fill="none" stroke="#eef2ee" strokeWidth="18"/>{data.map((d,i)=>{const length=total?d.value/total*circ:0,offset=data.slice(0,i).reduce((sum,d)=>sum+(total?d.value/total*circ:0),0);return <circle key={i} cx="75" cy="75" r={radius} fill="none" stroke={COLORS[i%COLORS.length]} strokeWidth="18" strokeDasharray={`${length} ${circ-length}`} strokeDashoffset={-offset} transform="rotate(-90 75 75)"><title>{d.label}: {d.value}</title></circle>})}<text x="75" y="73" textAnchor="middle" className="donut-total">{total}</text><text x="75" y="93" textAnchor="middle">listings</text></svg><ul className="chart-legend">{data.map((d,i)=><li key={i}><span style={{background:COLORS[i%COLORS.length]}}/>{d.label}<strong>{d.value}</strong></li>)}</ul></div><DataTable data={data}/></section>
}
