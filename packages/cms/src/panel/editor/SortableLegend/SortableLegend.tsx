'use client'
import './SortableLegend.sass'
import { useT } from '../../client/context'
import CustomButton from '../../primitives/CustomButton/CustomButton'

interface Props {
  label: string
  help?: string
  count: number
  min?: number
  max?: number
  // Shown with two or more items.
  allOpen: boolean
  onOpenAll: () => void
  onCollapseAll: () => void
}

// The legend of a list or blocks field: label, how many items (and the limits), expand or collapse all.
const SortableLegend = ({ label, help, count, min, max, allOpen, onOpenAll, onCollapseAll }: Props) => {
  const { t } = useT()
  const summary = min !== undefined && max !== undefined
    ? t('fields.list.countRange', { count, min, max })
    : min !== undefined ? t('fields.list.countMin', { count, min })
      : max !== undefined ? t('fields.list.count', { count, max }) : String(count)

  return (
    <>
      <legend className='SortableLegend'>
        <span className='SortableLegend__Label'>{label}</span>
        <span className='SortableLegend__Count'>{summary}</span>
        {count > 1 && (
          <CustomButton type='button' variant='ghost' size='xs' className='SortableLegend__Toggle' onClick={allOpen ? onCollapseAll : onOpenAll}>
            <i className={allOpen ? 'pi pi-angle-double-up' : 'pi pi-angle-double-down'} aria-hidden='true' />
            {allOpen ? t('fields.list.collapseAll') : t('fields.list.expandAll')}
          </CustomButton>
        )}
      </legend>
      {help && <p className='SortableLegend__Help'>{help}</p>}
    </>
  )
}

export default SortableLegend
