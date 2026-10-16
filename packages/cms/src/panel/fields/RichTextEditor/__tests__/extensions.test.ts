// @vitest-environment jsdom
import { Editor } from '@tiptap/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RICH_TEXT_MARKS, RICH_TEXT_NODES } from '../../../../core/richText/nodes'
import { richTextExtensions } from '../extensions'
import type { RichTextNodeType } from '../../../../core/richText/nodes'

const SUPABASE_URL = 'http://127.0.0.1:54321'

let editor: Editor | null = null

afterEach(() => editor?.destroy())

const collect = (node: RichTextNodeType, nodes = new Set<string>(), marks = new Set<string>()) => {
  nodes.add(node.type)
  node.marks?.forEach(mark => marks.add(mark.type))
  node.content?.forEach(child => collect(child, nodes, marks))
  return { nodes, marks }
}

const load = (html: string) => {
  editor = new Editor({ extensions: richTextExtensions(SUPABASE_URL), content: html })
  return editor.getJSON() as RichTextNodeType
}

describe('richTextExtensions', () => {
  it('keeps pasted Word / Google Docs content inside the allowlist', () => {
    const json = load(`
      <h1>Título principal</h1>
      <p class="MsoNormal"><span style="color:red;font-family:Comic Sans">Rojo</span> <code>code</code></p>
      <b style="font-weight:normal" id="docs-internal-guid-1"><p>Texto de Google Docs</p></b>
      <pre><code>const x = 1</code></pre>
      <table><tr><td>celda</td></tr></table>
      <img src="https://otro-sitio.com/foto.jpg">
      <script>alert(1)</script>
      <p><a href="javascript:alert(1)">malo</a> <a href="https://example.com">bueno</a> <u>sub</u> <s>tach</s></p>
    `)
    const { nodes, marks } = collect(json)

    expect([...nodes].every(type => (RICH_TEXT_NODES as readonly string[]).includes(type)), [...nodes].join()).toBe(true)
    expect([...marks].every(type => (RICH_TEXT_MARKS as readonly string[]).includes(type)), [...marks].join()).toBe(true)
    const findText = (node: RichTextNodeType, text: string): RichTextNodeType | undefined =>
      node.text === text ? node : node.content?.map(child => findText(child, text)).find(Boolean)
    const docsText = findText(json, 'Texto de Google Docs')
    expect(docsText).toBeDefined()
    expect(docsText?.marks ?? []).toEqual([])
    expect(JSON.stringify(json)).not.toContain('javascript:')
    expect(JSON.stringify(json)).toContain('https://example.com')
  })

  it('turns H1 into a paragraph and keeps H2–H4', () => {
    const json = load('<h1>a</h1><h2>b</h2><h4>c</h4><h5>d</h5>')
    expect(json.content?.map(node => `${node.type}${node.attrs?.level ?? ''}`)).toEqual(['paragraph', 'heading2', 'heading4', 'paragraph'])
  })

  it('keeps only the heading levels the field allows', () => {
    editor = new Editor({ extensions: richTextExtensions(SUPABASE_URL, [2]), content: '<h2>a</h2><h3>b</h3>' })
    expect(editor.getJSON().content?.map(node => `${node.type}${node.attrs?.level ?? ''}`)).toEqual(['heading2', 'paragraph'])
  })

  it('keeps images from the media bucket and drops images from other sites', () => {
    const own = `${SUPABASE_URL}/storage/v1/object/public/media/blog/2026/a.webp`
    const json = load(`<img src="${own}" alt="Sala" width="800" height="600" data-media-id="m1"><img src="https://otro.com/x.jpg">`)
    const images = (json.content ?? []).filter(node => node.type === 'image')

    expect(images).toHaveLength(1)
    expect(images[0].attrs).toMatchObject({ src: own, alt: 'Sala', mediaId: 'm1' })
  })

  it('drops images from another Supabase project', () => {
    const json = load('<img src="http://127.0.0.1:9999/storage/v1/object/public/media/blog/2026/a.webp">')
    expect((json.content ?? []).filter(node => node.type === 'image')).toHaveLength(0)
  })

  it('round-trips video nodes', () => {
    editor = new Editor({
      extensions: richTextExtensions(SUPABASE_URL),
      content: { type: 'doc', content: [{ type: 'video', attrs: { src: 'https://vimeo.com/76979871' } }] }
    })
    expect(editor.getJSON().content).toEqual([{ type: 'video', attrs: { src: 'https://vimeo.com/76979871', title: null, caption: null } }])
  })

  it('keeps the title and caption of migrated videos', () => {
    const attrs = { src: 'https://youtu.be/abcdefghijk', title: 'Entrevista', caption: 'Charla completa' }
    editor = new Editor({ extensions: richTextExtensions(SUPABASE_URL), content: { type: 'doc', content: [{ type: 'video', attrs }] } })
    expect(editor.getJSON().content).toEqual([{ type: 'video', attrs }])
  })
})
