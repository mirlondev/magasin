import { Routes } from "@angular/router";
import { EmployeeRole } from "../../core/models";
import { roleGuard } from "../guards/role-guard";
import { EmployeeListComponent } from "../../features/employees/employee-list.component/employee-list.component";

export const EMPLOYEES_ROUTES: Routes = [
  {
    path: '',
    component: EmployeeListComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  },
//   {
//     path: 'new',
//     component: OrderCreateComponent,
//     canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
//   }
];