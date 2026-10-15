import { defineCmsConfig } from '../config'
import { openingHours } from '../kinds/openingHours'

// For tests that check fields on their own, outside any entry.
export const config = defineCmsConfig({ schema: {}, fields: [openingHours] })
