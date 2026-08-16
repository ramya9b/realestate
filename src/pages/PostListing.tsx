import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import AreaInput from '../components/form/AreaInput'
import DocumentUpload, { type PickedDocs } from '../components/form/DocumentUpload'
import {
  ChoiceGroup, Field, MultiSelect, Select, Steps, TextArea, TextInput, Toggle,
  type Option,
} from '../components/form/fields'
import { useAuth } from '../lib/auth'
import { uploadDocument } from '../lib/documents'
import { createListing, getDistricts, getTaluks, submitForVerification } from '../lib/listings'
import {
  APPROVING_AUTHORITIES, LABELS, LAND_TYPES, LAYOUT_AMENITIES,
  LISTING_CATEGORIES, PRICE_BASES, SITE_ROAD_WIDTHS_FT, TRUCK_SIZES_FT,
  WATER_SOURCES, ZONE_TYPES,
  type AreaUnit, type ApprovingAuthority, type District, type DocumentType,
  type LandType, type LayoutAmenity, type ListingCategory, type PriceBasis,
  type Taluk, type WaterSource, type ZoneType,
} from '../lib/schema'

// Build sheet P1-01 to P1-04. Sections referenced below are the field
// confirmation checklist: A shared, B land, C sites, D warehouse.

const opts = <T extends string>(
  values: readonly T[],
  labels?: Record<string, { en: string; kn: string }>,
): Option<T>[] =>
  values.map(v => ({
    value: v,
    label: labels?.[v]?.en ?? titleise(v),
    labelKn: labels?.[v]?.kn,
  }))

const titleise = (s: string) =>
  s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())

const CATEGORY_OPTIONS = opts(LISTING_CATEGORIES, LABELS.category)
const LAND_TYPE_OPTIONS = opts(LAND_TYPES, LABELS.landType)
const ZONE_OPTIONS = opts(ZONE_TYPES, LABELS.zone)
const PRICE_BASIS_OPTIONS = opts(PRICE_BASES, LABELS.priceBasis)
const WATER_OPTIONS = opts(WATER_SOURCES)
const APPROVAL_OPTIONS = opts(APPROVING_AUTHORITIES).map(o => ({
  ...o, label: o.value.toUpperCase(),
})) as Option<ApprovingAuthority>[]
const AMENITY_OPTIONS = opts(LAYOUT_AMENITIES)

/** Categories with a confirmed field list. Rent and shop are in scope but unspecified — build sheet F-06. */
const SPECIFIED: ListingCategory[] = ['land', 'site', 'warehouse']

