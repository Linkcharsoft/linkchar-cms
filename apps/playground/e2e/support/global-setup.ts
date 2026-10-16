import { existsSync } from 'node:fs'

const globalSetup = async () => {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')
  const { admin, resetQaUsers } = await import('./db')
  await resetQaUsers()

  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  for (const user of data.users.filter(item => item.email?.startsWith('e2e-'))) await admin.auth.admin.deleteUser(user.id)
}

export default globalSetup
