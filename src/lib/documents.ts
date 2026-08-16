import { supabase } from './supabase'
import type { DocumentType, ListingDocument } from './schema'

// Build sheet P1-07.
//
// EC, RTC, Khata and mutation are land ownership records. They go into a
// private bucket and are never publicly addressable — viewing one requires a
// short-lived signed URL, issued only to the seller who owns the listing or to
// staff reviewing it.

const BUCKET = 'listing-documents'

/** <listing_id>/<document_type>.<ext> — the first segment is what the storage policies join on. */
function objectPath(listingId: string, type: DocumentType, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'pdf'
  return `${listingId}/${type}.${ext}`
}

export const MAX_BYTES = 10 * 1024 * 1024
export const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

/** Validate before upload so the user gets a useful message rather than a storage error. */
export function checkFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return 'Upload a PDF, JPG, PNG or WebP.'
  if (file.size > MAX_BYTES) return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 10 MB.`
  return null
}

export async function uploadDocument(
  listingId: string,
  type: DocumentType,
  file: File,
): Promise<ListingDocument> {
  const problem = checkFile(file)
  if (problem) throw new Error(problem)

  const path = objectPath(listingId, type, file.name)

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError

  // upsert so re-uploading after a rejection replaces the file and resets the
  // review, rather than leaving the old decision attached to a new document.
  const { data, error } = await supabase
    .from('listing_documents')
    .upsert(
      {
        listing_id: listingId,
        document_type: type,
        storage_path: path,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
      },
      { onConflict: 'listing_id,document_type' },
    )
    .select('id, listing_id, document_type, status, rejection_reason, uploaded_at')
    .single()

  if (error) throw error
  return data
}

export async function getDocuments(listingId: string): Promise<ListingDocument[]> {
  const { data, error } = await supabase
    .from('listing_documents')
    .select('id, listing_id, document_type, status, rejection_reason, uploaded_at')
    .eq('listing_id', listingId)
  if (error) throw error
  return data ?? []
}

/** Short-lived URL for viewing. Expires so a shared link does not become a permanent channel. */
export async function getDocumentUrl(storagePath: string, expiresInSeconds = 300): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (error) return null
  return data.signedUrl
}

export async function removeDocument(listingId: string, type: DocumentType): Promise<void> {
  const { data } = await supabase
    .from('listing_documents')
    .select('storage_path')
    .eq('listing_id', listingId)
    .eq('document_type', type)
    .maybeSingle()

  if (data?.storage_path) {
    await supabase.storage.from(BUCKET).remove([data.storage_path])
  }
  await supabase
    .from('listing_documents')
    .delete()
    .eq('listing_id', listingId)
    .eq('document_type', type)
}
