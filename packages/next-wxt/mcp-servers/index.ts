import type { MetaConfig, ModuleInfo } from './types'

// 主模块工具文件（每个域名的 index.ts）
const modules = import.meta.glob('./*/index.ts', { eager: true })
// 元信息文件（每个域名的 meta.ts）
export const metaModules = import.meta.glob('./*/meta.ts', { eager: true })
// 所有子模块文件（用于动态加载子模块工具）
const allModules = import.meta.glob('./*/**/*.ts', { eager: true })

// 工具名称到模块信息的映射表（用于路由拦截）
const toolModuleMap = new Map<string, ModuleInfo>()

/**
 * 解析子模块入口路径
 * @param domain - 域名
 * @param entry - 子模块入口相对路径（相对于 meta.ts 所在目录）
 * @returns 完整的模块路径
 */
function resolveModuleEntry(domain: string, entry: string): string {
  return `./${domain}/${entry}`
}

/**
 * 加载指定域名的所有子模块工具
 * @param domain - 域名
 * @param meta - 元信息配置
 * @returns 子模块工具注册函数数组
 */
function loadSubModuleTools(domain: string, meta: MetaConfig): Array<any> {
  const subModuleTools: Array<any> = []
  
  // 如果没有配置子模块，直接返回空数组
  if (!meta.modules) {
    return subModuleTools
  }

  // 遍历所有子模块配置
  for (const [moduleName, moduleConfig] of Object.entries(meta.modules)) {
    const modulePath = resolveModuleEntry(domain, moduleConfig.entry)
    const moduleFile = allModules[modulePath]

    if (moduleFile) {
      const toolFunc = (moduleFile as any).default || moduleFile
      
      // 创建一个包装函数来记录工具映射
      const wrappedToolFunc = (params: any) => {
        // 创建一个包装的 server 对象，拦截 registerTool 调用
        const wrappedServer = new Proxy(params.server, {
          get(target, prop) {
            if (prop === 'registerTool') {
              // 返回一个包装的 registerTool 函数
              return (toolName: string, ...args: any[]) => {
                // 先记录工具所属的模块信息
                toolModuleMap.set(toolName, {
                  moduleName,
                  moduleUrl: moduleConfig.url,
                  domain
                })
                
                // 然后调用原始的 registerTool（注意：直接调用 target 的方法，不通过 proxy）
                return target[prop](toolName, ...args)
              }
            }
            return target[prop as keyof typeof target]
          }
        })
        
        // 执行子模块工具注册，传入包装后的 server
        return toolFunc({ ...params, server: wrappedServer })
      }
      
      subModuleTools.push(wrappedToolFunc)
    } else {
      console.warn(`子模块文件未找到: ${modulePath}`)
    }
  }

  return subModuleTools
}

/**
 * 根据域名和当前 URL 获取对应的 MCP 工具配置
 * @param hostname - 当前页面的域名（如 'opentiny.design'）
 * @param currentUrl - 当前页面的完整 URL（可选，用于按需加载子模块）
 * @returns 匹配的工具模块，如果没有匹配则返回 null
 */
