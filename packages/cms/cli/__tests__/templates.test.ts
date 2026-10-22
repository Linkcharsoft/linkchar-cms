import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { confirmLink, syncTemplates, translatorOf } from '../templates.js'

let supabaseDir: string

const read = (file: string) => readFile(join(supabaseDir, file), 'utf8')

beforeEach(async () => {
  supabaseDir = join(await mkdtemp(join(tmpdir(), 'cms-templates-')), 'supabase')
  await mkdir(supabaseDir, { recursive: true })
  // As supabase init writes it: the template blocks come commented out.
  await writeFile(join(supabaseDir, 'config.toml'), '[auth]\nsite_url = "http://127.0.0.1:3000"\n# [auth.email.template.invite]\n# content_path = "./supabase/templates/invite.html"\n')
})

afterEach(() => rm(join(supabaseDir, '..'), { recursive: true, force: true }))

describe('syncTemplates', () => {
  it('writes both emails linking to the panel confirm route and registers them in config.toml', async () => {
    const changes = await syncTemplates({ supabaseDir, basePath: '/cms', t: await translatorOf('es') })
    expect(changes.map(change => change.status)).toEqual(['added', 'added', 'added', 'added'])

    const invite = await read('templates/invite.html')
    expect(invite).toContain('<a href="{{ .SiteURL }}/cms/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite">Crear mi usuario</a>')
    expect(await read('templates/recovery.html')).toContain(confirmLink('/cms', 'recovery'))
    const toml = await read('config.toml')
    expect(toml).toContain('[auth.email.template.invite]\nsubject = "Te invitaron al panel de contenido"\ncontent_path = "./supabase/templates/invite.html"')
    expect(toml).toContain('[auth.email.template.recovery]')
  })

  it('keeps the project wording and only flags a template that links elsewhere', async () => {
    await mkdir(join(supabaseDir, 'templates'))
    await writeFile(join(supabaseDir, 'templates', 'invite.html'), `<p>Hola</p><a href="${confirmLink('/cms', 'invite').replace('&amp;', '&')}">Entrar</a>`)
    await writeFile(join(supabaseDir, 'templates', 'recovery.html'), `<a href="${confirmLink('/dashboard', 'recovery')}">Entrar</a>`)
    await appendFile(join(supabaseDir, 'config.toml'), '[auth.email.template.invite]\nsubject = "Hola"\n')

    const changes = await syncTemplates({ supabaseDir, basePath: '/cms', t: await translatorOf('es'), write: false })
    expect(changes).toEqual([
      { file: 'templates/invite.html', status: 'kept' },
      { file: 'templates/recovery.html', status: 'stale' },
      { file: 'config.toml [auth.email.template.invite]', status: 'same' },
      { file: 'config.toml [auth.email.template.recovery]', status: 'added' }
    ])
    expect(await read('templates/invite.html')).toContain('<p>Hola</p>')
    expect(await read('config.toml')).not.toContain('[auth.email.template.recovery]')
  })

  it('speaks the panel language and the project overrides', async () => {
    await syncTemplates({ supabaseDir, basePath: '/cms', t: await translatorOf({ panelLocale: 'en', messages: { en: { emails: { invite: { action: 'Join Acme' } } } } }) })
    const invite = await read('templates/invite.html')
    expect(invite).toContain('>Join Acme</a>')
    expect(invite).toContain('<h2>You are invited to the content panel</h2>')
  })

  it('needs the Supabase folder of the project', async () => {
    await rm(join(supabaseDir, 'config.toml'))
    await expect(syncTemplates({ supabaseDir, basePath: '/cms', t: await translatorOf('es') })).rejects.toThrow('run supabase init first')
  })
})
