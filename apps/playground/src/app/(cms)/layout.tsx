import '@/styles/cms.css'
import { rootLayout } from '@linkcharsoft/cms/panel/routes/root'
import { Inter } from 'next/font/google'
import { CmsClient } from '@/cms/client'
import { cms } from '@/cms/server'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

const route = rootLayout(cms, CmsClient, { className: inter.variable })

export default route.Layout
export const metadata = route.metadata
