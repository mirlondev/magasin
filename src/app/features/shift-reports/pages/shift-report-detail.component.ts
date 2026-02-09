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
              @if (shift()?.startTime) {
                Ouverte le {{ shift()?.startTime | date:'dd/MM/yyyy à HH:mm' }}
              }
              @if (shift()?.endTime) {
                • Fermée le {{ shift()?.endTime | date:'dd/MM/yyyy à HH:mm' }}
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
            <!-- Financial Summary -->
            <p-card header="Résumé financier">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                  <h3 class="font-semibold text-lg mb-3">Recettes</h3>
                  
                  <div class="space-y-3">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Solde d'ouverture:</span>
                      <span class="font-semibold">{{ shift()!.openingBalance | xaf}}</span>
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

            <!-- Recent Transactions -->
            <p-card header="Transactions récentes">
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b">
                      <th class="pb-3">Heure</th>
                      <th class="pb-3">Type</th>
                      <th class="pb-3">Description</th>
                      <th class="pb-3">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- This would be populated with actual transaction data -->
                    <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td class="py-3">14:30</td>
                      <td class="py-3">
                        <p-tag value="Vente" severity="success" />
                      </td>
                      <td class="py-3">Commande #ORD-1234</td>
                      <td class="py-3 font-semibold text-green-600">+125.50 xaf</td>
                    </tr>
                    <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td class="py-3">15:45</td>
                      <td class="py-3">
                        <p-tag value="Remboursement" severity="danger" />
                      </td>
                      <td class="py-3">Remboursement #REF-5678</td>
                      <td class="py-3 font-semibold text-red-600">-45.00€</td>
                    </tr>
                  </tbody>
                </table>
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
                
                <div>
                  <div class="text-sm text-gray-500">Magasin</div>
                  <div class="font-medium mt-1">{{ shift()?.storeName }}</div>
                  <div class="text-sm text-gray-500">{{ shift()?.storeAddress }}</div>
                </div>
                
                <div>
                  <div class="text-sm text-gray-500">Durée</div>
                  <div class="font-medium mt-1">
                    @if (shift()!.endTime) {
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
                                     [step]="10"
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
                                     [step]="10"
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
                  
                  <!-- Update Notes -->
                  <div class="p-3 border rounded-lg">
                    <h4 class="font-semibold mb-2">Notes</h4>
                    <textarea pInputTextarea [(ngModel)]="notes" 
                                     [rows]="3" 
                                     placeholder="Ajouter des notes..."
                                     class="w-full mb-2"></textarea>
                    <button pButton 
                            label="Mettre à jour" 
                            class="p-button-outlined w-full"
                            (click)="updateNotes()"
                            [disabled]="notes === shift()!.notes">
                    </button>
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
                    <div class="text-sm text-gray-500">{{ shift()!.startTime | date:'dd/MM/yyyy HH:mm' }}</div>
                    <div class="text-sm text-gray-500">Solde d'ouverture: {{ shift()!.openingBalance | xaf }}</div>
                  </div>
                </div>
                
                @if (shift()!.updatedAt !== shift()!.startTime) {
                  <div class="flex items-start">
                    <div class="w-3 h-3 bg-blue-500 rounded-full mt-1 mr-3"></div>
                    <div>
                      <div class="font-medium">Dernière mise à jour</div>
                      <div class="text-sm text-gray-500">{{ shift()!.updatedAt | date:'dd/MM/yyyy HH:mm' }}</div>
                    </div>
                  </div>
                }
                
                @if (shift()!.endTime) {
                  <div class="flex items-start">
                    <div class="w-3 h-3 bg-purple-500 rounded-full mt-1 mr-3"></div>
                    <div>
                      <div class="font-medium">Caisse fermée</div>
                      <div class="text-sm text-gray-500">{{ shift()!.endTime | date:'dd/MM/yyyy HH:mm' }}</div>
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
          <div>
            <label class="block text-sm font-medium mb-2">Solde de fermeture *</label>
            <p-inputNumber [(ngModel)]="closingBalance" 
                           [min]="0" 
                           [step]="0.01"
                           required
                           class="w-full"
                           placeholder="Montant compté en caisse" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Notes</label>
            <textarea pInputTextarea [(ngModel)]="closingNotes" 
                             [rows]="3" 
                             placeholder="Notes de fermeture..."
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
                  (click)="closeShift()"
                  [disabled]="!closingBalance">
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
  loading = this.shiftReportsService.loading;

  // Dialog states
  showCloseDialog = false;
  closingBalance: number = 0;
  closingNotes = '';

  // Cash operations
  addCashAmount: number = 0;
  removeCashAmount: number = 0;
  notes = '';

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.shiftId.set(params['id']);
      this.loadShift();
    });
  }

  loadShift() {
    if (this.shiftId()) {
      this.shiftReportsService.getShiftReportById(this.shiftId()).subscribe(shift => {
        this.notes = shift?.notes || '';
        console.log(this.shift());
      });
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
    if (!shift?.startTime || !shift?.endTime) return '';
    
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
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
    // Implement print functionality
    this.messageService.add({
      severity: 'info',
      summary: 'Impression',
      detail: 'Fonctionnalité d\'impression bientôt disponible'
    });
  }

  confirmCloseShift() {
    this.showCloseDialog = true;
    this.closingBalance = this.shift()?.actualBalance || 0;
  }

  closeShift() {
    if (this.shiftId()) {
      const closingData = {
        closingBalance: this.closingBalance,
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
    if (this.addCashAmount > 0 && this.shiftId()) {
      this.shiftReportsService.addCash(this.shiftId(), this.addCashAmount, 'Ajout manuel').subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Fonds ajoutés avec succès'
          });
          this.addCashAmount = 0;
          this.loadShift();
        }
      });
    }
  }

  removeCash() {
    if (this.removeCashAmount > 0 && this.shiftId()) {
      this.shiftReportsService.removeCash(this.shiftId(), this.removeCashAmount, 'Retrait manuel').subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Fonds retirés avec succès'
          });
          this.removeCashAmount = 0;
          this.loadShift();
        }
      });
    }
  }

  updateNotes() {
    if (this.shiftId()) {
      this.shiftReportsService.updateNotes(this.shiftId(), this.notes).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Notes mises à jour avec succès'
          });
          this.loadShift();
        }
      });
    }
  }
}