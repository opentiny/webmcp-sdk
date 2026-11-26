import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { compareSemver, pickLatestPublished, validatePublishRequest } from './npm-publish-version.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function versionInputDefault(workflowRelativePath) {
  const text = fs.readFileSync(path.join(repoRoot, workflowRelativePath), 'utf8').replace(/\r\n/g, '\n')
  const block = text.split('\n      version:\n')[1]
  const match = block?.match(/default: '([^']+)'/)
  return match?.[1] ?? ''
}

const packument = {
  'dist-tags': { latest: '1.0.0', alpha: '1.1.0-alpha.2' },
  time: {
    created: '2020-01-01T00:00:00.000Z',
    modified: '2026-11-25T00:00:00.000Z',
    '1.0.0': '2026-01-01T00:00:00.000Z',
    '1.1.0-alpha.1': '2026-06-01T00:00:00.000Z',
    '1.1.0-alpha.2': '2026-11-20T00:00:00.000Z',
    '9.9.9': '2026-12-01T00:00:00.000Z'
  },
  versions: {
    '1.0.0': {},
    '1.1.0-alpha.1': {},
    '1.1.0-alpha.2': {}
  }
}

test('按发布时间取最近一次发布，不用 latest 标签，也不用未发布版本', () => {
  assert.deepEqual(pickLatestPublished(packument), {
    version: '1.1.0-alpha.2',
    publishedAt: '2026-11-20T00:00:00.000Z'
  })
})

test('留空 version 时只报告最近一次发布，不进入发布', () => {
  const result = validatePublishRequest({ packument, version: '  ', tag: 'alpha' })
  assert.equal(result.ok, true)
  assert.equal(result.publish, false)
  assert.match(result.message, /1\.1\.0-alpha\.2/)
  assert.match(result.message, /latest 标签是 1\.0\.0/)
  assert.doesNotMatch(result.message, /9\.9\.9/)
})

test('新的 alpha 版本可以发布', () => {
  const result = validatePublishRequest({ packument, version: '1.1.0-alpha.3', tag: 'alpha' })
  assert.equal(result.ok, true)
  assert.equal(result.publish, true)
  assert.equal(result.version, '1.1.0-alpha.3')
})

test('已发布版本、latest 标签和通道不一致时拒绝', () => {
  const published = validatePublishRequest({ packument, version: '1.1.0-alpha.2', tag: 'alpha' })
  assert.equal(published.ok, false)

  const asLatest = validatePublishRequest({ packument, version: '1.1.0-alpha.3', tag: 'latest' })
  assert.equal(asLatest.ok, false)
  assert.match(asLatest.message, /不能发布到 latest/)

  const wrongChannel = validatePublishRequest({ packument, version: '1.1.0-beta.1', tag: 'alpha' })
  assert.equal(wrongChannel.ok, false)
  assert.match(wrongChannel.message, /beta/)

  const stableOnAlpha = validatePublishRequest({ packument, version: '1.2.0', tag: 'alpha' })
  assert.equal(stableOnAlpha.ok, false)

  const stable = validatePublishRequest({ packument, version: '1.2.0', tag: 'latest' })
  assert.equal(stable.publish, true)

  const custom = validatePublishRequest({ packument, version: '1.1.0-next.1', tag: 'alpha' })
  assert.equal(custom.publish, true)
})

test('发布表单默认回显对应 package.json 的版本号', () => {
  for (const [workflow, pkg] of [
    ['.github/workflows/dispatch-nextsdk-publish.yml', 'packages/next-sdk/package.json'],
    ['.github/workflows/dispatch-webmcp-cli-publish.yml', 'packages/webmcp-cli/package.json']
  ]) {
    const version = JSON.parse(fs.readFileSync(path.join(repoRoot, pkg), 'utf8')).version
    assert.equal(versionInputDefault(workflow), version)
  }
})

test('带构建元数据的版本会被拒绝，普通 alpha 版本仍可发布', () => {
  const withMetadata = validatePublishRequest({
    packument,
    version: '1.1.0-alpha.2+ci.7',
    tag: 'alpha'
  })
  assert.equal(withMetadata.ok, false)
  assert.match(withMetadata.message, /1\.1\.0-alpha\.2/)
  assert.doesNotMatch(withMetadata.message, /将发布/)

  const freshMetadata = validatePublishRequest({
    packument,
    version: '1.1.0-alpha.9+build.1',
    tag: 'alpha'
  })
  assert.equal(freshMetadata.publish, false)

  const alpha = validatePublishRequest({ packument, version: '1.1.0-alpha.9', tag: 'alpha' })
  assert.equal(alpha.publish, true)
})

test('更旧的版本不能把 dist-tag 退回去', () => {
  assert.equal(compareSemver('1.1.0-alpha.10', '1.1.0-alpha.9'), 1)
  assert.equal(
    compareSemver('1.1.0-alpha.9007199254740993', '1.1.0-alpha.9007199254740992'),
    1
  )
  assert.equal(compareSemver('1.1.0-1', '1.1.0-alpha'), -1)

  const older = validatePublishRequest({ packument, version: '1.0.9-alpha.1', tag: 'alpha' })
  assert.equal(older.ok, false)
  assert.match(older.message, /1\.1\.0-alpha\.2/)

  const newer = validatePublishRequest({ packument, version: '1.1.0-alpha.10', tag: 'alpha' })
  assert.equal(newer.publish, true)

  const olderStable = validatePublishRequest({ packument, version: '0.9.0', tag: 'latest' })
  assert.equal(olderStable.ok, false)
})

test('发布按包排队，查询和检出都不跟着提交漂移', () => {
  for (const workflow of [
    '.github/workflows/dispatch-nextsdk-publish.yml',
    '.github/workflows/dispatch-webmcp-cli-publish.yml'
  ]) {
    const text = fs.readFileSync(path.join(repoRoot, workflow), 'utf8').replace(/\r\n/g, '\n')
    const beforeJobs = text.split('\njobs:\n')[0]
    assert.equal(beforeJobs.includes('concurrency:'), false)
    assert.equal(text.includes('github.ref_name'), false)
    assert.equal(text.match(/ref: \$\{\{ github\.sha \}\}/g)?.length, 2)
    const build = text.split('\n  build:\n')[1]
    const concurrency = build.match(
      /concurrency:\n {6}group:.*\n {6}cancel-in-progress: .*\n {6}queue: .*/
    )
    assert.match(concurrency[0], /group: \$\{\{ github\.workflow \}\}-publish\n/)
    assert.match(concurrency[0], /cancel-in-progress: false/)
    assert.match(concurrency[0], /queue: max/)
    assert.equal(build.includes('Confirm dist-tag moves forward'), true)
  }
})

test('非法版本号会带上最近一次发布作为参考', () => {
  const result = validatePublishRequest({ packument, version: 'latest', tag: 'alpha' })
  assert.equal(result.ok, false)
  assert.match(result.message, /1\.1\.0-alpha\.2/)
})
