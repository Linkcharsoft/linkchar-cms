import activity from './activity'
import core from './core'
import status from './status'

// A namespace never has a key named `other`: an object with `other` is a plural message.
const es = { ...core, ...status, ...activity } as const

export default es
