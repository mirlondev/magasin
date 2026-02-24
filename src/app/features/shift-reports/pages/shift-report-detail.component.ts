import { CommonModule } from "@angular/common";
import { Location } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { DividerModule } from "primeng/divider";
import { InputNumberModule } from "primeng/inputnumber";
import { TextareaModule } from "primeng/textarea";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { EmployeeRole, ShiftStatus } from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { ShiftReportsService } from "../../../core/services/shift-reports.service";
import { XafPipe } from "../../../core/pipes/xaf-currency-pipe";

@Component({
  selector: 'app-shift-report-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TagModule,
    DividerModule,
    TableModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TextareaModule,
    InputNumberModule,
    XafPipe
],
  template: `
    <div class="p-4">
      <p-toast />
      <p-confirmDialog />

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <button pButton 
                  icon="pi pi-arrow-left" 
                  class="p-button-text mr-4"
                  (click)="goBack()">
          </button>
          <div>
            <h1 class="text-2xl font-bold">Session #{{ shift()?.shiftNumber }}</h1>
            <p class="text-gray-600">
              @if (shift()?.openingTime) {
                Ouverte le {{ shift()?.openingTime | date:'dd/MM/yyyy à HH:mm' }}
              }
              @if (shift()?.closingTime) {
                • Fermée le {{ shift()?.closingTime | date:'dd/MM/yyyy à HH:mm' }}
              }
              @if (shift()?.cashRegisterNumber) {
                • Caisse {{ shift()?.cashRegisterNumber }}
              }
            </p>
          </div>
        </div>

        <div class="flex gap-2">
          <button pButton 
                  icon="pi pi-print" 
                  label="Imprimer" 
                  class="p-button-help"
                  (click)="printShiftReport()">
          </button>
          
          @if (canManageShift()) {
            @if (shift()?.status === 'OPEN') {
              <button pButton 
                      icon="pi pi-pause" 
                      label="Suspendre" 
                      class="p-button-warning"
                      (click)="suspendShift()">
              </button>
              
              <button pButton 
                      icon="pi pi-lock" 
                      label="Fermer" 
                      class="p-button-danger"
                      (click)="confirmCloseShift()">
              </button>
            }
            
            @if (shift()?.status === 'SUSPENDED') {
              <button pButton 
                      icon="pi pi-play" 
                      label="Reprendre" 
                      class="p-button-success"
                      (click)="resumeShift()">
              </button>
            }
          }
        </div>
      </div>

      @if (shift()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column - Shift Details -->
          <div class="lg:col-span-2 space-y-6">
            
            <!-- NOUVEAU : Payment Methods Breakdown -->
            @if (shiftDetail()) {
              <p-card header="Répartition des paiements">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div class="text-500 font-medium text-sm">Espèces</div>
                    <div class="text-900 text-xl font-bold text-green-600">
                      {{ shiftDetail()!.cashTotal | xaf }}
                    </div>
                  </div>
                  
                  <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div class="text-500 font-medium text-sm">Mobile Money</div>
                    <div class="text-900 text-xl font-bold text-blue-600">
                      {{ shiftDetail()!.mobileTotal | xaf }}
                    </div>
                  </div>
                  
                  <div class="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div class="text-500 font-medium text-sm">Carte Bancaire</div>
                    <div class="text-900 text-xl font-bold text-purple-600">
                      {{ shiftDetail()!.cardTotal | xaf }}
                    </div>
                  </div>
                  
                  <div class="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div class="text-500 font-medium text-sm">Crédit</div>
                    <div class="text-900 text-xl font-bold text-orange-600">
                      {{ shiftDetail()!.creditTotal | xaf }}
                    </div>
                  </div>
                </div>
              </p-card>
            }

            <!-- Financial Summary -->
            <p-card header="Résumé financier">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                  <h3 class="font-semibold text-lg mb-3">Recettes</h3>
                  
                  <div class="space-y-3">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Solde d'ouverture:</span>
                      <span class="font-semibold">{{ shift()!.openingBalance | xaf }}</span>
                    </div>
                    
                    <div class="flex justify-between">
                      <span class="text-gray-600">Total des ventes:</span>
                      <span class="font-semibold text-green-600">{{ shift()!.totalSales | xaf }}</span>
                    </div>

                    <div class="flex justify-between">
                      <span class="text-gray-600">Total des remboursements:</span>
                      <span class="font-semibold text-red-600">{{ shift()!.totalRefunds | xaf }}</span>
                    </div>
                    
                    <div class="flex justify-between">
                      <span class="text-gray-600">Ventes nettes:</span>
                      <span class="font-semibold">{{ shift()!.netSales | xaf }}</span>
                    </div>
                    
                    <p-divider />
                    
                    <div class="flex justify-between text-lg font-bold">
                      <span>Solde attendu:</span>
                      <span>{{ shift()!.expectedBalance | xaf }}</span>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <h3 class="font-semibold text-lg mb-3">Solde final</h3>
                  
                  <div class="space-y-3">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Solde réel en caisse:</span>
                      <span class="font-semibold">{{ shift()!.actualBalance | xaf }}</span>
                    </div>
                    
                    <div class="flex justify-between">
                      <span class="text-gray-600">Solde de fermeture:</span>
                      <span class="font-semibold">{{ shift()!.closingBalance | xaf }}</span>
                    </div>
                    
                    <p-divider />
                    
                    <div class="flex justify-between items-center">
                      <span class="text-gray-600">Écart:</span>
                      <p-tag [value]="getDiscrepancyLabel(shift()!.discrepancy)" 
                             [severity]="getDiscrepancySeverity(shift()!.discrepancy)" />
                    </div>
                    
                    <div class="text-center">
                      <span class="text-2xl font-bold" 
                            [class.text-green-600]="shift()!.discrepancy >= 0"
                            [class.text-red-600]="shift()!.discrepancy < 0">
                        {{ shift()!.discrepancy | xaf }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </p-card>

            <!-- Transactions Summary -->
            <p-card header="Transactions">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div class="text-500 font-medium">Transactions</div>
                  <div class="text-900 text-3xl font-bold">{{ shift()!.totalTransactions }}</div>
                </div>
                
                <div class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div class="text-500 font-medium">Ventes</div>
                  <div class="text-900 text-3xl font-bold text-green-600">{{ shift()!.totalSales | xaf }}</div>
                </div>
                
                <div class="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div class="text-500 font-medium">Remboursements</div>
                  <div class="text-900 text-3xl font-bold text-red-600">{{ shift()!.totalRefunds | xaf }}</div>
                </div>
              </div>
            </p-card>
          </div>

          <!-- Right Column - Shift Info & Actions -->
          <div class="space-y-6">
            <!-- Shift Information -->
            <p-card header="Informations">
              <div class="space-y-3">
                <div>
                  <div class="text-sm text-gray-500">Statut</div>
                  <div class="flex items-center mt-1">
                    <p-tag [value]="getStatusLabel(shift()!.status)" 
                           [severity]="getStatusSeverity(shift()!.status)" />
                  </div>
                </div>
                
                <div>
                  <div class="text-sm text-gray-500">Caissier</div>
                  <div class="font-medium mt-1">{{ shift()!.cashierName }}</div>
                </div>
                
                <!-- NOUVEAU : Caisse Info -->
                <div>
                  <div class="text-sm text-gray-500">Caisse</div>
                  <div class="font-medium mt-1">
                    @if (shift()?.cashRegisterNumber) {
                      {{ shift()?.cashRegisterNumber }} - {{ shift()?.cashRegisterName }}
                    } @else {
                      <span class="text-gray-400">Non assignée</span>
                    }
                  </div>
                </div>
                
                <div>
                  <div class="text-sm text-gray-500">Magasin</div>
                  <div class="font-medium mt-1">{{ shift()?.storeName }}</div>
                </div>
                
                <div>
                  <div class="text-sm text-gray-500">Durée</div>
                  <div class="font-medium mt-1">
                    @if (shift()!.closingTime) {
                      {{ getShiftDuration() }}
                    } @else {
                      En cours...
                    }
                  </div>
                </div>
              </div>
            </p-card>

            <!-- Cash Operations -->
            @if (canManageShift() && shift()!.status === 'OPEN') {
              <p-card header="Opérations de caisse">
                <div class="space-y-4">
                  <!-- Add Cash -->
                  <div class="p-3 border rounded-lg">
                    <h4 class="font-semibold mb-2">Ajouter des fonds</h4>
                    <div class="flex gap-2">
                      <p-inputNumber [(ngModel)]="addCashAmount" 
                                     [min]="0" 
                                     [step]="1000"
                                     placeholder="Montant"
                                     class="flex-1" />
                      <button pButton 
                              icon="pi pi-plus" 
                              class="p-button-success"
                              (click)="addCash()"
                              [disabled]="!addCashAmount || addCashAmount <= 0">
                      </button>
                    </div>
                  </div>
                  
                  <!-- Remove Cash -->
                  <div class="p-3 border rounded-lg">
                    <h4 class="font-semibold mb-2">Retirer des fonds</h4>
                    <div class="flex gap-2">
                      <p-inputNumber [(ngModel)]="removeCashAmount" 
                                     [min]="0" 
                                     [max]="shift()!.actualBalance"
                                     [step]="1000"
                                     placeholder="Montant"
                                     class="flex-1" />
                      <button pButton 
                              icon="pi pi-minus" 
                              class="p-button-warning"
                              (click)="removeCash()"
                              [disabled]="!removeCashAmount || removeCashAmount <= 0">
                      </button>
                    </div>
                  </div>
                </div>
              </p-card>
            }

            <!-- Shift Timeline -->
            <p-card header="Historique">
              <div class="space-y-4">
                <div class="flex items-start">
                  <div class="w-3 h-3 bg-green-500 rounded-full mt-1 mr-3"></div>
                  <div>
                    <div class="font-medium">Caisse ouverte</div>
                    <div class="text-sm text-gray-500">{{ shift()!.openingTime | date:'dd/MM/yyyy HH:mm' }}</div>
                    <div class="text-sm text-gray-500">Solde: {{ shift()!.openingBalance | xaf }}</div>
                    @if (shift()?.cashRegisterNumber) {
                      <div class="text-sm text-blue-600">Caisse: {{ shift()?.cashRegisterNumber }}</div>
                    }
                  </div>
                </div>
                
                @if (shift()!.updatedAt !== shift()!.openingTime) {
                  <div class="flex items-start">
                    <div class="w-3 h-3 bg-blue-500 rounded-full mt-1 mr-3"></div>
                    <div>
                      <div class="font-medium">Dernière mise à jour</div>
                      <div class="text-sm text-gray-500">{{ shift()!.updatedAt | date:'dd/MM/yyyy HH:mm' }}</div>
                    </div>
                  </div>
                }
                
                @if (shift()!.closingTime) {
                  <div class="flex items-start">
                    <div class="w-3 h-3 bg-purple-500 rounded-full mt-1 mr-3"></div>
                    <div>
                      <div class="font-medium">Caisse fermée</div>
                      <div class="text-sm text-gray-500">{{ shift()!.closingTime | date:'dd/MM/yyyy HH:mm' }}</div>
                    </div>
                  </div>
                }
              </div>
            </p-card>
          </div>
        </div>
      } @else if (loading()) {
        <div class="text-center py-12">
          <i class="pi pi-spin pi-spinner text-4xl text-primary-500"></i>
          <p class="mt-4 text-gray-600">Chargement de la session de caisse...</p>
        </div>
      } @else {
        <div class="text-center py-12">
          <i class="pi pi-exclamation-circle text-4xl text-gray-400"></i>
          <p class="mt-4 text-gray-600">Session de caisse non trouvée</p>
          <button pButton 
                  label="Retour aux sessions" 
                  class="p-button-outlined mt-4"
                  (click)="goBack()">
          </button>
        </div>
      }

      <!-- Close Shift Dialog -->
      <p-dialog header="Fermer la caisse" 
                [(visible)]="showCloseDialog" 
                [modal]="true" 
                [style]="{ width: '500px' }">
        <div class="space-y-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
            <div class="text-sm text-blue-800 dark:text-blue-200">
              <strong>Solde attendu:</strong> {{ shift()?.expectedBalance | xaf }}<br>
              <small>Si vous ne saisissez pas de solde réel, le solde attendu sera utilisé.</small>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Solde réel compté (optionnel)</label>
            <p-inputNumber [(ngModel)]="closingBalance" 
                           [min]="0" 
                           [step]="1000"
                           class="w-full"
                           placeholder="Montant compté en caisse" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Notes de fermeture</label>
            <textarea pTextarea [(ngModel)]="closingNotes" 
                             [rows]="3" 
                             placeholder="Notes..."
                             class="w-full"></textarea>
          </div>
        </div>
        
        <ng-template pTemplate="footer">
          <button pButton 
                  label="Annuler" 
                  class="p-button-outlined"
                  (click)="showCloseDialog = false">
          </button>
          
          <button pButton 
                  label="Fermer la caisse" 
                  class="p-button-danger"
                  (click)="closeShift()">
          </button>
        </ng-template>
      </p-dialog>
    </div>
  `
})
export class ShiftReportDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private shiftReportsService = inject(ShiftReportsService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);

  shiftId = signal<string>('');
  shift = this.shiftReportsService.selectedShiftReport;
  shiftDetail = this.shiftReportsService.selectedShiftDetail; // NOUVEAU
  loading = this.shiftReportsService.loading;

  // Dialog states
  showCloseDialog = false;
  closingBalance: number | null = null;  // MODIFIÉ : null par défaut
  closingNotes = '';

  // Cash operations
  addCashAmount: number = 0;
  removeCashAmount: number = 0;

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.shiftId.set(params['id']);
      this.loadShift();
      this.loadShiftDetail(); // NOUVEAU
    });
  }

  loadShift() {
    if (this.shiftId()) {
      this.shiftReportsService.getShiftReportById(this.shiftId()).subscribe();
    }
  }

  // NOUVEAU : Charger les détails avec répartition des paiements
  loadShiftDetail() {
    if (this.shiftId()) {
      this.shiftReportsService.getShiftDetail(this.shiftId()).subscribe();
    }
  }

  // Permission checks
  canManageShift(): boolean {
    if (!this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])) {
      return false;
    }
    
    const currentUser = this.authService.currentUser();
    const isOwner = this.shift()?.cashier?.userId === currentUser?.userId;
    const isAdmin = this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]);
    
    return isOwner || isAdmin;
  }

  // UI Helpers
  getStatusLabel(status: ShiftStatus): string {
    switch (status) {
      case ShiftStatus.OPEN: return 'Ouverte';
      case ShiftStatus.CLOSED: return 'Fermée';
      case ShiftStatus.SUSPENDED: return 'Suspendue';
      case ShiftStatus.UNDER_REVIEW: return 'En révision';
      default: return status;
    }
  }

  getStatusSeverity(status: ShiftStatus): 'success' | 'warn' | 'info' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case ShiftStatus.OPEN: return 'success';
      case ShiftStatus.CLOSED: return 'info';
      case ShiftStatus.SUSPENDED: return 'warn';
      case ShiftStatus.UNDER_REVIEW: return 'danger';
      default: return 'info';
    }
  }

  getDiscrepancyLabel(discrepancy: number): string {
    if (discrepancy > 0) return 'Excédent';
    if (discrepancy < 0) return 'Manquant';
    return 'Équilibré';
  }

  getDiscrepancySeverity(discrepancy: number): 'success' | 'warn' | 'danger' {
    if (discrepancy > 0) return 'warn';
    if (discrepancy < 0) return 'danger';
    return 'success';
  }

  getShiftDuration(): string {
    const shift = this.shift();
    if (!shift?.openingTime || !shift?.closingTime) return '';
    
    const start = new Date(shift.openingTime);
    const end = new Date(shift.closingTime);
    const duration = end.getTime() - start.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  // Operations
  goBack() {
    this.location.back();
  }

  printShiftReport() {
    this.messageService.add({
      severity: 'info',
      summary: 'Impression',
      detail: 'Fonctionnalité d\'impression bientôt disponible'
    });
  }

  confirmCloseShift() {
    this.showCloseDialog = true;
    this.closingBalance = null; // Reset
  }

  closeShift() {
    if (this.shiftId()) {
      // MODIFIÉ : Utilisation de CloseShiftRequest
      const closingData = {
        actualBalance: this.closingBalance || undefined, // Si null, le backend utilisera expectedBalance
        notes: this.closingNotes
      };

      this.shiftReportsService.closeShift(this.shiftId(), closingData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Caisse fermée avec succès'
          });
          this.showCloseDialog = false;
          this.loadShift();
          this.loadShiftDetail();
        }
      });
    }
  }

  suspendShift() {
    this.confirmationService.confirm({
      message: `Souhaitez-vous suspendre la session ${this.shift()?.shiftNumber} ?`,
      header: 'Suspension de caisse',
      icon: 'pi pi-pause',
      acceptLabel: 'Oui, suspendre',
      rejectLabel: 'Non',
      accept: () => {
        this.shiftReportsService.suspendShift(this.shiftId(), 'Suspendue par l\'utilisateur').subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Caisse suspendue avec succès'
            });
            this.loadShift();
          }
        });
      }
    });
  }

  resumeShift() {
    this.shiftReportsService.resumeShift(this.shiftId()).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Caisse reprise avec succès'
        });
        this.loadShift();
      }
    });
  }

  addCash() {
    // À implémenter selon votre API
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Fonctionnalité à implémenter'
    });
  }

  removeCash() {
    // À implémenter selon votre API
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Fonctionnalité à implémenter'
    });
  }
}