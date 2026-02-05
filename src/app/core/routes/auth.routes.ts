import { Routes } from "@angular/router";

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../../core/auth/login/login.component').then(m => m.LoginComponent)


  },

];
