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
  institution_types?: string[]
  reporting_policy?: {
    contract_version?: number
    version?: string
    confirmed_by_client?: boolean
    commitment_template?: { filename: string; sha256: string; original_filename?: string }
    attachment_names?: Record<string, string>
    export_values?: Record<string, string>
    employment_reporting?: { confirmed?: boolean; date_rule?: string | null; years_rule?: string | null; allow_zero_years?: boolean | null }
  }
  commitment_template?: { filename: string; sha256: string; original_filename?: string } | null
}

export interface RensheExportInstructions {
  registration_template: string
  work_template: string
  work_description: string
  directory_note: string
  portrait_note: string
  file_tree: string
  example_paths: string[]
  columns: Array<{ column: number; header: string; source: string }>
}

export interface RensheAdmissionRequirements {
  scope: {
    occupation_name: string
    occupation_code: string
    skill_level: string
    export_skill_level: string
    application_types: string[]
    exam_types: string[]
    qualification_rule: string
  }
  form_sections: string[]
  education_options: Array<{ value: string; label: string }>
  institution_types: Array<{ value: string; label: string }>
  materials: Array<{
    kind: string
    name: string
    required: boolean
    extensions: string[]
    max_count: number
    max_size_bytes: number
  }>
  notes: string[]
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
  admission_requirements?: RensheAdmissionRequirements
  validation_errors: string[]
  batch_count: number
}

export interface RensheProjectWrite {
  chinese_name: string
  description?: string | null
  home_cover_url?: string | null
  status: RensheProject['status']
  occupation_code?: string
  skill_level?: string
  commitment_template?: RensheProjectConfig['commitment_template']
  config?: RensheProjectConfig | null
  expected_version?: number
}

export interface RensheCapabilities {
  supported_programs?: Array<{
    occupation_name: string
    occupation_code: string
    skill_level: string
    export_skill_level: string
    config: RensheProjectConfig
    admission_requirements: RensheAdmissionRequirements
  }>
  default_config: RensheProjectConfig
  templates: Record<string, { label: string; columns: string[] }>
  material_names: Record<string, string>
  form_fields: string[]
  qualification_rules: Record<string, string>
  institution_types?: Record<string, string>
  review_checks?: Record<string, string>
  reporting_contract?: { education_labels: Record<string, string>; application_condition: string }
  admission_requirements?: RensheAdmissionRequirements
  export_instructions?: RensheExportInstructions
}
