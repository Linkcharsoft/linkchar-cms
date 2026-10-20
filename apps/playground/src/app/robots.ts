import { absoluteUrl } from '@linkcharsoft/cms/core'
import cmsConfig from '../../cms.config'
import type { MetadataRoute } from 'next'

const robots = (): MetadataRoute.Robots => ({
  rules: { userAgent: '*', disallow: [cmsConfig.basePath, '/api'] },
  sitemap: absoluteUrl(cmsConfig, '/sitemap.xml')
})

export default robots
