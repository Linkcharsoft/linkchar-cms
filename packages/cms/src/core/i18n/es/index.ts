import activity from './activity'
import core from './core'
import status from './status'
import ui from './ui'

// A namespace never has a key named `other`: an object with `other` is a plural message.
const es = { ...core, ...activity, ...status, ...ui } as const

export default es
