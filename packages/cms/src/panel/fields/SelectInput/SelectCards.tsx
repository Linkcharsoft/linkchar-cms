'use client'
import './SelectCards.sass'
import { classNames } from 'primereact/utils'
import { useRef } from 'react'
import { gridPlacement } from '../../../core/kinds/select'
import type { SelectOptionType, SelectPreviewType } from '../../../core/fields'
import type { KeyboardEvent } from 'react'

interface Props {
  id: string
  name: string
  options: readonly SelectOptionType[]
  value: string | null
  label: string
  invalid: boolean
  describedBy?: string
  text: (option: SelectOptionType) => string
  onChange: (value: string) => void
}

const Preview = ({ preview }: { preview: SelectPreviewType }) => {
  if ('icon' in preview) return <i className={classNames('SelectCards__Icon pi', preview.icon)} aria-hidden='true' />
  if ('image' in preview) return <img className='SelectCards__Image' src={preview.image} alt='' />
  const { columns, rows, cells } = preview.grid
  return (
    <span className='SelectCards__Grid' style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }} aria-hidden='true'>
      {cells.map((cell, index) => (
        <span
          key={index}
          className='SelectCards__Cell'
          style={{ gridColumn: gridPlacement(cell.column, cell.columnSpan), gridRow: gridPlacement(cell.row, cell.rowSpan) }}
        />
      ))}
    </span>
  )
}

// One card per option, as a radio group: arrows move and select, like native radios.
const SelectCards = ({ id, name, options, value, label, invalid, describedBy, text, onChange }: Props) => {
  const group = useRef<HTMLDivElement>(null)
  const selected = options.findIndex(option => option.value === value)
  const focusable = selected >= 0 ? selected : 0

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    const step = steps[event.key]
    if (!step) return
    event.preventDefault()
    const next = (index + step + options.length) % options.length
    onChange(options[next].value)
    group.current?.querySelectorAll<HTMLButtonElement>('[role=radio]')[next]?.focus()
  }

  return (
    <div
      ref={group}
      id={id}
      className='SelectCards'
      role='radiogroup'
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      data-name={name}
    >
      {options.map((option, index) => {
        const checked = index === selected
        return (
          <button
            key={option.value}
            type='button'
            role='radio'
            aria-checked={checked}
            tabIndex={index === focusable ? 0 : -1}
            className={classNames('SelectCards__Card', { 'SelectCards__Card--Checked': checked, 'SelectCards__Card--Invalid': invalid })}
            onClick={() => onChange(option.value)}
            onKeyDown={event => onKeyDown(event, index)}
          >
            <span className='SelectCards__Preview'>{option.preview && <Preview preview={option.preview} />}</span>
            <span className='SelectCards__Label'>{text(option)}</span>
          </button>
        )
      })}
    </div>
  )
}

export default SelectCards
