import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface User { id: string; name: string; email: string }
export interface Category { id: string; name: string; creator_id: string }
export interface Item {
  id: string; name: string; title: string; description: string; price: string;
  category_id: string; category: string; stock: number; seller_id: string; seller: string; photos: string[];
}
export interface CartLine {
  id: string; name: string; price: string; stock: number; quantity: number; subtotal: string; available: boolean;
}
export interface Cart { items: CartLine[]; total: string }
export interface Order { id: string; total: string; created_at: string }
export interface OrderDetail extends Order {
  items: { item_id: string; item_name: string; seller_name: string; unit_price: string; quantity: number }[];
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  user = signal<User | null>(null);
  count = signal(0);

  get<T>(path: string) { return firstValueFrom(this.http.get<T>('/api' + path)); }
  post<T>(path: string, body: object) { return firstValueFrom(this.http.post<T>('/api' + path, body)); }
  put<T>(path: string, body: object) { return firstValueFrom(this.http.put<T>('/api' + path, body)); }
  delete(path: string) { return firstValueFrom(this.http.delete<void>('/api' + path)); }
  items(filters: { q?: string; category?: string; mine?: boolean } = {}) {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.mine) params.set('mine', 'true');
    return this.get<Item[]>('/items?' + params);
  }
  categories() { return this.get<Category[]>('/categories'); }
  async cart() {
    const cart = await this.get<Cart>('/cart');
    this.count.set(cart.items.reduce((total, item) => total + item.quantity, 0));
    return cart;
  }
  async restore() {
    this.user.set(await this.get<User | null>('/auth/me'));
    if (this.user()) await this.cart();
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof HttpErrorResponse) {
    return error.error?.message ?? 'Could not reach the marketplace API.';
  }
  return 'Something went wrong. Please try again.';
}
