'use client'
import './ListInput.sass'
import { newListItem } from '../../../core/defaults'
import { useCms, useT } from '../../client/context'
import CmsFields from '../../editor/CmsFields/CmsFields'
import SortableItem from '../../editor/SortableItem/SortableItem'
import SortableList from '../../editor/SortableList/SortableList'
import useSortableField from '../../editor/useSortableField'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputError from '../../primitives/InputError/InputError'
import Notice from '../../primitives/Notice/Notice'
import { useFieldError, useFieldLabel, useStoredText, useText } from '../fieldUtils'
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
  const { items, isOpen, toggle, collapseAll, add, duplicate, remove, move } = useSortableField<ItemType>(name)
  const error = useFieldError(name)
  const atMax = field.max !== undefined && items.length >= field.max

  const titleOf = (item: ItemType, index: number) => {
    const own = field.itemLabel ? stored(item[field.itemLabel]) : ''
    return own.trim() ? own : t('fields.list.item', { label: text(field.label), number: index + 1 })
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
      <legend className='ListInput__Legend'>
        {label(field)}
        <span className='ListInput__Count'>{field.max !== undefined ? t('fields.list.count', { count: items.length, max: field.max }) : items.length}</span>
      </legend>
      {field.help && <p className='ListInput__Help'>{text(field.help)}</p>}
      {translating && <Notice>{t('fields.locale.sharedItems')}</Notice>}

      {items.length > 0 && (
        <SortableList
          ids={items.map(item => item._key)}
          labelOf={key => titleOf(items.find(item => item._key === key) ?? items[0], items.findIndex(item => item._key === key))}
          onMove={move}
          onDragStart={collapseAll}
        >
          {items.map((item, index) => (
            <SortableItem
              key={item._key}
              id={item._key}
              title={titleOf(item, index)}
              open={isOpen(item._key)}
              canDuplicate={!atMax}
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
        <CustomButton type='button' variant='secondary' size='sm' disabled={atMax} onClick={() => add(newListItem(config, field.fields) as ItemType)}>
          <i className='pi pi-plus' aria-hidden='true' />
          {t('fields.list.add')}
        </CustomButton>
      </div>
      <InputError message={error} />
    </fieldset>
  )
}

export default ListInput
