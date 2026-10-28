import { rootLayout } from '@linkcharsoft/cms/panel/routes/root'
import { CmsClient } from '@/cms/client'
import { cms } from '@/cms/server'

const route = rootLayout(cms, CmsClient)

export default route.Layout
export const metadata = route.metadata
