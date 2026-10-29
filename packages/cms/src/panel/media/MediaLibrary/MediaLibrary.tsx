'use client'
import './MediaLibrary.sass'
import { Dropdown } from 'primereact/dropdown'
import { useEffect, useRef, useState } from 'react'
import { languageName } from '../../../core/i18n/translator'
import { useCms, useT } from '../../client/context'
import { useText } from '../../fields/fieldUtils'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DashboardPageHeader from '../../primitives/DashboardPageHeader/DashboardPageHeader'
import DashboardToolbar from '../../primitives/DashboardToolbar/DashboardToolbar'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import Notice from '../../primitives/Notice/Notice'
import SearchInput from '../../primitives/SearchInput/SearchInput'
import SkeletonBlock from '../../primitives/SkeletonBlock/SkeletonBlock'
import { useNotify } from '../../providers/notify'
import MediaDetails from '../MediaDetails/MediaDetails'
import MediaGrid from '../MediaGrid/MediaGrid'
import MediaUploader from '../MediaUploader/MediaUploader'
import type { MediaItemType, MediaTypeType } from '../../../core/media'
import type { MediaQueryType } from '../../../server/media'
import type { Dispatch, SetStateAction } from 'react'

interface Props {
  header?: { title: string, subtitle: string }
  initialItems?: MediaItemType[]
  initialTotal?: number
  mode: 'manage' | 'pick'
  accept?: MediaTypeType | 'any'
  multiple?: boolean
  defaultFolder?: string
  canPurge?: boolean
  // Pick mode: the selection belongs to the picker, which shows it in its footer.
  selected?: MediaItemType[]
  onSelect?: Dispatch<SetStateAction<MediaItemType[]>>
}

// PrimeReact shows an empty Dropdown for '', so "no filter" needs its own value.
const ALL = 'all'

const SKELETON_COUNT = 12

