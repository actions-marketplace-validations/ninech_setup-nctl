import * as core from '@actions/core'
import { installNctl } from './install.js'

export async function run(): Promise<void> {
  try {
    const { version, dir } = await installNctl(core.getInput('version'))
    core.setOutput('version', version)
    core.setOutput('path', dir)
    core.info(`nctl ${version} is available on the PATH`)
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}
