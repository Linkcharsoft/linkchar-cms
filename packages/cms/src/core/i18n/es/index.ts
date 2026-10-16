import activity from './activity'
import auth from './auth'
import core from './core'
import shell from './shell'
import status from './status'
import ui from './ui'

// A namespace never has a key named `other`: an object with `other` is a plural message.
const es = { ...core, ...activity, ...auth, ...shell, ...status, ...ui } as const

export default es
