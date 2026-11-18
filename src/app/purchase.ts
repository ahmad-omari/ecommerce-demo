import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Cart, CartLine, Order, OrderDetail } from './api';
import { Page } from './page';

@Component({
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
    <div class="page-heading"><h1>Your cart</h1></div>
    @if (error()) { <p role="alert" class="error">{{error()}}</p> }
    @if (notice()) { <p role="status" class="notice">{{notice()}}</p> }
    @if (busy() && !cart()) { <p role="status">Loading cart…</p> }
    @if (cart(); as basket) {
      @if (basket.items.length) {
        <div class="cart-layout">
          <div class="rows">
            @for (line of basket.items; track line.id) {
              <article class="row cart-row">
                <div>
                  @if (line.available) { <a [routerLink]="['/items',line.id]"><strong>{{line.name}}</strong></a> }
                  @else { <strong>{{line.name}}</strong> }
                  <p class="muted">{{line.price | currency:'USD'}} each · {{line.available ? line.stock + ' available' : 'Listing unavailable'}}</p>
                </div>
                <form class="actions" #form="ngForm" (ngSubmit)="update(line)">
                  @if (line.available && line.stock) {
                    <label>Quantity<input type="number" class="quantity" name="quantity" min="1" [max]="line.stock" required
                      [ngModel]="drafts[line.id]" (ngModelChange)="drafts[line.id] = $event"></label>
                    <button class="secondary" [disabled]="busy() || form.invalid || drafts[line.id] === line.quantity">Update</button>
                  }
                  <button class="text-button danger" type="button" [disabled]="busy()" (click)="remove(line)">Remove</button>
                </form>
                <strong>{{line.subtotal | currency:'USD'}}</strong>
              </article>
            }
          </div>
          <aside class="panel summary"><h2>Simulated checkout</h2><p>No payment details are needed.</p>
            <div class="summary-total"><strong>Total</strong><strong>{{basket.total | currency:'USD'}}</strong></div>
            @if (!canCheckout(basket)) { <p class="muted">Update or remove unavailable quantities to continue.</p> }
            <button [disabled]="busy() || !canCheckout(basket)" (click)="checkout()">{{busy() ? 'Please wait…' : 'Place Demo Order'}}</button>
          </aside>
        </div>
      } @else { <div class="empty"><p>Your cart is empty.</p><a routerLink="/">Browse listings</a></div> }
    }
  `
})
export class CartPage extends Page {
  private router = inject(Router);
  cart = signal<Cart | null>(null);
  drafts: Record<string, number | null> = {};
  constructor() { super(); void this.run(() => this.refresh()); }
  async refresh() {
    const basket = await this.api.cart();
    this.drafts = Object.fromEntries(basket.items.map(item => [item.id,item.quantity]));
    this.cart.set(basket);
  }
  canCheckout(basket: Cart) { return basket.items.every(item => item.available && item.quantity <= item.stock); }
  async update(line: CartLine) {
    await this.run(async () => {
      await this.api.put('/cart/' + line.id,{quantity:this.drafts[line.id]});
      await this.refresh();
      this.notice.set('Cart updated.');
    });
  }
  async remove(line: CartLine) {
    await this.run(async () => {
      await this.api.delete('/cart/' + line.id);
      await this.refresh();
      this.notice.set('Item removed.');
    });
  }
  async checkout() {
    await this.run(async () => {
      const order = await this.api.post<Order>('/checkout',{});
      this.api.count.set(0);
      await this.router.navigate(['/orders',order.id,'confirmation']);
    });
  }
}

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="page-heading"><h1>Order history</h1></div>
    @if (error()) { <p role="alert" class="error">{{error()}}</p> }
    @if (busy()) { <p role="status">Loading orders…</p> }
    @else if (!orders().length && !error()) { <div class="empty"><p>You have no orders yet.</p><a routerLink="/">Browse listings</a></div> }
    <div class="rows">
      @for (order of orders(); track order.id) {
        <a class="row" [routerLink]="['/orders',order.id]">
          <div><strong>Order #{{ order.id.slice(0,8) }}</strong><p class="muted">{{order.created_at | date:'medium'}}</p></div>
          <strong>{{order.total | currency:'USD'}}</strong>
        </a>
      }
    </div>
  `
})
export class OrdersPage extends Page {
  orders = signal<Order[]>([]);
  constructor() { super(); void this.run(async () => { this.orders.set(await this.api.get<Order[]>('/orders')); }); }
}

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <a class="back" routerLink="/orders">← Order history</a>
    @if (error()) { <p role="alert" class="error">{{error()}}</p> }
    @if (busy()) { <p role="status">Loading order…</p> }
    @if (order(); as entry) {
      @if (confirmed) {
        <div class="notice"><strong>Demo order placed!</strong> Your order is ready to view below.</div>
      }
      <section class="panel">
        <h1>Order #{{entry.id.slice(0,8)}}</h1><p class="muted">{{entry.created_at | date:'medium'}}</p>
        <div class="rows">
          @for (line of entry.items; track line.item_id) {
            <div class="row"><div><strong>{{line.item_name}}</strong><p class="muted">Seller · {{line.seller_name}}</p></div>
              <span>{{line.quantity}} × {{line.unit_price | currency:'USD'}}</span></div>
          }
        </div>
        <div class="summary-total"><strong>Total</strong><strong>{{entry.total | currency:'USD'}}</strong></div>
      </section>
    }
  `
})
export class OrderPage extends Page {
  route = inject(ActivatedRoute);
  confirmed = this.route.snapshot.data['confirmed'] === true;
  order = signal<OrderDetail | null>(null);
  constructor() {
    super();
    void this.run(async () => { this.order.set(await this.api.get<OrderDetail>('/orders/' + this.route.snapshot.paramMap.get('id'))); });
  }
}
