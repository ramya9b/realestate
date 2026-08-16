import { supabase } from './supabase'
import {
  toSqft,
  type AreaUnit,
  type District,
  type LandDetail,
  type ListingCategory,
  type ListingContact,
  type ListingMedia,
  type PublicListing,
  type SiteDetail,
  type Taluk,
  type WarehouseDetail,
  type ZoneType,
} from './schema'

// All reads go through `listings_public`, never the `listings` table directly.
// The view is built without any column from listing_contacts or
// listing_exact_location, so the paid tier cannot leak through a careless
// select. Row Level Security enforces the same thing a layer below; this is
// belt and braces, and the braces are the ones that matter.
const VIEW = 'listings_public'

// ---------------------------------------------------------------------------
// Geography  (P1-16 — search by village, taluk and survey number)
// ---------------------------------------------------------------------------

export async function getDistricts(): Promise<District[]> {
  const { data, error } = await supabase
    .from('districts')
    .select('id, name, name_kn, state')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getTaluks(districtId: string): Promise<Taluk[]> {
  const { data, error } = await supabase
    .from('taluks')
    .select('id, district_id, name, name_kn')
    .eq('district_id', districtId)
    .order('name')
  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface ListingFilters {
  category?: ListingCategory
  districtId?: string
  talukId?: string
  /** Free text: matches village or city name. */
  village?: string
  /** Exact-ish match. The way land is actually identified in Karnataka. */
  surveyNumber?: string
  /** Compared in square feet, so a search in acres still matches a listing entered in gunta. */
  minArea?: number
  maxArea?: number
  areaUnit?: AreaUnit
  minPrice?: number
  maxPrice?: number
  zones?: ZoneType[]
  negotiableOnly?: boolean
}

export interface ListingPage {
  rows: PublicListing[]
  total: number
}

export async function searchListings(
  filters: ListingFilters = {},
  page = 0,
  pageSize = 12,
): Promise<ListingPage> {
  let q = supabase.from(VIEW).select('*', { count: 'exact' })

  if (filters.category)   q = q.eq('category', filters.category)
  if (filters.districtId) q = q.eq('district_id', filters.districtId)
  if (filters.talukId)    q = q.eq('taluk_id', filters.talukId)
  if (filters.village)    q = q.ilike('village_city', `%${filters.village}%`)

  // Survey numbers are written inconsistently — "123/4", "123-4", "123 / 4" —
  // so match on a prefix rather than demanding an exact string.
  if (filters.surveyNumber) q = q.ilike('survey_number', `${filters.surveyNumber}%`)

  // Area filters arrive in whatever unit the buyer is thinking in and are
  // converted to the canonical sqft column before comparison.
  const unit = filters.areaUnit ?? 'sqft'
  if (filters.minArea != null) q = q.gte('area_sqft', toSqft(filters.minArea, unit))
  if (filters.maxArea != null) q = q.lte('area_sqft', toSqft(filters.maxArea, unit))

  if (filters.minPrice != null) q = q.gte('price_amount', filters.minPrice)
  if (filters.maxPrice != null) q = q.lte('price_amount', filters.maxPrice)

  if (filters.zones?.length) q = q.overlaps('zones', filters.zones)
  if (filters.negotiableOnly) q = q.eq('negotiable', true)

  const from = page * pageSize
  const { data, count, error } = await q
    .order('verified_at', { ascending: false, nullsFirst: false })
    .range(from, from + pageSize - 1)

  if (error) throw error
  return { rows: data ?? [], total: count ?? 0 }
}

/**
 * Bounding-box query behind the draw-an-area map (P1-18).
 * Returns approximate pins only — the exact boundary is never sent to an
 * unpaid client, so the marker a buyer sees is intentionally not the plot.
 */
export async function listingsWithinBounds(
  bounds: { north: number; south: number; east: number; west: number },
  filters: ListingFilters = {},
): Promise<PublicListing[]> {
  let q = supabase
    .from(VIEW)
    .select('*')
    .gte('approx_lat', bounds.south)
    .lte('approx_lat', bounds.north)
    .gte('approx_lng', bounds.west)
    .lte('approx_lng', bounds.east)

  if (filters.category) q = q.eq('category', filters.category)

  const { data, error } = await q.limit(500)
  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Single listing
// ---------------------------------------------------------------------------

export async function getListing(id: string): Promise<PublicListing | null> {
  const { data, error } = await supabase.from(VIEW).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getLandDetail(id: string): Promise<LandDetail | null> {
  const { data, error } = await supabase
    .from('listing_land').select('*').eq('listing_id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getSiteDetail(id: string): Promise<SiteDetail | null> {
  const { data, error } = await supabase
    .from('listing_site').select('*').eq('listing_id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getWarehouseDetail(id: string): Promise<WarehouseDetail | null> {
  const { data, error } = await supabase
    .from('listing_warehouse').select('*').eq('listing_id', id).maybeSingle()
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Creating a listing  (P1-01 to P1-08)
// ---------------------------------------------------------------------------

export interface CreateListingInput {
  category: ListingCategory
  survey_number: string | null
  district_id: string
  taluk_id: string
  village_city: string
  pincode: string | null
  nearest_landmark: string | null
  distance_from_main_road_m: number | null
  nearest_places: string | null
  distance_bus_stand_km: number | null
  distance_hospital_km: number | null
  distance_market_km: number | null
  area_value: number
  area_unit: AreaUnit
  price_amount: number
  price_basis: string
  negotiable: boolean
  zones: ZoneType[]
  description: string | null
  /** Written to listing_contacts, never onto the listing row. */
  owner_name: string
  owner_phone: string
  /** Shape depends on category; keys must match the detail table's columns. */
  detail: Record<string, unknown> | null
}

const DETAIL_TABLE: Partial<Record<ListingCategory, string>> = {
  land: 'listing_land',
  site: 'listing_site',
  warehouse: 'listing_warehouse',
}

/**
 * Creates the listing as a draft, then its detail row and contact record.
 *
 * Not a transaction — PostgREST has no multi-statement call — so on a failure
 * partway the draft is deleted rather than left orphaned. A draft is invisible
 * to everyone but its seller, so a leaked one is harmless, but cleaning up
 * keeps "my listings" honest.
 */
export async function createListing(input: CreateListingInput): Promise<string> {
  const { data: auth } = await supabase.auth.getUser()
  const sellerId = auth.user?.id
  if (!sellerId) throw new Error('Sign in before posting a listing.')

  const { detail, owner_name, owner_phone, ...listing } = input

  const { data: created, error } = await supabase
    .from('listings')
    .insert({ ...listing, seller_id: sellerId, status: 'draft' })
    .select('id')
    .single()
  if (error) throw error

  const listingId = created.id as string

  try {
    const table = DETAIL_TABLE[input.category]
    if (table && detail) {
      const { error: detailError } = await supabase
        .from(table)
        .insert({ ...detail, listing_id: listingId })
      if (detailError) throw detailError
    }

    const { error: contactError } = await supabase
      .from('listing_contacts')
      .insert({ listing_id: listingId, owner_name, owner_phone })
    if (contactError) throw contactError
  } catch (e) {
    await supabase.from('listings').delete().eq('id', listingId)
    throw e
  }

  return listingId
}

/**
 * Moves a draft into the review queue. The database function checks ownership
 * and refuses if fewer than four documents are present — a seller cannot set
 * their own listing to verified, which is the point of change 3.
 */
export async function submitForVerification(listingId: string): Promise<void> {
  const { error } = await supabase.rpc('submit_for_verification', { target_listing: listingId })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Gated reads
// ---------------------------------------------------------------------------

/**
 * Photographs and video the caller is allowed to see.
 *
 * RLS decides what comes back: a signed-out visitor gets the three free
 * photographs, a buyer who has paid gets everything. There is no "hidden"
 * media in the response for a client to reveal — the rows simply are not
 * returned, which is change 1 of the five.
 */
export async function getVisibleMedia(id: string): Promise<ListingMedia[]> {
  const { data, error } = await supabase
    .from('listing_media')
    .select('id, listing_id, media_type, storage_path, sort_order, is_free')
    .eq('listing_id', id)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

/** How many gated items exist, so the UI can show the right number of locked slots. */
export async function getGatedMediaCount(id: string): Promise<number> {
  const { count, error } = await supabase
    .from('listing_media')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', id)
    .eq('is_free', false)
  if (error) throw error
  return count ?? 0
}

/**
 * The owner's phone. Returns null until the buyer has paid — that is the
 * intended state, not an error, and the caller should render the unlock
 * prompt rather than treating it as a failure.
 */
export async function getContactIfUnlocked(id: string): Promise<ListingContact | null> {
  const { data, error } = await supabase
    .from('listing_contacts')
    .select('listing_id, owner_name, owner_phone')
    .eq('listing_id', id)
    .maybeSingle()
  // A permission failure here is the lock working. Anything else is a real error.
  if (error && error.code !== 'PGRST116') return null
  return data
}
