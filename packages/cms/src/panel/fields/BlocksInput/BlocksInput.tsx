'use client'
import './BlocksInput.sass'
import { useState } from 'react'
import { newBlock } from '../../../core/defaults'
import { dataFields } from '../../../core/walk'
import { useCms, useT } from '../../client/context'
import BlockPicker from '../../editor/BlockPicker/BlockPicker'
import CmsFields from '../../editor/CmsFields/CmsFields'
import SortableItem from '../../editor/SortableItem/SortableItem'
import SortableList from '../../editor/SortableList/SortableList'
import useSortableField from '../../editor/useSortableField'
import { useConfirm } from '../../primitives/ConfirmAction/ConfirmAction'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputError from '../../primitives/InputError/InputError'
import { useFieldError, useFieldLabel, useStoredText, useText } from '../fieldUtils'
import type { BlocksField } from '../../../core/fields'

interface Props {
  name: string
  field: BlocksField
}

type BlockItemType = { _key: string, _type: string } & Record<string, unknown>

const SUMMARY_KINDS = ['text', 'textarea', 'video']

const BlocksInput = ({ name, field }: Props) => {
  const { t } = useT()
  const { config } = useCms()
  const confirm = useConfirm()
  const text = useText()
  const label = useFieldLabel()
  const stored = useStoredText()
  const { items, isOpen, toggle, collapseAll, add, duplicate, remove, move } = useSortableField<BlockItemType>(name)
  const [isPicking, setIsPicking] = useState(false)
  const error = useFieldError(name)
  const atMax = field.max !== undefined && items.length >= field.max

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
      <legend className='BlocksInput__Legend'>
        {label(field)}
        <span className='BlocksInput__Count'>{field.max !== undefined ? t('fields.list.count', { count: items.length, max: field.max }) : items.length}</span>
      </legend>
      {field.help && <p className='BlocksInput__Help'>{text(field.help)}</p>}

      {items.length > 0 && (
        <SortableList
          ids={items.map(item => item._key)}
          labelOf={key => titleOf(items.find(item => item._key === key) ?? items[0])}
          onMove={move}
          onDragStart={collapseAll}
        >
          {items.map((item, index) => {
            const block = field.blocks[item._type]
            if (!block) return null
            return (
              <SortableItem
                key={item._key}
                id={item._key}
                title={summaryOf(item) || t('fields.blocks.empty')}
                badge={text(block.label)}
                icon={block.icon}
                open={isOpen(item._key)}
                canDuplicate={!atMax}
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
        <CustomButton type='button' variant='secondary' size='sm' disabled={atMax} onClick={() => setIsPicking(true)}>
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