export default function PostListing() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [districts, setDistricts] = useState<District[]>([])
  const [taluks, setTaluks] = useState<Taluk[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [docs, setDocs] = useState<PickedDocs>({})

  // Section A — shared across every category
  const [category, setCategory] = useState<ListingCategory | ''>('')
  const [surveyNumber, setSurveyNumber] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [talukId, setTalukId] = useState('')
  const [village, setVillage] = useState('')
  const [pincode, setPincode] = useState('')
  const [landmark, setLandmark] = useState('')
  const [roadDistanceM, setRoadDistanceM] = useState('')
  const [nearestPlaces, setNearestPlaces] = useState('')
  const [busKm, setBusKm] = useState('')
  const [hospitalKm, setHospitalKm] = useState('')
  const [marketKm, setMarketKm] = useState('')
  const [areaValue, setAreaValue] = useState('')
  const [areaUnit, setAreaUnit] = useState<AreaUnit | ''>('')
  const [price, setPrice] = useState('')
  const [priceBasis, setPriceBasis] = useState<PriceBasis | ''>('')
  const [negotiable, setNegotiable] = useState(false)
  const [zones, setZones] = useState<ZoneType[]>([])
  const [description, setDescription] = useState('')

  // Section B — land
  const [landType, setLandType] = useState<LandType | ''>('')
  const [converted, setConverted] = useState(false)
  const [conversionOrder, setConversionOrder] = useState('')
  const [landRoadWidth, setLandRoadWidth] = useState('')
  const [borewells, setBorewells] = useState('')
  const [landWater, setLandWater] = useState<WaterSource | ''>('')
  const [electricity, setElectricity] = useState(false)
  const [fenced, setFenced] = useState(false)
  const [standingCrop, setStandingCrop] = useState('')

  // Section C — sites
  const [projectName, setProjectName] = useState('')
  const [totalSites, setTotalSites] = useState('')
  const [siteNumber, setSiteNumber] = useState('')
  const [siteLength, setSiteLength] = useState('')
  const [siteWidth, setSiteWidth] = useState('')
  const [facingE, setFacingE] = useState('')
  const [facingW, setFacingW] = useState('')
  const [facingN, setFacingN] = useState('')
  const [facingS, setFacingS] = useState('')
  const [cornerSite, setCornerSite] = useState(false)
  const [siteRoadWidth, setSiteRoadWidth] = useState('')
  const [approvedBy, setApprovedBy] = useState<ApprovingAuthority[]>([])
  const [amenities, setAmenities] = useState<LayoutAmenity[]>([])

  // Section D — warehouse
  const [whConverted, setWhConverted] = useState(false)
  const [floorArea, setFloorArea] = useState('')
  const [entries, setEntries] = useState('')
  const [docks, setDocks] = useState('')
  const [dockLevellers, setDockLevellers] = useState(false)
  const [parking, setParking] = useState(false)
  const [parkingCount, setParkingCount] = useState('')
  const [truckSize, setTruckSize] = useState('')
  const [whWater, setWhWater] = useState<WaterSource | ''>('')
  const [drainage, setDrainage] = useState(false)
  const [roadApproach, setRoadApproach] = useState('')
  const [canteen, setCanteen] = useState(false)
  const [conveyors, setConveyors] = useState(false)
  const [washRooms, setWashRooms] = useState(false)
  const [fireHydrant, setFireHydrant] = useState(false)
  const [clearHeight, setClearHeight] = useState('')
  const [powerLoad, setPowerLoad] = useState('')

  // Contact — written to listing_contacts, never to the listing row
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')

  useEffect(() => { getDistricts().then(setDistricts).catch(() => setDistricts([])) }, [])
  useEffect(() => {
    setTalukId('')
    if (!districtId) { setTaluks([]); return }
    getTaluks(districtId).then(setTaluks).catch(() => setTaluks([]))
  }, [districtId])

  const STEP_LABELS = ['Category', 'Location', 'Details', 'Size & price', 'Documents']

  // Survey number is compulsory for land — confirmed in the checklist and
  // enforced by a check constraint in the migration.
  const surveyRequired = category === 'land'

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return category !== ''
      case 1: return Boolean(districtId && talukId && village) && (!surveyRequired || surveyNumber !== '')
      case 2: return category !== 'land' || landType !== ''
      case 3: return areaValue !== '' && areaUnit !== '' && price !== '' && priceBasis !== ''
      default: return true
    }
  }

  const num = (s: string): number | null => {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  }
  const int = (s: string): number | null => {
    const n = parseInt(s, 10)
    return Number.isFinite(n) ? n : null
  }

  /** Detail row for the chosen category. Keys must match the detail table's columns. */
  const buildDetail = (): Record<string, unknown> | null => {
    switch (category) {
      case 'land':
        return {
          land_type: landType,
          converted_non_agricultural: converted,
          conversion_order_number: converted ? conversionOrder || null : null,
          road_width_ft: num(landRoadWidth),
          borewells: int(borewells),
          water_source: landWater || null,
          electricity_connection: electricity,
          fenced,
          standing_crop_or_trees: standingCrop || null,
        }
      case 'site':
        return {
          project_name: projectName || null,
          total_sites_available: int(totalSites),
          site_number: siteNumber || null,
          site_length_ft: num(siteLength),
          site_width_ft: num(siteWidth),
          sites_facing_east: int(facingE) ?? 0,
          sites_facing_west: int(facingW) ?? 0,
          sites_facing_north: int(facingN) ?? 0,
          sites_facing_south: int(facingS) ?? 0,
          corner_site: cornerSite,
          road_width_ft: int(siteRoadWidth),
          approved_by: approvedBy,
          amenities,
        }
      case 'warehouse':
        return {
          converted: whConverted,
          floor_area_sqft: num(floorArea),
          number_of_entries: int(entries),
          number_of_docks: int(docks),
          dock_levellers: dockLevellers,
          parking_available: parking,
          parking_vehicle_count: parking ? int(parkingCount) : null,
          truck_size_feasible_ft: int(truckSize),
          water_source: whWater || null,
          drainage_system: drainage,
          road_approach_width_ft: num(roadApproach),
          has_canteen: canteen,
          has_conveyors: conveyors,
          has_wash_rooms: washRooms,
          has_fire_hydrant: fireHydrant,
          clear_height_ft: num(clearHeight),
          power_load_kva: num(powerLoad),
        }
      default:
        return null
    }
  }

  const submit = async () => {
    if (!user) { navigate('/signin?next=/post'); return }
    setError(null)
    setBusy(true)
    try {
      setProgress('Saving listing…')
      const listingId = await createListing({
        category: category as ListingCategory,
        survey_number: surveyNumber || null,
        district_id: districtId,
        taluk_id: talukId,
        village_city: village,
        pincode: pincode || null,
        nearest_landmark: landmark || null,
        distance_from_main_road_m: num(roadDistanceM),
        nearest_places: nearestPlaces || null,
        distance_bus_stand_km: num(busKm),
        distance_hospital_km: num(hospitalKm),
        distance_market_km: num(marketKm),
        area_value: num(areaValue) as number,
        area_unit: areaUnit as AreaUnit,
        price_amount: num(price) as number,
        price_basis: priceBasis as PriceBasis,
        negotiable,
        zones,
        description: description || null,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        detail: buildDetail(),
      })

      // Documents can only be filed once the listing exists — the storage
      // policy joins on the listing id to decide who may write.
      const entriesToUpload = Object.entries(docs) as [DocumentType, File][]
      for (let i = 0; i < entriesToUpload.length; i++) {
        const [type, file] = entriesToUpload[i]
        setProgress(`Uploading documents… ${i + 1} of ${entriesToUpload.length}`)
        await uploadDocument(listingId, type, file)
      }

      setProgress('Submitting for verification…')
      await submitForVerification(listingId)
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the listing. Try again.')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const allDocsPicked = (['ec', 'rtc', 'khata', 'mutation'] as DocumentType[])
    .every(t => Boolean(docs[t]))

  if (submitted) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">📐</div>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: '#1A2B4A' }}>
              Submitted for verification
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Our team will check the EC, RTC, Khata and mutation you uploaded. The listing goes
              live with a Verified mark once those are approved.
            </p>
            <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>Back to home</Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-xl mx-auto">
          <h1 className="font-display font-bold text-2xl text-center mb-1" style={{ color: '#1A2B4A' }}>
            Post your property
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            ನಿಮ್ಮ ಆಸ್ತಿಯನ್ನು ಹಾಕಿ — free to post, verified before it goes live
          </p>

          <Steps labels={STEP_LABELS} current={step} />

          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-5">

            {/* ---- 0 · Category ---- */}
            {step === 0 && (
              <Field label="What are you listing" labelKn="ಏನು ಹಾಕುತ್ತಿದ್ದೀರಿ" required>
                <ChoiceGroup
                  value={category}
                  onChange={setCategory}
                  options={CATEGORY_OPTIONS}
                  columns={2}
                />
                {category !== '' && !SPECIFIED.includes(category) && (
                  <p className="text-xs mt-3 rounded-lg px-3 py-2" style={{ background: '#FEF3C7', color: '#7E5A10' }}>
                    The field list for {LABELS.category[category].en.toLowerCase()} has not been
                    confirmed yet — only the shared fields will be asked for.
                  </p>
                )}
              </Field>
            )}

            {/* ---- 1 · Location (section A) ---- */}
            {step === 1 && (
              <>
                <Field
                  label="Survey number"
                  labelKn="ಸರ್ವೆ ನಂಬರ್"
                  required={surveyRequired}
                  hint={surveyRequired ? 'No land in Karnataka can be identified without it.' : undefined}
                >
                  <TextInput value={surveyNumber} onChange={setSurveyNumber} placeholder="e.g. 123/4" />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="District" labelKn="ಜಿಲ್ಲೆ" required>
                    <Select
                      value={districtId}
                      onChange={v => setDistrictId(v as string)}
                      options={districts.map(d => ({ value: d.id, label: d.name, labelKn: d.name_kn ?? undefined }))}
                      placeholder={districts.length ? 'Select district' : 'None loaded'}
                    />
                  </Field>
                  <Field label="Taluk" labelKn="ತಾಲ್ಲೂಕು" required>
                    <Select
                      value={talukId}
                      onChange={v => setTalukId(v as string)}
                      options={taluks.map(t => ({ value: t.id, label: t.name, labelKn: t.name_kn ?? undefined }))}
                      placeholder={districtId ? 'Select taluk' : 'Choose district first'}
                      disabled={!districtId}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Village / City" labelKn="ಗ್ರಾಮ" required>
                    <TextInput value={village} onChange={setVillage} placeholder="e.g. Nelamangala" />
                  </Field>
                  <Field label="Pincode" hint="6 digits">
                    <TextInput value={pincode} onChange={setPincode} placeholder="562123" />
                  </Field>
                </div>

                <Field label="Nearest landmark" labelKn="ಹತ್ತಿರದ ಗುರುತು">
                  <TextInput value={landmark} onChange={setLandmark} placeholder="e.g. opposite the government school" />
                </Field>

                <Field
                  label="Distance from main road"
                  hint="In metres — the whiteboard did not state a unit, and metres was confirmed."
                >
                  <TextInput type="number" value={roadDistanceM} onChange={setRoadDistanceM} placeholder="e.g. 400" />
                </Field>

                <Field label="Nearest places" labelKn="ಹತ್ತಿರದ ಸ್ಥಳಗಳು">
                  <TextInput value={nearestPlaces} onChange={setNearestPlaces} placeholder="Towns or junctions nearby" />
                </Field>

                <Field label="Distance in km">
                  <div className="grid grid-cols-3 gap-3">
                    <TextInput type="number" value={busKm} onChange={setBusKm} placeholder="Bus stand" />
                    <TextInput type="number" value={hospitalKm} onChange={setHospitalKm} placeholder="Hospital" />
                    <TextInput type="number" value={marketKm} onChange={setMarketKm} placeholder="Market" />
                  </div>
                </Field>
              </>
            )}

            {/* ---- 2 · Category detail ---- */}
            {step === 2 && category === 'land' && (
              <>
                <Field label="Land type" labelKn="ಜಮೀನಿನ ಪ್ರಕಾರ" required>
                  <ChoiceGroup value={landType} onChange={setLandType} options={LAND_TYPE_OPTIONS} columns={1} />
                </Field>
                <Toggle checked={converted} onChange={setConverted}
                  label="Converted for non-agricultural use" labelKn="ಪರಿವರ್ತಿತ" />
                {converted && (
                  <Field label="Conversion order number" required>
                    <TextInput value={conversionOrder} onChange={setConversionOrder} placeholder="Order number" />
                  </Field>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Road width (ft)">
                    <TextInput type="number" value={landRoadWidth} onChange={setLandRoadWidth} placeholder="e.g. 30" />
                  </Field>
                  <Field label="Borewells" labelKn="ಬೋರ್‌ವೆಲ್">
                    <TextInput type="number" value={borewells} onChange={setBorewells} placeholder="How many" />
                  </Field>
                </div>
                <Field label="Water source" labelKn="ನೀರಿನ ಮೂಲ">
                  <Select value={landWater} onChange={setLandWater} options={WATER_OPTIONS} />
                </Field>
                <div className="space-y-3">
                  <Toggle checked={electricity} onChange={setElectricity} label="Electricity connection" labelKn="ವಿದ್ಯುತ್" />
                  <Toggle checked={fenced} onChange={setFenced} label="Fenced" labelKn="ಬೇಲಿ" />
                </div>
                <Field label="Standing crop or trees" hint="Affects green-land valuation.">
                  <TextArea value={standingCrop} onChange={setStandingCrop} placeholder="e.g. 40 coconut trees, 3 years old" rows={2} />
                </Field>
              </>
            )}

            {step === 2 && category === 'site' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Project name"><TextInput value={projectName} onChange={setProjectName} /></Field>
                  <Field label="Site number"><TextInput value={siteNumber} onChange={setSiteNumber} /></Field>
                </div>
                <Field label="Total sites available">
                  <TextInput type="number" value={totalSites} onChange={setTotalSites} placeholder="How many" />
                </Field>
                <Field label="Site size (ft)" hint="Length × width.">
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput type="number" value={siteLength} onChange={setSiteLength} placeholder="Length" />
                    <TextInput type="number" value={siteWidth} onChange={setSiteWidth} placeholder="Width" />
                  </div>
                </Field>
                <Field label="Sites per facing">
                  <div className="grid grid-cols-4 gap-2">
                    <TextInput type="number" value={facingE} onChange={setFacingE} placeholder="East" />
                    <TextInput type="number" value={facingW} onChange={setFacingW} placeholder="West" />
                    <TextInput type="number" value={facingN} onChange={setFacingN} placeholder="North" />
                    <TextInput type="number" value={facingS} onChange={setFacingS} placeholder="South" />
                  </div>
                </Field>
                <Toggle checked={cornerSite} onChange={setCornerSite} label="Corner site" labelKn="ಮೂಲೆ ನಿವೇಶನ" />
                <Field label="Road width (ft)">
                  <ChoiceGroup
                    value={siteRoadWidth}
                    onChange={setSiteRoadWidth}
                    options={SITE_ROAD_WIDTHS_FT.map(w => ({ value: String(w), label: `${w} ft` }))}
                    columns={4}
                  />
                </Field>
                <Field label="Approved by" labelKn="ಅನುಮೋದನೆ">
                  <MultiSelect values={approvedBy} onChange={setApprovedBy} options={APPROVAL_OPTIONS} />
                </Field>
                <Field label="Amenities" labelKn="ಸೌಲಭ್ಯಗಳು">
                  <MultiSelect values={amenities} onChange={setAmenities} options={AMENITY_OPTIONS} />
                </Field>
              </>
            )}

            {step === 2 && category === 'warehouse' && (
              <>
                <Toggle checked={whConverted} onChange={setWhConverted} label="Converted" labelKn="ಪರಿವರ್ತಿತ" />
                <Field label="Floor area (sq ft)" hint="Covered shed area, not the whole plot.">
                  <TextInput type="number" value={floorArea} onChange={setFloorArea} placeholder="e.g. 20000" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Number of entries"><TextInput type="number" value={entries} onChange={setEntries} /></Field>
                  <Field label="Number of docks"><TextInput type="number" value={docks} onChange={setDocks} /></Field>
                </div>
                <Toggle checked={dockLevellers} onChange={setDockLevellers} label="Dock levellers" />
                <Toggle checked={parking} onChange={setParking} label="Parking available" />
                {parking && (
                  <Field label="Parking capacity"><TextInput type="number" value={parkingCount} onChange={setParkingCount} placeholder="How many vehicles" /></Field>
                )}
                <Field label="Largest truck the yard can turn and dock">
                  <ChoiceGroup
                    value={truckSize}
                    onChange={setTruckSize}
                    options={TRUCK_SIZES_FT.map(t => ({ value: String(t), label: `${t} ft` }))}
                    columns={3}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Clear height (ft)" hint="Every logistics tenant asks.">
                    <TextInput type="number" value={clearHeight} onChange={setClearHeight} placeholder="e.g. 32" />
                  </Field>
                  <Field label="Power load (KVA)" hint="Decides if machinery can run.">
                    <TextInput type="number" value={powerLoad} onChange={setPowerLoad} placeholder="e.g. 250" />
                  </Field>
                </div>
                <Field label="Water source">
                  <Select value={whWater} onChange={setWhWater} options={WATER_OPTIONS} />
                </Field>
                <Field label="Road approach width (ft)">
                  <TextInput type="number" value={roadApproach} onChange={setRoadApproach} />
                </Field>
                <div className="space-y-3">
                  <Toggle checked={drainage} onChange={setDrainage} label="Drainage system" />
                  <Toggle checked={canteen} onChange={setCanteen} label="Canteen" />
                  <Toggle checked={conveyors} onChange={setConveyors} label="Conveyors" />
                  <Toggle checked={washRooms} onChange={setWashRooms} label="Wash rooms" />
                  <Toggle checked={fireHydrant} onChange={setFireHydrant} label="Fire hydrant" />
                </div>
              </>
            )}

            {step === 2 && category !== '' && !SPECIFIED.includes(category) && (
              <p className="text-sm text-gray-500">
                No extra fields for {LABELS.category[category].en.toLowerCase()} yet — the field
                list is still to be confirmed. Continue to size and price.
              </p>
            )}

            {/* ---- 3 · Size & price (section A) ---- */}
            {step === 3 && (
              <>
                <AreaInput
                  value={areaValue}
                  unit={areaUnit}
                  onValueChange={setAreaValue}
                  onUnitChange={setAreaUnit}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Price (₹)" labelKn="ಬೆಲೆ" required>
                    <TextInput type="number" value={price} onChange={setPrice} placeholder="e.g. 4000000" />
                  </Field>
                  <Field label="Price basis" required>
                    <Select value={priceBasis} onChange={setPriceBasis} options={PRICE_BASIS_OPTIONS} />
                  </Field>
                </div>
                <Toggle checked={negotiable} onChange={setNegotiable} label="Negotiable" labelKn="ಚರ್ಚಿಸಬಹುದು" />
                <Field label="Zone" labelKn="ವಲಯ" hint="Tick any that apply.">
                  <MultiSelect values={zones} onChange={setZones} options={ZONE_OPTIONS} />
                </Field>
                <Field label="Description" labelKn="ವಿವರಣೆ">
                  <TextArea value={description} onChange={setDescription} placeholder="Anything a buyer should know" />
                </Field>
              </>
            )}

            {/* ---- 4 · Documents & contact ---- */}
            {step === 4 && (
              <>
                <DocumentUpload picked={docs} onChange={setDocs} />

                <div className="pt-2">
                  <p className="text-sm font-semibold mb-3" style={{ color: '#1A2B4A' }}>Your details</p>
                  <div className="space-y-4">
                    <Field label="Your name" labelKn="ಹೆಸರು" required>
                      <TextInput value={ownerName} onChange={setOwnerName} placeholder="Full name" />
                    </Field>
                    <Field label="Mobile number" labelKn="ಮೊಬೈಲ್" required>
                      <TextInput type="tel" value={ownerPhone} onChange={setOwnerPhone} placeholder="10-digit number" />
                    </Field>
                  </div>
                </div>

                <div className="rounded-xl p-4 text-sm" style={{ background: '#FBF6EC', border: '1.5px solid #E8C97A', color: '#1A2B4A' }}>
                  🔒 Your number is never shown on the listing. Buyers see the village, taluk and an
                  approximate location — your number and the exact plot are released only to a buyer
                  who pays.
                </div>

                {!user && !authLoading && (
                  <div className="rounded-xl p-4 text-sm" style={{ background: '#EFF6FF', border: '1.5px solid #93C5FD', color: '#1E3A8A' }}>
                    You need an account before a listing can be saved.{' '}
                    <Link to="/signin?mode=up&next=/post" className="font-semibold underline" style={{ color: '#1E3A8A' }}>
                      Create one
                    </Link>{' '}
                    — it takes a minute, and posting stays free.
                  </div>
                )}

                {error && (
                  <div className="rounded-xl p-4 text-sm" style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B' }}>
                    {error}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 font-semibold text-sm hover:border-gray-400 transition-colors bg-white"
                >
                  ← Back
                </button>
              )}
              {step < STEP_LABELS.length - 1 ? (
                <button
                  type="button"
                  disabled={!canAdvance()}
                  onClick={() => setStep(s => s + 1)}
                  className="flex-1 text-white font-display font-bold py-3 rounded-xl disabled:opacity-40"
                  style={{ background: '#1A2B4A', border: 'none', cursor: 'pointer' }}
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!ownerName || !ownerPhone || !allDocsPicked || busy}
                  onClick={submit}
                  className="flex-1 text-white font-display font-bold py-3 rounded-xl disabled:opacity-40"
                  style={{ background: '#1A2B4A', border: 'none', cursor: 'pointer' }}
                >
                  {busy ? progress || 'Working…' : user ? 'Submit for verification' : 'Sign in to submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
