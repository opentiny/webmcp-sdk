import { Component, Input, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-chat-remoter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="remoter-sidebar" [class.fullscreen]="fullscreen">
      <iframe
        #remoterFrame
        class="remoter-frame"
        [src]="safeSrc"
        frameborder="0"
        allow="clipboard-write"
        [title]="title"
      ></iframe>
    </aside>
  `,
  styles: [`
    .remoter-sidebar {
      width: 400px;
      height: 100%;
      border-left: 1px solid #e5e7eb;
      background: #fff;
      display: flex;
      flex-direction: column;
      
      &.fullscreen {
        width: 100%;
        border-left: none;
      }
    }

    .remoter-frame {
      width: 100%;
      height: 100%;
      border: none;
    }
  `]
})
export class ChatRemoterComponent {
  private sanitizer = inject(DomSanitizer);

  @Input() src: string = '/remoter.html';
  @Input() title: string = 'AI 助手';
  @Input() fullscreen: boolean = false;

  @ViewChild('remoterFrame') remoterFrame!: ElementRef<HTMLIFrameElement>;

  get safeSrc(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.src);
  }
}
