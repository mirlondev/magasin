import { Routes } from "@angular/router";
import { EmployeeRole } from "../../core/models";
import { ShiftReportDetailComponent } from "../../features/shift-reports/pages/shift-report-detail.component";
import { ShiftReportListComponent } from "../../features/shift-reports/pages/shift-report-list/shift-report-list.component";
import { ShiftReportOpenComponent } from "../../features/shift-reports/pages/shift-report-open.component";
import { roleGuard } from "../guards/role-guard";
import { ShiftOpenGuard } from "../guards/shift-open.guard";
import { noShiftOpenGuard } from "../guards/no-shift-open.guard";
import { CashRegisterListComponent } from "../../features/shift-reports/pages/cash-register-list/cash-register-list.component";

export const SHIFT_REPORTS_ROUTES: Routes = [
  {
    path: '',
    component: ShiftReportListComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])]
  },
  {
    path: 'new',
    component: ShiftReportOpenComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  },
  {
    path: ':id',
    component: ShiftReportDetailComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  },
  {
    path: 'cash-registers',
    component: CashRegisterListComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])]
  }
];