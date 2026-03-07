import { Component, OnInit, inject } from '@angular/core'
import { Router } from '@angular/router'
import { RouterOutlet } from '@angular/router'

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
    const { setNavigator } = await import('@opentiny/next-sdk')
    setNavigator((route) => {
      void this.router.navigateByUrl(route)
    })
    const { createMcpServer } = await import('../mcp-servers')
    await createMcpServer()
  }
}
