'use client'
import './RichTextEditor.sass'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { classNames } from 'primereact/utils'
import { use, useEffect, useRef, useState } from 'react'
import { RICH_TEXT_HEADING_LEVELS } from '../../../core/richText/nodes'
import { entryPath, slugPrefixFor } from '../../../core/urls'
import parseVideoUrl from '../../../core/video'
import { useCms, useT } from '../../client/context'
import LinkDialog from '../../editor/LinkDialog/LinkDialog'
import UrlDialog from '../../editor/UrlDialog/UrlDialog'
import MediaPicker from '../../media/MediaPicker/MediaPicker'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import { useStoredText } from '../fieldUtils'
import { ReferencesContext } from '../referencesContext'
import { richTextExtensions } from './extensions'
import type { EditorImageType } from './extensions'
import type { MediaItemType } from '../../../core/media'
import type { RichTextDocType, RichTextHeadingLevelType } from '../../../core/richText/nodes'
import type { EntryTargetType } from '../LinkInput/EntryPicker'
import type { Editor } from '@tiptap/react'

interface Props {
  id: string
  label: string
  value: RichTextDocType | null
  headings?: readonly RichTextHeadingLevelType[]
  invalid: boolean
  describedBy?: string
  onChange: (value: RichTextDocType) => void
  onBlur: () => void
}

// The selection is captured when the dialog opens: focusing the editor again from the dialog can reset it.
type DialogType = { kind: 'link' | 'video' | 'image', from: number, to: number } | null

type ToolNameType = 'bold' | 'italic' | 'underline' | 'strike' | 'bulletList' | 'orderedList' | 'quote' | 'divider'

