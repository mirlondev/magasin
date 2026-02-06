import { Routes } from "@angular/router";
import { EmployeeRole } from "../../core/models";
import { OrderDetailComponent } from "../../features/orders/pages/order-detail.component";
import { OrderListComponent } from "../../features/orders/pages/order-list.component";
import { OrderCreateComponent } from "../../features/orders/pages/order-create.component";
import { roleGuard } from "../guards/role-guard";

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    component: OrderListComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  },
  {
    path: 'new',
    component: OrderCreateComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  },
//   {
//     path: ':id',
//     component: OrderDetailComponent,
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
//   },
//   {
//     path: ':id/payment',
//     component: OrderPaymentComponent,
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
//   },
//   {
//     path: ':id/edit',
//     component: OrderCreateComponent,
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
//   }
];