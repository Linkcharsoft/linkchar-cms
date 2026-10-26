'use client'
import { useField } from 'formik'
import dynamic from 'next/dynamic'
import { richTextReferences } from '../../../core/richText/nodes'
import { useT } from '../../client/context'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import { describedBy, fieldId, useFieldError, useFieldLabel, useText, useValuePath } from '../fieldUtils'
import { useEditingTranslation, useLocaleNote } from '../LocaleNote/LocaleNote'
import MissingAlt from '../MissingAlt/MissingAlt'
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
  const languages = useLocaleNote(name, field)
  const translating = useEditingTranslation()

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)} badge={languages.badge} note={languages.note}>
      <RichTextEditor
        id={id}
        label={text(field.label)}
        value={value ?? null}
        headings={field.headings}
        inline={field.inline}
        marks={field.marks}
        invalid={!!error}
        describedBy={describedBy(name, field, languages.describedBy)}
        onChange={setValue}
        onBlur={() => setTouched(true)}
      />
      {translating && value && <MissingAlt ids={richTextReferences(value).media} />}
    </InputContainer>
  )
}

export default RichTextInput
