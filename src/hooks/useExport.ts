import { useState, useCallback } from 'react'

export function useExport() {
  const [exporting, setExporting] = useState(false)

  const startExport = useCallback(() => setExporting(true), [])
  const finishExport = useCallback(() => setExporting(false), [])

  return { exporting, startExport, finishExport }
}
