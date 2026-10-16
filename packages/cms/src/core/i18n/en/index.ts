import activity from './activity'
import core from './core'
import status from './status'
import type { MessagesType } from '../types'

const en = { ...core, ...status, ...activity } satisfies MessagesType

export default en
