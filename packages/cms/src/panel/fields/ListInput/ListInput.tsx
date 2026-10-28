'use client'
import './ListInput.sass'
import { use } from 'react'
import { newListItem } from '../../../core/defaults'
import { useCms, useT } from '../../client/context'
import CmsFields from '../../editor/CmsFields/CmsFields'
import SortableItem from '../../editor/SortableItem/SortableItem'
import ItemThumb, { initialOpenKeys, thumbnailKey } from '../../editor/sortableItems'
import SortableLegend from '../../editor/SortableLegend/SortableLegend'
import SortableList from '../../editor/SortableList/SortableList'
import useSortableField from '../../editor/useSortableField'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputError from '../../primitives/InputError/InputError'
import Notice from '../../primitives/Notice/Notice'
import { useFieldError, useFieldLabel, useStoredText, useText } from '../fieldUtils'
import { countIssues, FormFocusContext } from '../formFocusContext'
import { useEditingTranslation } from '../LocaleNote/LocaleNote'
import type { ListField } from '../../../core/fields'

interface Props {
  name: string
  field: ListField
}

type ItemType = { _key: string } & Record<string, unknown>

const ListInput = ({ name, field }: Props) => {
  const { t } = useT()
  const translating = useEditingTranslation()
  const { config } = useCms()
  const confirm = useConfirm()
  const text = useText()
  const label = useFieldLabel()
  const stored = useStoredText()
  const { issues } = use(FormFocusContext)
  const { items, isOpen, allOpen, toggle, openAll, collapseAll, startDrag, endDrag, add, duplicate, remove, move } =
    useSortableField<ItemType>(name, current => initialOpenKeys(field.open, current, () => field.fields))
  const error = useFieldError(name)
  const thumbnail = thumbnailKey(field.fields, field.thumbnail)
  const full = field.max !== undefined && items.length >= field.max ? t('fields.list.full', { max: field.max }) : undefined
  const atMin = field.min !== undefined && items.length <= field.min ? t('fields.list.atMin', { min: field.min }) : undefined
  const singular = field.singularLabel ? text(field.singularLabel) : ''

  const titleOf = (item: ItemType, index: number) => {
    const own = field.itemLabel ? stored(item[field.itemLabel]) : ''
    if (own.trim()) return own
    const noun = singular ? singular.charAt(0).toLocaleUpperCase(config.panelLocale) + singular.slice(1) : text(field.label)
    return t('fields.list.item', { label: noun, number: index + 1 })
  }

  const askRemove = (index: number) => confirm({
    header: t('fields.list.removeHeader'),
    message: t('fields.list.removeMessage', { title: titleOf(items[index], index) }),
    acceptLabel: t('fields.list.remove'),
    tone: 'danger',
    accept: () => remove(index)
  })

  return (
    <fieldset className='ListInput'>
      <SortableLegend
        label={label(field)}
        help={field.help ? text(field.help) : undefined}
        count={items.length}
        min={field.min}
        max={field.max}
        allOpen={allOpen}
        onOpenAll={openAll}
        onCollapseAll={collapseAll}
      />
      {translating && <Notice>{t('fields.locale.sharedItems')}</Notice>}

      {items.length > 0 && (
        <SortableList
          ids={items.map(item => item._key)}
          labelOf={key => titleOf(items.find(item => item._key === key) ?? items[0], items.findIndex(item => item._key === key))}
          onMove={move}
          onDragStart={startDrag}
          onDragEnd={endDrag}
        >
          {items.map((item, index) => (
            <SortableItem
              key={item._key}
              id={item._key}
              title={titleOf(item, index)}
              open={isOpen(item._key)}
              issues={countIssues(issues, field.fields, `${name}.${index}.`)}
              thumbnail={thumbnail ? <ItemThumb value={item[thumbnail]} /> : undefined}
              duplicateDisabledReason={full}
              removeDisabledReason={atMin}
              onToggle={() => toggle(item._key)}
              onDuplicate={() => duplicate(index)}
              onRemove={() => askRemove(index)}
            >
              <CmsFields fields={field.fields} prefix={`${name}.${index}.`} />
            </SortableItem>
          ))}
        </SortableList>
      )}

      <div>
        <CustomButton type='button' variant='secondary' size='sm' disabled={!!full} tooltip={full} onClick={() => add(newListItem(config, field.fields) as ItemType)}>
          <i className='pi pi-plus' aria-hidden='true' />
          {singular ? t('fields.list.addItem', { item: singular }) : t('fields.list.add')}
        </CustomButton>
      </div>
      <InputError message={error} />
    </fieldset>
  )
}

export default ListInput
