import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [],
  template: `<h1>Hello Acro companion</h1>`,
})
export class AppComponent {
  protected readonly title = signal('acro-companion-test');
}
