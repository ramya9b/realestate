import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { supabase } from '../supabase'

const STEPS = ['Property type','Location','Details','Contact']
const LOCALITIES = ['Whitefield','Sarjapur Road','Koramangala','Electronic City','KR Puram','Hebbal','Yelahanka','Indiranagar','Marathahalli','HSR Layout','Bannerghatta Road','Hennur','Kanakapura Road','Bellandur','Rajajinagar']

export default function PostProperty() {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({category:'buy',property_type:'apartment',locality_name:'',bhk:'',area_sqft:'',floor_number:'',total_floors:'',price:'',furnishing:'unfurnished',possession:'ready',facing:'',amenities:'',description:'',contact_name:'',contact_phone:'',posted_by:'owner',is_rera:false,rera_number:''})
  const set = (k:string,v:string|boolean) => setForm(f=>({...f,[k]:v}))

  const submit = async () => {
    setLoading(true)
    const payload = {...form,bhk:form.bhk?parseInt(form.bhk):null,area_sqft:form.area_sqft?parseInt(form.area_sqft):null,floor_number:form.floor_number?parseInt(form.floor_number):null,total_floors:form.total_floors?parseInt(form.total_floors):null,price:form.price?parseInt(form.price):0,amenities:form.amenities?form.amenities.split(',').map(a=>a.trim()).filter(Boolean):[],is_active:true,is_featured:false}
    const {error} = await supabase.from('properties').insert([payload])
    if(!error) setSubmitted(true)
    setLoading(false)
  }

  if(submitted) return (
    <><Navbar/>
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="font-display font-bold text-2xl mb-2" style={{color:'#1A2B4A'}}>Property listed successfully!</h1>
        <p className="text-gray-500 text-sm mb-6">Your property will be reviewed and made live within 24 hours. We'll contact you on {form.contact_phone}.</p>
        <Link to="/" style={{background:'#1A2B4A',color:'white',padding:'12px 24px',borderRadius:'8px',textDecoration:'none',fontFamily:'DM Sans',fontWeight:700}}>Back to home</Link>
      </div>
    </div></>
  )

  return (
    <><Navbar/>
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="font-display font-bold text-2xl text-center mb-2" style={{color:'#1A2B4A'}}>Post your property</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Free listing — verified by our team within 24 hours</p>
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((label,i)=>(
            <div key={label} className="flex-1 flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors text-white`}
                  style={{background:i<step?'#059669':i===step?'#1A2B4A':'#D1D5DB',color:i<step||i===step?'white':'#6B7280'}}>
                  {i<step?'✓':i+1}
                </div>
                <span className="text-xs whitespace-nowrap" style={{color:i===step?'#1A2B4A':'#9CA3AF',fontWeight:i===step?600:400}}>{label}</span>
              </div>
              {i<STEPS.length-1&&<div className="flex-1 h-0.5 mx-2 mb-4" style={{background:i<step?'#059669':'#E5E7EB'}}/>}
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-5">
          {step===0&&<>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">I want to</label>
              <div className="grid grid-cols-2 gap-3">
                {[{v:'buy',l:'Sell my property'},{v:'rent',l:'Rent out my property'},{v:'commercial',l:'Commercial space'},{v:'pg',l:'PG / Co-living'}].map(o=>(
                  <button key={o.v} onClick={()=>set('category',o.v)} className="px-4 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all" style={{borderColor:form.category===o.v?'#1A2B4A':'#E5E7EB',background:form.category===o.v?'#1A2B4A':'white',color:form.category===o.v?'white':'#6B7280'}}>{o.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Property type</label>
              <div className="grid grid-cols-3 gap-2">
                {['apartment','villa','plot','house','office','pg'].map(t=>(
                  <button key={t} onClick={()=>set('property_type',t)} className="px-3 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all" style={{borderColor:form.property_type===t?'#1A2B4A':'#E5E7EB',background:form.property_type===t?'#1A2B4A':'white',color:form.property_type===t?'white':'#6B7280'}}>{t}</button>
                ))}
              </div>
            </div>
          </>}
          {step===1&&<>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Locality *</label>
              <select value={form.locality_name} onChange={e=>set('locality_name',e.target.value)} className="form-select" required>
                <option value="">Select locality</option>
                {LOCALITIES.map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Area / Society name</label>
              <input type="text" placeholder="e.g. Prestige Lake Ridge" className="form-input"/>
            </div>
          </>}
          {step===2&&<>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">BHK</label>
                <select value={form.bhk} onChange={e=>set('bhk',e.target.value)} className="form-select"><option value="">Select</option>{['1','2','3','4','5'].map(b=><option key={b} value={b}>{b} BHK</option>)}</select></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Area (sqft)</label>
                <input type="number" value={form.area_sqft} onChange={e=>set('area_sqft',e.target.value)} placeholder="e.g. 1200" className="form-input"/></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Floor no.</label>
                <input type="number" value={form.floor_number} onChange={e=>set('floor_number',e.target.value)} placeholder="e.g. 5" className="form-input"/></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Total floors</label>
                <input type="number" value={form.total_floors} onChange={e=>set('total_floors',e.target.value)} placeholder="e.g. 12" className="form-input"/></div>
            </div>
            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{form.category==='rent'?'Monthly rent (₹)':'Expected price (₹)'}</label>
              <input type="number" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="e.g. 6500000" className="form-input"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Furnishing</label>
                <select value={form.furnishing} onChange={e=>set('furnishing',e.target.value)} className="form-select"><option value="unfurnished">Unfurnished</option><option value="semi-furnished">Semi-furnished</option><option value="furnished">Furnished</option></select></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Possession</label>
                <select value={form.possession} onChange={e=>set('possession',e.target.value)} className="form-select"><option value="ready">Ready to move</option><option value="under-construction">Under construction</option></select></div>
            </div>
            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Amenities (comma-separated)</label>
              <input type="text" value={form.amenities} onChange={e=>set('amenities',e.target.value)} placeholder="Gym, Swimming Pool, Parking" className="form-input"/></div>
            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
              <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={3} placeholder="Describe the property..." className="form-input resize-none"/></div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="rera" checked={form.is_rera} onChange={e=>set('is_rera',e.target.checked)} className="w-4 h-4"/>
              <label htmlFor="rera" className="text-sm text-gray-600">This property is RERA registered</label>
            </div>
            {form.is_rera&&<input type="text" value={form.rera_number} onChange={e=>set('rera_number',e.target.value)} placeholder="RERA registration number" className="form-input"/>}
          </>}
          {step===3&&<>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">You are a</label>
              <div className="flex gap-3">
                {['owner','builder','agent'].map(r=>(
                  <button key={r} onClick={()=>set('posted_by',r)} className="flex-1 px-4 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all" style={{borderColor:form.posted_by===r?'#1A2B4A':'#E5E7EB',background:form.posted_by===r?'#1A2B4A':'white',color:form.posted_by===r?'white':'#6B7280'}}>{r}</button>
                ))}
              </div>
            </div>
            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Your name *</label>
              <input type="text" value={form.contact_name} onChange={e=>set('contact_name',e.target.value)} placeholder="Full name" className="form-input" required/></div>
            <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Mobile number *</label>
              <input type="tel" value={form.contact_phone} onChange={e=>set('contact_phone',e.target.value)} placeholder="10-digit mobile number" className="form-input" required/></div>
            <div className="rounded-xl p-4 text-sm" style={{background:'#FBF6EC',border:'1.5px solid #E8C97A',color:'#1A2B4A'}}>
              ✓ Your number will only be shared with serious buyers/renters.<br/>
              ✓ Listing goes live after team verification (within 24hr).
            </div>
          </>}
          <div className="flex gap-3 pt-2">
            {step>0&&<button onClick={()=>setStep(s=>s-1)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 font-semibold text-sm hover:border-gray-400 transition-colors bg-white">← Back</button>}
            {step<STEPS.length-1
              ? <button onClick={()=>setStep(s=>s+1)} className="flex-1 text-white font-display font-bold py-3 rounded-xl transition-colors" style={{background:'#1A2B4A',border:'none',cursor:'pointer'}}>Next →</button>
              : <button onClick={submit} disabled={loading||!form.contact_name||!form.contact_phone} className="flex-1 text-white font-display font-bold py-3 rounded-xl transition-colors disabled:opacity-50" style={{background:'#1A2B4A',border:'none',cursor:'pointer'}}>{loading?'Submitting...':'Submit listing'}</button>
            }
          </div>
        </div>
      </div>
    </div></>
  )
}