export default function getMcpToolByHostname(hostname: string, currentUrl?: string) {
  // 遍历所有模块，查找匹配的域名
  for (const [path, module] of Object.entries(modules)) {
    // 从路径中提取域名：'./www.baidu.com/index.ts' -> 'www.baidu.com'
    const domainMatch = path.match(/^\.\/(.+)\/index\.ts$/)
    if (domainMatch && domainMatch[1] === hostname) {
      const mainTool = (module as any).default || module
      const meta = getMcpMetaInfo(hostname) as MetaConfig
      
      // 如果没有子模块配置，直接返回主工具
      if (!meta || !meta.modules) {
        return mainTool
      }
      
      // 根据 currentUrl 过滤需要加载的子模块
      let subModulesToLoad: Array<any> = []
      
      if (currentUrl && meta.modules) {
        // 检查当前 URL 是否匹配任何子模块的 URL
        for (const [moduleName, moduleConfig] of Object.entries(meta.modules)) {
          try {
            const currentUrlObj = new URL(currentUrl)
            const moduleUrlObj = new URL(moduleConfig.url)
            
            // 比较 origin 和 pathname
            if (currentUrlObj.origin === moduleUrlObj.origin && 
                currentUrlObj.pathname === moduleUrlObj.pathname) {
              // URL 匹配，加载这个子模块
              const modulePath = resolveModuleEntry(hostname, moduleConfig.entry)
              const moduleFile = allModules[modulePath]
              
              if (moduleFile) {
                const toolFunc = (moduleFile as any).default || moduleFile
                
                // 创建包装函数来记录工具映射
                const wrappedToolFunc = (params: any) => {
                  const wrappedServer = new Proxy(params.server, {
                    get(target, prop) {
                      if (prop === 'registerTool') {
                        return (toolName: string, ...args: any[]) => {
                          toolModuleMap.set(toolName, {
                            moduleName,
                            moduleUrl: moduleConfig.url,
                            domain: hostname
                          })
                          return target[prop](toolName, ...args)
                        }
                      }
                      return target[prop as keyof typeof target]
                    }
                  })
                  return toolFunc({ ...params, server: wrappedServer })
                }
                
                subModulesToLoad.push(wrappedToolFunc)
              }
            }
          } catch (error) {
            console.warn(`URL 解析失败: ${error}`)
          }
        }
      }
      
      // 如果没有匹配到任何子模块，只返回主工具
      if (subModulesToLoad.length === 0) {
        return mainTool
      }
      
      // 返回合并后的工具注册函数
      return (params: any) => {
        // 先注册主模块工具
        if (mainTool) {
          mainTool(params)
        }
        
        // 再注册匹配的子模块工具
        subModulesToLoad.forEach(toolFunc => {
          toolFunc(params)
        })
      }
    }
  }

  // 如果没有找到匹配的域名配置，返回 null
  return null
}

/**
 * 根据工具名称获取模块信息
 * @param toolName - 工具名称
 * @returns 模块信息，如果工具不属于任何子模块则返回 null
 */
export function getModuleInfoByToolName(toolName: string): ModuleInfo | null {
  return toolModuleMap.get(toolName) || null
}

/**
 * 获取工具模块映射表（用于 sidepanel 中的路由跳转）
 * @returns 工具名称到模块信息的映射表
 */
export function getToolModuleMap(): Map<string, ModuleInfo> {
  return toolModuleMap
}

export const getMcpMetaInfo = (hostname: string) => {
  for (const [path, module] of Object.entries(metaModules)) {
    const domainMatch = path.match(/^\.\/(.+)\/meta\.ts$/)
    if (domainMatch && domainMatch[1] === hostname) {
      return (module as any).default || module
    }
  }
  return null
}

/**
 * 根据 isAlwaysEnabled 获取所有匹配的工具配置（包括子模块）
 * @returns 匹配类型的工具模块数组，每个元素包含 meta（元信息）、tool（工具注册函数）和 domain（域名）
 */
export const getAllMcpServersByIsAlwaysEnabled = () => {
  const result: Array<{ meta: any; tool: any; domain: string }> = []

  for (const [metaPath, metaModule] of Object.entries(metaModules)) {
    const meta = (metaModule as any).default || metaModule

    if (meta.isAlwaysEnabled) {
      const domain = meta.name
      const toolPath = `./${domain}/index.ts`
      const toolModule = modules[toolPath]

      if (toolModule) {
        const mainTool = (toolModule as any).default || toolModule
        
        // 如果有子模块配置，加载并合并子模块工具
        if (meta.modules) {
          const subModuleTools = loadSubModuleTools(domain, meta)
          
          // 合并主模块和子模块工具
          const combinedTool = (params: any) => {
            // 先注册主模块工具
            if (mainTool) {
              mainTool(params)
            }
            
            // 再注册所有子模块工具
            subModuleTools.forEach(toolFunc => {
              toolFunc(params)
            })
          }
          
          result.push({
            meta,
            tool: combinedTool,
            domain
          })
        } else {
          // 没有子模块，只添加主模块
          result.push({
            meta,
            tool: mainTool,
            domain
          })
        }
      }
    }
  }

  return result
}
