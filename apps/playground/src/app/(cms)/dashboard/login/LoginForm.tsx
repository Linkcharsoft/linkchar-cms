'use client'
import { translatorFor } from '@linkcharsoft/cms/core'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import cmsConfig from '../../../../../cms.config'
import { login } from '../../actions'
import type { FormEvent } from 'react'

const { translate } = translatorFor(cmsConfig)

const LoginForm = () => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = await login({ email: form.get('email'), password: form.get('password') })
    if (result.error) return setError(translate(result.error))
    if (result.redirectTo) router.push(result.redirectTo as never)
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
      <label htmlFor='email'>Email</label>
      <input id='email' name='email' type='email' autoComplete='username' />
      <label htmlFor='password'>Contraseña</label>
      <input id='password' name='password' type='password' autoComplete='current-password' />
      <button type='submit'>Ingresar</button>
      {error && <p role='alert'>{error}</p>}
    </form>
  )
}

export default LoginForm
