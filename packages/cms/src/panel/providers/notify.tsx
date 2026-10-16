'use client'
import { Toast } from 'primereact/toast'
import { createContext, useContext, useRef } from 'react'
import type { ReactNode } from 'react'

export type NotifySeverityType = 'success' | 'info' | 'warn' | 'error'

export interface NotifyMessageType {
  severity: NotifySeverityType
  summary: string
  detail?: string
  life?: number
  sticky?: boolean
}

type NotifyType = (message: NotifyMessageType) => void

const ICONS: Record<NotifySeverityType, string> = {
  success: 'pi pi-check-circle',
  info: 'pi pi-info-circle',
  warn: 'pi pi-exclamation-triangle',
  error: 'pi pi-times-circle'
}

const NotifyContext = createContext<NotifyType>(() => {})

export const useNotify = () => useContext(NotifyContext)

export const NotifyProvider = ({ children }: { children: ReactNode }) => {
  const toast = useRef<Toast>(null)

  const notify: NotifyType = message => {
    toast.current?.show({ ...message, life: message.life ?? 5000, icon: `${ICONS[message.severity]} cms-text-regular-20` })
  }

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Toast ref={toast} position='top-right' />
    </NotifyContext.Provider>
  )
}
