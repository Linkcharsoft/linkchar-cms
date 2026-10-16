import core from './core'

// A namespace never has a key named `other`: an object with `other` is a plural message.
const es = { ...core } as const

export default es
