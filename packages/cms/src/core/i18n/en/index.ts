import activity from './activity'
import auth from './auth'
import core from './core'
import shell from './shell'
import status from './status'
import ui from './ui'
import type { MessagesType } from '../types'

const en = { ...core, ...activity, ...auth, ...shell, ...status, ...ui } satisfies MessagesType

export default en
