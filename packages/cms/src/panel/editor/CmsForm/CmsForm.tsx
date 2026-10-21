'use client'
import './CmsForm.sass'
import { FormikProvider, getIn, setIn, useFormik } from 'formik'
import { usePathname, useRouter } from 'next/navigation'
import { Dropdown } from 'primereact/dropdown'
import { Tag } from 'primereact/tag'
import { classNames } from 'primereact/utils'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { documentTitle, getEntry } from '../../../core/entries'
import { languageName } from '../../../core/i18n/translator'
import { changedKeys, pickKeys, rebase, sameContent } from '../../../core/merge'
import { countByLocale, missingContent } from '../../../core/missing'
import { pageSections } from '../../../core/pages'
import { visibleFields } from '../../../core/permissions'
import { displayStatus } from '../../../core/status'
import { entryPath, slugsOf } from '../../../core/urls'
import { validateContent } from '../../../core/validation'
import { fieldLabel } from '../../../core/walk'
import { useCms, usePaths, useT, useTextContext } from '../../client/context'
import { EntryContext } from '../../fields/entryContext'
import { fieldId } from '../../fields/fieldUtils'
import { errorPaths, FormFocusContext } from '../../fields/formFocusContext'
import { MediaRegistryContext, ReferencesContext } from '../../fields/referencesContext'
import { RemountContext } from '../../fields/remountContext'
import VersionHistory from '../../history/VersionHistory/VersionHistory'
import { DOCUMENT_SEVERITIES } from '../../lists/documentStatus'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import DashboardPageHeader from '../../primitives/DashboardPageHeader/DashboardPageHeader'
import Notice from '../../primitives/Notice/Notice'
import { useNotify } from '../../providers/notify'
import AutosaveStatus from '../AutosaveStatus/AutosaveStatus'
import CmsFields from '../CmsFields/CmsFields'
import ConflictDialog from '../ConflictDialog/ConflictDialog'
import PageFields from '../PageFields/PageFields'
import PreviewPane from '../PreviewPane/PreviewPane'
import useAutosave from '../useAutosave'
import type { MissingContentType } from '../../../core/missing'
import type { DocumentStatusType } from '../../../core/status'
import type { ContentErrorsType } from '../../../core/validation'
import type { ReplaceDraftResultType } from '../../../server/versions'
import type { RevealType } from '../../fields/formFocusContext'
import type { MediaRegistryType, ResolvedReferencesType } from '../../fields/referencesContext'
import type { AutosaveOutcomeType } from '../useAutosave'
import type { FormikErrors, FormikTouched } from 'formik'
import type { Route } from 'next'
import type { ReactNode } from 'react'

type DataRecord = Record<string, unknown>

interface Props {
  entryId: string
  documentId: string | null
  initialData: DataRecord
  initialRevision: number | null
  // Pages only: published content, to mark which sections changed.
  publishedData?: DataRecord | null
  isSuperadmin: boolean
  title: string
  // Publication status when the page loaded; null while the content was never saved.
  status?: DocumentStatusType | null
  // Whether missing content kept it out of the publication when the page loaded; the editor re-checks after each save.
  incomplete?: boolean
  toolbar?: ReactNode
  references?: ResolvedReferencesType
  // Language being edited, from `?locale=`; the default one otherwise.
  initialLocale?: string
}

const MAX_MISSING_LISTED = 4

const EMPTY_REFERENCES: ResolvedReferencesType = { relations: {}, media: {} }

const toNested = <V,>(errors: ContentErrorsType, value: (message: string) => V) =>
  Object.entries(errors).reduce<DataRecord>((acc, [path, message]) => setIn(acc, path, value(message)), {})

