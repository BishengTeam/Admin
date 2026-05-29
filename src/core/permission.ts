export function checkPermission(permissions: string[], code: string): boolean {
  return permissions.includes(code)
}

export function checkPermissionOneOf(permissions: string[], codes: string[]): boolean {
  return codes.some((code) => permissions.includes(code))
}
