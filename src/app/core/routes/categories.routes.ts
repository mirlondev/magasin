import { Routes } from "@angular/router";
import { EmployeeRole } from "../../core/models";
import { roleGuard } from "../guards/role-guard";

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])],
    loadComponent: () => import('../../features/categories/categories-list/categories-list').then(m => m.CategoriesListComponent)
  },
//   {
//     path: 'new',
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])],
//     loadComponent: () => import('../../features/categories/category-form.component').then(m => m.CategoryFormComponent)
//   },
//   {
//     path: ':id',
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])],
//     loadComponent: () => import('../../features/categories/category-detail.component').then(m => m.CategoryDetailComponent)
//   },
//   {
//     path: ':id/edit',
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])],
//     loadComponent: () => import('../../features/categories/category-form.component').then(m => m.CategoryFormComponent)
//   }
];