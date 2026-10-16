'use client'
import './PreviewPane.sass'
import { SelectButton } from 'primereact/selectbutton'
import { useEffect, useMemo, useRef, useState } from 'react'
import { draftUrl, PREVIEW_DEVICES } from '../../../core/preview'
import { useT } from '../../client/context'
import type { PreviewDeviceType } from '../../../core/preview'

interface Props {
  path: string
  // Changes after every autosave; the page in the iframe refreshes itself on the message.
  savedAt: Date | null
  // Section on screen in the editor: the page scrolls to the element with this id.
  anchor?: string | null
}

const withHash = (url: string, anchor?: string | null) => (anchor ? `${url}#${anchor}` : url)

interface DeviceOptionType {
  value: PreviewDeviceType
  icon: string
  label: string
}

const deviceTemplate = (option: DeviceOptionType) => (
  <span className='PreviewPane__Device'>
    <i className={`pi ${option.icon}`} aria-hidden='true' />
    <span className='sr-only'>{option.label}</span>
  </span>
)

const PreviewPane = ({ path, savedAt, anchor }: Props) => {
  const { t } = useT()
  const frame = useRef<HTMLIFrameElement>(null)
  const [device, setDevice] = useState<PreviewDeviceType>('desktop')
  const anchorRef = useRef(anchor)
  // The redirect from the draft route keeps the hash, so the first load already opens on the section.
  const src = useMemo(() => withHash(draftUrl(path), anchorRef.current), [path])
  const viewport = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const width = PREVIEW_DEVICES[device].width
  // Wider devices are rendered at their real width and scaled down to fit, like a zoomed-out browser.
  const scale = box.width ? Math.min(1, box.width / width) : 1
  const options: DeviceOptionType[] = (Object.keys(PREVIEW_DEVICES) as PreviewDeviceType[])
    .map(value => ({ value, icon: PREVIEW_DEVICES[value].icon, label: t(`editor.previewPane.devices.${value}`) }))

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (savedAt) frame.current?.contentWindow?.postMessage({ type: 'cms:refresh' }, window.location.origin)
  }, [savedAt])

  useEffect(() => {
    if (anchorRef.current === anchor) return
    anchorRef.current = anchor
    if (anchor) frame.current?.contentWindow?.postMessage({ type: 'cms:scroll', anchor }, window.location.origin)
  }, [anchor])

  return (
    <div className='PreviewPane'>
      <div className='PreviewPane__Toolbar'>
        <SelectButton
          value={device}
          options={options}
          optionValue='value'
          itemTemplate={deviceTemplate}
          onChange={event => event.value && setDevice(event.value)}
          allowEmpty={false}
          aria-label={t('editor.previewPane.size')}
        />
        <a href={withHash(draftUrl(path), anchor)} target='_blank' rel='noopener noreferrer' className='PreviewPane__Open'>
          <i className='pi pi-external-link' aria-hidden='true' />
          {t('editor.previewPane.open')}
        </a>
      </div>

      <div ref={viewport} className='PreviewPane__Viewport'>
        <div className='PreviewPane__Stage' style={{ width: width * scale }}>
          <iframe
            ref={frame}
            src={src}
            title={t('editor.previewPane.frame')}
            className='PreviewPane__Frame'
            style={{ width, height: box.height / scale || '100%', transform: `scale(${scale})` }}
          />
        </div>
      </div>
    </div>
  )
}

export default PreviewPane
