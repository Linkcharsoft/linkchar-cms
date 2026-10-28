'use client'
import './BlocksInput.sass'
import { use, useState } from 'react'
import { newBlock } from '../../../core/defaults'
import { dataFields } from '../../../core/walk'
import { useCms, useT } from '../../client/context'
import BlockPicker from '../../editor/BlockPicker/BlockPicker'
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
import type { BlocksField } from '../../../core/fields'

interface Props {
  name: string
  field: BlocksField
}

type BlockItemType = { _key: string, _type: string } & Record<string, unknown>

const SUMMARY_KINDS = ['text', 'textarea', 'video']

const BlocksInput = ({ name, field }: Props) => {
  const { t } = useT()
  const translating = useEditingTranslation()
  const { config } = useCms()
  const confirm = useConfirm()
  const text = useText()
  const label = useFieldLabel()
  const stored = useStoredText()
  const { issues } = use(FormFocusContext)
  const { items, isOpen, allOpen, toggle, openAll, collapseAll, startDrag, endDrag, add, duplicate, remove, move } =
    useSortableField<BlockItemType>(name, current => initialOpenKeys(field.open, current, item => field.blocks[item._type]?.fields))
  const [isPicking, setIsPicking] = useState(false)
  const error = useFieldError(name)
  const full = field.max !== undefined && items.length >= field.max ? t('fields.list.full', { max: field.max }) : undefined
  const atMin = field.min !== undefined && items.length <= field.min ? t('fields.list.atMin', { min: field.min }) : undefined

  // Summary: the first non-empty text field of the block, if any.
  const summaryOf = (item: BlockItemType) => {
    const block = field.blocks[item._type]
    if (!block) return ''
    return dataFields(block.fields)
      .filter(([, def]) => SUMMARY_KINDS.includes(def.kind))
      .map(([key]) => stored(item[key]).trim())
      .find(Boolean) ?? ''
  }

  const titleOf = (item: BlockItemType) => {
    const block = field.blocks[item._type]
    return summaryOf(item) || (block ? text(block.label) : t('fields.blocks.fallback'))
  }

  const askRemove = (index: number) => confirm({
    header: t('fields.blocks.removeHeader'),
    message: t('fields.blocks.removeMessage', { title: titleOf(items[index]) }),
    acceptLabel: t('fields.list.remove'),
    tone: 'danger',
    accept: () => remove(index)
  })

  return (
    <fieldset className='BlocksInput'>
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
          labelOf={key => titleOf(items.find(item => item._key === key) ?? items[0])}
          onMove={move}
          onDragStart={startDrag}
          onDragEnd={endDrag}
        >
          {items.map((item, index) => {
            const block = field.blocks[item._type]
            // A block whose type left the schema still counts and can go; nothing else can be done with it.
            if (!block) {
              return (
                <SortableItem key={item._key} id={item._key} title={t('fields.blocks.unknown', { type: item._type })} removeDisabledReason={atMin} onRemove={() => askRemove(index)} />
              )
            }
            const thumbnail = thumbnailKey(block.fields)
            return (
              <SortableItem
                key={item._key}
                id={item._key}
                title={summaryOf(item) || t('fields.blocks.empty')}
                badge={text(block.label)}
                icon={block.icon}
                open={isOpen(item._key)}
                issues={countIssues(issues, block.fields, `${name}.${index}.`)}
                thumbnail={thumbnail ? <ItemThumb value={item[thumbnail]} /> : undefined}
                duplicateDisabledReason={full}
                removeDisabledReason={atMin}
                onToggle={() => toggle(item._key)}
                onDuplicate={() => duplicate(index)}
                onRemove={() => askRemove(index)}
              >
                <CmsFields fields={block.fields} prefix={`${name}.${index}.`} />
              </SortableItem>
            )
          })}
        </SortableList>
      )}

      <div>
        <CustomButton type='button' variant='secondary' size='sm' disabled={!!full} tooltip={full} onClick={() => setIsPicking(true)}>
          <i className='pi pi-plus' aria-hidden='true' />
          {t('fields.blocks.add')}
        </CustomButton>
      </div>
      <InputError message={error} />

      <BlockPicker
        visible={isPicking}
        blocks={field.blocks}
        onHide={() => setIsPicking(false)}
        onPick={type => {
          add(newBlock(config, type, field.blocks[type]) as BlockItemType)
          setIsPicking(false)
        }}
      />
    </fieldset>
  )
}

export default BlocksInput
