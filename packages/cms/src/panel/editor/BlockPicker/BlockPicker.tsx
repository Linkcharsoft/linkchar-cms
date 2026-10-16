'use client'
import './BlockPicker.sass'
import Image from 'next/image'
import { Dialog } from 'primereact/dialog'
import { classNames } from 'primereact/utils'
import { useT } from '../../client/context'
import { useText } from '../../fields/fieldUtils'
import type { BlockDef } from '../../../core/fields'

interface Props {
  visible: boolean
  blocks: Record<string, BlockDef>
  onPick: (type: string) => void
  onHide: () => void
}

const BlockPicker = ({ visible, blocks, onPick, onHide }: Props) => {
  const { t } = useT()
  const text = useText()

  return (
    <Dialog visible={visible} header={t('fields.blocks.add')} modal dismissableMask className='BlockPicker' onHide={onHide}>
      <ul className='BlockPicker__Grid'>
        {Object.entries(blocks).map(([type, block]) => (
          <li key={type}>
            <button type='button' className='BlockPicker__Option' onClick={() => onPick(type)}>
              {block.thumbnail ? (
                <Image src={block.thumbnail} alt='' width={240} height={135} className='BlockPicker__Thumb' />
              ) : (
                <span className='BlockPicker__IconBox' aria-hidden='true'>
                  <i className={classNames('pi', block.icon ?? 'pi-box')} />
                </span>
              )}
              <span className='BlockPicker__Name'>{text(block.label)}</span>
              {block.description && <span className='BlockPicker__Description'>{text(block.description)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

export default BlockPicker
