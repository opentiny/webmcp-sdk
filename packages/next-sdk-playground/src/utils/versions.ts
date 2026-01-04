interface GetVersionsOptions {
  includePrerelease?: boolean | string[] // 是否包含预发布版本，true=包含所有，false=不包含，数组=包含指定类型
  limit?: number // 限制返回的版本总数量，默认为 20
  includeLatest?: boolean // 是否包含 latest tag，默认为 true
}

const versionCache = new Map<string, string[]>()

export async function getVersions(pkg: string, options: GetVersionsOptions = {}): Promise<string[]> {
  const { includePrerelease = false, limit = 20, includeLatest = true } = options
  // 生成缓存键，处理 includePrerelease 可能是数组的情况
  const prereleaseKey = Array.isArray(includePrerelease) ? includePrerelease.join(',') : includePrerelease
  const cacheKey = `${pkg}-${prereleaseKey}-${limit}-${includeLatest}`

  if (versionCache.has(cacheKey)) {
    return versionCache.get(cacheKey)!
  }

  try {
    // 使用 npmmirror 的 API 获取版本信息
    console.log(111, pkg)

    const response = await fetch(`https://registry.npmmirror.com/${pkg}`)
    const data = await response.json()

    const time: Record<string, string> = data?.time || {}
    const allVersions = Object.entries(time)
      .filter(([key]) => key !== 'created' && key !== 'modified')
      .slice()
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .map(([key]) => key)

    let versions = allVersions.filter((version: string) => {
      // 过滤预发布版本
      if (typeof includePrerelease === 'boolean') {
        if (!includePrerelease && /[a-zA-Z]/.test(version)) {
          return false
        }
      } else if (Array.isArray(includePrerelease)) {
        // 如果指定了要包含的预发布版本类型
        if (/[a-zA-Z]/.test(version)) {
          // 检查版本是否包含指定的预发布类型
          const hasMatchingType = includePrerelease.some(
            (type) => version.includes(`-${type}.`) || version.includes(`-${type}-`) || version.endsWith(`-${type}`)
          )
          if (!hasMatchingType) {
            return false
          }
        }
      }
      return true
    })

    // 限制返回的版本数量
    versions = versions.slice(0, limit)

    // Add latest tag if available and includeLatest is true
    if (includeLatest && data['dist-tags']?.latest) {
      if (!versions.includes('latest')) {
        versions.unshift('latest')
      }
    }

    versionCache.set(cacheKey, versions)
    return versions
  } catch (error) {
    console.error(`Failed to fetch versions for ${pkg}:`, error)
    return ['latest']
  }
}
