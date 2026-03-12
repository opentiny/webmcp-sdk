import { Component, OnInit, inject } from '@angular/core'
import { Router } from '@angular/router'
import { RouterOutlet } from '@angular/router'
import { setNavigator } from '@opentiny/next-sdk'
import { createMcpServer, setAngularNavigator } from '../mcp-servers'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private router = inject(Router)

  async ngOnInit(): Promise<void> {
    // 1. 注册基础 SDK 导航器（供 page-tool-bridge 内部自动跳转使用）
    setNavigator(async (route) => {
      await this.router.navigateByUrl(route)
    })

    // 2. 注册 Angular 专属导航器（供 navigate_to_page 工具手动跳转使用）
    // navigateByUrl 返回 Promise<boolean>：成功为 true，被 guard 拦截/取消等为 false，需透传失败状态
    setAngularNavigator(async (path) => {
      const navigated = await this.router.navigateByUrl(path)
      if (!navigated) {
        throw new Error(`页面跳转失败：导航至 "${path}" 被取消或拦截`)
      }
    })

    // 3. 启动 MCP Server
    await createMcpServer()
  }
}
