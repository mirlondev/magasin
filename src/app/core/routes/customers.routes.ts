import { Routes } from "@angular/router";
import { CustomerListComponent } from "../../features/customers/components/customers-list/costumers-list.component";

export const CUSTOMERS_ROUTES: Routes = [
  {
    path: '',
    component: CustomerListComponent
  },
  // {
  //   path: ':id',
  //   component: StoreDetailComponent
  // }
];