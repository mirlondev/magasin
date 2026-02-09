import { Routes } from "@angular/router";
import { EmployeeRole } from "../../core/models";
import { OrderDetailComponent } from "../../features/orders/pages/order-detail.component";
import { OrderListComponent } from "../../features/orders/pages/order-list.component";
import { OrderCreateComponent } from "../../features/orders/pages/order-create.component";
import { roleGuard } from "../guards/role-guard";
import { PosSaleComponent } from "../../features/orders/pages/pos-sale/pos-sale.component";
import { CreditSaleComponent } from "../../features/orders/pages/credit-sale/credit-sale.component";
import { ProformaComponent } from "../../features/orders/pages/proforma/proforma.component";

export const ORDERS_ROUTES: Routes = [
  
    { path: '',
    component: OrderListComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  
  },
  // },
  // {
  //   path: 'new',
  //   component: OrderCreateComponent,
  //   canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  // },

      
      // Sales Pages
      { path: 'pos-sale', component: PosSaleComponent ,
       canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]

      },
      { path: 'credit-sale', component: CreditSaleComponent,
       canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
       },
      { path: 'proforma', component: ProformaComponent,
       canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
       },

      
      // Management Pages
      { path: 'orders', component: OrderListComponent,
       canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
       },
      { path: 'orders/:id', component: OrderDetailComponent,
       canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
       },

      // { path: ':id/edit', component: OrderEditComponent },
      // { path: ':id/payment', component: OrderPaymentComponent }
    
  
  // Redirects for backward compatibility
  { path: 'orders/create', redirectTo: 'orders/pos-sale', pathMatch: 'full' },
  { path: 'orders/pos', redirectTo: 'orders/pos-sale', pathMatch: 'full' },
  { path: 'orders/credit', redirectTo: 'orders/credit-sale', pathMatch: 'full' },
  { path: 'orders/proforma', redirectTo: 'orders/proforma', pathMatch: 'full' }
];