interface ToolType {
  name: ToolNameType
  icon?: string
  text?: string
  // Marks show their letter in their own format; PrimeIcons has no bold, italic or underline icon.
  glyph?: 'Bold' | 'Italic' | 'Underline' | 'Strike'
  isActive?: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const MARK_TOOLS: ToolType[] = [
  { name: 'bold', text: 'B', glyph: 'Bold', isActive: e => e.isActive('bold'), run: e => e.chain().focus().toggleBold().run() },
  { name: 'italic', text: 'I', glyph: 'Italic', isActive: e => e.isActive('italic'), run: e => e.chain().focus().toggleItalic().run() },
  { name: 'underline', text: 'U', glyph: 'Underline', isActive: e => e.isActive('underline'), run: e => e.chain().focus().toggleUnderline().run() },
  { name: 'strike', text: 'S', glyph: 'Strike', isActive: e => e.isActive('strike'), run: e => e.chain().focus().toggleStrike().run() }
]

const BLOCK_TOOLS: ToolType[] = [
  { name: 'bulletList', icon: 'pi pi-list', isActive: e => e.isActive('bulletList'), run: e => e.chain().focus().toggleBulletList().run() },
  { name: 'orderedList', text: '1.', isActive: e => e.isActive('orderedList'), run: e => e.chain().focus().toggleOrderedList().run() },
  { name: 'quote', icon: 'pi pi-comment', isActive: e => e.isActive('blockquote'), run: e => e.chain().focus().toggleBlockquote().run() },
  { name: 'divider', icon: 'pi pi-minus', run: e => e.chain().focus().setHorizontalRule().run() }
]

// Loaded lazily by RichTextInput: Tiptap only reaches the browser when a rich text field is on screen.
const RichTextEditor = ({ id, label, value, headings = RICH_TEXT_HEADING_LEVELS, invalid, describedBy, onChange, onBlur }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const stored = useStoredText()
  const [dialog, setDialog] = useState<DialogType>(null)
  const knownMedia = use(ReferencesContext).media
  // Files picked while editing, next to the ones the document already had when it loaded.
  const picked = useRef(new Map<string, MediaItemType>())
  const lookup = (mediaId: string): EditorImageType | undefined => {
    const item = picked.current.get(mediaId) ?? knownMedia[mediaId]
    return item && { url: item.url, alt: stored(item.alt), width: item.width, height: item.height }
  }
  const lookupRef = useRef(lookup)

  const callbacks = useRef({ onChange, onBlur })
  const pendingFrame = useRef<number | null>(null)

  useEffect(() => {
    callbacks.current = { onChange, onBlur }
    lookupRef.current = lookup
  })

  // Form state is updated on the next frame, never inside ProseMirror's dispatch (IME input looped there).
  const emitChange = (current: Editor) => {
    if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current)
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null
      callbacks.current.onChange(current.getJSON() as RichTextDocType)
    })
  }

  // Created once: re-applying options on each render loops onUpdate → setValue. Remount to load new content.
  const editor = useEditor({
    immediatelyRender: false,
    extensions: richTextExtensions(mediaId => lookupRef.current(mediaId), headings),
    content: value ?? undefined,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        class: 'RichTextEditor__Content'
      }
    },
    onUpdate: ({ editor: current }) => emitChange(current),
    onBlur: () => callbacks.current.onBlur()
  }, [])

  useEffect(() => () => {
    if (pendingFrame.current === null || !editor) return
    cancelAnimationFrame(pendingFrame.current)
    callbacks.current.onChange(editor.getJSON() as RichTextDocType)
  }, [editor])

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      active: current ? [...MARK_TOOLS, ...BLOCK_TOOLS].map(tool => tool.isActive?.(current) ?? false) : [],
      heading: current ? headings.find(level => current.isActive('heading', { level })) ?? null : null,
      link: current?.getAttributes('link') as { href?: string, target?: string, entry?: string, id?: string, anchor?: string } | undefined,
      canUndo: current?.can().undo() ?? false,
      canRedo: current?.can().redo() ?? false
    })
  })

  if (!editor) return <div className='RichTextEditor RichTextEditor--Loading'>{t('richTextEditor.loading')}</div>

  // The site resolves the target per language; href is what a reader that doesn't know it falls back to.
  const fallbackHref = ({ entry, anchor }: EntryTargetType) => {
    const target = entry ? config.schema[entry] : undefined
    if (!target) return '/'
    const path = target.kind === 'collection' ? slugPrefixFor(config, target, config.defaultLocale) : entryPath(config, target)
    return `${path ?? '/'}${anchor ? `#${anchor}` : ''}`
  }

  const validateVideo = (url: string) => (parseVideoUrl(url) ? null : t('richTextEditor.videoInvalid'))

  const openDialog = (kind: 'link' | 'video' | 'image') =>
    setDialog({ kind, from: editor.state.selection.from, to: editor.state.selection.to })

  // Focus goes back to the text, not to the toolbar button that opened the dialog.
  const closeDialog = () => {
    setDialog(null)
    setTimeout(() => editor.commands.focus(), 0)
  }

  const renderTool = (tool: ToolType, index: number) => (
    <CustomButton
      key={tool.name}
      type='button'
      variant='ghost'
      size='xs'
      iconOnly
      icon={tool.icon}
      aria-label={t(`richTextEditor.${tool.name}`)}
      aria-pressed={tool.isActive ? !!state?.active[index] : undefined}
      className={classNames('RichTextEditor__Tool', { 'RichTextEditor__Tool--Active': state?.active[index] })}
      onClick={() => tool.run(editor)}
    >
      {tool.glyph ? <span className={`RichTextEditor__Glyph RichTextEditor__Glyph--${tool.glyph}`}>{tool.text}</span> : tool.text}
    </CustomButton>
  )

  return (
    <div className={classNames('RichTextEditor', { 'RichTextEditor--Invalid': invalid })}>
      {/* mousedown is cancelled so clicking a tool never takes focus (and the selection) away from the text. */}
      <div
        role='toolbar'
        aria-label={t('richTextEditor.toolbar', { label })}
        aria-controls={id}
        className='RichTextEditor__Toolbar'
        onMouseDown={event => event.preventDefault()}
      >
        {headings.map(level => (
          <CustomButton
            key={level}
            type='button'
            variant='ghost'
            size='xs'
            iconOnly
            aria-label={t('richTextEditor.heading', { level })}
            aria-pressed={state?.heading === level}
            className={classNames('RichTextEditor__Tool', { 'RichTextEditor__Tool--Active': state?.heading === level })}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          >
            H{level}
          </CustomButton>
        ))}
        <span className='RichTextEditor__Divider' aria-hidden='true' />
        {MARK_TOOLS.map((tool, index) => renderTool(tool, index))}
        <CustomButton
          type='button'
          variant='ghost'
          size='xs'
          iconOnly
          icon='pi pi-link'
          aria-label={t('richTextEditor.link')}
          aria-pressed={!!state?.link?.href}
          className={classNames('RichTextEditor__Tool', { 'RichTextEditor__Tool--Active': !!state?.link?.href })}
          onClick={() => openDialog('link')}
        />
        <span className='RichTextEditor__Divider' aria-hidden='true' />
        {BLOCK_TOOLS.map((tool, index) => renderTool(tool, MARK_TOOLS.length + index))}
        <CustomButton
          type='button'
          variant='ghost'
          size='xs'
          iconOnly
          icon='pi pi-image'
          aria-label={t('richTextEditor.insertImage')}
          className='RichTextEditor__Tool'
          onClick={() => openDialog('image')}
        />
        <CustomButton
          type='button'
          variant='ghost'
          size='xs'
          iconOnly
          icon='pi pi-video'
          aria-label={t('richTextEditor.insertVideo')}
          className='RichTextEditor__Tool'
          onClick={() => openDialog('video')}
        />
        <span className='RichTextEditor__Divider' aria-hidden='true' />
        <CustomButton
          type='button'
          variant='ghost'
          size='xs'
          iconOnly
          icon='pi pi-undo'
          aria-label={t('richTextEditor.undo')}
          disabled={!state?.canUndo}
          className='RichTextEditor__Tool'
          onClick={() => editor.chain().focus().undo().run()}
        />
        <CustomButton
          type='button'
          variant='ghost'
          size='xs'
          iconOnly
          icon='pi pi-refresh'
          aria-label={t('richTextEditor.redo')}
          disabled={!state?.canRedo}
          className='RichTextEditor__Tool'
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      <EditorContent editor={editor} />

      {dialog?.kind === 'link' && (
        <LinkDialog
          initialValue={{
            url: state?.link?.entry ? '' : state?.link?.href ?? '',
            newTab: state?.link?.target === '_blank',
            target: state?.link?.entry ? { entry: state.link.entry, id: state.link.id ?? undefined, anchor: state.link.anchor ?? undefined } : null
          }}
          onHide={closeDialog}
          onRemove={state?.link?.href ? () => {
            editor.chain().focus().setTextSelection(dialog).extendMarkRange('link').unsetLink().run()
            closeDialog()
          } : undefined}
          onSubmit={({ url, newTab, target }) => {
            const attributes = target
              ? { href: fallbackHref(target), entry: target.entry ?? null, id: target.id ?? null, anchor: target.anchor ?? null }
              : { href: url, entry: null, id: null, anchor: null }
            editor.chain().focus().setTextSelection(dialog).extendMarkRange('link')
              .setLink({ ...attributes, target: newTab ? '_blank' : null }).run()
            editor.commands.setTextSelection(editor.state.selection.to)
            closeDialog()
          }}
        />
      )}

      {dialog?.kind === 'image' && (
        <MediaPicker
          header={t('richTextEditor.insertImage')}
          accept='image'
          onHide={closeDialog}
          onPick={([item]) => {
            picked.current.set(item.id, item)
            editor.chain().focus().insertContentAt(dialog.to, { type: 'image', attrs: { mediaId: item.id } }).run()
            closeDialog()
          }}
        />
      )}

      {dialog?.kind === 'video' && (
        <UrlDialog
          header={t('richTextEditor.insertVideo')}
          label={t('richTextEditor.videoLabel')}
          placeholder={t('fields.placeholders.video')}
          validate={validateVideo}
          onHide={closeDialog}
          onSubmit={({ url }) => {
            // Inserted after the selection so selected text is never replaced by the video.
            editor.chain().focus().insertContentAt(dialog.to, { type: 'video', attrs: { src: url } }).run()
            closeDialog()
          }}
        />
      )}
    </div>
  )
}

export default RichTextEditor
