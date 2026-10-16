import activity from './activity'
import core from './core'
import status from './status'
import ui from './ui'
import type { MessagesType } from '../types'

const en = { ...core, ...activity, ...status, ...ui } satisfies MessagesType

export default en
