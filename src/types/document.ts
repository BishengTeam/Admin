export interface DocumentResource {
  id: number
  document_key: string
  title: string
  description: string | null
  original_filename: string
  content_type: string
  size_bytes: number
  sha256: string
  version_no: number
  is_active: boolean
  created_by: number | null
  updated_by: number | null
  created_at: string
  updated_at: string
  download_url?: string | null
}

export interface DocumentCreatePayload {
  document_key: string
  title: string
  description?: string | null
  is_active: boolean
}

export interface DocumentUpdatePayload {
  title?: string
  description?: string | null
  is_active?: boolean
}
