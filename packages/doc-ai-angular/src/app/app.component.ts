import { Component, OnInit, inject } from '@angular/core'
import { Router } from '@angular/router'
import { RouterOutlet } from '@angular/router'
import { setNavigator } from '@opentiny/next-sdk'
import { createMcpServer } from './mcp-servers'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private router = inject(Router)

  ngOnInit(): void {
    // 注册导航函数，对应 Vue 版本 main.ts 中的 setNavigator((route) => router.push(route))
    setNavigator((route) => this.router.navigateByUrl(route))

    // 初始化 MCP Server，监听 iframe TinyRemoter 的 MessageChannel 连接
    void createMcpServer()
  }
}
