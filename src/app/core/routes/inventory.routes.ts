import { Routes } from "@angular/router";
import { EmployeeRole } from "../../core/models";
import { InventoryListComponent } from "../../features/inventory/pages/inventory-list.component";
import { roleGuard } from "../guards/role-guard";
import { InventoryFormComponent } from "../../features/inventory/components/inventory-form.component";
import { InventoryDetailComponent } from "../../features/inventory/components/inventory-detail.component";

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    component: InventoryListComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER])]
  },
 { path: 'new', component: InventoryFormComponent },
  { path: ':id', component: InventoryDetailComponent },
  { path: ':id/edit', component: InventoryFormComponent },
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