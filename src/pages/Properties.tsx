import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PropertyCard from '../components/PropertyCard'
import { getProperties, getLocalities, Property, Locality } from '../supabase'

export default function Properties() {
  const [sp, setSp] = useSearchParams()
  const [properties, setProperties] = useState<Property[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const filters: Record<string,string> = {}
    sp.forEach((v,k) => { if(v) filters[k]=v })
    Promise.all([getProperties(filters), getLocalities()]).then(([{data,count},locs]) => {
      setProperties(data); setCount(count); setLocalities(locs); setLoading(false)
    })
  }, [sp.toString()])

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(sp)
    value ? next.set(key, value) : next.delete(key)
    setSp(next)
  }

  return (
    <>
      <Navbar />
      <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display font-bold text-xl" style={{color:'#1A2B4A'}}>
            {sp.get('locality') ? `Properties in ${sp.get('locality')}` : 'All properties in Bangalore'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{count.toLocaleString()} listings found</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex gap-8">
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-24 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category</label>
              {[{v:'',l:'All'},{v:'buy',l:'Buy'},{v:'rent',l:'Rent'},{v:'commercial',l:'Commercial'},{v:'pg',l:'PG'}].map(o=>(
                <button key={o.v} onClick={()=>setFilter('category',o.v)}
                  className={`block w-full text-left text-sm py-1.5 px-2 rounded transition-colors ${sp.get('category')===o.v||(!sp.get('category')&&o.v==='')?'font-semibold text-navy':'text-gray-500 hover:text-navy'}`}
                  style={sp.get('category')===o.v||(!sp.get('category')&&o.v==='')?{color:'#1A2B4A'}:{}}>
                  {o.l}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Locality</label>
              <select className="form-select text-sm" value={sp.get('locality')||''} onChange={e=>setFilter('locality',e.target.value)}>
                <option value="">All localities</option>
                {localities.map(l=><option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Max budget</label>
              <select className="form-select text-sm" value={sp.get('max_price')||''} onChange={e=>setFilter('max_price',e.target.value)}>
                <option value="">Any budget</option>
                <option value="4000000">Under ₹40L</option>
                <option value="8000000">Under ₹80L</option>
                <option value="15000000">Under ₹1.5Cr</option>
                <option value="30000000">Under ₹3Cr</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Possession</label>
              <select className="form-select text-sm" value={sp.get('possession')||''} onChange={e=>setFilter('possession',e.target.value)}>
                <option value="">Any</option>
                <option value="ready">Ready to move</option>
                <option value="under-construction">Under construction</option>
              </select>
            </div>
            <button onClick={()=>setSp(new URLSearchParams())} className="w-full border border-gray-200 rounded-lg text-sm text-gray-500 py-2.5 hover:border-gray-400 transition-colors bg-white">
              Clear filters
            </button>
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          {loading
            ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">{[1,2,3,4,5,6].map(i=><div key={i} className="rounded-xl border border-gray-200 h-72 bg-gray-50 animate-pulse"/>)}</div>
            : properties.length > 0
              ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">{properties.map(p=><PropertyCard key={p.id} p={p}/>)}</div>
              : <div className="text-center py-24">
                  <p className="text-4xl mb-2">🏠</p>
                  <p className="font-display font-bold text-lg mb-2" style={{color:'#1A2B4A'}}>No properties found</p>
                  <p className="text-gray-400 text-sm mb-6">Try adjusting your filters</p>
                  <button onClick={()=>setSp(new URLSearchParams())} className="btn-primary" style={{background:'#1A2B4A',color:'white',border:'none',padding:'12px 24px',borderRadius:'8px',cursor:'pointer'}}>View all listings</button>
                </div>
          }
        </div>
      </div>
    </>
  )
}
