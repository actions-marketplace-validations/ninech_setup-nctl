import { describe, expect, it } from 'vitest'
import {
  assetName,
  normalizeVersion,
  parseChecksums,
  releaseDownloadUrl,
  resolvePlatform,
  versionFromReleaseUrl,
} from '../src/install.js'

describe('resolvePlatform', () => {
  it.each([
    ['linux', 'x64', { os: 'linux', arch: 'amd64' }],
    ['linux', 'arm64', { os: 'linux', arch: 'arm64' }],
    ['darwin', 'arm64', { os: 'darwin', arch: 'arm64' }],
    ['win32', 'x64', { os: 'windows', arch: 'amd64' }],
  ] as const)('%s/%s', (platform, arch, expected) => {
    expect(resolvePlatform(platform, arch)).toEqual(expected)
  })

  it('rejects unsupported platforms', () => {
    expect(() => resolvePlatform('freebsd', 'x64')).toThrow('not available for freebsd/x64')
    expect(() => resolvePlatform('linux', 'ia32')).toThrow('not available for linux/ia32')
  })
})

describe('normalizeVersion', () => {
  it.each([
    ['1.20.0', '1.20.0'],
    ['v1.20.0', '1.20.0'],
    [' v1.20.0 ', '1.20.0'],
    ['1.21.0-rc.1', '1.21.0-rc.1'],
    ['latest', undefined],
    ['', undefined],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeVersion(input)).toBe(expected)
  })

  it.each(['1.20', 'main', '1.20.0; rm -rf /'])('rejects %j', (input) => {
    expect(() => normalizeVersion(input)).toThrow('invalid nctl version')
  })
})

describe('assetName', () => {
  it('uses tar.gz on unix and zip on windows', () => {
    expect(assetName('1.20.0', { os: 'linux', arch: 'amd64' })).toBe(
      'nctl_1.20.0_linux_amd64.tar.gz',
    )
    expect(assetName('1.20.0', { os: 'windows', arch: 'arm64' })).toBe(
      'nctl_1.20.0_windows_arm64.zip',
    )
  })

  it('downloads from the v-prefixed tag', () => {
    expect(releaseDownloadUrl('1.20.0', 'checksums.txt')).toBe(
      'https://github.com/ninech/nctl/releases/download/v1.20.0/checksums.txt',
    )
  })
})

describe('parseChecksums', () => {
  it('parses goreleaser checksum files', () => {
    const content = [
      'b93fdc02e8b26c0997d35871719f2899991c31fc95b84de585bda10e58fe0a51  nctl_1.20.0_darwin_amd64.tar.gz',
      '5093746F0BFE1DE7BCEA7CD8446EF2014856A39F51E5EF92D5F825F072503FC3 *nctl_1.20.0_linux_amd64.tar.gz',
      '',
      'not a checksum line',
    ].join('\r\n')

    const checksums = parseChecksums(content)

    expect(checksums.size).toBe(2)
    expect(checksums.get('nctl_1.20.0_darwin_amd64.tar.gz')).toBe(
      'b93fdc02e8b26c0997d35871719f2899991c31fc95b84de585bda10e58fe0a51',
    )
    expect(checksums.get('nctl_1.20.0_linux_amd64.tar.gz')).toBe(
      '5093746f0bfe1de7bcea7cd8446ef2014856a39f51e5ef92d5f825f072503fc3',
    )
  })
})

describe('versionFromReleaseUrl', () => {
  it('extracts the version from the redirect target', () => {
    expect(versionFromReleaseUrl('https://github.com/ninech/nctl/releases/tag/v1.20.0')).toBe(
      '1.20.0',
    )
  })

  it('rejects unexpected redirects', () => {
    expect(() => versionFromReleaseUrl('https://github.com/login')).toThrow('could not determine')
  })
})
