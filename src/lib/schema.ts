// Types mirroring supabase/migrations/001_multi_category_listings.sql.
//
// Hand-written rather than generated, because the migration has not been
// applied yet. Once it has, `supabase gen types typescript` should replace
// this file wholesale.
//
// Section letters in comments refer to the field confirmation checklist.

// ---------------------------------------------------------------------------
// Enums — these mirror Postgres types, so the string values must match exactly
// ---------------------------------------------------------------------------

export const LISTING_CATEGORIES = ['land', 'site', 'warehouse', 'rent', 'shop'] as const
export type ListingCategory = (typeof LISTING_CATEGORIES)[number]

export const LISTING_STATUSES = [
  'draft', 'pending_verification', 'verified', 'rejected', 'blocked', 'sold',
] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const AREA_UNITS = ['sqft', 'sq_yard', 'cent', 'gunta', 'acre'] as const
export type AreaUnit = (typeof AREA_UNITS)[number]

export const PRICE_BASES = ['total', 'per_sqft', 'per_gunta', 'per_acre', 'per_month'] as const
export type PriceBasis = (typeof PRICE_BASES)[number]

export const ZONE_TYPES = [
  'residential', 'commercial', 'industrial', 'public_semi_public',
  'green', 'yellow', 'blue', 'grey',
] as const
export type ZoneType = (typeof ZONE_TYPES)[number]

export const WATER_SOURCES = ['borewell', 'municipal', 'both', 'none'] as const
export type WaterSource = (typeof WATER_SOURCES)[number]

export const LAND_TYPES = ['green_land', 'dry_land', 'conversion_property'] as const
export type LandType = (typeof LAND_TYPES)[number]

export const APPROVING_AUTHORITIES = ['bda', 'bmrda', 'dtcp', 'panchayat', 'rera'] as const
export type ApprovingAuthority = (typeof APPROVING_AUTHORITIES)[number]

export const LAYOUT_AMENITIES = ['park', 'club_house', 'gym', 'swimming_pool', 'play_ground'] as const
export type LayoutAmenity = (typeof LAYOUT_AMENITIES)[number]

