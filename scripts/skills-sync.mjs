#!/usr/bin/env node
/**
 * 将 skills.manifest.json 中的 Skill 同步到 .agents/skills/
 * - localSkills: 相对仓库根的目录 → symlink
 * - npmSkills: 从 node_modules/<package> 解析 SKILL.md 所在目录 → symlink
 * 生产环境（NODE_ENV=production）默认跳过（可用 --force 覆盖）
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const require = createRequire(path.join(root, 'package.json'))
const force = process.argv.includes('--force')

if (process.env.NODE_ENV === 'production' && !force) {
  console.log('[skills:sync] skip in NODE_ENV=production (use --force to override)')
  process.exit(0)
}

const manifestPath = path.join(root, 'skills.manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error('[skills:sync] missing skills.manifest.json')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const targetDir = path.join(root, manifest.targetDir || '.agents/skills')
fs.mkdirSync(targetDir, { recursive: true })

function findSkillRoot(pkgDir) {
  if (fs.existsSync(path.join(pkgDir, 'SKILL.md'))) return pkgDir
  const nestedSkills = path.join(pkgDir, 'skills')
  if (fs.existsSync(nestedSkills) && fs.statSync(nestedSkills).isDirectory()) {
    if (fs.existsSync(path.join(nestedSkills, 'SKILL.md'))) return nestedSkills
    for (const e of fs.readdirSync(nestedSkills, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      const candidate = path.join(nestedSkills, e.name)
      if (fs.existsSync(path.join(candidate, 'SKILL.md'))) return candidate
    }
  }
  return null
}

function removeDest(dest) {
  try {
    fs.lstatSync(dest)
    fs.rmSync(dest, { recursive: true, force: true })
  } catch {
    /* not exists */
  }
}

function linkSkill(name, sourceAbs) {
  const dest = path.join(targetDir, name)
  const skillRoot = findSkillRoot(sourceAbs) || sourceAbs
  if (!fs.existsSync(path.join(skillRoot, 'SKILL.md'))) {
    console.warn(`[skills:sync] skip ${name}: no SKILL.md under ${sourceAbs}`)
    return false
  }
  removeDest(dest)
  const rel = path.relative(targetDir, skillRoot)
  fs.symlinkSync(rel, dest, 'dir')
  console.log(`[skills:sync] ${name} -> ${rel}`)
  return true
}

function resolveNodeModule(pkgName) {
  try {
    return path.dirname(require.resolve(`${pkgName}/package.json`))
  } catch {
    const direct = path.join(root, 'node_modules', ...pkgName.split('/'))
    if (fs.existsSync(direct)) return direct
    return null
  }
}

let ok = 0
let skipped = 0

for (const local of manifest.localSkills || []) {
  const abs = path.join(root, local.path)
  if (!fs.existsSync(abs)) {
    console.warn(`[skills:sync] local missing: ${local.path}`)
    skipped++
    continue
  }
  if (linkSkill(local.name, abs)) ok++
  else skipped++
}

for (const npm of manifest.npmSkills || []) {
  const pkgDir = resolveNodeModule(npm.package)
  if (!pkgDir) {
    const msg = `[skills:sync] npm package not installed: ${npm.package}`
    if (npm.optional) {
      console.warn(`${msg} (optional, skip)`)
      skipped++
      continue
    }
    console.error(msg)
    process.exitCode = 1
    skipped++
    continue
  }
  if (linkSkill(npm.name, pkgDir)) ok++
  else skipped++
}

console.log(`[skills:sync] done: linked=${ok}, skipped=${skipped}, target=${manifest.targetDir}`)
