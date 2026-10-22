import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { CliError } from './migrations.js'

/**
 * @typedef {{ id: string, email?: string }} AuthUserType
 * @typedef {{ message: string, code?: string } | null} AuthErrorType
 * @typedef {{
 *   auth: { admin: {
 *     createUser: (attributes: { email: string, password: string, email_confirm: boolean, user_metadata: Record<string, string> }) => Promise<{ data: { user: AuthUserType | null }, error: AuthErrorType }>,
 *     inviteUserByEmail: (email: string, options: { data: Record<string, string> }) => Promise<{ data: { user: AuthUserType | null }, error: AuthErrorType }>,
 *     updateUserById: (id: string, attributes: { password: string }) => Promise<{ error: AuthErrorType }>,
 *     listUsers: (options: { page: number, perPage: number }) => Promise<{ data: { users: AuthUserType[] }, error: AuthErrorType }>
 *   } },
 *   from: (table: 'profiles') => { update: (values: Record<string, unknown>) => { eq: (column: 'id', value: string) => { select: (columns: 'id') => { maybeSingle: () => Promise<{ data: { id: string } | null, error: AuthErrorType }> } } } }
 * }} AdminClientType
 * @typedef {{ email: string, password?: string, name?: string }} SuperadminInputType
 * @typedef {{ status: 'created' | 'invited' | 'promoted', userId: string }} SuperadminResultType
 */

// KEY=VALUE lines of a dotenv file, without expansion; the shell environment wins over the file.
/** @param {string} file @returns {Promise<Record<string, string>>} */
export const readEnvFile = async file => {
  if (!existsSync(file)) return {}
  const lines = (await readFile(file, 'utf8')).split(/\r?\n/)
  return Object.fromEntries(lines.flatMap(line => {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!match || line.trim().startsWith('#')) return []
    return [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]]
  }))
}

/** @param {AdminClientType} client @param {string} email */
const findUser = async (client, email) => {
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new CliError(`Could not list the users: ${error.message}`)
    const found = data.users.find(user => user.email?.toLowerCase() === email.toLowerCase())
    if (found || data.users.length < 1000) return found ?? null
  }
}

/**
 * The first superadmin: created with a password, invited by email without one, or promoted when the user exists.
 * Runs with the secret key, which the profile guard lets change roles.
 * @param {AdminClientType} client
 * @param {SuperadminInputType} input
 * @returns {Promise<SuperadminResultType>}
 */
export const createSuperadmin = async (client, { email, password, name = '' }) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CliError(`--email "${email}" is not an email address.`)

  /** @type {SuperadminResultType['status']} */
  let status = 'promoted'
  let user = await findUser(client, email)
  if (user && password) {
    const { error } = await client.auth.admin.updateUserById(user.id, { password })
    if (error) throw new CliError(`Could not set the password: ${error.message}`)
  }
  if (!user && password) {
    const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })
    if (error || !data.user) throw new CliError(`Could not create ${email}: ${error?.message ?? 'no user returned'}`)
    user = data.user
    status = 'created'
  }
  if (!user) {
    const { data, error } = await client.auth.admin.inviteUserByEmail(email, { data: { name } })
    if (error || !data.user) throw new CliError(`Could not invite ${email}: ${error?.message ?? 'no user returned'}`)
    user = data.user
    status = 'invited'
  }

  const values = { role: 'superadmin', can_publish: true, active: true, ...(name ? { name } : {}) }
  const { data, error } = await client.from('profiles').update(values).eq('id', user.id).select('id').maybeSingle()
  if (error || !data) throw new CliError(`Could not promote ${email}: ${error?.message ?? 'no profile row (are the package migrations applied?)'}`)
  return { status, userId: user.id }
}
