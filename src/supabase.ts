import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dyicvdbwyjxskyelsmtw.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_sDwyFx-oKfVg1s5BwalXQg_sYg346j9'

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Property {
  id: string; title: string; category: string; property_type: string;
  price: number; price_unit: string; area_sqft: number; bhk: number | null;
  floor_number: number | null; total_floors: number | null; facing: string | null;
  furnishing: string | null; possession: string | null; locality_name: string;
  city: string; images: string[]; amenities: string[]; description: string | null;
  posted_by: string | null; contact_name: string | null; contact_phone: string | null;
  is_rera: boolean; is_bda: boolean; is_featured: boolean; created_at: string;
}

export interface Locality {
  id: string; name: string; slug: string; zone: string;
  avg_price_sqft: number | null; nearby_metro: string | null;
  metro_line: string | null; listing_count: number;
}

export function formatPrice(price: number, unit = ''): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr ${unit}`.trim()
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)} L ${unit}`.trim()
  return `₹${price.toLocaleString('en-IN')} ${unit}`.trim()
}

export async function getFeaturedProperties(): Promise<Property[]> {
  const { data } = await supabase.from('properties').select('*')
    .eq('is_featured', true).eq('is_active', true)
    .order('created_at', { ascending: false }).limit(6)
  return data ?? []
}

export async function getProperties(filters: Record<string, string> = {}): Promise<{ data: Property[], count: number }> {
  let query = supabase.from('properties').select('*', { count: 'exact' }).eq('is_active', true)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.locality) query = query.ilike('locality_name', `%${filters.locality}%`)
  if (filters.bhk) query = query.eq('bhk', parseInt(filters.bhk))
  if (filters.max_price) query = query.lte('price', parseInt(filters.max_price))
  if (filters.possession) query = query.eq('possession', filters.possession)
  const { data, count } = await query.order('created_at', { ascending: false }).limit(12)
  return { data: data ?? [], count: count ?? 0 }
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const { data } = await supabase.from('properties').select('*').eq('id', id).single()
  return data
}

export async function getLocalities(): Promise<Locality[]> {
  const { data } = await supabase.from('localities').select('*').order('name')
  return data ?? []
}
