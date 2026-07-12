import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getPropertyById, formatPrice, Property } from '../supabase'

export default function PropertyDetail() {
  const { id } = useParams<{id:string}>()
  const [p, setP] = useState<Property|null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if(id) getPropertyById(id).then(data=>{setP(data);setLoading(false)})
  },[id])

  if(loading) return <><Navbar/><div className="max-w-7xl mx-auto px-4 py-16"><div className="animate-pulse space-y-4"><div className="h-96 bg-gray-100 rounded-2xl"/><div className="h-8 bg-gray-100 rounded w-2/3"/></div></div></>
  if(!p) return <><Navbar/><div className="text-center py-24"><p className="text-4xl mb-4">🏠</p><p className="font-display font-bold text-xl mb-4" style={{color:'#1A2B4A'}}>Property not found</p><Link to="/properties" className="btn-primary" style={{background:'#1A2B4A',color:'white',padding:'12px 24px',borderRadius:'8px',textDecoration:'none'}}>Browse listings</Link></div></>

  const emi = Math.round((p.price*0.8*(8.5/1200)*Math.pow(1+8.5/1200,240))/(Math.pow(1+8.5/1200,240)-1))

  return (
    <>
      <Navbar/>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 text-xs text-gray-400 flex gap-2 flex-wrap">
        <Link to="/" className="hover:text-navy" style={{}}>Home</Link> /
        <Link to="/properties" className="hover:text-navy">Properties</Link> /
        <span className="font-medium truncate" style={{color:'#1A2B4A'}}>{p.title}</span>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl overflow-hidden h-72 sm:h-96 flex items-center justify-center relative" style={{background:'#2C4170'}}>
            <svg width="80" height="80" viewBox="0 0 64 64" fill="white" className="opacity-20"><path d="M32 8L8 28H16V56H28V40H36V56H48V28H56L32 8Z"/></svg>
            {p.is_rera && <span className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">RERA ✓</span>}
          </div>
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display font-bold text-2xl leading-tight" style={{color:'#1A2B4A'}}>{p.title}</h1>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-2xl" style={{color:'#1A2B4A'}}>{formatPrice(p.price,p.price_unit)}</div>
                {p.area_sqft&&p.category==='buy'&&<div className="text-sm text-gray-400">₹{Math.round(p.price/p.area_sqft).toLocaleString()}/sqft</div>}
              </div>
            </div>
            <div className="text-gray-500 text-sm mt-2">📍 {p.locality_name}, {p.city}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {label:'BHK',value:p.bhk?`${p.bhk} BHK`:'—'},
              {label:'Area',value:p.area_sqft?`${p.area_sqft.toLocaleString()} sqft`:'—'},
              {label:'Floor',value:p.floor_number!=null&&p.total_floors?`${p.floor_number}/${p.total_floors}`:'—'},
              {label:'Facing',value:p.facing??'—'},
              {label:'Furnishing',value:p.furnishing??'—'},
              {label:'Possession',value:p.possession==='ready'?'Ready to move':'Under construction'},
              {label:'Posted by',value:p.posted_by??'—'},
              {label:'Type',value:p.property_type},
            ].map(s=>(
              <div key={s.label} className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{s.label}</div>
                <div className="text-sm font-semibold capitalize" style={{color:'#1A2B4A'}}>{s.value}</div>
              </div>
            ))}
          </div>
          {p.description&&<div><h2 className="font-display font-bold text-lg mb-3" style={{color:'#1A2B4A'}}>About this property</h2><p className="text-gray-600 text-sm leading-relaxed">{p.description}</p></div>}
          {p.amenities.length>0&&<div><h2 className="font-display font-bold text-lg mb-3" style={{color:'#1A2B4A'}}>Amenities</h2><div className="flex flex-wrap gap-2">{p.amenities.map(a=><span key={a} className="text-xs font-semibold px-3 py-1.5 rounded-full border" style={{background:'#FBF6EC',borderColor:'#E8C97A',color:'#1A2B4A'}}>{a}</span>)}</div></div>}
          <div className="rounded-2xl p-6 text-white" style={{background:'#0F1B2E'}}>
            <h2 className="font-display font-bold text-lg mb-1">EMI calculator</h2>
            <p className="text-white/50 text-sm mb-5">Estimated monthly home loan EMI</p>
            <div className="grid grid-cols-3 gap-4">
              {[{l:'Loan (80%)',v:formatPrice(Math.round(p.price*0.8))},{l:'Interest',v:'8.5% p.a.'},{l:'EMI (20yr)',v:formatPrice(emi)+'/mo'}].map(item=>(
                <div key={item.l} className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.1)'}}>
                  <div className="text-xs text-white/50 mb-1">{item.l}</div>
                  <div className="font-display font-bold" style={{color:'#C9A84C'}}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-display font-bold text-lg mb-1" style={{color:'#1A2B4A'}}>Enquire about this property</h3>
              <p className="text-gray-400 text-xs mb-5">Get details or schedule a visit</p>
              <div className="space-y-3">
                <input type="text" placeholder="Your name" className="form-input"/>
                <input type="tel" placeholder="Mobile number" className="form-input"/>
                <input type="email" placeholder="Email (optional)" className="form-input"/>
                <textarea placeholder="I am interested in this property..." rows={3} className="form-input resize-none"/>
                <button className="w-full text-white font-display font-bold py-3 rounded-lg transition-colors" style={{background:'#1A2B4A',border:'none',cursor:'pointer'}}>Send enquiry</button>
              </div>
              {p.contact_phone&&(
                <a href={`https://wa.me/91${p.contact_phone}?text=Hi, I am interested in "${p.title}" on NammaProperty.`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 border-2 border-emerald-500 text-emerald-700 font-display font-bold text-sm rounded-xl py-3 hover:bg-emerald-50 transition-colors w-full" style={{textDecoration:'none'}}>
                  💬 WhatsApp the owner
                </a>
              )}
            </div>
            {p.is_rera&&<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800"><span className="font-bold">✓ RERA registered</span><span className="block mt-1 text-emerald-600">Verify at rera.karnataka.gov.in</span></div>}
            <Link to="/properties" className="block text-center text-sm text-gray-400 hover:text-navy transition-colors py-2" style={{textDecoration:'none'}}>← Back to listings</Link>
          </div>
        </div>
      </div>
    </>
  )
}
