import { Component, inject, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ToastModule } from "primeng/toast";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule],
  template: `
    <router-outlet />
    <p-toast />
  `
})
export class App {
   constructor() {
    // Configuration PrimeNG

  }
}
