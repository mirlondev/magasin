import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { DividerModule } from "primeng/divider";
import { InputTextModule } from "primeng/inputtext";
import { MessageModule } from "primeng/message";
import { PasswordModule } from "primeng/password";
import { SelectModule } from "primeng/select";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    DividerModule,
    SelectModule
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div class="w-full max-w-2xl">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center">
              <i class="pi pi-store text-3xl text-white"></i>
            </div>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Créer un compte</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            Rejoignez notre système de gestion de point de vente
          </p>
        </div>

        <!-- Registration Card -->
        <p-card class="shadow-lg">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left Column -->
            <div class="space-y-5">
              <div class="text-center mb-4">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Informations personnelles</h2>
              </div>

              @if (error()) {
                <p-message severity="error" [ariaValueText]="error()" class="w-full" />
              }

              <!-- First Name -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prénom *
                </label>
                <input pInputText 
                       [(ngModel)]="userData().firstName" 
                       name="firstName"
                       required
                       class="w-full"
                       placeholder="Jean"
                       [class.p-invalid]="submitted() && !userData().firstName" />
                @if (submitted() && !userData().firstName) {
                  <small class="p-error">Le prénom est obligatoire</small>
                }
              </div>

              <!-- Last Name -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom *
                </label>
                <input pInputText 
                       [(ngModel)]="userData().lastName" 
                       name="lastName"
                       required
                       class="w-full"
                       placeholder="Dupont"
                       [class.p-invalid]="submitted() && !userData().lastName" />
                @if (submitted() && !userData().lastName) {
                  <small class="p-error">Le nom est obligatoire</small>
                }
              </div>

              <!-- Email -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email *
                </label>
                <input pInputText 
                       type="email"
                       [(ngModel)]="userData().email" 
                       name="email"
                       required
                       class="w-full"
                       placeholder="jean.dupont@example.com"
                       [class.p-invalid]="submitted() && !userData().email" />
                @if (submitted() && !userData().email) {
                  <small class="p-error">L'email est obligatoire</small>
                }
              </div>

              <!-- Phone -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Téléphone *
                </label>
                <input pInputText 
                       [(ngModel)]="userData().phone" 
                       name="phone"
                       required
                       class="w-full"
                       placeholder="+33 1 23 45 67 89"
                       [class.p-invalid]="submitted() && !userData().phone" />
                @if (submitted() && !userData().phone) {
                  <small class="p-error">Le téléphone est obligatoire</small>
                }
              </div>
            </div>

            <!-- Right Column -->
            <div class="space-y-5">
              <div class="text-center mb-4">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Informations de connexion</h2>
              </div>

              <!-- Username -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom d'utilisateur *
                </label>
                <input pInputText 
                       [(ngModel)]="userData().username" 
                       name="username"
                       required
                       class="w-full"
                       placeholder="jdupont"
                       [class.p-invalid]="submitted() && !userData().username" />
                @if (submitted() && !userData().username) {
                  <small class="p-error">Le nom d'utilisateur est obligatoire</small>
                }
              </div>

              <!-- Password -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mot de passe *
                </label>
                <p-password 
                  [(ngModel)]="userData().password" 
                  name="password"
                  required
                  [toggleMask]="true"
                  [feedback]="true"
                  class="w-full"
                  placeholder="Votre mot de passe"
                  [inputStyleClass]="submitted() && !userData().password ? 'p-invalid w-full' : 'w-full'" />
                @if (submitted() && !userData().password) {
                  <small class="p-error">Le mot de passe est obligatoire</small>
                }
              </div>

              <!-- Confirm Password -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmer le mot de passe *
                </label>
                <p-password 
                  [(ngModel)]="confirmPassword" 
                  name="confirmPassword"
                  required
                  [toggleMask]="true"
                  [feedback]="false"
                  class="w-full"
                  placeholder="Confirmez votre mot de passe"
                  [inputStyleClass]="submitted() && !passwordsMatch() ? 'p-invalid w-full' : 'w-full'" />
                @if (submitted() && !passwordsMatch()) {
                  <small class="p-error">Les mots de passe ne correspondent pas</small>
                }
              </div>

              <!-- Role Selection -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rôle *
                </label>
                <p-select [options]="roleOptions" 
                           [(ngModel)]="userData().userRole"
                           name="userRole"
                           required
                           placeholder="Sélectionnez un rôle"
                           class="w-full"
                           [class.p-invalid]="submitted() && !userData().userRole">
                </p-select>
                @if (submitted() && !userData().userRole) {
                  <small class="p-error">Le rôle est obligatoire</small>
                }
              </div>

              <!-- Address -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse
                </label>
                <input pInputText 
                       [(ngModel)]="userData().address" 
                       name="address"
                       class="w-full"
                       placeholder="123 Rue Principale" />
              </div>
            </div>
          </div>

          <!-- Terms and Conditions -->
          <div class="mt-6">
            <div class="flex items-center">
              <input type="checkbox" 
                     id="terms" 
                     [(ngModel)]="acceptedTerms"
                     name="terms"
                     required
                     class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <label for="terms" class="ml-2 text-sm text-gray-600 dark:text-gray-400">
                J'accepte les 
                <a href="#" class="text-primary-600 hover:text-primary-500">conditions d'utilisation</a>
                et la 
                <a href="#" class="text-primary-600 hover:text-primary-500">politique de confidentialité</a>
                *
              </label>
            </div>
            @if (submitted() && !acceptedTerms) {
              <small class="p-error">Vous devez accepter les conditions</small>
            }
          </div>

          <!-- Submit Button -->
          <div class="mt-8">
            <button pButton 
                    type="button" 
                    label="Créer mon compte" 
                    class="w-full"
                    [disabled]="loading()"
                    (click)="onSubmit()">
              @if (loading()) {
                <i class="pi pi-spin pi-spinner mr-2"></i>
              }
            </button>
          </div>

          <!-- Divider -->
          <p-divider class="my-6">
            <span class="text-sm text-gray-500 px-2">Déjà inscrit ?</span>
          </p-divider>

          <!-- Login Link -->
          <div class="text-center">
            <a routerLink="/login" 
               class="inline-flex items-center text-primary-600 hover:text-primary-500 font-medium">
              <i class="pi pi-arrow-left mr-2"></i>
              Retour à la page de connexion
            </a>
          </div>
        </p-card>

        <!-- Footer -->
        <div class="text-center mt-6">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            © 2024 Retail POS. En créant un compte, vous acceptez nos conditions.
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  userData = signal({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    userRole: 'EMPLOYEE' as any,
    address: ''
  });

  confirmPassword = signal<string>('');
  acceptedTerms = signal<boolean>(false);
  submitted = signal<boolean>(false);
  loading = this.authService.loading;
  error = this.authService.error;

  roleOptions = [
    { label: 'Employé', value: 'EMPLOYEE' },
    { label: 'Caissier', value: 'CASHIER' },
    { label: 'Gérant de Dépot', value: 'DEPOT_MANAGER' },
    { label: 'Admin Magasin', value: 'STORE_ADMIN' },
    { label: 'Administrateur', value: 'ADMIN' }
  ];

  passwordsMatch(): boolean {
    return this.userData().password === this.confirmPassword();
  }

  onSubmit() {
    this.submitted.set(true);

    // Validation
    if (!this.isFormValid()) {
      return;
    }

    this.authService.register(this.userData()).subscribe({
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

  private isFormValid(): boolean {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phone', 
      'username', 'password', 'userRole'
    ];

    const allRequired = requiredFields.every(field => 
      this.userData()
    );

    return allRequired && this.passwordsMatch() && this.acceptedTerms();
  }
}