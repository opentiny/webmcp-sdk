import { Component, OnInit, inject } from '@angular/core'
import { Router } from '@angular/router'
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'
import { setNavigator, initializeBuiltinWebMCP } from '@opentiny/next-sdk'
import { createMcpServer } from '../mcp-servers'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private router = inject(Router)
  async ngOnInit(): Promise<void> {
    // 1. 注册基础 SDK 导航器（供 page-tool-bridge 和 registerNavigateTool 内部自动跳转使用）
    // navigateByUrl 返回 false 时表示被取消或拦截，需抛出错误
    setNavigator(async (route) => {
      const navigated = await this.router.navigateByUrl(route)
      if (!navigated) {
        throw new Error(`页面跳转失败：导航至 "${route}" 被取消或拦截`)
      }
    })

    // 2. 激活浏览器内置 WebMCP 服务 (含低版本浏览器 Polyfill)
    initializeBuiltinWebMCP()

    // 3. 本地 MCP Server 启动：失败则直接抛出（核心功能）
    await createMcpServer()
  }
}
