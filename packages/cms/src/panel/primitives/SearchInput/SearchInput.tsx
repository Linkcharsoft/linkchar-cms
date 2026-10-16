'use client'
import './SearchInput.sass'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '../../client/context'

interface Props {
  id?: string
  initialValue?: string
  placeholder?: string
  'aria-label'?: string
  onChange: (value?: string) => void
  disabled?: boolean
  className?: string
}

const SearchInput = ({
  id,
  initialValue,
  placeholder,
  'aria-label': ariaLabel,
  onChange,
  disabled,
  className
}: Props) => {
  const { t } = useT()
  const autoId = useId()
  const [searchValue, setSearchValue] = useState<string>(initialValue || '')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const label = placeholder ?? t('ui.search')

  const debouncedUpdateSearch = (value: string) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(value), 500)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    if(initialValue === undefined) setSearchValue('')
  }, [initialValue])

  return (
    <IconField iconPosition="right" className={className}>
      <InputText
        id={id ?? autoId}
        name='search'
        className='SearchInput'
        aria-label={ariaLabel || label}
        value={searchValue}
        placeholder={label}
        onChange={e => {
          const value = e.target.value
          setSearchValue(value)
          debouncedUpdateSearch(value)
        }}
        autoComplete="off"
        disabled={disabled}
      />

      {searchValue ? (
        <InputIcon
          className="pi pi-times cms-text-regular-14 cursor-pointer hover:text-cms-danger-600 hover:opacity-75"
          aria-label={t('ui.clearSearch')}
          onClick={() => {
            clearTimeout(timer.current)
            setSearchValue('')
            onChange()
          }}
        />
      ) : (
        <InputIcon className="pi pi-search cms-text-regular-14" />
      )}
    </IconField>
  )
}

export default SearchInput
