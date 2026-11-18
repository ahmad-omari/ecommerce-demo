import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Api } from './api';
import { CatalogPage, DetailPage } from './catalog';
import { AuthPage, CategoriesPage, ListingPage } from './manage';
import { CartPage, OrderPage, OrdersPage } from './purchase';

const signedIn: CanActivateFn = (_route, state) => inject(Api).user()
  ? true : inject(Router).createUrlTree(['/login'], {queryParams:{next:state.url}});

export const routes: Routes = [
  {path:'',component:CatalogPage,data:{mode:'browse'}},
  {path:'items/:id',component:DetailPage},
  {path:'login',component:AuthPage},
  {path:'register',component:AuthPage,data:{register:true}},
  {path:'categories',component:CategoriesPage},
  {path:'listings',component:CatalogPage,canActivate:[signedIn],data:{mode:'mine'}},
  {path:'listings/new',component:ListingPage,canActivate:[signedIn]},
  {path:'listings/:id/edit',component:ListingPage,canActivate:[signedIn]},
  {path:'favorites',component:CatalogPage,canActivate:[signedIn],data:{mode:'favorites'}},
  {path:'cart',component:CartPage,canActivate:[signedIn]},
  {path:'orders',component:OrdersPage,canActivate:[signedIn]},
  {path:'orders/:id/confirmation',component:OrderPage,canActivate:[signedIn],data:{confirmed:true}},
  {path:'orders/:id',component:OrderPage,canActivate:[signedIn]},
  {path:'**',redirectTo:''}
];