export const DOCUMENT_TYPES = ['ec', 'rtc', 'khata', 'mutation'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const DOCUMENT_STATUSES = ['pending', 'approved', 'rejected'] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

export type MediaType = 'photo' | 'video'
export type UnlockScope = 'photos' | 'video' | 'contact' | 'combo'
export type UserRole = 'admin' | 'verifier' | 'agent' | 'seller' | 'buyer'

// Confirmed values, enforced by check constraints in the migration.
export const SITE_ROAD_WIDTHS_FT = [30, 40, 60, 80] as const
export const TRUCK_SIZES_FT = [20, 32, 40] as const

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------
// Kannada labels are build sheet item P3-02 and are deliberately kept beside
// the English ones so the land vocabulary is translated, not just the chrome.

export const LABELS = {
  category: {
    land:      { en: 'Land',      kn: 'ಜಮೀನು' },
    site:      { en: 'Site',      kn: 'ನಿವೇಶನ' },
    warehouse: { en: 'Warehouse', kn: 'ಗೋದಾಮು' },
    rent:      { en: 'Rent',      kn: 'ಬಾಡಿಗೆ' },
    shop:      { en: 'Shop',      kn: 'ಅಂಗಡಿ' },
  },
  areaUnit: {
    sqft:    { en: 'sq ft',   kn: 'ಚ.ಅಡಿ' },
    sq_yard: { en: 'sq yard', kn: 'ಚ.ಗಜ' },
    cent:    { en: 'cent',    kn: 'ಸೆಂಟ್' },
    gunta:   { en: 'gunta',   kn: 'ಗುಂಟೆ' },
    acre:    { en: 'acre',    kn: 'ಎಕರೆ' },
  },
  landType: {
    green_land:          { en: 'Green land',          kn: 'ತರಿ ಜಮೀನು' },
    dry_land:            { en: 'Dry land',            kn: 'ಖುಷ್ಕಿ ಜಮೀನು' },
    conversion_property: { en: 'Conversion property', kn: 'ಪರಿವರ್ತಿತ ಆಸ್ತಿ' },
  },
  priceBasis: {
    total:     { en: 'Total',     kn: 'ಒಟ್ಟು' },
    per_sqft:  { en: 'Per sq ft', kn: 'ಪ್ರತಿ ಚ.ಅಡಿ' },
    per_gunta: { en: 'Per gunta', kn: 'ಪ್ರತಿ ಗುಂಟೆ' },
    per_acre:  { en: 'Per acre',  kn: 'ಪ್ರತಿ ಎಕರೆ' },
    per_month: { en: 'Per month', kn: 'ಪ್ರತಿ ತಿಂಗಳು' },
  },
  zone: {
    residential:        { en: 'Residential',        kn: 'ವಸತಿ' },
    commercial:         { en: 'Commercial',         kn: 'ವಾಣಿಜ್ಯ' },
    industrial:         { en: 'Industrial',         kn: 'ಕೈಗಾರಿಕೆ' },
    public_semi_public: { en: 'Public / semi-public', kn: 'ಸಾರ್ವಜನಿಕ' },
    green:              { en: 'Green',  kn: 'ಹಸಿರು' },
    yellow:             { en: 'Yellow', kn: 'ಹಳದಿ' },
    blue:               { en: 'Blue',   kn: 'ನೀಲಿ' },
    grey:               { en: 'Grey',   kn: 'ಬೂದು' },
  },
  documentType: {
    ec:       { en: 'Encumbrance Certificate', kn: 'ಇಸಿ' },
    rtc:      { en: 'RTC / Pahani',            kn: 'ಆರ್‌ಟಿಸಿ' },
    khata:    { en: 'Khata',                   kn: 'ಖಾತಾ' },
    mutation: { en: 'Mutation',                kn: 'ಮ್ಯುಟೇಶನ್' },
  },
} as const

// ---------------------------------------------------------------------------
// Area conversion
// ---------------------------------------------------------------------------
// Mirrors the generated column in the migration. Confirmed in checklist
// section E item 1: 1 acre = 40 gunta = 43,560 sqft.

export const SQFT_PER_UNIT: Record<AreaUnit, number> = {
  sqft: 1,
  sq_yard: 9,
  cent: 435.6,
  gunta: 1089,
  acre: 43560,
}

export function toSqft(value: number, unit: AreaUnit): number {
  return value * SQFT_PER_UNIT[unit]
}

export function fromSqft(sqft: number, unit: AreaUnit): number {
  return sqft / SQFT_PER_UNIT[unit]
}

/** "2 acre (87,120 sq ft)" — land is advertised in local units but compared in sqft. */
export function formatArea(value: number, unit: AreaUnit): string {
  const label = LABELS.areaUnit[unit].en
  if (unit === 'sqft') return `${value.toLocaleString('en-IN')} ${label}`
  const sqft = Math.round(toSqft(value, unit))
  return `${value.toLocaleString('en-IN')} ${label} (${sqft.toLocaleString('en-IN')} sq ft)`
}

export function formatPrice(amount: number, basis: PriceBasis = 'total'): string {
  const suffix = basis === 'total' ? '' : ` ${LABELS.priceBasis[basis].en.toLowerCase()}`
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr${suffix}`
  if (amount >= 1_00_000)    return `₹${(amount / 1_00_000).toFixed(2)} L${suffix}`
  return `₹${amount.toLocaleString('en-IN')}${suffix}`
}

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface District { id: string; name: string; name_kn: string | null; state: string }
export interface Taluk    { id: string; district_id: string; name: string; name_kn: string | null }

/**
 * A row of `listings_public`. This is the free tier and the only listing shape
 * an unauthenticated visitor can read — it carries no owner contact and no
 * exact location by construction, not by omission.
 */
export interface PublicListing {
  id: string
  category: ListingCategory
  status: ListingStatus
  title: string | null
  survey_number: string | null

  state: string
  district_id: string
  district: string
  district_kn: string | null
  taluk_id: string
  taluk: string
  taluk_kn: string | null
  village_city: string
  pincode: string | null

  /** Deliberately offset. The exact pin is released only on payment. */
  approx_lat: number | null
  approx_lng: number | null

  nearest_landmark: string | null
  distance_from_main_road_m: number | null
  nearest_places: string | null
  distance_bus_stand_km: number | null
  distance_hospital_km: number | null
  distance_market_km: number | null

  area_value: number
  area_unit: AreaUnit
  area_sqft: number

  price_amount: number
  price_basis: PriceBasis
  negotiable: boolean

  zones: ZoneType[]
  description: string | null
  verified_at: string | null
  created_at: string
}

export interface LandDetail {
  listing_id: string
  land_type: LandType
  converted_non_agricultural: boolean
  conversion_order_number: string | null
  road_width_ft: number | null
  borewells: number | null
  water_source: WaterSource | null
  electricity_connection: boolean | null
  fenced: boolean | null
  standing_crop_or_trees: string | null
}

export interface SiteDetail {
  listing_id: string
  project_name: string | null
  total_sites_available: number | null
  site_number: string | null
  site_length_ft: number | null
  site_width_ft: number | null
  sites_facing_east: number
  sites_facing_west: number
  sites_facing_north: number
  sites_facing_south: number
  corner_site: boolean
  road_width_ft: number | null
  approved_by: ApprovingAuthority[]
  amenities: LayoutAmenity[]
}

export interface WarehouseDetail {
  listing_id: string
  converted: boolean
  floor_area_sqft: number | null
  number_of_entries: number | null
  number_of_docks: number | null
  dock_levellers: boolean | null
  parking_available: boolean
  parking_vehicle_count: number | null
  truck_size_feasible_ft: number | null
  water_source: WaterSource | null
  drainage_system: boolean | null
  road_approach_width_ft: number | null
  has_canteen: boolean
  has_conveyors: boolean
  has_wash_rooms: boolean
  has_fire_hydrant: boolean
  clear_height_ft: number | null
  power_load_kva: number | null
}

export interface ListingDocument {
  id: string
  listing_id: string
  document_type: DocumentType
  status: DocumentStatus
  rejection_reason: string | null
  uploaded_at: string
}

export interface ListingMedia {
  id: string
  listing_id: string
  media_type: MediaType
  storage_path: string
  sort_order: number
  is_free: boolean
}

/**
 * Released only after payment. Absent from every anonymous query — if this is
 * null, the buyer has not unlocked it, which is the intended state.
 */
export interface ListingContact {
  listing_id: string
  owner_name: string
  owner_phone: string
}

export interface ListingExactLocation {
  listing_id: string
  exact_lat: number | null
  exact_lng: number | null
  door_number: string | null
  full_address: string | null
  plot_boundary: unknown | null
}
