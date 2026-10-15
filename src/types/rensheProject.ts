export interface RensheProjectConfig {
  occupation_name: string
  occupation_code: string
  skill_level: string
  export_skill_level: string
  exam_types: string[]
  application_types: string[]
  qualification_rule: string
  education_levels: string[]
  form_fields: string[]
  materials: Array<{ kind: string; name: string; required: boolean; extensions: string[]; max_count: number }>
  export_template: string
  field_mapping: Record<string, string>
  attachment_layout: string
}

export interface RensheProject {
  id: number
  code: string
  chinese_name: string
  description: string | null
  home_cover_url: string | null
  status: 'draft' | 'available' | 'disabled'
  config_id: number | null
  version: number
  config: RensheProjectConfig
  validation_errors: string[]
  batch_count: number
}

export interface RensheProjectWrite {
  chinese_name: string
  description?: string | null
  home_cover_url?: string | null
  status: RensheProject['status']
  config: RensheProjectConfig
  expected_version?: number
}

export interface RensheCapabilities {
  default_config: RensheProjectConfig
  templates: Record<string, { label: string; columns: string[] }>
  material_names: Record<string, string>
  form_fields: string[]
  qualification_rules: Record<string, string>
}
