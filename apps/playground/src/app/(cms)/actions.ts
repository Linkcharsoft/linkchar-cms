'use server'
import { cms } from '@/cms/server'

export const login = cms.actions.login
export const saveDocument = cms.actions.saveDocument
export const publishChanges = cms.actions.publishChanges
export const getPublishStatus = cms.actions.getPublishStatus
