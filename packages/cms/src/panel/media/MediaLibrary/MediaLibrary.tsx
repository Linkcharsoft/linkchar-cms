'use client'
import './MediaLibrary.sass'
import { Dropdown } from 'primereact/dropdown'
import { useEffect, useRef, useState } from 'react'
import { useCms, useT } from '../../client/context'
import { useText } from '../../fields/fieldUtils'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DashboardPageHeader from '../../primitives/DashboardPageHeader/DashboardPageHeader'
import DashboardToolbar from '../../primitives/DashboardToolbar/DashboardToolbar'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import SearchInput from '../../primitives/SearchInput/SearchInput'
import MediaDetails from '../MediaDetails/MediaDetails'
import MediaGrid from '../MediaGrid/MediaGrid'
import MediaUploader from '../MediaUploader/MediaUploader'
import type { MediaItemType } from '../../../core/media'
import type { MediaQueryType } from '../../../server/media'

interface Props {
  header?: { title: string, subtitle: string }
  initialItems?: MediaItemType[]
  initialTotal?: number
  mode: 'manage' | 'pick'
  accept?: 'image' | 'document' | 'any'
  multiple?: boolean
  defaultFolder?: string
  canPurge?: boolean
  onPick?: (items: MediaItemType[]) => void
}

// PrimeReact shows an empty Dropdown for '', so "no filter" needs its own value.
const ALL = 'all'

const MediaLibrary = ({
  header,
  initialItems,
  initialTotal = 0,
  mode,
  accept = 'any',
  multiple = false,
  defaultFolder,
  canPurge = false,
  onPick
}: Props) => {
  const { t } = useT()
  const { config, actions } = useCms()
  const text = useText()
  const fixedType = accept === 'any' ? undefined : accept
  const [query, setQuery] = useState<MediaQueryType>({ type: fixedType, folder: mode === 'pick' ? defaultFolder : undefined })
  const [items, setItems] = useState<MediaItemType[]>(initialItems ?? [])
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(!initialItems)
  const [showUploader, setShowUploader] = useState(false)
  const [opened, setOpened] = useState<MediaItemType | null>(null)
  const [selected, setSelected] = useState<MediaItemType[]>([])
  const skipFirstLoad = useRef(!!initialItems)

  const folderOptions = [
    { label: t('media.library.allFolders'), value: ALL },
    ...config.mediaFolders.map(option => ({ value: option.value, label: text(option.label) }))
  ]

  const typeOptions = [
    { label: t('media.library.types.any'), value: ALL },
    { label: t('media.library.types.image'), value: 'image' },
    { label: t('media.library.types.document'), value: 'document' }
  ]

  const load = async (nextQuery: MediaQueryType, nextPage = 1) => {
    setIsLoading(true)
    const result = await actions.searchMedia({ ...nextQuery, page: nextPage })
    setItems(current => (nextPage === 1 ? result.items : [...current, ...result.items]))
    setTotal(result.total)
    setPage(nextPage)
    setIsLoading(false)
  }

  useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false
      return
    }
    void load(query)
  }, [query])

  const update = (changes: MediaQueryType) => setQuery(current => ({ ...current, ...changes }))

  const activate = (item: MediaItemType) => {
    if (mode === 'manage') {
      setOpened(item)
      return
    }
    setSelected(current => {
      if (!multiple) return [item]
      return current.some(entry => entry.id === item.id) ? current.filter(entry => entry.id !== item.id) : [...current, item]
    })
  }

  const onUploaded = (uploaded: MediaItemType[]) => {
    setShowUploader(false)
    setItems(current => [...uploaded, ...current])
    setTotal(current => current + uploaded.length)
    if (mode === 'pick') setSelected(current => (multiple ? [...current, ...uploaded] : uploaded.slice(-1)))
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
      </DashboardToolbar>

      {showUploader && !query.trash && (
        <MediaUploader defaultFolder={query.folder ?? defaultFolder} accept={accept} onUploaded={onUploaded} />
      )}

      {query.trash && <p className='MediaLibrary__Note'>{t('media.library.trashNote')}</p>}

      <div aria-busy={isLoading} aria-live='polite'>
        {items.length > 0 ? (
          <MediaGrid
            items={items}
            selectable={mode === 'pick'}
            selectedIds={selected.map(item => item.id)}
            onActivate={activate}
          />
        ) : (
          !isLoading && (
            <EmptyState
              icon={query.trash ? 'pi pi-trash' : 'pi pi-images'}
              title={query.trash ? t('media.library.trashEmpty') : t('media.library.noMatches')}
            />
          )
        )}
      </div>

      {items.length < total && (
        <div className='flex justify-center'>
          <CustomButton type='button' variant='secondary' size='sm' loading={isLoading} onClick={() => load(query, page + 1)}>
            {t('media.library.loadMore')}
          </CustomButton>
        </div>
      )}

      {mode === 'pick' && (
        <div className='MediaLibrary__PickBar'>
          <span className='MediaLibrary__PickCount'>
            {selected.length ? t('media.library.selected', { count: selected.length }) : t('media.library.pickOne')}
          </span>
          <CustomButton type='button' disabled={!selected.length} onClick={() => onPick?.(selected)}>
            {multiple ? t('media.library.useSelection') : t('media.library.useFile')}
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
