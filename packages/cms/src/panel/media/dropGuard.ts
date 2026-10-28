'use client'
import { useEffect } from 'react'

const hasFiles = (event: DragEvent) => !!event.dataTransfer?.types.includes('Files')

// A file dropped outside an uploader would otherwise open in the tab and leave the panel.
export const useFileDropGuard = () => {
  useEffect(() => {
    const block = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    return () => {
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
    }
  }, [])
}
