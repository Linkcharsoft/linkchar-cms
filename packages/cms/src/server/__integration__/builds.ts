import { BUILD_CONFIRMATION_TIMEOUT_MS } from '../../core/publish'
import type { CmsClientType } from '../context'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// publishChanges refuses to run while a build is in progress: wait for the mock to finish, and close a build whose
// timer died with an earlier test run, which would otherwise block publishing for 30 minutes.
export const settleBuilds = async (admin: CmsClientType) => {
  const open = () => admin.from('publish_log').select('id').in('build_status', ['pending', 'building'])
    .gte('requested_at', new Date(Date.now() - BUILD_CONFIRMATION_TIMEOUT_MS).toISOString())
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data } = await open()
    if (!data?.length) return
    await wait(250)
  }
  await admin.from('publish_log').update({ build_status: 'failed', error_code: 'build_cancelled', finished_at: new Date().toISOString() })
    .in('build_status', ['pending', 'building'])
}
