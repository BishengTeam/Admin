export interface DocumentResource {
  id: number
  document_key: string
  scene: string | null
  title: string
  entry_text: string | null
  entry_mode: string | null
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
  scene?: string
  title: string
  entry_text?: string | null
  description?: string | null
  is_active: boolean
}

export interface DocumentUpdatePayload {
  scene?: string | null
  title?: string
  entry_text?: string | null
  description?: string | null
  is_active?: boolean
}
