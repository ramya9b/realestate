import { Link } from 'react-router-dom'
import { Property, formatPrice } from '../supabase'

const COLORS = ['#2C4170','#1E5C4A','#4A3B1E','#2B3B5C','#3B1E4A','#1E4A3B']

export default function PropertyCard({ p }: { p: Property }) {
  const color = COLORS[p.id.charCodeAt(0) % COLORS.length]
  const badgeColor = p.category === 'rent' ? '#0F6E56' : p.category === 'commercial' ? '#92400e' : '#1A2B4A'
  const badgeLabel = p.category === 'rent' ? 'For rent' : p.category === 'commercial' ? 'Commercial' : 'For sale'

  return (
    <Link to={`/property/${p.id}`} className="property-card block">
      <div className="relative h-44 overflow-hidden" style={{background: p.images?.[0] ? undefined : color}}>
        {p.images?.[0]
          ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center opacity-20">
              <svg width="56" height="56" viewBox="0 0 64 64" fill="white"><path d="M32 8L8 28H16V56H28V40H36V56H48V28H56L32 8Z"/></svg>
            </div>
        }
        <span className="absolute top-2.5 left-2.5 text-xs font-bold px-2.5 py-1 rounded-md text-white" style={{background:badgeColor}}>{badgeLabel}</span>
        {p.is_rera && <span className="absolute bottom-2.5 left-2.5 bg-white/90 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">RERA ✓</span>}
      </div>
      <div className="p-4">
        <div className="font-display font-bold text-lg" style={{color:'#1A2B4A'}}>{formatPrice(p.price, p.price_unit)}</div>
        <div className="text-sm text-gray-700 mt-1 line-clamp-2">{p.title}</div>
        <div className="text-xs text-gray-500 mt-1.5">📍 {p.locality_name}</div>
        <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          {p.bhk && <span><b className="text-navy font-semibold">{p.bhk} BHK</b></span>}
          {p.area_sqft && <span><b className="font-semibold" style={{color:'#1A2B4A'}}>{p.area_sqft.toLocaleString()}</b> sqft</span>}
          {p.floor_number != null && p.total_floors && <span>Floor <b className="font-semibold" style={{color:'#1A2B4A'}}>{p.floor_number}/{p.total_floors}</b></span>}
        </div>
      </div>
    </Link>
  )
}
