export function checkPermission(permissions: string[], code: string): boolean {
  return permissions.includes('*') || permissions.includes(code)
}

export function checkPermissionOneOf(permissions: string[], codes: string[]): boolean {
  return permissions.includes('*') || codes.some((code) => permissions.includes(code))
}
