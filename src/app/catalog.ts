import { CurrencyPipe } from '@angular/common';
import { Component, input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, Category, Item } from './api';
import { Page } from './page';

@Component({
  selector: 'app-item-card',
  imports: [CurrencyPipe, RouterLink],
  template: `
    <article class="product">
      <a class="product-image" [routerLink]="['/items', item().id]" [attr.aria-label]="item().name">
        @if (item().photos[0]; as key) { <img [src]="'/api/photos/' + key" alt="" loading="lazy"> }
        @else { <span class="photo-placeholder">No photo</span> }
      </a>
      <div class="product-body">
        <p class="eyebrow">{{item().category}}</p>
        <h2><a [routerLink]="['/items', item().id]">{{item().name}}</a></h2>
        <p class="muted">{{item().title}}</p>
        <div class="product-meta"><strong>{{item().price | currency:'USD'}}</strong>
          <span>{{item().stock ? 'In stock' : 'Sold out'}}</span>
        </div>
        <ng-content />
      </div>
    </article>
  `
})
export class ItemCard { item = input.required<Item>(); }

@Component({
  imports: [FormsModule, ItemCard, RouterLink],
  template: `
    @if (mode === 'browse') {
      <section class="hero">
        <div><p class="eyebrow">The campus marketplace</p><h1>Find your next<br>good thing.</h1>
        <p>Shop everyday finds from local sellers, or list something of your own.</p>
        <a class="button" routerLink="/listings/new">Sell an item</a></div>
        <img src="/seed/hero.jpg" alt="">
      </section>
      <div class="page-heading"><h2>Explore the marketplace</h2></div>
      <form class="filters" (ngSubmit)="load()">
        <label>Search<input name="q" [(ngModel)]="search" placeholder="Try headphones or desk lamp"></label>
        <label>Category<select name="category" [(ngModel)]="category" (ngModelChange)="load()">
          <option value="">All categories</option>
          @for (entry of categories(); track entry.id) { <option [value]="entry.id">{{entry.name}}</option> }
        </select></label>
        <button>Search</button>
      </form>
    } @else {
      <div class="page-heading"><h1>{{mode === 'mine' ? 'My Listings' : 'Favorites'}}</h1>
        @if (mode === 'mine') { <a class="button" routerLink="/listings/new">Add listing</a> }
      </div>
    }
    @if (error()) { <p role="alert" class="error">{{error()}}</p> }
    @if (notice()) { <p role="status" class="notice">{{notice()}}</p> }
    @if (busy()) { <p role="status">Loading…</p> }
    @else if (items().length) {
      <div class="grid">
        @for (item of items(); track item.id) {
          <app-item-card [item]="item">
            @if (mode === 'mine') {
              <div class="actions"><a [routerLink]="['/listings',item.id,'edit']">Edit</a>
                <button class="text-button danger" type="button" (click)="remove(item)">Delete</button></div>
            }
            @if (mode === 'favorites') {
              <button class="text-button" type="button" (click)="remove(item)">Remove favorite</button>
            }
          </app-item-card>
        }
      </div>
    } @else if (!error()) {
      <p class="empty">{{ mode === 'browse' ? 'No listings match your search.' : mode === 'mine' ? 'You have no listings yet.' : 'You have no favorites yet.' }}</p>
    }
  `
})
export class CatalogPage extends Page {
  route = inject(ActivatedRoute);
  mode: 'browse' | 'mine' | 'favorites' = this.route.snapshot.data['mode'];
  items = signal<Item[]>([]);
  categories = signal<Category[]>([]);
  category = '';
  search = '';
  private searchVersion = 0;

