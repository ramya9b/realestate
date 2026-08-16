import { useRef, useState } from 'react'
import { checkFile } from '../../lib/documents'
import { LABELS, type DocumentType } from '../../lib/schema'

// Build sheet P1-07.
//
// Files are held in memory until the listing exists — a document cannot be
// uploaded before there is a listing id to file it under, and the storage
// policy joins on that id to decide who may write. So the seller picks all
// four here, and they upload together once the draft is created.

export interface PickedDocs {
  ec?: File
  rtc?: File
  khata?: File
  mutation?: File
}

const ORDER: DocumentType[] = ['ec', 'rtc', 'khata', 'mutation']

export default function DocumentUpload({
  picked, onChange,
}: {
  picked: PickedDocs
  onChange: (next: PickedDocs) => void
}) {
  const [errors, setErrors] = useState<Partial<Record<DocumentType, string>>>({})

  return (
    <div>
      <p className="text-sm font-semibold mb-1" style={{ color: '#1A2B4A' }}>
        Ownership documents
      </p>
      <p className="text-xs text-gray-400 mb-4">
        All four are required. Our team checks them before the listing goes live — a listing
        without approved documents is never published.
      </p>

      <div className="space-y-2">
        {ORDER.map(type => (
          <DocRow
            key={type}
            type={type}
            file={picked[type]}
            error={errors[type]}
            onPick={file => {
              const problem = checkFile(file)
              if (problem) {
                setErrors(e => ({ ...e, [type]: problem }))
                return
              }
              setErrors(e => ({ ...e, [type]: undefined }))
              onChange({ ...picked, [type]: file })
            }}
            onClear={() => {
              const next = { ...picked }
              delete next[type]
              onChange(next)
              setErrors(e => ({ ...e, [type]: undefined }))
            }}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        PDF, JPG, PNG or WebP · up to 10 MB each · stored privately, never shown on the listing
      </p>
    </div>
  )
}

function DocRow({
  type, file, error, onPick, onClear,
}: {
  type: DocumentType
  file?: File
  error?: string
  onPick: (f: File) => void
  onClear: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const label = LABELS.documentType[type]

  return (
    <div
      className="rounded-xl px-4 py-3 border-2 transition-colors"
      style={{
        borderStyle: file ? 'solid' : 'dashed',
        borderColor: error ? '#FCA5A5' : file ? '#059669' : '#E5E7EB',
        background: file ? '#F0FDF4' : 'white',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm font-semibold" style={{ color: '#1A2B4A' }}>{label.en}</span>
          <span className="text-gray-400 ml-2 text-xs">{label.kn}</span>
          {file && (
            <span className="block text-xs text-gray-500 truncate mt-0.5">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </span>
          )}
        </div>

        <div className="shrink-0">
          <input
            ref={input}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) onPick(f)
              e.target.value = ''
            }}
          />
          {file ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-gray-500 bg-transparent border-none cursor-pointer p-0 hover:text-red-600"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 bg-white cursor-pointer"
              style={{ borderColor: '#1A2B4A', color: '#1A2B4A' }}
            >
              Choose file
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  )
}
