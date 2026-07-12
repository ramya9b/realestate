import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PropertyCard from '../components/PropertyCard'
import { getFeaturedProperties, getLocalities, Property, Locality } from '../supabase'

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [locality, setLocality] = useState('')
  const [budget, setBudget] = useState('')
  const [bhk, setBhk] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getFeaturedProperties().then(setProperties)
    getLocalities().then(setLocalities)
  }, [])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (locality) params.set('locality', locality)
    if (budget) params.set('max_price', budget)
    if (bhk) params.set('bhk', bhk)
    navigate(`/properties?${params}`)
  }

  return (
    <>
      <Navbar />
      {/* HERO */}
      <section style={{background:'#0F1B2E'}} className="relative overflow-hidden">
        <svg className="absolute bottom-0 left-0 right-0 w-full opacity-[0.07]" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path fill="white" d="M0,120 L0,90 L40,90 L40,70 L60,70 L60,55 L70,55 L70,40 L80,40 L80,55 L90,55 L90,45 L100,45 L100,50 L110,50 L110,30 L115,30 L115,20 L120,20 L120,30 L125,30 L125,50 L140,50 L140,60 L160,60 L160,40 L170,40 L170,60 L200,60 L200,70 L220,70 L220,55 L235,55 L235,70 L250,70 L280,70 L280,50 L295,50 L295,25 L300,25 L300,50 L320,50 L320,60 L340,60 L340,75 L380,75 L380,60 L395,60 L395,35 L400,35 L400,60 L420,60 L420,65 L440,65 L440,80 L480,80 L480,65 L495,65 L495,40 L500,40 L500,65 L520,65 L520,70 L540,70 L555,55 L560,55 L560,70 L580,70 L600,80 L640,80 L660,65 L670,50 L675,28 L680,28 L680,50 L700,65 L720,75 L760,75 L780,60 L785,38 L790,38 L790,60 L820,60 L820,70 L840,80 L880,80 L900,65 L910,40 L920,40 L920,65 L960,75 L1000,75 L1020,60 L1025,35 L1030,35 L1030,60 L1060,70 L1080,80 L1100,65 L1130,65 L1160,75 L1200,60 L1225,35 L1230,35 L1230,60 L1260,70 L1280,80 L1320,65 L1340,75 L1380,85 L1440,85 L1440,120 Z"/>
        </svg>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-16 pb-20 relative z-10">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{color:'#C9A84C'}}>Namma Bengaluru's Property Platform</p>
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-white leading-tight mb-4">
            Find your perfect home<br/>in <span style={{color:'#C9A84C'}}>Bangalore</span>
          </h1>
          <p className="text-white/60 text-base sm:text-lg mb-10 leading-relaxed">
            RERA-registered listings from verified owners, builders & agents. 1,24,000+ properties across all zones.
          </p>
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xl">
            <div className="flex gap-2 mb-5 flex-wrap">
              {['Buy','Rent','Commercial','PG'].map((tab,i) => (
                <Link key={tab} to={`/properties?category=${tab.toLowerCase()}`}
                  className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-colors ${i===0?'text-white':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  style={i===0?{background:'#1A2B4A'}:{}}>
                  {tab}
                </Link>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Locality</label>
                <select className="form-select" value={locality} onChange={e=>setLocality(e.target.value)}>
                  <option value="">Select locality</option>
                  {localities.map(l=><option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Budget</label>
                <select className="form-select" value={budget} onChange={e=>setBudget(e.target.value)}>
                  <option value="">Any</option>
                  <option value="4000000">Under ₹40L</option>
                  <option value="8000000">Under ₹80L</option>
                  <option value="15000000">Under ₹1.5Cr</option>
                  <option value="30000000">Under ₹3Cr</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">BHK</label>
                <select className="form-select" value={bhk} onChange={e=>setBhk(e.target.value)}>
                  <option value="">Any</option>
                  <option value="1">1 BHK</option>
                  <option value="2">2 BHK</option>
                  <option value="3">3 BHK</option>
                  <option value="4">4 BHK+</option>
                </select>
              </div>
              <button onClick={handleSearch} className="btn-primary flex items-center gap-2 justify-center whitespace-nowrap" style={{background:'#1A2B4A'}}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div style={{background:'#1A2B4A'}}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10">
          {[{num:'1,24,000+',label:'Active listings'},{num:'58+',label:'Localities covered'},{num:'12,400+',label:'Happy customers'},{num:'100%',label:'RERA verified'}].map(s=>(
            <div key={s.label} className="flex flex-col items-center py-5 px-4">
              <span className="font-display font-bold text-2xl" style={{color:'#C9A84C'}}>{s.num}</span>
              <span className="text-white/50 text-xs mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURED */}
      <section className="py-14 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display font-bold text-2xl" style={{color:'#1A2B4A'}}>Featured properties</h2>
          <Link to="/properties" className="text-sm font-semibold hover:underline" style={{color:'#C9A84C'}}>View all →</Link>
        </div>
        {properties.length > 0
          ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{properties.map(p=><PropertyCard key={p.id} p={p}/>)}</div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{[1,2,3].map(i=><div key={i} className="rounded-xl border border-gray-200 h-72 bg-gray-50 animate-pulse"/>)}</div>
        }
      </section>

      {/* LOCALITIES */}
      <section className="py-14 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display font-bold text-2xl" style={{color:'#1A2B4A'}}>Popular localities</h2>
            <Link to="/properties" className="text-sm font-semibold hover:underline" style={{color:'#C9A84C'}}>Explore all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {localities.slice(0,8).map(loc=>(
              <Link key={loc.id} to={`/properties?locality=${encodeURIComponent(loc.name)}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-all group relative overflow-hidden" style={{}}>
                <div className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl" style={{background:'#C9A84C'}}/>
                <div className="font-display font-bold text-base mb-1" style={{color:'#1A2B4A'}}>{loc.name}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">{loc.zone} Bangalore</div>
                {loc.avg_price_sqft && <div className="text-sm text-gray-600">Avg. <span className="font-semibold" style={{color:'#1A2B4A'}}>₹{loc.avg_price_sqft.toLocaleString()}/sqft</span></div>}
                {loc.nearby_metro && <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium mt-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"/>{loc.nearby_metro}</div>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center gap-8 justify-between border-2" style={{background:'#FBF6EC',borderColor:'#E8C97A'}}>
          <div>
            <h2 className="font-display font-bold text-2xl mb-3" style={{color:'#1A2B4A'}}>Sell or rent your property — free</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-md">List directly with verified buyers and renters. No middlemen, no hidden charges. RERA listings get priority.</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link to="/post-property" className="btn-primary text-center whitespace-nowrap" style={{background:'#1A2B4A',color:'white',textDecoration:'none',padding:'12px 24px',borderRadius:'8px',fontFamily:'DM Sans',fontWeight:700}}>Post property free</Link>
            <span className="text-xs text-center text-gray-400">Takes under 5 minutes</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:'#1A2B4A'}} className="px-4 sm:px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-display font-bold text-lg text-white">Namma<span style={{color:'#C9A84C'}}>Property</span></span>
        <span className="text-white/30 text-xs">© 2026 NammaProperty · Bengaluru, Karnataka</span>
        <div className="flex gap-5">
          {['About','Privacy','Terms','Contact'].map(l=>(
            <a key={l} href="#" className="text-white/40 hover:text-white/70 text-xs transition-colors">{l}</a>
          ))}
        </div>
      </footer>
    </>
  )
}
