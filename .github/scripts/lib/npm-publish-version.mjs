/**
 * 解析手动发布要用的版本号。
 *
 * 「最近一次发布」按 npm packument 的 time 取最晚的已发布版本，
 * 不使用 dist-tags.latest。latest 只作为对照信息打印。
 */
import fs from 'node:fs'

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

const ALLOWED_TAGS = new Set(['alpha', 'beta', 'rc', 'latest'])
const CHANNELS = new Set(['alpha', 'beta', 'rc'])
const PACKAGE_NAME_RE = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/

export function pickLatestPublished(packument) {
  const versions = packument?.versions ?? {}
  const time = packument?.time ?? {}
  let best = null
  for (const version of Object.keys(versions)) {
    if (!SEMVER_RE.test(version)) continue
    const publishedAt = time[version]
    if (typeof publishedAt !== 'string' || /[\r\n%]/.test(publishedAt)) continue
    const ms = Date.parse(publishedAt)
    if (Number.isNaN(ms)) continue
    if (!best || ms > best.ms || (ms === best.ms && version > best.version)) {
      best = { version, publishedAt, ms }
    }
  }
  if (!best) return null
  return { version: best.version, publishedAt: best.publishedAt }
}

export function latestDistTag(packument) {
  const value = packument?.['dist-tags']?.latest
  return typeof value === 'string' && SEMVER_RE.test(value) ? value : null
}

function publishedAtOf(packument, version) {
  if (!version) return null
  const value = packument?.time?.[version]
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null
  return value
}

function prereleaseId(version) {
  const match = SEMVER_RE.exec(version)
  if (!match?.[4]) return null
  return match[4].split('.')[0]
}

function referenceText(latestPublished, latestTagVersion, latestTagPublishedAt) {
  const latest = latestPublished
    ? `${latestPublished.version}（${latestPublished.publishedAt}）`
    : '无'
  const tagged = latestTagVersion
    ? `${latestTagVersion}${latestTagPublishedAt ? `（${latestTagPublishedAt}）` : ''}`
    : '无'
  return `最近一次发布的版本是 ${latest}；latest 标签是 ${tagged}。`
}

function tagError(version, tag) {
  if (!ALLOWED_TAGS.has(tag)) {
    return `tag「${tag || '空'}」不在 alpha、beta、rc、latest 中。`
  }
  const id = prereleaseId(version)
  if (!id) {
    if (tag !== 'latest') {
      return `版本 ${version} 是正式版本，tag 请选 latest，当前是 ${tag}。`
    }
    return null
  }
  if (tag === 'latest') {
    return `版本 ${version} 是预发布版本，不能发布到 latest 标签。`
  }
  if (CHANNELS.has(id) && tag !== id) {
    return `版本 ${version} 的预发布通道是 ${id}，与 tag「${tag}」不一致。请把 tag 改成 ${id}。`
  }
  return null
}

export function validatePublishRequest({ packument, version, tag }) {
  const requested = String(version ?? '').trim()
  const latestPublished = pickLatestPublished(packument)
  const latestTagVersion = latestDistTag(packument)
  const latestTagPublishedAt = publishedAtOf(packument, latestTagVersion)
  const base = { latestPublished, latestTagVersion, latestTagPublishedAt, version: requested }

  if (!requested) {
    return {
      ...base,
      ok: true,
      publish: false,
      version: '',
      message: `未填写 version，本次不发布。${referenceText(latestPublished, latestTagVersion, latestTagPublishedAt)}请重新运行，把 version 改成要发布的新版本（可在最近一次发布的版本上修改）。版本号只写入本次构建，不会提交到仓库。`
    }
  }

  if (!SEMVER_RE.test(requested)) {
    return {
      ...base,
      ok: false,
      publish: false,
      message: `version「${requested}」不是合法的语义化版本号，且不要带 v 前缀。${referenceText(latestPublished, latestTagVersion, latestTagPublishedAt)}`
    }
  }

  if (packument?.versions && Object.hasOwn(packument.versions, requested)) {
    return {
      ...base,
      ok: false,
      publish: false,
      message: `版本 ${requested} 已经发布过，不能重复发布。${referenceText(latestPublished, latestTagVersion, latestTagPublishedAt)}请改成一个新版本后再运行。`
    }
  }

  const mismatch = tagError(requested, tag)
  if (mismatch) {
    return { ...base, ok: false, publish: false, message: mismatch }
  }

  return {
    ...base,
    ok: true,
    publish: true,
    message: `将发布 ${requested}，dist-tag 为 ${tag}。${referenceText(latestPublished, latestTagVersion, latestTagPublishedAt)}版本号只写入本次构建，不会提交到仓库。`
  }
}