// The schema is resolved here: it holds functions and RegExps, which can't cross the server → client boundary.
const CmsForm = ({
  entryId, documentId, initialData, initialRevision, publishedData = null, isSuperadmin, title, status = null, incomplete = false, toolbar,
  references = EMPTY_REFERENCES, initialLocale
}: Props) => {
  const { t } = useT()
  const { config, actions } = useCms()
  const paths = usePaths()
  const textCtx = useTextContext()
  const router = useRouter()
  const pathname = usePathname()
  const notify = useNotify()
  const confirm = useConfirm()
  const entry = getEntry(config, entryId)
  const fields = visibleFields(entry?.fields ?? {}, isSuperadmin)
  const document = useRef({ id: documentId, revision: initialRevision })
  // Last state confirmed by the server, per top-level key: saves send only what changed since then.
  const base = useRef(initialData)
  const [locale, setLocale] = useState(initialLocale && config.locales.includes(initialLocale) ? initialLocale : config.defaultLocale)
  const [conflict, setConflict] = useState<{ data: DataRecord, updatedAt: string, keys: string[] } | null>(null)
  const [remounts, setRemounts] = useState<Record<string, number>>({})
  const [missing, setMissing] = useState<MissingContentType[] | null>(null)
  const [anchor, setAnchor] = useState<string | null>(entry?.anchor ?? null)
  const [edited, setEdited] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [reveal, setReveal] = useState<RevealType | null>(null)
  const [media, setMedia] = useState(references.media)
  const registry = useMemo<MediaRegistryType>(() => ({
    media,
    remember: (...items) => setMedia(current => ({ ...current, ...Object.fromEntries(items.map(item => [item.id, item])) }))
  }), [media])
  // What a save left unsaved (a taken URL): shown on its field until the editor changes that value.
  const serverErrors = useRef<{ path: string, message: string, value: unknown }[]>([])
  const label = (path: string) => fieldLabel(fields, path, textCtx)

  const formik = useFormik<DataRecord>({
    initialValues: initialData,
    validate: async values => {
      const { errors } = await validateContent(config, fields, values, { mode: 'draft' })
      const standing = serverErrors.current.filter(error => sameContent(getIn(values, error.path), error.value))
      return toNested({ ...Object.fromEntries(standing.map(error => [error.path, error.message])), ...errors }, message => message)
    },
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: () => undefined
  })

  const latestValues = useRef(formik.values)
  useEffect(() => {
    latestValues.current = formik.values
  })

  // Values that arrive from outside remount their inputs: rich text isn't controlled.
  const remount = (keys: string[]) => {
    if (keys.length > 0) setRemounts(current => ({ ...current, ...Object.fromEntries(keys.map(key => [key, (current[key] ?? 0) + 1])) }))
  }

  const adopt = (values: DataRecord, keys: string[]) => {
    for (const key of keys) void formik.setFieldValue(key, values[key], false)
    remount(keys)
  }

  const save = async (values: DataRecord): Promise<AutosaveOutcomeType> => {
    // Plain JSON only: ProseMirror attrs aren't plain objects and would reach the server action as empty references.
    const data = JSON.parse(JSON.stringify(values)) as DataRecord
    const keys = changedKeys(data, base.current)
    if (keys.length === 0) return 'saved'

    const isNew = !document.current.id
    const result = await actions.saveDocument({
      entryId,
      id: document.current.id,
      patch: pickKeys(data, keys),
      base: isNew ? base.current : pickKeys(base.current, keys)
    })

    switch (result.status) {
      case 'saved': {
        document.current = { id: result.id, revision: result.revision }
        const rebased = rebase(latestValues.current, base.current, result.data, keys)
        base.current = rebased.base
        // A slug the server replaced is taken unless the editor typed over it meanwhile.
        const adjusted = (result.adjusted ?? []).filter(key => sameContent(latestValues.current[key], data[key]))
        const adopted = [...rebased.adopted, ...adjusted]
        if (adopted.length > 0) adopt({ ...rebased.values, ...pickKeys(result.data, adjusted) }, adopted)
        showServerErrors(result.errors ?? {}, data)
        setEdited(true)
        return result.errors ? 'partial' : 'saved'
      }
      case 'invalid':
        formik.setErrors(toNested(result.errors, message => message) as FormikErrors<DataRecord>)
        formik.setTouched(toNested(result.errors, () => true) as FormikTouched<DataRecord>, false)
        return 'invalid'
      case 'conflict':
        document.current = { id: result.id, revision: result.revision }
        setConflict({ data: result.data, updatedAt: result.updatedAt, keys: result.keys })
        return 'conflict'
      default:
        return 'error'
    }
  }

  const showServerErrors = (errors: ContentErrorsType, sent: DataRecord) => {
    if (serverErrors.current.length === 0 && Object.keys(errors).length === 0) return
    serverErrors.current = Object.entries(errors).map(([path, message]) => ({ path, message, value: getIn(sent, path) }))
    for (const { path } of serverErrors.current) void formik.setFieldTouched(path, true, false)
    void formik.validateForm()
  }

  const autosave = useAutosave({ values: formik.values, save, enabled: !conflict })

  useEffect(() => {
    let cancelled = false
    missingContent(config, fields, formik.values, { mediaAlt: id => media[id]?.alt }).then(found => {
      if (!cancelled) setMissing(found)
    })
    return () => {
      cancelled = true
    }
  // Re-checked after each save, not on every keystroke, and when a file or its alt text changes.
  }, [autosave.savedAt, media])

  useEffect(() => () => void autosave.flush(), [])

  const replaceValues = (values: DataRecord) => {
    const keys = changedKeys(latestValues.current, values)
    base.current = values
    formik.resetForm({ values })
    autosave.markSaved(values)
    remount(keys)
  }

  const loadCurrent = () => {
    if (!conflict) return
    replaceValues(conflict.data)
    setConflict(null)
  }

  const prepareReplace = async () => ((await autosave.flush()) && !conflict ? document.current.revision : null)

  const replace = async (run: (revision: number) => Promise<ReplaceDraftResultType>, success: string) => {
    const revision = await prepareReplace()
    if (revision === null) {
      notify({ severity: 'warn', summary: t('editor.resolveFirst') })
      return false
    }

    const result = await run(revision)
    if (result.status === 'replaced') {
      document.current = { id: document.current.id, revision: result.revision }
      replaceValues(result.data)
      setEdited(false)
      router.refresh()
      notify({ severity: 'success', summary: success })
      return true
    }
    if (result.status === 'conflict') {
      notify({ severity: 'warn', summary: t('editor.someoneSaved'), detail: t('editor.reloadAndRetry'), life: 6000 })
    } else {
      notify({ severity: 'error', summary: t('editor.couldNotFinish'), detail: textCtx.translator.translate(result.error) })
    }
    return false
  }

  const discardSection = (key: string, sectionLabel: string) => confirm({
    header: t('editor.discardSection.header', { label: sectionLabel }),
    message: t('editor.discardSection.message', { label: sectionLabel }),
    acceptLabel: t('editor.discardSection.accept'),
    tone: 'danger',
    accept: () => {
      void replace(
        revision => actions.discardChanges(entryId, document.current.id ?? '', revision, key),
        t('editor.discardSection.done', { label: sectionLabel })
      )
    }
  })

  const onAnchorChange = useCallback((next: string | null) => setAnchor(next), [])

  const reviewAndPublish = async () => {
    await autosave.flush()
    router.push(paths.publishItem(document.current.id ?? undefined) as Route)
  }

  // The language lives in the URL, so a reload or a shared link opens the same one.
  const switchLocale = (next: string) => {
    setLocale(next)
    const query = new URLSearchParams(window.location.search)
    if (next === config.defaultLocale) query.delete('locale')
    else query.set('locale', next)
    const search = query.toString()
    window.history.replaceState(null, '', `${pathname}${search ? `?${search}` : ''}${window.location.hash}`)
  }

  // Opens whatever hides the field (language, tab, panel, group, page section) and then focuses it.
  const showField = (field: string, own: string | null) => {
    if (own && own !== locale) switchLocale(own)
    setReveal({ path: field, nonce: Date.now() })
    window.setTimeout(() => {
      // Inputs are named after the field, never the locale: "hero.title.en" lives in #cms-hero-title.
      const id = fieldId(field)
      const element = window.document.getElementById(id) ?? window.document.querySelector<HTMLElement>(`[id^="${id}"]`)
      element?.scrollIntoView({ block: 'center' })
      element?.focus({ preventScroll: true })
    }, 350)
  }

  // A link to one field ("#hero.title", from Publish) opens it; a page section alone is PageFields' job.
  useEffect(() => {
    const target = decodeURIComponent(window.location.hash.slice(1))
    const isSection = entry?.kind === 'page' && pageSections(fields).some(section => section.key === target)
    if (target && !isSection) showField(target, null)
  // Only on load.
  }, [])

  if (!entry) return null

  const multilingual = config.locales.length > 1
  const missingLabel = (item: MissingContentType) => {
    const name = item.kind === 'alt' ? t('validation.altOf', { field: label(item.field) }) : label(item.field)
    return multilingual && item.locale && item.locale !== locale ? `${name} (${languageName(item.locale, config.panelLocale)})` : name
  }
  const known = missing ?? []
  const isIncomplete = missing ? missing.length > 0 : incomplete
  const counts = countByLocale(config, known)
  const localeOption = (option: { value: string, label: string } | null) => option && (
    <span className='CmsForm__LocaleOption'>
      {option.label}
      <span className={classNames('CmsForm__LocaleCount', { 'CmsForm__LocaleCount--Missing': counts[option.value] > 0 })}>
        {counts[option.value] > 0 ? t('editor.languageMissing', { count: counts[option.value] }) : t('editor.languageComplete')}
      </span>
    </span>
  )
  const isPage = entry.kind === 'page'
  // A collection item is named by its title field: the header follows it while typing.
  const shownTitle = entry.kind === 'collection' ? documentTitle(entry, formik.values, textCtx) : title
  // What can be filled in the language on screen comes first.
  const here = (item: MissingContentType) => !item.locale || item.locale === locale
  const listed = [...new Map([...known.filter(here), ...known.filter(item => !here(item))].map(item => [missingLabel(item), item])).entries()]
  const issues = [...new Set([...known.map(item => item.path), ...errorPaths(formik.errors)])]
  const extra = listed.length - MAX_MISSING_LISTED
  const shownStatus = status === 'published' && edited ? 'changed' : status
  const previewPath = entryPath(config, entry, { locale, slug: slugsOf(config, entry, formik.values)[locale] })
  const showActions = toolbar || documentId || entry.path
  const showPreview = previewOpen && !!previewPath

  return (
    <FormikProvider value={formik}>
      <div className='CmsForm'>
        <div className='CmsForm__Bar'>
          <DashboardPageHeader
            size='editor'
            className='CmsForm__Header'
            title={shownTitle}
            meta={(
              <>
                {shownStatus && <Tag value={t(`documentStatus.${displayStatus(shownStatus, isIncomplete)}`)} severity={DOCUMENT_SEVERITIES[displayStatus(shownStatus, isIncomplete)]} />}
                <AutosaveStatus status={autosave.status} savedAt={autosave.savedAt} />
                {multilingual && (
                  <Dropdown
                    inputId={`${entryId}-locale`}
                    className='CmsForm__Locale'
                    aria-label={t('editor.language')}
                    tooltip={t('editor.languageHelp')}
                    value={locale}
                    options={config.locales.map(value => ({ value, label: languageName(value, config.panelLocale) }))}
                    itemTemplate={localeOption}
                    valueTemplate={localeOption}
                    onChange={event => switchLocale(event.value)}
                    data-testid='editor-locale'
                  />
                )}
              </>
            )}
            actions={showActions && (
              <>
                {entry.path && (
                  <CustomButton
                    type='button'
                    variant={previewOpen ? 'primary' : 'secondary'}
                    size='sm'
                    aria-pressed={previewOpen}
                    data-tour='preview'
                    disabled={!previewPath}
                    tooltip={previewPath ? undefined : multilingual ? t('editor.previewNeedsUrlIn', { language: languageName(locale, config.panelLocale) }) : t('editor.previewNeedsUrl')}
                    onClick={() => setPreviewOpen(open => !open)}
                  >
                    <i className='pi pi-eye' aria-hidden='true' />
                    {t('editor.preview')}
                  </CustomButton>
                )}
                {documentId && (
                  <VersionHistory
                    entryId={entryId}
                    documentId={documentId}
                    canDiscard={shownStatus === 'changed'}
                    replace={replace}
                    sections={isPage ? pageSections(fields).map(({ key }) => ({ key, label: label(key) })) : undefined}
                    flush={autosave.flush}
                  />
                )}
                {documentId && (shownStatus === 'new' || shownStatus === 'changed' || shownStatus === 'unpublishing') && (
                  <CustomButton type='button' size='sm' onClick={reviewAndPublish}>
                    <i className='pi pi-send' aria-hidden='true' />
                    {t('editor.reviewAndPublish')}
                  </CustomButton>
                )}
                {toolbar}
              </>
            )}
          />
        </div>

        {listed.length > 0 && (
          <Notice tone='warning' data-tour='missing'>
            {t('editor.missing')}{' '}
            {listed.slice(0, MAX_MISSING_LISTED).map(([fieldName, item], index) => (
              <Fragment key={fieldName}>
                {index > 0 && ', '}
                <button type='button' className='CmsForm__MissingLink' onClick={() => showField(item.field, item.locale)}>{fieldName}</button>
              </Fragment>
            ))}
            {extra > 0 ? t('editor.missingMore', { count: extra }) : ''}.
          </Notice>
        )}

        <div className={classNames({ CmsForm__Split: showPreview && !isPage, 'CmsForm__Page': isPage, 'CmsForm__Page--Preview': isPage && showPreview })}>
          <form
            className={isPage ? 'CmsForm__PageBody' : 'CmsForm__Body'}
            data-tour='form'
            noValidate
            onSubmit={event => event.preventDefault()}
          >
            <FormFocusContext value={{ issues, reveal }}>
              <EntryContext value={{ entryId, locale }}>
                <ReferencesContext value={references}>
                  <MediaRegistryContext value={registry}>
                    <RemountContext value={remounts}>
                      {isPage
                        ? (
                          <PageFields
                            fields={fields}
                            published={publishedData}
                            missing={known}
                            remounts={remounts}
                            compact={showPreview}
                            onAnchorChange={onAnchorChange}
                            onDiscardSection={publishedData && documentId ? key => discardSection(key, label(key)) : undefined}
                          />
                        )
                        : <CmsFields fields={fields} />}
                    </RemountContext>
                  </MediaRegistryContext>
                </ReferencesContext>
              </EntryContext>
            </FormFocusContext>
          </form>
          {showPreview && previewPath && <PreviewPane path={previewPath} savedAt={autosave.savedAt} anchor={anchor} language={multilingual ? languageName(locale, config.panelLocale) : undefined} />}
        </div>
      </div>

      <ConflictDialog
        visible={!!conflict}
        updatedAt={conflict?.updatedAt ?? null}
        parts={conflict?.keys.map(label) ?? []}
        onLoadCurrent={loadCurrent}
      />
    </FormikProvider>
  )
}

export default CmsForm
