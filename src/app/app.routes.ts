import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth-guard";
import { noAuthGuard } from "./core/guards/no-auth-guard";
import { roleGuard } from "./core/guards/role-guard";
import { EmployeeRole } from "./core/models";
import { AppLayoutComponent } from "./layouts/app-layout.component";

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./core/auth/login/login.component').then(m => m.LoginComponent),
    canMatch :[noAuthGuard],

  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'stores',
        canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])],
        loadChildren: () => import('./core/routes/stores.routes').then(m => m.STORES_ROUTES)
      },
       {
        path: 'orders',
        loadChildren: () => import('./core/routes/orders.routes').then(m => m.ORDERS_ROUTES)
      },
      {
        path: 'inventory',
        loadChildren: () => import('./core/routes/inventory.routes').then(m => m.INVENTORY_ROUTES)
      },{
        path: 'shift-reports',
        loadChildren: () => import('./core/routes/shift-reports.routes').then(m => m.SHIFT_REPORTS_ROUTES)
      },

      // {
      //   path: 'customers',
      //   canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])],
      //   loadComponent: () => import('./features/customers/pages/customer-list.component').then(m => m.CustomerListComponent)
      // },
      // {
      //   path: 'employees',
      //   canActivate: [roleGuard([EmployeeRole.ADMIN])],
      //   loadComponent: () => import('./features/employees/pages/employee-list.component').then(m => m.EmployeeListComponent)
      // },
      {
        path: 'employees',
        canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])],
        loadComponent: () => import('./features/employees/employee-list.component/employee-list.component').then(m => m.EmployeeListComponent)
      },
      {
        path: 'settings',
        loadChildren: () => import('./core/routes/settings.routes').then(m => m.SETTINGS_ROUTES)
      },
      {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];