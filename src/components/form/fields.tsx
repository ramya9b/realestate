import type { ReactNode } from 'react'

// Shared form primitives for the intake forms. Every field carries an optional
// Kannada label beside the English one — the seller posting two acres in
// Nelamangala is the primary user, and P3-02 covers the land vocabulary
// specifically rather than only the interface chrome.

interface FieldProps {
  label: string
  labelKn?: string
  hint?: string
  required?: boolean
  error?: string
  children: ReactNode
}

export function Field({ label, labelKn, hint, required, error, children }: FieldProps) {
  return (
    <div>
      <label className="block mb-1.5">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {labelKn && <span className="text-xs text-gray-400 ml-2">{labelKn}</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

interface TextProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'tel' | 'number'
}

export function TextInput({ value, onChange, placeholder, type = 'text' }: TextProps) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="form-input"
    />
  )
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: TextProps & { rows?: number }) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="form-input resize-none"
    />
  )
}

export interface Option<T extends string> {
  value: T
  label: string
  labelKn?: string
}

interface SelectProps<T extends string> {
  value: T | ''
  onChange: (v: T | '') => void
  options: readonly Option<T>[]
  placeholder?: string
  disabled?: boolean
}

export function Select<T extends string>({
  value, onChange, options, placeholder = 'Select', disabled,
}: SelectProps<T>) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value as T | '')}
      className="form-select disabled:bg-gray-50 disabled:text-gray-400"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}{o.labelKn ? ` · ${o.labelKn}` : ''}
        </option>
      ))}
    </select>
  )
}

/** Segmented single choice — used where the option set is small and worth showing at a glance. */
export function ChoiceGroup<T extends string>({
  value, onChange, options, columns = 3,
}: {
  value: T | ''
  onChange: (v: T) => void
  options: readonly Option<T>[]
  columns?: number
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map(o => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className="px-3 py-2.5 rounded-xl border-2 text-sm font-semibold text-left transition-all"
            style={{
              borderColor: on ? '#1A2B4A' : '#E5E7EB',
              background: on ? '#1A2B4A' : 'white',
              color: on ? 'white' : '#6B7280',
            }}
          >
            {o.label}
            {o.labelKn && (
              <span className="block text-xs font-normal opacity-70">{o.labelKn}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** "Tick any" — zones, layout approvals and amenities are all multi-select in the checklist. */
export function MultiSelect<T extends string>({
  values, onChange, options,
}: {
  values: T[]
  onChange: (v: T[]) => void
  options: readonly Option<T>[]
}) {
  const toggle = (v: T) =>
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v])

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = values.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            aria-pressed={on}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-colors"
            style={{
              borderColor: on ? '#1A2B4A' : '#E5E7EB',
              background: on ? '#1A2B4A' : 'white',
              color: on ? 'white' : '#6B7280',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({
  checked, onChange, label, labelKn,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  labelKn?: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#1A2B4A]"
      />
      <span className="text-sm text-gray-600">
        {label}
        {labelKn && <span className="text-gray-400 ml-2 text-xs">{labelKn}</span>}
      </span>
    </label>
  )
}

export function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <div className="flex items-center mb-10">
      {labels.map((label, i) => (
        <div key={label} className="flex-1 flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: i < current ? '#059669' : i === current ? '#1A2B4A' : '#D1D5DB',
                color: 'white',
              }}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span
              className="text-xs whitespace-nowrap"
              style={{ color: i === current ? '#1A2B4A' : '#9CA3AF', fontWeight: i === current ? 600 : 400 }}
            >
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div
              className="flex-1 h-0.5 mx-2 mb-4"
              style={{ background: i < current ? '#059669' : '#E5E7EB' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
