'use client'
import './VersionHistory.sass'
import { Sidebar } from 'primereact/sidebar'
import { useState } from 'react'
import { dayOf } from '../../../core/dates'
import { isHexColor } from '../../../core/kinds/color'
import { useCms, useFormatDate, useT } from '../../client/context'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import EmptyState from '../../primitives/EmptyState/EmptyState'
import Loader from '../../primitives/Loader/Loader'
import Notice from '../../primitives/Notice/Notice'
import type { FieldDiffType } from '../../../core/diff'
import type { ReplaceDraftResultType, VersionItemType } from '../../../server/versions'

interface Props {
  entryId: string
  documentId: string
  canDiscard: boolean
  // Saves pending edits, runs the replace and loads the result into the form; true when it went through.
  replace: (run: (revision: number) => Promise<ReplaceDraftResultType>, success: string) => Promise<boolean>
  // Pages: sections that can be restored one by one.
  sections?: { key: string, label: string }[]
  // Saves pending edits so the comparison uses the latest draft.
  flush: () => Promise<unknown>
}

interface PreviewType {
  versionId: string
  // null while loading; empty when the version equals the draft.
  diff: FieldDiffType[] | null
}

// A color summary ("#1F5FA8") gets its swatch; any other summary is plain text.
const Summary = ({ value }: { value: string }) => (isHexColor(value)
  ? <span className='VersionHistory__Color'><span className='VersionHistory__Swatch' style={{ backgroundColor: value }} aria-hidden='true' />{value}</span>
  : value)

const DiffList = ({ diff }: { diff: FieldDiffType[] }) => {
  const { t } = useT()
  return (
    <dl className='VersionHistory__Diff'>
      {diff.map(change => (
        <div key={change.path} className='VersionHistory__Change'>
          <dt className='VersionHistory__ChangeLabel'>{change.label}</dt>
          <dd className='VersionHistory__ChangeValue'><span className='VersionHistory__ChangeTag'>{t('editor.history.now')}</span><Summary value={change.current} /></dd>
          <dd className='VersionHistory__ChangeValue'><span className='VersionHistory__ChangeTag'>{t('editor.history.version')}</span><Summary value={change.version} /></dd>
        </div>
      ))}
    </dl>
  )
}

