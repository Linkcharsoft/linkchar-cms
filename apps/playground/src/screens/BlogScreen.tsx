import { entryPath, localePrefix } from '@linkcharsoft/cms/core'
import Link from 'next/link'
import { cms } from '@/cms/server'
import SiteFrame from '@/site/SiteFrame'
import cmsConfig from '../../cms.config'
import type { LocaleType } from '@linkcharsoft/cms/core'
import type { Route } from 'next'

interface Props {
  locale: LocaleType
}

const TITLES = { es: 'Blog', en: 'Blog' } satisfies Record<LocaleType, string>

const BlogScreen = async ({ locale }: Props) => {
  const posts = await cms.site.listDocuments('posts', { locale })
  const urls = Object.fromEntries(cmsConfig.locales.map(other => [other, `${localePrefix(cmsConfig, other)}/blog`]))

  return (
    <SiteFrame locale={locale} urls={urls}>
      <h1>{TITLES[locale]}</h1>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <Link href={(post.path ?? entryPath(cmsConfig, cmsConfig.schema.home, { locale }) ?? '/') as Route}>{post.content.title}</Link>
            {post.content.excerpt && <p>{post.content.excerpt}</p>}
          </li>
        ))}
      </ul>
    </SiteFrame>
  )
}

export default BlogScreen