  constructor() { super(); void this.load(); }
  async load() {
    const version = ++this.searchVersion;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.mode === 'browse' && !this.categories().length) this.categories.set(await this.api.categories());
      const items = this.mode === 'favorites'
        ? await this.api.get<Item[]>('/favorites')
        : await this.api.items({q:this.search,category:this.category,mine:this.mode === 'mine'});
      if (version === this.searchVersion) this.items.set(items);
    } catch (error) {
      if (version === this.searchVersion) this.report(error);
    } finally {
      if (version === this.searchVersion) this.busy.set(false);
    }
  }
  async remove(item: Item) {
    if (this.mode === 'mine' && !confirm('Delete ' + item.name + '?')) return;
    await this.run(async () => {
      await this.api.delete((this.mode === 'mine' ? '/items/' : '/favorites/') + item.id);
      this.items.update(items => items.filter(entry => entry.id !== item.id));
      this.notice.set(this.mode === 'mine' ? 'Listing deleted.' : 'Favorite removed.');
    });
  }
}

@Component({
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
    <a class="back" routerLink="/">← Browse listings</a>
    @if (error()) { <p role="alert" class="error">{{error()}}</p> }
    @if (notice()) { <p role="status" class="notice">{{notice()}}</p> }
    @if (busy() && !item()) { <p role="status">Loading listing…</p> }
    @if (item(); as entry) {
      <div class="detail">
        <div>
          @if (photo(); as key) { <img class="detail-image" [src]="'/api/photos/' + key" [alt]="entry.name"> }
          @else { <div class="detail-image photo-placeholder">No photo</div> }
          @if (entry.photos.length > 1) {
            <div class="thumbnails">
              @for (key of entry.photos; track key; let index = $index) {
                <button class="thumbnail" (click)="photo.set(key)" [attr.aria-label]="'Show photo ' + (index + 1)" [attr.aria-pressed]="key === photo()">
                  <img [src]="'/api/photos/' + key" alt="">
                </button>
              }
            </div>
          }
        </div>
        <section class="detail-copy">
          <p class="eyebrow">{{entry.category}}</p><h1>{{entry.name}}</h1><p class="lead">{{entry.title}}</p>
          <p class="price">{{entry.price | currency:'USD'}}</p><p>{{entry.description}}</p>
          <p class="muted">Sold by {{entry.seller}} · {{entry.stock ? entry.stock + ' available' : 'Sold out'}}</p>
          @if (api.user(); as user) {
            @if (user.id === entry.seller_id) {
              <a class="button" [routerLink]="['/listings',entry.id,'edit']">Edit listing</a>
            } @else if (entry.stock) {
              <form class="actions" (ngSubmit)="add(entry)">
                <label>Quantity<input class="quantity" name="quantity" type="number" min="1" [max]="entry.stock" required [(ngModel)]="amount"></label>
                <button [disabled]="busy() || amount < 1 || amount > entry.stock">Add to cart</button>
              </form>
            }
            <button class="secondary" [disabled]="busy()" type="button" (click)="favorite(entry)">{{saved() ? 'Remove favorite' : 'Save to favorites'}}</button>
          } @else {
            <a class="button" routerLink="/login" [queryParams]="{next:'/items/' + entry.id}">Log in to shop</a>
          }
        </section>
      </div>
    }
  `
})
export class DetailPage extends Page {
  item = signal<Item | null>(null);
  photo = signal('');
  saved = signal(false);
  amount = 1;
  route = inject(ActivatedRoute);

  constructor() {
    super();
    this.route.paramMap.subscribe(params => {
      this.item.set(null);
      void this.run(async () => {
        const item = await this.api.get<Item>('/items/' + params.get('id'));
        this.item.set(item);
        this.photo.set(item.photos[0] ?? '');
        if (this.api.user()) this.saved.set((await this.api.get<Item[]>('/favorites')).some(entry => entry.id === item.id));
      });
    });
  }
  async add(item: Item) {
    await this.run(async () => {
      await this.api.put('/cart/' + item.id, {quantity:this.amount,add:true});
      await this.api.cart();
      this.notice.set('Added to your cart.');
    });
  }
  async favorite(item: Item) {
    await this.run(async () => {
      if (this.saved()) await this.api.delete('/favorites/' + item.id);
      else await this.api.put('/favorites/' + item.id, {});
      this.saved.update(saved => !saved);
      this.notice.set(this.saved() ? 'Saved to favorites.' : 'Favorite removed.');
    });
  }
}
