// Releases the action. dist/ is not committed on main, so every release is a
// commit on top of the released main commit that adds the built dist/:
//
//   src/vX.Y.Z  the released main commit. semantic-release finds the previous
//               version and the commits since through these tags.
//   vX.Y.Z, vX  the commit with dist/ that users reference.
//
// semantic-release only determines the version and release notes (dry run).
// The tags are pushed in a single atomic push, so a failed release leaves no
// partial set of tags behind.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import semanticRelease from 'semantic-release'

const BOT_NAME = 'github-actions[bot]'
const BOT_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com'

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' })
}

const result = await semanticRelease({ dryRun: true })

if (result && result.nextRelease) {
  const { version, gitTag: srcTag, gitHead, notes } = result.nextRelease
  const tag = `v${version}`
  const majorTag = `v${version.split('.')[0]}`

  run('git', ['checkout', '--detach', gitHead])
  run('git', ['add', '--force', 'dist'])
  run('git', [
    '-c',
    `user.name=${BOT_NAME}`,
    '-c',
    `user.email=${BOT_EMAIL}`,
    'commit',
    '--message',
    `chore(release): ${tag}`,
  ])
  run('git', ['tag', srcTag, gitHead])
  run('git', ['tag', tag])
  run('git', [
    'push',
    '--atomic',
    'origin',
    `refs/tags/${srcTag}`,
    `refs/tags/${tag}`,
    `+refs/tags/${tag}:refs/tags/${majorTag}`,
  ])

  const notesFile = path.join(process.env.RUNNER_TEMP || tmpdir(), 'release-notes.md')
  writeFileSync(notesFile, notes ?? '')
  run('gh', ['release', 'create', tag, '--verify-tag', '--title', tag, '--notes-file', notesFile])
}