const MediaLibrary = ({
  header,
  initialItems,
  initialTotal = 0,
  mode,
  accept = 'any',
  multiple = false,
  defaultFolder,
  canPurge = false,
  selected = [],
  onSelect
}: Props) => {
  const { t } = useT()
  const { config, actions } = useCms()
  const notify = useNotify()
  const text = useText()
  const fixedType = accept === 'any' ? undefined : accept
  const [query, setQuery] = useState<MediaQueryType>({ type: fixedType, folder: mode === 'pick' ? defaultFolder : undefined })
  const [items, setItems] = useState<MediaItemType[]>(initialItems ?? [])
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(!initialItems)
  const [failed, setFailed] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const [opened, setOpened] = useState<MediaItemType | null>(null)
  const skipFirstLoad = useRef(!!initialItems)
  // Only the newest request may touch the list: a slow page 1 must not land over a newer filter.
  const request = useRef(0)
  const sentinel = useRef<HTMLDivElement>(null)
  const hasMore = items.length < total

  const folderOptions = [
    { label: t('media.library.allFolders'), value: ALL },
    ...config.mediaFolders.map(option => ({ value: option.value, label: text(option.label) }))
  ]

  const typeOptions = [
    { label: t('media.library.types.any'), value: ALL },
    { label: t('media.library.types.image'), value: 'image' },
    { label: t('media.library.types.document'), value: 'document' },
    { label: t('media.library.types.video'), value: 'video' }
  ]

  const otherLocales = config.locales.filter(locale => locale !== config.defaultLocale)
  const altOptions = [
    { label: t('media.library.altAll'), value: ALL },
    ...otherLocales.map(locale => ({ value: locale, label: t('media.library.altMissingIn', { languages: languageName(locale, config.panelLocale) }) }))
  ]

  const load = async (nextQuery: MediaQueryType, nextPage = 1) => {
    const id = ++request.current
    setIsLoading(true)
    setFailed(false)
    try {
      const result = await actions.searchMedia({ ...nextQuery, page: nextPage })
      if (id !== request.current) return
      setItems(current => (nextPage === 1 ? result.items : [...current, ...result.items]))
      setTotal(result.total)
      setPage(nextPage)
    } catch {
      if (id === request.current) setFailed(true)
    } finally {
      if (id === request.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false
      return
    }
    void load(query)
  }, [query])

  const loadMore = () => {
    if (!isLoading && hasMore) void load(query, page + 1)
  }

  useEffect(() => {
    const element = sentinel.current
    if (!element || !hasMore || isLoading || failed || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore()
    }, { rootMargin: '200px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasMore, isLoading, failed, page, query])

  const update = (changes: MediaQueryType) => setQuery(current => ({ ...current, ...changes }))

  const activate = (item: MediaItemType) => {
    if (mode === 'manage') {
      setOpened(item)
      return
    }
    onSelect?.(current => {
      if (!multiple) return [item]
      return current.some(entry => entry.id === item.id) ? current.filter(entry => entry.id !== item.id) : [...current, item]
    })
  }

  // A reused library file may already be on screen: it is not added twice.
  const onUploaded = (uploaded: MediaItemType[], remaining: number) => {
    if (remaining === 0) setShowUploader(false)
    else if (uploaded.length > 0) notify({ severity: 'warn', summary: t('media.library.uploadedSome', { count: uploaded.length, remaining }) })
    setItems(current => {
      const fresh = uploaded.filter(item => !current.some(entry => entry.id === item.id))
      setTotal(total => total + fresh.length)
      return [...fresh, ...current]
    })
    if (mode === 'pick') onSelect?.(current => (multiple ? [...current, ...uploaded.filter(item => !current.some(entry => entry.id === item.id))] : uploaded.slice(-1)))
  }

  const toolbarActions = (
    <>
      {mode === 'manage' && (
        <CustomButton
          type='button'
          variant='secondary'
          aria-pressed={!!query.trash}
          onClick={() => update({ trash: !query.trash })}
        >
          <i className='pi pi-trash' aria-hidden='true' />
          {query.trash ? t('media.library.backToLibrary') : t('media.library.trash')}
        </CustomButton>
      )}
      {!query.trash && (
        <CustomButton
          type='button'
          variant={showUploader ? 'secondary' : 'primary'}
          onClick={() => setShowUploader(open => !open)}
          data-tour={mode === 'manage' ? 'media-upload' : undefined}
        >
          <i className={showUploader ? 'pi pi-times' : 'pi pi-upload'} aria-hidden='true' />
          {showUploader ? t('ui.close') : t('media.library.upload')}
        </CustomButton>
      )}
    </>
  )

  return (
    <div className='MediaLibrary'>
      {header && <DashboardPageHeader title={header.title} subtitle={header.subtitle} actions={toolbarActions} />}

      <DashboardToolbar data-tour={mode === 'manage' ? 'media-toolbar' : undefined} actions={header ? undefined : toolbarActions}>
        <SearchInput
          placeholder={t('media.library.searchPlaceholder')}
          onChange={value => update({ search: value?.trim() || undefined })}
        />
        <Dropdown
          inputId={`${mode}-media-folder`}
          aria-label={t('media.texts.folder')}
          value={query.folder ?? ALL}
          options={folderOptions}
          onChange={event => update({ folder: event.value === ALL ? undefined : event.value })}
        />
        {!fixedType && (
          <Dropdown
            inputId={`${mode}-media-type`}
            aria-label={t('media.library.fileType')}
            value={query.type ?? ALL}
            options={typeOptions}
            onChange={event => update({ type: event.value === ALL ? undefined : event.value })}
          />
        )}
        {otherLocales.length > 0 && (accept === 'any' || accept === 'image') && (
          <Dropdown
            inputId={`${mode}-media-alt`}
            aria-label={t('media.library.altFilter')}
            value={query.missingAlt ?? ALL}
            options={altOptions}
            onChange={event => update({ missingAlt: event.value === ALL ? undefined : event.value })}
          />
        )}
      </DashboardToolbar>

      {showUploader && !query.trash && (
        <MediaUploader defaultFolder={query.folder ?? defaultFolder} accept={accept} onUploaded={onUploaded} />
      )}

      {query.trash && <p className='MediaLibrary__Note'>{t('media.library.trashNote')}</p>}

      <p className='sr-only' aria-live='polite'>{isLoading ? '' : t('media.library.results', { count: total })}</p>

      {failed && (
        <Notice
          tone='error'
          action={<CustomButton type='button' variant='secondary' size='sm' onClick={() => load(query, items.length > 0 ? page + 1 : 1)}>{t('ui.retry')}</CustomButton>}
        >
          {t('media.library.loadFailed')}
        </Notice>
      )}

      <div aria-busy={isLoading}>
        {items.length > 0 ? (
          <MediaGrid
            items={items}
            selectable={mode === 'pick'}
            selectedIds={selected.map(item => item.id)}
            onActivate={activate}
          />
        ) : isLoading ? (
          <ul className='MediaLibrary__Skeleton' aria-hidden='true'>
            {Array.from({ length: SKELETON_COUNT }, (_, index) => <li key={index}><SkeletonBlock className='MediaLibrary__SkeletonItem' /></li>)}
          </ul>
        ) : (
          !failed && (
            <EmptyState
              icon={query.trash ? 'pi pi-trash' : 'pi pi-images'}
              title={query.trash ? t('media.library.trashEmpty') : t('media.library.noMatches')}
            />
          )
        )}
      </div>

      {hasMore && (
        <div ref={sentinel} className='flex justify-center'>
          <CustomButton type='button' variant='secondary' size='sm' loading={isLoading} onClick={loadMore}>
            {t('media.library.loadMore')}
          </CustomButton>
        </div>
      )}

      {opened && (
        <MediaDetails
          key={opened.id}
          item={opened}
          canPurge={canPurge}
          onHide={() => setOpened(null)}
          onChanged={changed => setItems(current => current.map(item => (item.id === changed.id ? changed : item)))}
          onRemoved={id => {
            setItems(current => current.filter(item => item.id !== id))
            setTotal(current => current - 1)
          }}
        />
      )}
    </div>
  )
}

export default MediaLibrary
