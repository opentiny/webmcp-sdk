import { Component, OnInit, inject } from '@angular/core'
import { Router } from '@angular/router'
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'
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
    // 1. 激活浏览器内置 WebMCP 服务 (含低版本浏览器 Polyfill)
    initializeBuiltinWebMCP()

    // 2. 注册自配导航工具等 MCP 能力
    await createMcpServer(this.router)
  }
}
