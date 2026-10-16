import activity from './activity'
import admin from './admin'
import auth from './auth'
import core from './core'
import editor from './editor'
import inputs from './inputs'
import lists from './lists'
import media from './media'
import shell from './shell'
import status from './status'
import ui from './ui'
import type { MessagesType } from '../types'

const en = { ...core, ...activity, ...admin, ...auth, ...editor, ...inputs, ...lists, ...media, ...shell, ...status, ...ui } satisfies MessagesType

export default en
