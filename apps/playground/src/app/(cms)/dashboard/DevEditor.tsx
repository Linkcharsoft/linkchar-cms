'use client'
import { changedKeys, pickKeys, translatorFor } from '@linkcharsoft/cms/core'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import cmsConfig from '../../../../cms.config'
import { getPublishStatus, publishChanges, saveDocument } from '../actions'
import type { PublishRecordType } from '@linkcharsoft/cms/server'

interface PendingType {
  id: string
  title: string
  action: 'publish' | 'unpublish'
  revision: number
  problems: string[]
}

interface DevEditorProps {
  entryId: string
  id: string | null
  data: Record<string, unknown>
  pending: PendingType[]
  latest: PublishRecordType | null
}

const { translate } = translatorFor(cmsConfig)

const DevEditor = ({ entryId, id: initialId, data, pending, latest: initialLatest }: DevEditorProps) => {
  const router = useRouter()
  const [id, setId] = useState(initialId)
  const [base, setBase] = useState(data)
  const [text, setText] = useState(() => JSON.stringify(data, null, 2))
  const [message, setMessage] = useState('')
  const [latest, setLatest] = useState(initialLatest)

  const building = latest?.buildStatus === 'pending' || latest?.buildStatus === 'building'

  useEffect(() => {
    if (!building) return
    const timer = setInterval(async () => setLatest((await getPublishStatus()).latest), 2000)
    return () => clearInterval(timer)
  }, [building])

  const save = async () => {
    let values: Record<string, unknown>
    try {
      values = JSON.parse(text)
    } catch {
      return setMessage('JSON inválido')
    }
    const result = await saveDocument({ entryId, id, patch: pickKeys(values, changedKeys(values, base)), base })
    if (result.status === 'saved') {
      setId(result.id)
      setBase(result.data)
      setMessage(`Guardado · revisión ${result.revision}`)
      router.refresh()
    } else if (result.status === 'invalid') {
      setMessage(Object.entries(result.errors).map(([path, error]) => `${path}: ${error}`).join(' · '))
    } else if (result.status === 'conflict') {
      setMessage(`Conflicto en ${result.keys.join(', ')}`)
    } else {
      setMessage(translate(result.error))
    }
  }

  const publish = async () => {
    const ready = pending.filter(change => change.problems.length === 0)
    const result = await publishChanges({
      publish: ready.filter(change => change.action === 'publish').map(({ id: changeId, revision }) => ({ id: changeId, revision })),
      remove: ready.filter(change => change.action === 'unpublish').map(change => change.id)
    })
    setMessage(result.ok ? `Publicados ${result.published} · quitados ${result.removed} · build ${result.buildStatus}` : translate(result.error))
    setLatest((await getPublishStatus()).latest)
    router.refresh()
  }

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <label htmlFor='content'>{entryId}{id ? ` · ${id}` : ''}</label>
      <textarea id='content' value={text} onChange={event => setText(event.target.value)} rows={24} style={{ fontFamily: 'monospace' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type='button' onClick={save}>Guardar</button>
        <button type='button' onClick={publish} disabled={pending.length === 0}>Publicar {pending.length} cambios</button>
      </div>
      {message && <p role='status'>{message}</p>}
      <ul>
        {pending.map(change => (
          <li key={change.id}>{change.action} · {change.title}{change.problems.length > 0 ? ` · falta: ${change.problems.join(', ')}` : ''}</li>
        ))}
      </ul>
      {latest && (
        <p data-testid='build-status'>
          Última publicación: {latest.buildStatus}{latest.errorCode ? ` · ${translate(`errors.build.${latest.errorCode}`)}` : ''}
        </p>
      )}
    </section>
  )
}

export default DevEditor
