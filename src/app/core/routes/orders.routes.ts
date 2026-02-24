import { Routes } from "@angular/router";
import { EmployeeRole } from "../../core/models";
import { DocumentSaleComponent } from "../../features/orders/pages/document-sale/document-sale.component";
import { OrderCreateComponent } from "../../features/orders/pages/order-create.component";
import { OrderDetailComponent } from "../../features/orders/pages/order-detail.component";
import { OrderListComponent } from "../../features/orders/pages/order-list.component";
import { PosSaleComponent } from "../../features/orders/pages/pos-sale/pos-sale.component";
import { roleGuard } from "../guards/role-guard";
import { ShiftOpenGuard } from "../guards/shift-open.guard";

// import { CreditSaleComponent } from "../../features/orders/pages/credit-sale/credit-sale.component";
// import { ProformaComponent } from "../../features/orders/pages/proforma/proforma.component";
export const ORDERS_ROUTES: Routes = [

  {
    path: '',
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
  {
    path: 'pos-sale', component: PosSaleComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]), /*ShiftOpenGuard*/]

  },
  // { path: 'credit-sale', component: CreditSaleComponent,
  //  canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  //  },
  // { path: 'proforma', component: ProformaComponent,
  //  canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  //  },
  {
    path: 'documents-sale', component: DocumentSaleComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  },


  // Management Pages
  {
    path: 'orders', component: OrderListComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  },
  {
    path: 'orders/:id', component: OrderDetailComponent,
    canActivate: [roleGuard([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])]
  },

    {
    path: '',
    redirectTo: 'credit-sales',
    pathMatch: 'full'
  },
  {
    path: 'credit-sales',
    children: [
      {
        path: '',
        loadComponent: () => import('../../features/orders/pages/credit-sales-list/credit-sales-list.component')
          .then(m => m.CreditSalesListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('../../features/orders/pages/document-form/document-form.component')
          .then(m => m.DocumentFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('../../features/orders/pages/document-form/document-form.component')
          .then(m => m.DocumentFormComponent)
      }
    ]
  },
  {
    path: 'proformas',
    children: [
      {
        path: '',
        loadComponent: () => import('../../features/orders/pages/non-commercial-documents/non-commercial-documents.component')
          .then(m => m.NonCommercialDocumentsComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('../../features/orders/pages/document-form/document-form.component')
          .then(m => m.DocumentFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('../../features/orders/pages/document-form/document-form.component')
          .then(m => m.DocumentFormComponent)
      }
    ]
  },
  {
    path: 'quotes',
    children: [
      {
        path: '',
        loadComponent: () => import('../../features/orders/pages/non-commercial-documents/non-commercial-documents.component')
          .then(m => m.NonCommercialDocumentsComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('../../features/orders/pages/document-form/document-form.component')
          .then(m => m.DocumentFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('../../features/orders/pages/document-form/document-form.component')
          .then(m => m.DocumentFormComponent)
      }
    ]
  },
  {
    path: 'documents',
    loadComponent: () => import('../../features/orders/pages/non-commercial-documents/non-commercial-documents.component')
      .then(m => m.NonCommercialDocumentsComponent)
  },


  // { path: ':id/edit', component: OrderEditComponent },
  // { path: ':id/payment', component: OrderPaymentComponent }


  // Redirects for backward compatibility
  { path: 'orders/create', redirectTo: 'orders/pos-sale', pathMatch: 'full' },
  { path: 'orders/pos', redirectTo: 'orders/pos-sale', pathMatch: 'full' }
  // { path: 'orders/credit', redirectTo: 'orders/credit-sale', pathMatch: 'full' },
  // { path: 'orders/proforma', redirectTo: 'orders/proforma', pathMatch: 'full' }
];