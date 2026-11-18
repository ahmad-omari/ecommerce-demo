import { Directive, inject, signal } from '@angular/core';
import { Api, errorMessage } from './api';

@Directive()
export abstract class Page {
  api = inject(Api);
  busy = signal(false);
  error = signal('');
  notice = signal('');

  report(error: unknown) { this.error.set(errorMessage(error)); }
  async run(action: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try { await action(); }
    catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
}
