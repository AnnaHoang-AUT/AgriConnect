import { useState, useCallback } from 'react'
import { emptyPortfolio } from './portfolio'
const KEY='agrireuse_portfolios_v1'
export function usePortfolio(email){
  const [accounts,setAccounts]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}})
  const [storageError,setStorageError]=useState('')
  const portfolio=email?(accounts[email]||emptyPortfolio()):emptyPortfolio()
  const update=useCallback(fn=>{
    if(!email)return
    setAccounts(all=>{
      const next={...all,[email]:fn(all[email]||emptyPortfolio())}
      try{localStorage.setItem(KEY,JSON.stringify(next))}catch{queueMicrotask(()=>setStorageError('Browser storage is unavailable or full. Changes work in this session but may not survive a reload.'))}
      return next
    })
  },[email])
  return {portfolio,update,storageError}
}
