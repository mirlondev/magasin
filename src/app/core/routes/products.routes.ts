import { Routes } from '@angular/router';
import { EmployeeRole } from '../models';
import { roleGuard } from '../guards/role-guard';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])],
    loadComponent: () => import('../../features/products/products-list.component').then(m => m.ProductsListComponent)
  },
  {
    path: 'new',
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])],
    loadComponent: () => import('../../features/products/components/product-form.component').then(m => m.ProductFormComponent)
  },
  {
    path: ':id',
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])],
    loadComponent: () => import('../../features/products/pages/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])],
    loadComponent: () => import('../../features/products/components/product-form.component').then(m => m.ProductFormComponent)
  }
];