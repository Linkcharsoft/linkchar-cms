'use client'
import './PageOutline.sass'
import { Dropdown } from 'primereact/dropdown'
import { classNames } from 'primereact/utils'
import { useCms, useT } from '../../client/context'
import LocaleCounts, { totalMissing } from '../LocaleCounts/LocaleCounts'

export interface OutlineItemType {
  key: string
  label: string
  icon?: string
  changed: boolean
  // Missing items per locale.
  missing: Record<string, number>
  hidden: boolean
}

interface Props {
  items: OutlineItemType[]
  active: string | null
  onSelect: (key: string) => void
}

const Marks = ({ item }: { item: OutlineItemType }) => {
  const { t } = useT()
  const { config } = useCms()
  const multilingual = config.locales.length > 1
  const incomplete = !multilingual && totalMissing(item.missing) > 0
  return (
    <span className='PageOutline__Marks'>
      {multilingual && <LocaleCounts counts={item.missing} />}
      {incomplete && <span className='PageOutline__Dot PageOutline__Dot--Missing' title={t('editor.page.missing')} />}
      {item.changed && <span className='PageOutline__Dot PageOutline__Dot--Changed' title={t('editor.page.changedUnpublished')} />}
      {item.hidden && <i className='pi pi-eye-slash PageOutline__HiddenIcon' title={t('editor.page.hiddenOnSite')} />}
      <span className='sr-only'>
        {[incomplete && t('editor.page.marksMissing'), item.changed && t('editor.page.marksChanged'), item.hidden && t('editor.page.marksHidden')]
          .filter(Boolean).join(', ')}
      </span>
    </span>
  )
}

const optionTemplate = (item: OutlineItemType | null) => item && (
  <span className='PageOutline__Option'>
    <span>{item.label}</span>
    <Marks item={item} />
  </span>
)

// Page sections with what's missing and what changed; picking one opens it and scrolls to it.
const PageOutline = ({ items, active, onSelect }: Props) => {
  const { t } = useT()

  return (
    <>
      <nav className='PageOutline' aria-label={t('editor.page.outline')} data-tour='outline'>
        <p className='PageOutline__Title'>{t('editor.page.outlineTitle')}</p>
        <ul className='PageOutline__List'>
          {items.map(item => (
            <li key={item.key}>
              <button
                type='button'
                className={classNames('PageOutline__Item', { 'PageOutline__Item--Active': item.key === active })}
                aria-current={item.key === active ? 'location' : undefined}
                onClick={() => onSelect(item.key)}
              >
                <i className={`pi ${item.icon ?? 'pi-file'} PageOutline__Icon`} aria-hidden='true' />
                <span className='PageOutline__Label'>{item.label}</span>
                <Marks item={item} />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className='PageOutline__Mobile'>
        <Dropdown
          value={items.find(item => item.key === active) ?? null}
          options={items}
          optionLabel='label'
          itemTemplate={optionTemplate}
          valueTemplate={optionTemplate}
          placeholder={t('editor.page.goTo')}
          aria-label={t('editor.page.goToLabel')}
          onChange={event => event.value && onSelect((event.value as OutlineItemType).key)}
          className='w-full'
        />
      </div>
    </>
  )
}

export default PageOutline
