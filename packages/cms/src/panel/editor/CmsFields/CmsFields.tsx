'use client'
import './CmsFields.sass'
import { Panel } from 'primereact/panel'
import { TabPanel, TabView } from 'primereact/tabview'
import { use, useEffect, useState } from 'react'
import { useT } from '../../client/context'
import { EntryContext } from '../../fields/entryContext'
import { useText } from '../../fields/fieldUtils'
import { countIssues, FormFocusContext, holdsPath, useOpenOnFocus } from '../../fields/formFocusContext'
import { RemountContext } from '../../fields/remountContext'
import Notice from '../../primitives/Notice/Notice'
import CmsField from '../CmsField/CmsField'
import type { DataField, FieldNode, FieldsRecord, PanelLayout, TabLayout } from '../../../core/fields'

interface Props {
  fields: FieldsRecord
  // Data path of the parent ("items.0."), empty at the root. Tabs, panels and rows don't add a level.
  prefix?: string
}

type NodeEntry = [string, FieldNode]

const IssueCount = ({ count }: { count: number }) => {
  const { t } = useT()
  return count > 0 ? <span className='CmsFields__Issues' aria-label={t('fields.issues', { count })}>{count}</span> : null
}

// Keyed by language and remount version: rich text isn't controlled, so a new value or language needs a new editor.
const DataFieldNode = ({ name, field }: { name: string, field: DataField }) => {
  const versions = use(RemountContext)
  const { locale } = use(EntryContext)
  return <CmsField key={`${name}:${locale}:${versions[name.split('.')[0]] ?? 0}`} name={name} field={field} />
}

const PanelNode = ({ panel, prefix }: { panel: PanelLayout, prefix: string }) => {
  const text = useText()
  const [collapsed, setCollapsed] = useState(!!panel.collapsed)
  const count = useOpenOnFocus(panel.fields, prefix, () => setCollapsed(false))

  return (
    <Panel
      header={<span className='CmsFields__Header'>{text(panel.label)}<IssueCount count={count} /></span>}
      toggleable
      collapsed={collapsed}
      onToggle={event => setCollapsed(event.value)}
      className='CmsFields__Panel'
    >
      <div className='CmsFields__Body'>
        <CmsFields fields={panel.fields} prefix={prefix} />
      </div>
    </Panel>
  )
}

// Tabs that sit together render as one TabView where the first of them is declared.
const TabsNode = ({ tabs, prefix }: { tabs: [string, TabLayout][], prefix: string }) => {
  const text = useText()
  const { issues, reveal } = use(FormFocusContext)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const index = reveal ? tabs.findIndex(([, tab]) => holdsPath(reveal.path, tab.fields, prefix)) : -1
    if (index >= 0) setActive(index)
  // Only when a new reveal arrives.
  }, [reveal?.nonce])

  return (
    <TabView className='CmsFields__Tabs' activeIndex={active} onTabChange={event => setActive(event.index)}>
      {tabs.map(([key, tab]) => (
        <TabPanel key={key} header={<span className='CmsFields__Header'>{text(tab.label)}<IssueCount count={countIssues(issues, tab.fields, prefix)} /></span>}>
          <div className='CmsFields__Body'>
            <CmsFields fields={tab.fields} prefix={prefix} />
          </div>
        </TabPanel>
      ))}
    </TabView>
  )
}

const CmsNode = ({ nodeKey, node, prefix }: { nodeKey: string, node: FieldNode, prefix: string }) => {
  const text = useText()
  if (node.kind === 'note') return <Notice>{text(node.text)}</Notice>
  if (node.kind === 'row') {
    return (
      <div className='CmsFields__Row'>
        <CmsFields fields={node.fields} prefix={prefix} />
      </div>
    )
  }
  if (node.kind === 'panel') return <PanelNode panel={node} prefix={prefix} />
  if (node.kind === 'tab') return null
  return <DataFieldNode name={`${prefix}${nodeKey}`} field={node} />
}

const CmsFields = ({ fields, prefix = '' }: Props) => {
  const entries: NodeEntry[] = Object.entries(fields)
  const isTab = (entry: NodeEntry): entry is [string, TabLayout] => entry[1].kind === 'tab'

  return entries.map((entry, index) => {
    const [key, node] = entry
    if (!isTab(entry)) return <CmsNode key={key} nodeKey={key} node={node} prefix={prefix} />
    if (index > 0 && isTab(entries[index - 1])) return null

    const run = entries.slice(index)
    const end = run.findIndex(candidate => !isTab(candidate))
    return <TabsNode key={key} tabs={(end === -1 ? run : run.slice(0, end)) as [string, TabLayout][]} prefix={prefix} />
  })
}

export default CmsFields
