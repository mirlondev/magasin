import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputNumberModule } from "primeng/inputnumber";
import { SelectModule } from "primeng/select";
import { TextareaModule } from "primeng/textarea";
import { ToastModule } from "primeng/toast";
import { AuthService } from "../../../core/services/auth.service";
import { ShiftReportsService } from "../../../core/services/shift-reports.service";
import { StoresService } from "../../../core/services/stores.service";
import { XafPipe } from "../../../core/pipes/xaf-currency-pipe";

@Component({
  selector: 'app-shift-report-open',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    ToastModule,
    XafPipe
],
  template: `
    <div class="p-4">
      <p-toast />

      <!-- Header -->
      <div class="mb-6">
        <button pButton 
                icon="pi pi-arrow-left" 
                class="p-button-text mb-4"
                (click)="goBack()">
        </button>
        <h1 class="text-2xl font-bold">Ouvrir une nouvelle caisse</h1>
        <p class="text-gray-600">Configurez les paramètres d'ouverture de caisse</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Form -->
        <div class="lg:col-span-2">
          <p-card>
            <form #shiftForm="ngForm" (ngSubmit)="onSubmit()" class="space-y-6">
              <!-- Store Selection -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Magasin *
                </label>
                <p-select [options]="storeOptions()" 
                           [(ngModel)]="shiftData()!.storeId"
                           name="storeId"
                           required
                           placeholder="Sélectionnez un magasin"
                           class="w-full"
                           [class.p-invalid]="submitted() && !shiftData()!.storeId">
                </p-select>
                @if (submitted() && !shiftData()!.storeId) {
                  <small class="p-error">Le magasin est obligatoire</small>
                }
              </div>

              <!-- Opening Balance -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Solde d'ouverture *
                </label>
                <p-inputNumber [(ngModel)]="shiftData()!.openingBalance" 
                               name="openingBalance"
                               [min]="0" 
                               [step]="10"
                               required
                               mode="currency" 
                               currency="EUR" 
                               locale="fr-FR"
                               class="w-full"
                               [class.p-invalid]="submitted() && !shiftData()!.openingBalance">
                </p-inputNumber>
                @if (submitted() && !shiftData()!.openingBalance) {
                  <small class="p-error">Le solde d'ouverture est obligatoire</small>
                }
                <p class="text-sm text-gray-500">
                  Montant initial compté en caisse avant le début des opérations
                </p>
              </div>

              <!-- Notes -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes (optionnel)
                </label>
                <textarea [(ngModel)]="shiftData()!.notes"  pTextarea 
                                 name="notes"
                                 [rows]="4" 
                                 placeholder="Notes d'ouverture, informations importantes..."
                                 class="w-full">
              </textarea>
              </div>

              <!-- Quick Amounts -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Solde d'ouverture rapide
                </label>
                <div class="grid grid-cols-4 gap-2">
                  @for (amount of quickAmounts; track amount) {
                    <button type="button"
                            pButton
                            [label]="amount | xaf"
                            class="p-button-outlined"
                            (click)="shiftData()!.openingBalance = amount">
                    </button>
                  }
                </div>
              </div>

              <!-- Form Actions -->
              <div class="flex gap-2 pt-4">
                <button pButton 
                        type="button" 
                        label="Annuler" 
                        class="p-button-outlined"
                        (click)="goBack()">
                </button>
                
                <button pButton 
                        type="submit" 
                        label="Ouvrir la caisse" 
                        class="p-button-success flex-1"
                        [disabled]="loading()"
                        [loading]="loading()">
                  @if (loading()) {
                    <i class="pi pi-spin pi-spinner mr-2"></i>
                  }
                </button>
              </div>
            </form>
          </p-card>
        </div>

        <!-- Information Panel -->
        <div class="space-y-6">
          <!-- Instructions -->
          <p-card header="Instructions">
            <div class="space-y-3">
              <div class="flex items-start">
                <i class="pi pi-check-circle text-green-500 mt-1 mr-3"></i>
                <div>
                  <div class="font-medium">Vérifiez le solde initial</div>
                  <p class="text-sm text-gray-500">Comptez soigneusement l'argent en caisse avant d'ouvrir</p>
                </div>
              </div>
              
              <div class="flex items-start">
                <i class="pi pi-info-circle text-blue-500 mt-1 mr-3"></i>
                <div>
                  <div class="font-medium">Sélectionnez le bon magasin</div>
                  <p class="text-sm text-gray-500">Assurez-vous d'ouvrir la caisse dans le bon établissement</p>
                </div>
              </div>
              
              <div class="flex items-start">
                <i class="pi pi-exclamation-triangle text-orange-500 mt-1 mr-3"></i>
                <div>
                  <div class="font-medium">Notez les observations</div>
                  <p class="text-sm text-gray-500">Toute information importante doit être notée</p>
                </div>
              </div>
            </div>
          </p-card>

          <!-- Current Shift Info -->
          @if (currentShift()) {
            <p-card header="Caisse en cours" class="border-orange-200">
              <div class="space-y-3">
                <div class="flex items-center">
                  <i class="pi pi-exclamation-triangle text-orange-500 text-xl mr-3"></i>
                  <div>
                    <div class="font-semibold">Attention</div>
                    <p class="text-sm text-gray-500">Vous avez déjà une caisse ouverte</p>
                  </div>
                </div>
                
                <div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div class="text-sm text-gray-500">Session #{{ currentShift()?.shiftNumber }}</div>
                  <div class="font-semibold">{{ currentShift()?.store?.name }}</div>
                  <div class="text-sm text-gray-500">
                    Ouverte à {{ currentShift()?.startTime | date:'HH:mm' }}
                  </div>
                </div>
                
                <button pButton 
                        label="Voir la caisse" 
                        icon="pi pi-external-link" 
                        class="p-button-outlined w-full"
                        (click)="router.navigate(['/shift-reports', currentShift()?.shiftReportId])">
                </button>
              </div>
            </p-card>
          }
        </div>
      </div>
    </div>
  `
})
export class ShiftReportOpenComponent implements OnInit {
  private shiftReportsService = inject(ShiftReportsService);
  private storesService = inject(StoresService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  protected router = inject(Router);

  shiftData = signal({
    storeId: '',
    openingBalance: 0,
    notes: ''
  });

  submitted = signal(false);
  loading = this.shiftReportsService.loading;
  currentShift = signal<any>(null);

  quickAmounts = [50, 100, 200, 500];

  storeOptions = signal<any[]>([]);

  ngOnInit() {
    this.loadStores();
    this.loadCurrentShift();
  }

  loadStores() {
    this.storesService.loadStores(1, 100).subscribe(() => {
      const stores = this.storesService.items();
      this.storeOptions.set(
        stores.map(store => ({
          label: `${store.name} - ${store.city}`,
          value: store.storeId
        }))
      );
    });
  }

  loadCurrentShift() {
    this.shiftReportsService.getCurrentShift().subscribe(shift => {
      this.currentShift.set(shift);
    });
  }

  goBack() {
    this.router.navigate(['/shift-reports']);
  }

  onSubmit() {
    this.submitted.set(true);

    // Validation
    if (!this.shiftData().storeId || !this.shiftData().openingBalance) {
      return;
    }

    this.shiftReportsService.openShift(this.shiftData()).subscribe({
      next: (shift) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Caisse ouverte avec succès'
        });
        this.router.navigate(['/shift-reports', shift.shiftReportId]);
      },
      error: () => {
        // Error handled in service
      }
    });
  }
}