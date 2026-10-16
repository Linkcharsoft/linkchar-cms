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
import { describedBy, fieldId, useFieldError, useFieldLabel, useText } from '../fieldUtils'
import { ReferencesContext } from '../referencesContext'
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
}

const RelationInput = ({ name, field }: Props) => {
  const { t } = useT()
  const { config, actions } = useCms()
  const textCtx = useTextContext()
  const text = useText()
  const label = useFieldLabel()
  const initialLabels = useContext(ReferencesContext).relations
  const [labels, setLabels] = useState(initialLabels)
  const [suggestions, setSuggestions] = useState<OptionType[]>([])
  const [lastQuery, setLastQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [{ value }, , { setValue, setTouched }] = useField<string | string[] | null>(name)
  const error = useFieldError(name)
  const id = fieldId(name)
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
    const issue = relationIssue(option, t)
    return (
      <span className='RelationInput__Option'>
        <span className='RelationInput__OptionLabel'>{option.label}</span>
        {issue && <Tag value={issue.tag} severity={issue.severity} />}
      </span>
    )
  }

  const search = async (query: string) => {
    setLastQuery(query)
    const results = await actions.searchRelation(field.to, query)
    setLabels(current => ({ ...current, ...Object.fromEntries(results.map(({ id: resultId, ...ref }) => [resultId, ref])) }))
    setSuggestions(field.multiple ? results.filter(result => !ids.includes(result.id)) : results)
  }

  const commit = (next: string[]) => {
    setValue(field.multiple ? next : (next[0] ?? null))
    setTouched(true, false)
  }

  const created = ({ id: createdId, ...ref }: RelationOptionType) => {
    setLabels(current => ({ ...current, [createdId]: ref }))
    commit(field.multiple ? [...ids, createdId] : [createdId])
    setCreating(false)
  }

  return (
    <InputContainer label={label(field)} htmlFor={id} error={error} help={text(field.help)}>
      <AutoComplete
        inputId={id}
        multiple={field.multiple}
        dropdown
        forceSelection
        field='label'
        value={field.multiple ? ids.map(toOption) : (ids[0] ? toOption(ids[0]) : null)}
        suggestions={suggestions}
        completeMethod={event => void search(event.query)}
        placeholder={target ? t('relationInput.search', { name: text(target.label).toLocaleLowerCase(textCtx.locale) }) : t('relationInput.searchAny')}
        emptyMessage={t('relationInput.empty')}
        itemTemplate={optionTemplate}
        invalid={!!error}
        aria-describedby={describedBy(name, field)}
        className='RelationInput'
        inputClassName='RelationInput__Input'
        onChange={event => {
          const selected = event.value as OptionType | OptionType[] | string | null
          if (typeof selected === 'string') return
          commit((Array.isArray(selected) ? selected : selected ? [selected] : []).map(option => option.id))
        }}
      />
      {notices.map(notice => (
        <Notice key={notice.id} tone={notice.missing ? 'warning' : 'info'}>{notice.text}</Notice>
      ))}
      {target && (
        <CustomButton type='button' variant='ghost' size='sm' className='RelationInput__Create' onClick={() => setCreating(true)}>
          <i className='pi pi-plus' aria-hidden='true' />
          {collectionNewLabel(target, textCtx)}
        </CustomButton>
      )}
      {creating && <CreateRelatedDialog entryId={field.to} initialTitle={lastQuery} onCreated={created} onHide={() => setCreating(false)} />}
    </InputContainer>
  )
}

export default RelationInput
