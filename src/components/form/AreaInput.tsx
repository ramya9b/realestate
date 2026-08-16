import { AREA_UNITS, LABELS, SQFT_PER_UNIT, toSqft, type AreaUnit } from '../../lib/schema'
import { Field } from './fields'

// Build sheet P1-06.
//
// Land in Karnataka is quoted in gunta and acre, sites in square feet, older
// deeds in cent. A seller entering "2" without seeing what it becomes is the
// commonest data-entry error in this business, and it is expensive: a listing
// entered in the wrong unit is off by a factor of 1,089.
//
// So the conversion is shown live, in the units the seller is likely to be
// checking against, rather than validated after the fact.

interface Props {
  value: string
  unit: AreaUnit | ''
  onValueChange: (v: string) => void
  onUnitChange: (u: AreaUnit) => void
  label?: string
  labelKn?: string
  required?: boolean
}

export default function AreaInput({
  value, unit, onValueChange, onUnitChange,
  label = 'Area', labelKn = 'ವಿಸ್ತೀರ್ಣ', required,
}: Props) {
  const n = parseFloat(value)
  const valid = Number.isFinite(n) && n > 0 && unit !== ''
  const sqft = valid ? toSqft(n, unit as AreaUnit) : 0

  // Show the two or three units a seller would actually cross-check against,
  // never the one they just typed.
  const equivalents = valid
    ? (AREA_UNITS as readonly AreaUnit[])
        .filter(u => u !== unit)
        .map(u => ({ unit: u, amount: sqft / SQFT_PER_UNIT[u] }))
        .filter(e => e.amount >= 0.01 && e.amount < 1_000_000)
        .slice(0, 3)
    : []

  return (
    <Field label={label} labelKn={labelKn} required={required}>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          placeholder="e.g. 2"
          onChange={e => onValueChange(e.target.value)}
          className="form-input"
        />
        <select
          value={unit}
          onChange={e => onUnitChange(e.target.value as AreaUnit)}
          className="form-select w-auto min-w-[7.5rem]"
        >
          <option value="">Unit</option>
          {AREA_UNITS.map(u => (
            <option key={u} value={u}>
              {LABELS.areaUnit[u].en} · {LABELS.areaUnit[u].kn}
            </option>
          ))}
        </select>
      </div>

      {valid && (
        <div className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: '#FBF6EC', border: '1px solid #E8C97A' }}>
          <span className="font-semibold" style={{ color: '#1A2B4A' }}>
            = {Math.round(sqft).toLocaleString('en-IN')} sq ft
          </span>
          {equivalents.length > 0 && (
            <span className="text-gray-500">
              {' · '}
              {equivalents
                .map(e => `${trim(e.amount)} ${LABELS.areaUnit[e.unit].en}`)
                .join(' · ')}
            </span>
          )}
        </div>
      )}

      {value !== '' && !valid && unit === '' && (
        <p className="text-xs text-gray-400 mt-1">Choose a unit to see the conversion.</p>
      )}
    </Field>
  )
}

/** 2 → "2", 2.5 → "2.5", 2.503 → "2.5". Trailing zeros read as false precision. */
function trim(n: number): string {
  return parseFloat(n.toFixed(2)).toLocaleString('en-IN')
}
