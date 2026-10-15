import { describe, expect, expectTypeOf, it } from 'vitest'
import { createTranslator, languageName } from '../translator'
import type { MessageKeyType, MessagesType } from '../types'

describe('createTranslator', () => {
  it('interpolates parameters', () => {
    const { t } = createTranslator({ locale: 'es' })
    expect(t('validation.maxLength', { max: 80 })).toBe('Usá hasta 80 caracteres')
    expect(t('validation.required')).toBe('Este campo es obligatorio')
  })

  it('picks the plural form with Intl.PluralRules', () => {
    const { t } = createTranslator({ locale: 'es' })
    expect(t('diff.images', { count: 1 })).toBe('1 imagen')
    expect(t('diff.images', { count: 3 })).toBe('3 imágenes')
    expect(createTranslator({ locale: 'en' }).t('validation.minBlocks', { count: 2 })).toBe('Add at least 2 blocks')
  })

  it('lets the project override any text and falls back to Spanish', () => {
    const { t } = createTranslator({ locale: 'en', overrides: { en: { collection: { new: 'Add {name}' } } } })
    expect(t('collection.new', { name: 'post' })).toBe('Add post')
    expect(t('common.yes')).toBe('Yes')
    expect(createTranslator({ locale: 'pt' }).t('common.yes')).toBe('Sí')
  })

  it('returns the key for unknown runtime keys', () => {
    expect(createTranslator({ locale: 'es' }).translate('validation.nope')).toBe('validation.nope')
  })

  it('types keys and their parameters', () => {
    const { t } = createTranslator({ locale: 'es' })
    expectTypeOf<'validation.required'>().toExtend<MessageKeyType>()
    // @ts-expect-error unknown key
    t('validation.nope')
    // @ts-expect-error missing the {max} parameter
    t('validation.maxLength')
    // @ts-expect-error a plural needs its count
    t('diff.images', {})
  })

  it('makes every catalog follow the Spanish one', () => {
    // @ts-expect-error a catalog missing keys does not satisfy MessagesType
    const partial: MessagesType = { common: { yes: 'Ja', no: 'Nein', empty: '—', changed: 'Geändert' } }
    expect(partial).toBeTruthy()
  })
})

describe('languageName', () => {
  it('names a language in the panel language, capitalized', () => {
    expect(languageName('en', 'es')).toBe('Inglés')
    expect(languageName('es', 'en')).toBe('Spanish')
  })
})
