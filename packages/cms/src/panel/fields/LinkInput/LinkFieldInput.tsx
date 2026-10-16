'use client'
import { useFieldLabel } from '../fieldUtils'
import LinkInput from './LinkInput'
import type { LinkField } from '../../../core/kinds/link'

interface Props {
  name: string
  field: LinkField
}

// A link field of the schema; buttons reuse LinkInput for their destination.
const LinkFieldInput = ({ name, field }: Props) => {
  const label = useFieldLabel()
  return <LinkInput name={name} label={label(field)} allow={field.allow} />
}

export default LinkFieldInput
