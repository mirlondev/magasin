import { Routes } from "@angular/router";
import { StoreListComponent } from "../../features/stores/pages/store-list/store-list.component";

export const STORES_ROUTES: Routes = [
  {
    path: '',
    component: StoreListComponent
  },
  // {
  //   path: ':id',
  //   component: StoreDetailComponent
  // }
];