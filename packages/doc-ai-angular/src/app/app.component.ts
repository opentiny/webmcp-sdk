import { Component, OnInit, inject } from '@angular/core'
import { Router } from '@angular/router'
import { RouterOutlet } from '@angular/router'
import { setNavigator } from '@opentiny/next-sdk'
import { createMcpServer } from '../mcp-servers'

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
    // 注册路由导航器，工具触发跳转时使用 Angular Router
    setNavigator(async (route) => {
      await this.router.navigateByUrl(route)
    })
    // 启动 MCP Server（创建 MessageChannel 服务端并等待 iframe 连接）
    await createMcpServer()
  }
}
