'use client'
import { Fragment } from 'react'
import { listParts } from '../../../core/i18n/translator'
import { useT } from '../../client/context'
import type { ReactNode } from 'react'

interface Props<T> {
  items: T[]
  label: (item: T) => string
  render: (item: T) => ReactNode
  type?: Intl.ListFormatType
}

// "a, b y c" with each item rendered as a node (a link), in the panel language.
const InlineList = <T,>({ items, label, render, type = 'conjunction' }: Props<T>) => {
  const { locale } = useT()
  let index = 0
  return listParts(locale, items.map(label), type).map((part, position) => (
    <Fragment key={position}>{part.type === 'literal' ? part.value : render(items[index++])}</Fragment>
  ))
}

export default InlineList

// A catalog sentence with nodes in its placeholders: "Cambió: {sections}." keeps its punctuation per language.
export const fillTemplate = (template: string, nodes: Record<string, ReactNode>): ReactNode[] =>
  template.split(/\{(\w+)\}/).map((piece, position) => (position % 2 === 1 ? <Fragment key={position}>{nodes[piece] ?? `{${piece}}`}</Fragment> : piece))
