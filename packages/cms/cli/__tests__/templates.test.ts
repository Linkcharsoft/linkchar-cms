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
    const changes = await syncTemplates({ supabaseDir, basePath: '/cms', t: await translatorOf('es'), product: 'Estudio <Norte>' })
    expect(changes.map(change => change.status)).toEqual(['added', 'added', 'added', 'added'])

    const invite = await read('templates/invite.html')
    expect(invite).toContain('<a href="{{ .SiteURL }}/cms/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite" style=')
    expect(invite).toContain('>Crear mi usuario</a>')
    expect(invite).toContain('Inferencia <span style="color:#b4adc4;font-size:14px;font-weight:400;">&middot; Estudio &lt;Norte&gt;</span>')
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
    expect(invite).toContain('>You are invited to the content panel</h1>')
  })

  it('brands the emails 0.10 wrote and the project never edited', async () => {
    await mkdir(join(supabaseDir, 'templates'))
    const unbranded = [
      '<h2>Te invitaron al panel de contenido</h2>',
      '<p>Para crear tu usuario, elegí tu contraseña desde este link:</p>',
      `<p><a href="${confirmLink('/cms', 'invite')}">Crear mi usuario</a></p>`,
      '<p>Si no esperabas esta invitación, ignorá este email.</p>',
      ''
    ]
    await writeFile(join(supabaseDir, 'templates', 'invite.html'), unbranded.join('\r\n'))
    await writeFile(join(supabaseDir, 'templates', 'recovery.html'), `<p>Nuestro texto</p><a href="${confirmLink('/cms', 'recovery')}">Entrar</a>`)

    const t = await translatorOf('es')
    const planned = await syncTemplates({ supabaseDir, basePath: '/cms', t, write: false })
    expect(planned.slice(0, 2)).toEqual([
      { file: 'templates/invite.html', status: 'updated' },
      { file: 'templates/recovery.html', status: 'kept' }
    ])
    expect(await read('templates/invite.html')).toContain('<h2>')

    await syncTemplates({ supabaseDir, basePath: '/cms', t, product: 'Norte' })
    expect(await read('templates/invite.html')).toContain('&middot; Norte')
    expect(await read('templates/recovery.html')).toContain('Nuestro texto')
  })

  it('needs the Supabase folder of the project', async () => {
    await rm(join(supabaseDir, 'config.toml'))
    await expect(syncTemplates({ supabaseDir, basePath: '/cms', t: await translatorOf('es') })).rejects.toThrow('run supabase init first')
  })
})
