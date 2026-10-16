import type { HTMLProps } from 'react'

const Label = (props: HTMLProps<HTMLLabelElement>) => {
  return (
    <label
      className="cms-text-medium-16 leading-normal text-cms-ink-700"
      {...props}
    >
      {props.children}
    </label>
  )
}

export default Label
