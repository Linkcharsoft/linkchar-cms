'use client'
import { useField } from 'formik'
import dynamic from 'next/dynamic'
import { useT } from '../../client/context'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { describedBy, fieldId, useFieldError, useFieldLabel, useText, useValuePath } from '../fieldUtils'
import type { RichTextField } from '../../../core/kinds/richText'
import type { RichTextDocType } from '../../../core/richText/nodes'

const Loading = () => {
  const { t } = useT()
  return <div className='RichTextEditor RichTextEditor--Loading'>{t('richTextEditor.loading')}</div>
}

const RichTextEditor = dynamic(() => import('../RichTextEditor/RichTextEditor'), { ssr: false, loading: Loading })

interface Props {
  name: string
  field: RichTextField
}

const RichTextInput = ({ name, field }: Props) => {
  const text = useText()
  const label = useFieldLabel()
  const path = useValuePath(name, field)
  const [{ value }, , { setValue, setTouched }] = useField<RichTextDocType | null>(path)
  const error = useFieldError(path)
  const id = fieldId(name)

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      <RichTextEditor
        id={id}
        label={text(field.label)}
        value={value ?? null}
        headings={field.headings}
        invalid={!!error}
        describedBy={describedBy(name, field)}
        onChange={setValue}
        onBlur={() => setTouched(true)}
      />
    </InputContainer>
  )
}

export default RichTextInput
