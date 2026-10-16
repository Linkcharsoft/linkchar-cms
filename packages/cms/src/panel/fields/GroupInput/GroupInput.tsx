'use client'
import './GroupInput.sass'
import { Panel } from 'primereact/panel'
import { useState } from 'react'
import CmsFields from '../../editor/CmsFields/CmsFields'
import SeoPreview from '../../editor/SeoPreview/SeoPreview'
import { useText } from '../fieldUtils'
import { useOpenOnFocus } from '../formFocusContext'
import type { GroupField } from '../../../core/fields'

interface Props {
  name: string
  field: GroupField
}

const GroupInput = ({ name, field }: Props) => {
  const text = useText()
  const [collapsed, setCollapsed] = useState(!!field.collapsed)
  useOpenOnFocus(field.fields, `${name}.`, () => setCollapsed(false))

  return (
    <Panel header={text(field.label)} toggleable collapsed={collapsed} onToggle={event => setCollapsed(event.value)} className='GroupInput'>
      {field.help && <p className='GroupInput__Help'>{text(field.help)}</p>}
      <div className='GroupInput__Fields'>
        <CmsFields fields={field.fields} prefix={`${name}.`} />
        {field.seo && <SeoPreview name={name} mark={field.seo} />}
      </div>
    </Panel>
  )
}

export default GroupInput
