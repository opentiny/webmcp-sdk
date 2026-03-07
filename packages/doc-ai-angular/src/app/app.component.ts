import { Component, OnInit, inject } from '@angular/core'
import { Router } from '@angular/router'
import { RouterOutlet } from '@angular/router'
import { setNavigator } from '@opentiny/next-sdk'
// mcp-servers 在 src/mcp-servers，从 src/app 需用 .. 引用；并已在 tsconfig.app.json 的 include 中
import { createMcpServer } from '../mcp-servers'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  // 使用内联 template/styles，避免 Vite 等环境下未执行 resolveComponentResources 导致引导失败
  template: `
    <div class="app-container">
      <div class="main-content">
        <router-outlet />
      </div>
      <aside class="remoter-sidebar">
        <iframe
          #remoterFrame
          class="remoter-frame"
          src="/remoter.html"
          frameborder="0"
          allow="clipboard-write"
          title="AI 助手"
        ></iframe>
      </aside>
    </div>
  `,
  styles: [
    `
      .app-container {
        position: relative;
        width: 100%;
        min-height: 100vh;
      }
      .main-content {
        width: 70%;
        min-height: 100vh;
        overflow: auto;
      }
      .remoter-sidebar {
        position: fixed;
        top: 0;
        right: 0;
        width: 30%;
        height: 100vh;
        border-left: 1px solid #eee;
        background: #fff;
        z-index: 10;
      }
      .remoter-frame {
        width: 100%;
        height: 100%;
        min-height: 100vh;
        border: none;
        display: block;
      }
    `
  ]
})
export class AppComponent implements OnInit {
  private router = inject(Router)

  ngOnInit(): void {
    // navigateByUrl 返回 Promise<boolean>，setNavigator 期望 void | Promise<void>，用 void 忽略返回值
    setNavigator((route) => {
      void this.router.navigateByUrl(route)
    })
    void createMcpServer()
  }
}
