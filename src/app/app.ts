import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Api, errorMessage } from './api';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html'
})
export class App {
  api = inject(Api);
  router = inject(Router);
  error = signal('');
  async logout() {
    try {
      await this.api.post('/auth/logout', {});
      this.api.user.set(null);
      this.api.count.set(0);
      await this.router.navigateByUrl('/');
    } catch (error) { this.error.set(errorMessage(error)); }
  }
}
