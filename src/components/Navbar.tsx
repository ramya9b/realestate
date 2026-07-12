import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav style={{background:'#1A2B4A'}} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-xl text-white">
          Namma<span style={{color:'#C9A84C'}}>Property</span>
        </Link>
        <div className="hidden md:flex gap-6">
          {[['Buy','/properties?category=buy'],['Rent','/properties?category=rent'],['Commercial','/properties?category=commercial'],['New Projects','/properties?possession=under-construction']].map(([l,h])=>(
            <Link key={l} to={h} className="text-white/75 hover:text-yellow-300 text-sm font-medium transition-colors">{l}</Link>
          ))}
        </div>
        <Link to="/post-property" className="hidden md:block font-display font-bold text-sm px-4 py-2 rounded-lg transition-colors" style={{background:'#C9A84C',color:'#0F1B2E'}}>
          Post property free
        </Link>
        <button className="md:hidden text-white p-1" onClick={()=>setOpen(!open)}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            {open?<path d="M6 18L18 6M6 6l12 12"/>:<path d="M4 6h16M4 12h16M4 18h16"/>}
          </svg>
        </button>
      </div>
      {open && (
        <div style={{background:'#0F1B2E'}} className="md:hidden px-4 py-4 flex flex-col gap-3 border-t border-white/10">
          {[['Buy','/properties?category=buy'],['Rent','/properties?category=rent'],['Commercial','/properties?category=commercial']].map(([l,h])=>(
            <Link key={l} to={h} className="text-white/80 text-sm py-2 border-b border-white/10" onClick={()=>setOpen(false)}>{l}</Link>
          ))}
          <Link to="/post-property" className="font-display font-bold text-sm px-4 py-2.5 rounded-lg text-center mt-2" style={{background:'#C9A84C',color:'#0F1B2E'}} onClick={()=>setOpen(false)}>Post property free</Link>
        </div>
      )}
    </nav>
  )
}
