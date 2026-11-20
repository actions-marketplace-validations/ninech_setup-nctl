import { hash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'

const REPO_URL = 'https://github.com/ninech/nctl'
const TOOL_NAME = 'nctl'
const USER_AGENT = 'ninech/setup-nctl'

export interface Platform {
  os: 'linux' | 'darwin' | 'windows'
  arch: 'amd64' | 'arm64'
}

export interface Installation {
  version: string
  dir: string
  bin: string
}

/** Maps Node's platform/arch names to the names used in nctl release assets. */
export function resolvePlatform(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): Platform {
  const osMap: Partial<Record<NodeJS.Platform, Platform['os']>> = {
    linux: 'linux',
    darwin: 'darwin',
    win32: 'windows',
  }
  const archMap: Record<string, Platform['arch']> = { x64: 'amd64', arm64: 'arm64' }

  const os = osMap[platform]
  const mappedArch = archMap[arch]
  if (!os || !mappedArch) {
    throw new Error(`nctl is not available for ${platform}/${arch}`)
  }
  return { os, arch: mappedArch }
}

/**
 * Normalizes a user supplied version ("v1.2.3" or "1.2.3") to "1.2.3".
 * Returns undefined for "latest" or an empty value.
 */
export function normalizeVersion(input: string): string | undefined {
  const version = input.trim()
  if (version === '' || version.toLowerCase() === 'latest') {
    return undefined
  }
  const match = /^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(version)
  if (!match?.[1]) {
    throw new Error(`invalid nctl version "${input}": expected "latest" or a version like "1.20.0"`)
  }
  return match[1]
}

export function assetName(version: string, platform: Platform): string {
  const ext = platform.os === 'windows' ? 'zip' : 'tar.gz'
  return `nctl_${version}_${platform.os}_${platform.arch}.${ext}`
}

export function releaseDownloadUrl(version: string, file: string): string {
  return `${REPO_URL}/releases/download/v${version}/${file}`
}

/** Parses a goreleaser checksums.txt ("<sha256>  <file>" per line). */
export function parseChecksums(content: string): Map<string, string> {
  const checksums = new Map<string, string>()
  for (const line of content.split(/\r?\n/)) {
    const match = /^([a-f0-9]{64})\s+\*?(\S+)$/i.exec(line.trim())
    if (match?.[1] && match[2]) {
      checksums.set(match[2], match[1].toLowerCase())
    }
  }
  return checksums
}

/** Extracts the version from a ".../releases/tag/v1.2.3" URL. */
export function versionFromReleaseUrl(url: string): string {
  const match = /\/releases\/tag\/([^/?#]+)/.exec(url)
  const version = match?.[1] && normalizeVersion(decodeURIComponent(match[1]))
  if (!version) {
    throw new Error(`could not determine nctl version from release URL "${url}"`)
  }
  return version
}

/**
 * Resolves the latest nctl release by following the redirect of the
 * /releases/latest page. Unlike the REST API this is not subject to the
 * unauthenticated API rate limit.
 */
export async function resolveLatestVersion(): Promise<string> {
  const res = await fetch(`${REPO_URL}/releases/latest`, {
    method: 'HEAD',
    redirect: 'manual',
    headers: { 'User-Agent': USER_AGENT },
  })
  const location = res.headers.get('location')
  if (!location) {
    throw new Error(`could not resolve the latest nctl release (HTTP ${res.status})`)
  }
  return versionFromReleaseUrl(location)
}

async function downloadChecksums(version: string): Promise<Map<string, string>> {
  const file = await tc.downloadTool(releaseDownloadUrl(version, 'checksums.txt'))
  return parseChecksums(await readFile(file, 'utf8'))
}

/**
 * Installs nctl into the tool cache (or reuses a cached copy) and adds it to
 * the PATH. The downloaded archive is verified against the release checksums.
 */
export async function installNctl(versionInput: string): Promise<Installation> {
  const platform = resolvePlatform()
  const version = normalizeVersion(versionInput) ?? (await resolveLatestVersion())
  const binName = platform.os === 'windows' ? 'nctl.exe' : 'nctl'

  let dir = tc.find(TOOL_NAME, version, platform.arch)
  if (dir) {
    core.info(`Found nctl ${version} in the tool cache`)
  } else {
    const file = assetName(version, platform)
    const url = releaseDownloadUrl(version, file)

    core.info(`Downloading ${url}`)
    const [archive, checksums] = await Promise.all([
      tc.downloadTool(url),
      downloadChecksums(version),
    ])

    const expected = checksums.get(file)
    if (!expected) {
      throw new Error(`checksums.txt of nctl ${version} has no entry for ${file}`)
    }
    const actual = hash('sha256', await readFile(archive))
    if (actual !== expected) {
      throw new Error(`checksum mismatch for ${file}: expected ${expected}, got ${actual}`)
    }
    core.info(`Verified SHA-256 checksum ${actual}`)

    const extracted =
      platform.os === 'windows' ? await tc.extractZip(archive) : await tc.extractTar(archive)
    dir = await tc.cacheDir(extracted, TOOL_NAME, version, platform.arch)
  }

  core.addPath(dir)
  return { version, dir, bin: path.join(dir, binName) }
}
