import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Category, Item, User } from './api';
import { Page } from './page';

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <section class="panel narrow">
      <h1>{{register ? 'Create an account' : 'Log in'}}</h1>
      @if (error()) { <p role="alert" class="error">{{error()}}</p> }
      <form class="stack" #form="ngForm" (ngSubmit)="submit()">
        @if (register) { <label>Name<input name="name" required [(ngModel)]="name" autocomplete="name"></label> }
        <label>Email<input name="email" type="email" required email [(ngModel)]="email" autocomplete="email"></label>
        <label>Password<input name="password" type="password" required [(ngModel)]="password" [autocomplete]="register ? 'new-password' : 'current-password'"></label>
        <button [disabled]="busy() || form.invalid">{{busy() ? 'Please wait…' : register ? 'Register' : 'Log in'}}</button>
      </form>
      <p><a [routerLink]="register ? '/login' : '/register'" queryParamsHandling="preserve">{{register ? 'Already registered? Log in' : 'New here? Register'}}</a></p>
    </section>
  `
})
export class AuthPage extends Page {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  register = this.route.snapshot.data['register'] === true;
  name = '';
  email = '';
  password = '';
  async submit() {
    await this.run(async () => {
      const user = await this.api.post<User>(this.register ? '/auth/register' : '/auth/login',
        {name:this.name,email:this.email,password:this.password});
      this.api.user.set(user);
      await this.api.cart();
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next?.startsWith('/') && !next.startsWith('//') ? next : '/');
    });
  }
}

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-heading"><h1>Categories</h1></div>
    @if (error()) { <p role="alert" class="error">{{error()}}</p> }
    @if (notice()) { <p role="status" class="notice">{{notice()}}</p> }
    @if (api.user()) {
      <form class="filters panel" #form="ngForm" (ngSubmit)="save()">
        <label>{{editing ? 'Edit category name' : 'New category name'}}<input name="name" required [(ngModel)]="name"></label>
        <button [disabled]="busy() || form.invalid">{{editing ? 'Save changes' : 'Add category'}}</button>
        @if (editing) { <button class="secondary" type="button" (click)="cancel()">Cancel</button> }
      </form>
    } @else { <p><a routerLink="/login" [queryParams]="{next:'/categories'}">Log in</a> to manage categories.</p> }
    @if (busy() && !categories().length) { <p role="status">Loading categories…</p> }
    @if (!busy() && !categories().length && !error()) { <p class="empty">No categories yet.</p> }
    <div class="rows">
      @for (entry of categories(); track entry.id) {
        <div class="row"><strong>{{entry.name}}</strong>
          @if (entry.creator_id === api.user()?.id) {
            <div class="actions">
              <button class="text-button" type="button" [disabled]="busy()" (click)="edit(entry)">Edit</button>
              <button class="text-button danger" type="button" [disabled]="busy()" (click)="remove(entry)">Delete</button>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CategoriesPage extends Page {
  categories = signal<Category[]>([]);
  editing = '';
  name = '';
  constructor() { super(); void this.run(() => this.refresh()); }
  async refresh() { this.categories.set(await this.api.categories()); }
  cancel() { this.editing = ''; this.name = ''; }
  edit(entry: Category) { this.editing = entry.id; this.name = entry.name; }
  async save() {
    await this.run(async () => {
      if (this.editing) await this.api.put('/categories/' + this.editing, {name:this.name});
      else await this.api.post('/categories', {name:this.name});
      this.cancel();
      await this.refresh();
      this.notice.set('Category saved.');
    });
  }
  async remove(entry: Category) {
    if (!confirm('Delete ' + entry.name + '?')) return;
    await this.run(async () => {
      await this.api.delete('/categories/' + entry.id);
      if (this.editing === entry.id) this.cancel();
      await this.refresh();
      this.notice.set('Category deleted.');
    });
  }
}

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <a class="back" routerLink="/listings">← My Listings</a>
    <section class="panel form-panel">
      <h1>{{id ? 'Edit listing' : 'Add a listing'}}</h1>
      @if (error()) { <p role="alert" class="error">{{error()}}</p> }
      @if (busy() && !ready()) { <p role="status">Loading form…</p> }
      @if (ready()) {
        <form class="stack" #form="ngForm" (ngSubmit)="save()">
          <label>Item name<input name="name" required [(ngModel)]="draft.name"></label>
          <label>Title<input name="title" required [(ngModel)]="draft.title"></label>
          <label>Description<textarea name="description" required rows="4" [(ngModel)]="draft.description"></textarea></label>
          <div class="form-columns">
            <label>Price (USD)<input name="price" type="number" min="0.01" step="0.01" required [(ngModel)]="draft.price"></label>
            <label>Stock quantity<input name="stock" type="number" min="0" required [(ngModel)]="draft.stock"></label>
          </div>
          <label>Category<select name="category" required [(ngModel)]="draft.category_id">
            <option value="">Choose a category</option>
            @for (entry of categories(); track entry.id) { <option [value]="entry.id">{{entry.name}}</option> }
          </select></label>
          @if (!categories().length) { <a routerLink="/categories">Create a category first</a> }
          @if (photos().length) {
            <fieldset><legend>Existing photos</legend><div class="thumbnails">
              @for (key of photos(); track key) {
                <label class="photo-choice"><img [src]="'/api/photos/' + key" alt="Listing photo">
                  <span><input type="checkbox" (change)="togglePhoto(key,$event)"> Remove</span></label>
              }
            </div></fieldset>
          }
          <label>Upload photos<input type="file" multiple accept="image/jpeg,image/png,image/webp" (change)="select($event)">
            <small>Up to six JPEG, PNG, or WebP photos, 4 MB each.</small>
          </label>
          <button [disabled]="busy() || form.invalid">{{busy() ? 'Saving…' : 'Save listing'}}</button>
        </form>
      }
    </section>
  `
})
export class ListingPage extends Page {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  id = this.route.snapshot.paramMap.get('id');
  ready = signal(false);
  categories = signal<Category[]>([]);
  photos = signal<string[]>([]);
  draft = {name:'',title:'',description:'',price:null as number | null,stock:1,category_id:''};
  files: File[] = [];
  removed = new Set<string>();

  constructor() {
    super();
    void this.run(async () => {
      this.categories.set(await this.api.categories());
      if (this.id) {
        const item = await this.api.get<Item>('/items/' + this.id);
        if (item.seller_id !== this.api.user()?.id) { this.error.set('You can only edit your own listings.'); return; }
        this.draft = {name:item.name,title:item.title,description:item.description,price:Number(item.price),stock:item.stock,category_id:item.category_id};
        this.photos.set(item.photos);
      }
      this.ready.set(true);
    });
  }
  select(event: Event) { this.files = Array.from((event.target as HTMLInputElement).files ?? []); }
  togglePhoto(key: string, event: Event) {
    if ((event.target as HTMLInputElement).checked) this.removed.add(key);
    else this.removed.delete(key);
  }
  async save() {
    await this.run(async () => {
      const payload = new FormData();
      for (const [key,value] of Object.entries(this.draft)) payload.set(key,String(value ?? ''));
      for (const file of this.files) payload.append('photos',file);
      for (const key of this.removed) payload.append('remove_photos',key);
      const result = this.id
        ? await this.api.put<{id:string}>('/items/' + this.id,payload)
        : await this.api.post<{id:string}>('/items',payload);
      await this.router.navigate(['/items', result.id]);
    });
  }
}
