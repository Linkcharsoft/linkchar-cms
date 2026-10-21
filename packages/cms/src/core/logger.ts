// Where the server reports the failures it swallows (best-effort writes, build hooks): console unless the project passes its own.
export interface CmsLoggerType {
  error: (message: string, detail?: unknown) => void
}

export const consoleLogger: CmsLoggerType = {
  error: (message, detail) => (detail === undefined ? console.error(message) : console.error(message, detail))
}