const VersionHistory = ({ entryId, documentId, canDiscard, replace, sections, flush }: Props) => {
  const { t } = useT()
  const { actions, config } = useCms()
  const confirm = useConfirm()
  const formatDate = useFormatDate()
  const [visible, setVisible] = useState(false)
  const [versions, setVersions] = useState<VersionItemType[] | null>(null)
  const [preview, setPreview] = useState<PreviewType | null>(null)
  const isPage = !!sections
  const scope = isPage ? t('editor.history.thePage') : t('editor.history.theDraft')

  const open = async () => {
    setVisible(true)
    setVersions(null)
    setPreview(null)
    setVersions(await actions.listVersions(entryId, documentId))
  }

  const run = async (action: (revision: number) => Promise<ReplaceDraftResultType>, success: string) => {
    if (await replace(action, success)) setVisible(false)
  }

  const askRestore = (version: VersionItemType) => confirm({
    header: isPage ? t('editor.history.restorePageHeader') : t('editor.history.restoreHeader'),
    message: t('editor.history.restoreMessage', { scope, date: formatDate(version.createdAt) }),
    acceptLabel: t('editor.history.restore'),
    accept: () => run(revision => actions.restoreVersion(entryId, documentId, version.id, revision), t('editor.history.restored'))
  })

  const askRestoreSection = (version: VersionItemType, section: { key: string, label: string }) => confirm({
    header: t('editor.history.restoreSectionHeader', { label: section.label }),
    message: t('editor.history.restoreSectionMessage', { label: section.label, date: formatDate(version.createdAt) }),
    acceptLabel: t('editor.history.restoreSection'),
    accept: () => run(
      revision => actions.restoreVersion(entryId, documentId, version.id, revision, section.key),
      t('editor.history.sectionRestored', { label: section.label })
    )
  })

  const togglePreview = async (version: VersionItemType) => {
    if (preview?.versionId === version.id) {
      setPreview(null)
      return
    }
    setPreview({ versionId: version.id, diff: null })
    await flush()
    const diff = await actions.getVersionDiff(entryId, documentId, version.id)
    setPreview(shown => (shown?.versionId === version.id ? { versionId: version.id, diff: diff ?? [] } : shown))
  }

  const sectionsOf = (diff: FieldDiffType[]) => (sections ?? [])
    .map(section => ({
      ...section,
      changes: diff
        .filter(change => change.path === section.key || change.path.startsWith(`${section.key}.`))
        .map(change => ({ ...change, label: change.label.replace(`${section.label} › `, '') }))
    }))
    .filter(section => section.changes.length > 0)

  const today = dayOf(new Date(), config.timeZone)
  const yesterday = dayOf(new Date(Date.now() - 24 * 60 * 60 * 1000), config.timeZone)
  const dayTitle = (version: VersionItemType) => {
    const day = dayOf(version.createdAt, config.timeZone)
    return day === today ? t('editor.history.today') : day === yesterday ? t('editor.history.yesterday') : formatDate(version.createdAt, 'longDate')
  }
  const days = (versions ?? []).reduce<{ key: string, versions: VersionItemType[] }[]>((groups, version) => {
    const key = dayOf(version.createdAt, config.timeZone)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.versions.push(version)
    else groups.push({ key, versions: [version] })
    return groups
  }, [])

  const askDiscard = () => confirm({
    header: t('editor.history.discardHeader'),
    message: t('editor.history.discardMessage', { scope }),
    acceptLabel: t('editor.history.discard'),
    tone: 'danger',
    accept: () => run(revision => actions.discardChanges(entryId, documentId, revision), t('editor.history.discarded'))
  })

  return (
    <>
      <CustomButton type='button' variant='secondary' size='sm' onClick={open} data-tour='history'>
        <i className='pi pi-history' aria-hidden='true' />
        {t('editor.history.open')}
      </CustomButton>

      <Sidebar visible={visible} position='right' onHide={() => setVisible(false)} className='VersionHistory' header={t('editor.history.open')}>
        <div className='VersionHistory__Body'>
          {canDiscard && (
            <Notice
              icon={null}
              action={(
                <CustomButton type='button' variant='secondary' size='sm' onClick={askDiscard}>
                  <i className='pi pi-undo' aria-hidden='true' />
                  {t('editor.history.discard')}
                </CustomButton>
              )}
            >
              {t('editor.history.unpublished')}
            </Notice>
          )}

          {versions === null ? (
            <div aria-busy='true' className='flex justify-center py-6'><Loader /></div>
          ) : versions.length === 0 ? (
            <EmptyState compact icon='pi pi-history' title={t('editor.history.empty')} description={t('editor.history.emptyHelp')} />
          ) : (
            <ul className='VersionHistory__Days'>
              {days.map(day => (
                <li key={day.key} className='VersionHistory__Day'>
                  <h3 className='VersionHistory__DayTitle'>{dayTitle(day.versions[0])}</h3>
                  <ul className='VersionHistory__List'>
                    {day.versions.map(version => (
                      <li key={version.id} className='VersionHistory__Item'>
                        <div>
                          <p className='VersionHistory__Reason'>{t(`editor.history.reasons.${version.reason}`)}</p>
                          <p className='VersionHistory__Meta'>
                            {formatDate(version.createdAt, 'time')}
                            {version.createdBy ? ` · ${version.createdBy}` : ''}
                          </p>
                        </div>
                        <div className='VersionHistory__Actions'>
                          <CustomButton
                            type='button'
                            variant='ghost'
                            size='sm'
                            aria-expanded={preview?.versionId === version.id}
                            onClick={() => togglePreview(version)}
                          >
                            {t('editor.history.showChanges')}
                          </CustomButton>
                          <CustomButton type='button' variant='ghost' size='sm' onClick={() => askRestore(version)}>
                            {isPage ? t('editor.history.restoreAll') : t('editor.history.restore')}
                          </CustomButton>
                        </div>
                        {preview?.versionId === version.id && (
                          <div className='VersionHistory__Preview'>
                            {preview.diff === null ? (
                              <div aria-busy='true' className='flex justify-center py-2'><Loader /></div>
                            ) : preview.diff.length === 0 ? (
                              <p className='VersionHistory__Meta'>{t('editor.history.same')}</p>
                            ) : isPage ? (
                              <ul className='VersionHistory__SectionList'>
                                {sectionsOf(preview.diff).map(section => (
                                  <li key={section.key} className='VersionHistory__Section'>
                                    <div className='VersionHistory__SectionHeader'>
                                      <span>{section.label}</span>
                                      <CustomButton type='button' variant='secondary' size='xs' onClick={() => askRestoreSection(version, section)}>
                                        {t('editor.history.restoreSection')}
                                      </CustomButton>
                                    </div>
                                    <DiffList diff={section.changes} />
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <DiffList diff={preview.diff} />
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sidebar>
    </>
  )
}

export default VersionHistory