export function formatSummary({ packageName, tag, result }) {
  const latest = result.latestPublished
  const lines = [
    '### npm 版本参考',
    '',
    '| 来源 | 版本 | 发布时间 |',
    '| --- | --- | --- |',
    `| 最近一次发布（按发布时间） | \`${latest ? latest.version : '无'}\` | ${latest ? latest.publishedAt : '无'} |`,
    `| latest 标签 | \`${result.latestTagVersion || '无'}\` | ${result.latestTagPublishedAt || '无'} |`,
    ''
  ]
  if (result.publish) {
    lines.push(
      '### 本次将发布',
      '',
      `- 包：\`${packageName}\``,
      `- 版本：\`${result.version}\``,
      `- dist-tag：\`${tag}\``,
      '',
      '版本号只写入本次 runner 的 package.json，不会提交到仓库。'
    )
  } else if (result.ok) {
    lines.push(
      '### 本次不发布',
      '',
      'version 留空，所以只查出最近一次发布的版本。',
      '请重新运行，把 version 改成新的 alpha 或 beta 版本。',
      '版本号不会提交到仓库。'
    )
  } else {
    lines.push('### 未发布', '', result.message)
  }
  return `${lines.join('\n')}\n`
}

export function registryUrl(packageName) {
  if (!PACKAGE_NAME_RE.test(packageName)) {
    throw new Error(`非法包名：${packageName}`)
  }
  return `https://registry.npmjs.org/${packageName.replace('/', '%2F')}`
}

export async function fetchPackument(packageName) {
  const response = await fetch(registryUrl(packageName), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(20000)
  })
  if (response.status === 404) {
    return { versions: {}, time: {}, 'dist-tags': {} }
  }
  if (!response.ok) {
    throw new Error(`读取 ${packageName} 的 npm 元数据失败：HTTP ${response.status}`)
  }
  return response.json()
}

function workflowSafe(value) {
  return String(value).replace(/[%\r\n]/g, '')
}

function annotate(kind, title, message) {
  console.log(`::${kind} title=${workflowSafe(title)}::${workflowSafe(message)}`)
}

function writeOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`)
}

function writeSummary(text) {
  if (!process.env.GITHUB_STEP_SUMMARY) return
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text)
}

export async function runResolve({ packageName, version, tag } = {}) {
  const name = packageName || process.env.PACKAGE_NAME || ''
  const requested = version ?? process.env.INPUT_VERSION ?? ''
  const selectedTag = tag ?? process.env.INPUT_TAG ?? ''
  if (!PACKAGE_NAME_RE.test(name)) {
    annotate('error', '包名无效', `PACKAGE_NAME 无效：${name}`)
    return 1
  }

  let packument
  try {
    packument = await fetchPackument(name)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    annotate('error', '查询 npm 失败', message)
    return 1
  }

  const result = validatePublishRequest({ packument, version: requested, tag: selectedTag })
  writeSummary(formatSummary({ packageName: name, tag: selectedTag, result }))
  console.log(result.message)

  if (!result.ok) {
    annotate('error', '不能发布', result.message)
    return 1
  }

  writeOutput('publish', result.publish ? 'true' : 'false')
  writeOutput('version', result.version)
  if (!result.publish) {
    const shown = result.latestPublished?.version || '无'
    annotate('notice', '最近发布的版本', `${shown}。${result.message}`)
  }
  return 0
}
