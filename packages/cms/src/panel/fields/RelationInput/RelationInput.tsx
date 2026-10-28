'use client'
import './RelationInput.sass'
import { useField } from 'formik'
import { AutoComplete } from 'primereact/autocomplete'
import { Tag } from 'primereact/tag'
import { useContext, useState } from 'react'
import { collectionNewLabel, getCollection } from '../../../core/entries'
import { relationIssue, relationNotice } from '../../../core/relations'
import { useCms, useT, useTextContext } from '../../client/context'
import CreateRelatedDialog from '../../editor/CreateRelatedDialog/CreateRelatedDialog'
import CustomButton from '../../primitives/CustomButton/CustomButton'
import InputContainer from '../../primitives/InputContainer/InputContainer'
import Notice from '../../primitives/Notice/Notice'
import { describedBy, errorId, fieldId, useFieldError, useFieldLabel, useText } from '../fieldUtils'
import { useLocaleNote } from '../LocaleNote/LocaleNote'
import { ReferencesContext } from '../referencesContext'
import { useSearchPicker } from './useSearchPicker'
import type { RelationField } from '../../../core/kinds/relation'
import type { RelationRefType } from '../../../core/relations'
import type { RelationOptionType } from '../../../server/documents'

interface Props {
  name: string
  field: RelationField
}

interface OptionType extends RelationRefType {
  id: string
  // Deleted for good: only its id is left in the data.
  gone?: boolean
  // Last suggestion: creates a new item named after the search instead of picking one.
  create?: boolean
}

const RelationInput = ({ name, field }: Props) => {
  const { t } = useT()
  const { config, actions } = useCms()
  const textCtx = useTextContext()
  const text = useText()
  const label = useFieldLabel()
  const initialLabels = useContext(ReferencesContext).relations
  const [labels, setLabels] = useState(initialLabels)
  const [lastQuery, setLastQuery] = useState('')
  // null: closed; otherwise the title the dialog starts with (the search typed, or nothing from the "New" button).
  const [creating, setCreating] = useState<string | null>(null)
  const [{ value }, , { setValue, setTouched }] = useField<string | string[] | null>(name)
  const error = useFieldError(name)
  const id = fieldId(name)
  const languages = useLocaleNote(name, field)
  const target = getCollection(config, field.to)

  const toOption = (optionId: string): OptionType => (labels[optionId]
    ? { id: optionId, ...labels[optionId] }
    : { id: optionId, label: t('relationInput.gone'), kind: '', status: 'hidden', trashed: false, gone: true })
  const ids = Array.isArray(value) ? value : value ? [value] : []
  const notices = ids.map(toOption).flatMap(option => {
    if (option.gone) return [{ id: option.id, text: t('relationInput.goneNotice'), missing: true }]
    const issue = relationIssue(option, t)
    return issue ? [{ id: option.id, text: relationNotice(option, issue, t), missing: issue.missing }] : []
  })

  const optionTemplate = (option: OptionType | null) => {
    if (!option) return null
    if (option.create) {
      return (
        <span className='RelationInput__Option RelationInput__Option--Create'>
          <i className='pi pi-plus' aria-hidden='true' />
          <span className='RelationInput__OptionLabel'>{option.label}</span>
        </span>
      )
    }
    const issue = relationIssue(option, t)
    return (
      <span className='RelationInput__Option'>
        <span className='RelationInput__OptionLabel'>{option.label}</span>
        {issue && <Tag value={issue.tag} severity={issue.severity} />}
      </span>
    )
  }

  const fetchOptions = async (query: string): Promise<OptionType[]> => {
    setLastQuery(query)
    const results = await actions.searchRelation(field.to, query)
    setLabels(current => ({ ...current, ...Object.fromEntries(results.map(({ id: resultId, ...ref }) => [resultId, ref])) }))
    const options: OptionType[] = field.multiple ? results.filter(result => !ids.includes(result.id)) : results
    const name = query.trim()
    const createOption = target && {
      id: '', label: name ? t('relationInput.create', { name }) : collectionNewLabel(target, textCtx), kind: '', status: 'new' as const, trashed: false, create: true
    }
    return createOption ? [...options, createOption] : options
  }

  const commit = (next: string[]) => {
    setValue(field.multiple ? next : (next[0] ?? null), true)
    setTouched(true, false)
  }

  const pick = (picked: OptionType[]) => {
    if (picked.some(option => option.create)) {
      setCreating(lastQuery)
      return
    }
    commit(picked.map(option => option.id))
  }

  const picker = useSearchPicker<OptionType>({
    fetch: fetchOptions,
    selected: ids[0] ? toOption(ids[0]) : null,
    onPick: option => pick(option ? [option] : [])
  })

  const created = ({ id: createdId, ...ref }: RelationOptionType) => {
    setLabels(current => ({ ...current, [createdId]: ref }))
    commit(field.multiple ? [...ids, createdId] : [createdId])
    setCreating(null)
  }

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)} badge={languages.badge}>
      <AutoComplete
        ref={picker.ref}
        inputId={id}
        multiple={field.multiple}
        dropdown
        forceSelection={field.multiple}
        field='label'
        value={field.multiple ? ids.map(toOption) : picker.value}
        suggestions={picker.suggestions}
        completeMethod={event => void picker.search(event.query)}
        placeholder={target ? t('relationInput.search', { name: text(target.label).toLocaleLowerCase(textCtx.locale) }) : t('relationInput.searchAny')}
        emptyMessage={t('relationInput.empty')}
        itemTemplate={optionTemplate}
        invalid={!!error}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, field, error && errorId(name))}
        className='RelationInput'
        inputClassName='RelationInput__Input'
        onFocus={picker.onFocus}
        onBlur={picker.onBlur}
        onChange={event => {
          if (!field.multiple) {
            picker.onChange(event)
            return
          }
          pick((event.value as OptionType[] | null) ?? [])
        }}
      />
      {notices.map(notice => (
        <Notice key={notice.id} tone={notice.missing ? 'warning' : 'info'}>{notice.text}</Notice>
      ))}
      {target && (
        <CustomButton type='button' variant='ghost' size='sm' className='RelationInput__Create' onClick={() => setCreating('')}>
          <i className='pi pi-plus' aria-hidden='true' />
          {collectionNewLabel(target, textCtx)}
        </CustomButton>
      )}
      {creating !== null && <CreateRelatedDialog entryId={field.to} initialTitle={creating} onCreated={created} onHide={() => setCreating(null)} />}
    </InputContainer>
  )
}

export default RelationInput
