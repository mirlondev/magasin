import { Routes } from "@angular/router";
import { EmployeeRole } from "../../core/models";
import { InventoryListComponent } from "../../features/inventory/pages/inventory-list.component";
import { roleGuard } from "../guards/role-guard";

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    component: InventoryListComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER])]
  },
//   {
//     path: ':id',
//     component: InventoryDetailComponent,
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER])]
//   },
//   {
//     path: ':id/restock',
//     component: InventoryRestockComponent,
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER])]
//   },
//   {
//     path: ':id/edit',
//     component: InventoryDetailComponent,
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER])]
//   },
//   {
//     path: ':id/transfer',
//     component: InventoryDetailComponent,
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER])]
//   }
];