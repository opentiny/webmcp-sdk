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
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
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
