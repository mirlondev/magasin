import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { DividerModule } from "primeng/divider";
import { InputTextModule } from "primeng/inputtext";
import { MessageModule } from "primeng/message";
import { PasswordModule } from "primeng/password";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    DividerModule,
    MessageModule,
    ProgressSpinnerModule
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div class="w-full max-w-md">
        <!-- Logo/Header -->
        <div class="text-center mb-8">
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center">
              <i class="pi pi-store text-3xl text-white"></i>
            </div>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Retail POS</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">Système de gestion de point de vente</p>
        </div>

        <!-- Login Card -->
        <p-card class="shadow-lg">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Connexion</h2>
            <p class="text-gray-600 dark:text-gray-400 mt-1">Entrez vos identifiants pour continuer</p>
          </div>

          <form #loginForm="ngForm" (ngSubmit)="onSubmit()" class="space-y-5">
            <!-- Error Message -->
            @if (error()) {
              <p-message severity="error" [ariaValueText]="error()" class="w-full" />
            }

            <!-- Username -->
            <div class="space-y-2">
              <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nom d'utilisateur
              </label>
              <input pInputText 
                     id="username" 
                     name="username" 
                     [(ngModel)]="credentials().username"
                     required
                     class="w-full"
                     placeholder="Entrez votre nom d'utilisateur"
                     [class.p-invalid]="submitted() && !credentials().username" />
              @if (submitted() && !credentials().username) {
                <small class="p-error">Le nom d'utilisateur est obligatoire</small>
              }
            </div>

            <!-- Password -->
            <div class="space-y-2">
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mot de passe
              </label>
              <p-password 
                id="password" 
                name="password" 
                [(ngModel)]="credentials().password"
                required
                [toggleMask]="true"
                [feedback]="false"
                class="w-full p-password"
                placeholder="Entrez votre mot de passe"
                [inputStyleClass]="submitted() && !credentials().password ? 'p-invalid w-full' : 'w-full'" />
              @if (submitted() && !credentials().password) {
                <small class="p-error">Le mot de passe est obligatoire</small>
              }
            </div>

            <!-- Remember Me & Forgot Password -->
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input type="checkbox" 
                
                       id="remember" 
                       [(ngModel)]="rememberMe"
                       name="remember"
                       class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <label for="remember" class="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Se souvenir de moi
                </label>
              </div>
              <a routerLink="/forgot-password" class="text-sm text-primary-600 hover:text-primary-500">
                Mot de passe oublié ?
              </a>
            </div>

            <!-- Submit Button -->
            <button pButton 
                    type="submit" 
                    label="Se connecter" 
                    class="w-full"
                    [disabled]="loading()"
                    [loading]="loading()">
              @if (loading()) {
                <i class="pi pi-spin pi-spinner mr-2"></i>
              }
            </button>

            <!-- Divider -->
            <p-divider>
              <span class="text-sm text-gray-500 px-2">Ou</span>
            </p-divider>

            <!-- Demo Credentials -->
            <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Démonstration :</strong> Utilisez ces identifiants pour tester
              </p>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="font-semibold">Admin:</span>
                  <p class="text-gray-500">admin / admin123</p>
                </div>
                <div>
                  <span class="font-semibold">Caissier:</span>
                  <p class="text-gray-500">cashier / cashier123</p>
                </div>
              </div>
            </div>

            <!-- Register Link -->
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Vous n'avez pas de compte ?
                <a routerLink="/register" class="font-medium text-primary-600 hover:text-primary-500 ml-1">
                  S'inscrire
                </a>
              </p>
            </div>
          </form>
        </p-card>

        <!-- Footer -->
        <div class="text-center mt-6">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            © 2024 Retail POS. Tous droits réservés.
            <a href="#" class="hover:text-primary-500">Conditions d'utilisation</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    ::ng-deep .p-password {
      width: 100%;
    }

    ::ng-deep .p-password-input {
      width: 100%;
    }
  `]
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  credentials = signal({
    username: '',
    password: ''
  });

  rememberMe = signal<boolean>(false);
  submitted = signal<boolean>(false);
  loading = this.authService.loading;
  error = this.authService.error;

  ngOnInit() {
    // Si déjà authentifié, rediriger vers le dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    this.submitted.set(true);

    // Validation simple
    if (!this.credentials().username || !this.credentials().password) {
      return;
    }

    this.authService.login(this.credentials()).subscribe({
      next: (success) => {
        if (success) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {
        // L'erreur est déjà gérée dans le service
      }
    });
  }

  // Méthode pour remplir les credentials de démonstration
  useDemoCredentials(role: 'admin' | 'cashier') {
    if (role === 'admin') {
      this.credentials.set({ username: 'admin', password: 'admin123' });
    } else {
      this.credentials.set({ username: 'cashier', password: 'cashier123' });
    }
  }
}