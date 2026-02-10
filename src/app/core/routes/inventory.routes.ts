import { Routes } from "@angular/router";
import { EmployeeRole } from "../../core/models";
import { InventoryListComponent } from "../../features/inventory/pages/inventory-list/inventory-list.component";
import { roleGuard } from "../guards/role-guard";
import { InventoryFormComponent } from "../../features/inventory/components/inventory-form.component";
import { InventoryDetailComponent } from "../../features/inventory/components/inventory-detail.component";
import { PhysicalCountScheduleComponent } from "../../features/inventory/pages/paysical-schedule/physical-count-schedule.component";
import { InventoryHistoryComponent } from "../../features/inventory/pages/inventory-history/inventory-history.component";
import { StockAdjustmentComponent } from "../../features/inventory/pages/inventory-adjustment/stock-adjustment.component";
import { StockTransferComponent } from "../../features/inventory/pages/inventory-transfer/stock-transfer.component";

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    component: InventoryListComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER])]
  },
  { path: 'new', component: InventoryFormComponent },
  { path: 'schedule', component: PhysicalCountScheduleComponent },
  { path: 'history', component: InventoryHistoryComponent },
  { path: ':id', component: InventoryDetailComponent },
  { path: ':id/edit', component: InventoryFormComponent },
  { path: ':id/adjust', component: StockAdjustmentComponent },
  { path: ':id/transfer', component: StockTransferComponent },
  { path: ':id/history', component: InventoryHistoryComponent }
];