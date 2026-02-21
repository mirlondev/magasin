import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { SelectModule } from "primeng/select";
import { EmployeeRole, CashRegister, CashRegisterRequest, Store } from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { CashRegistersService } from "../../../core/services/cash-registers.service";
import { StoresService } from "../../../core/services/stores.service";

@Component({
  selector: 'app-cash-register-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    CardModule
],
  template: `
    <div class="p-4">
      <p-toast />
      <p-confirmDialog />

      <!-- Toolbar -->
      <p-toolbar>
        <div class="p-toolbar-group-start">
          <h2 class="text-2xl font-bold">Gestion des Caisses</h2>
        </div>
        
        <div class="p-toolbar-group-end">
          @if (canManageCashRegisters()) {
            <button pButton 
                    icon="pi pi-plus" 
                    label="Nouvelle Caisse" 
                    class="p-button-success"
                    (click)="openNew()">
            </button>
          }
        </div>
      </p-toolbar>

      <!-- Filters -->
      <div class="p-4 surface-ground rounded mb-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Magasin</label>

             <p-select [options]="storeOptions()" 
                           [(ngModel)]="selectedStoreId"
                           (onChange)="onStoreChange($event)"
                           name="storeId"
                           required
                           placeholder="Sélectionnez un magasin"
                           class="w-full"
                            [class.p-invalid]="submitted() && !selectedStoreId">
                </p-select>
                 @if (submitted() && !selectedStoreId) {
                  <small class="p-error">Le magasin est obligatoire</small>
                 }
          <div>
            <label class="block text-sm font-medium mb-2">Recherche</label>
            <input pInputText 
                   [(ngModel)]="searchQuery"
                   placeholder="Numéro ou nom de caisse..." 
                   class="w-full" />
          </div>
          
          <div class="flex items-end">
            <button pButton 
                    icon="pi pi-filter-slash" 
                    label="Réinitialiser" 
                    class="p-button-outlined w-full"
                    (click)="resetFilters()">
            </button>
      </div>

      <!-- Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Total Caisses</div>
          <div class="text-900 text-3xl font-bold">{{ cashRegisters().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Caisses Actives</div>
          <div class="text-900 text-3xl font-bold text-green-500">
            {{ activeCashRegistersCount() }}
          </div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Caisses Inactives</div>
          <div class="text-900 text-3xl font-bold text-red-500">
            {{ inactiveCashRegistersCount() }}
          </div>
        </div>
      </div>

      <!-- Cash Registers Table -->
      <p-table [value]="filteredCashRegisters()" 
               [paginator]="true" 
               [rows]="10"
               [loading]="loading()"
               [rowsPerPageOptions]="[10, 25, 50]"
               [tableStyle]="{'min-width': '75rem'}">
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="registerNumber">N° Caisse <p-sortIcon field="registerNumber" /></th>
            <th pSortableColumn="name">Nom <p-sortIcon field="name" /></th>
            <th pSortableColumn="storeName">Magasin <p-sortIcon field="storeName" /></th>
            <th>Emplacement</th>
            <th pSortableColumn="isActive">Statut <p-sortIcon field="isActive" /></th>
            <th>Actions</th>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="body" let-register>
          <tr>
            <td class="font-semibold">{{ register.registerNumber }}</td>
            <td>{{ register.name }}</td>
            <td>{{ register.storeName || 'N/A' }}</td>
            <td>{{ register.location || '-' }}</td>
            <td>
              <p-tag [value]="register.isActive ? 'Active' : 'Inactive'" 
                     [severity]="register.isActive ? 'success' : 'danger'" />
            </td>
            <td>
              <div class="flex gap-2">
                @if (canManageCashRegisters()) {
                  <button pButton 
                          icon="pi pi-pencil" 
                          class="p-button-rounded p-button-success p-button-text"
                          (click)="editCashRegister(register)">
                  </button>
                  
                  @if (register.isActive) {
                    <button pButton 
                            icon="pi pi-power-off" 
                            class="p-button-rounded p-button-warning p-button-text"
                            (click)="deactivateCashRegister(register)"
                            [disabled]="loading()">
                    </button>
                  } @else {
                    <button pButton 
                            icon="pi pi-play" 
                            class="p-button-rounded p-button-success p-button-text"
                            (click)="activateCashRegister(register)"
                            [disabled]="loading()">
                    </button>
                  }
                  
                  <button pButton 
                          icon="pi pi-trash" 
                          class="p-button-rounded p-button-danger p-button-text"
                          (click)="deleteCashRegister(register)"
                          [disabled]="loading()">
                  </button>
                }
              </div>
            </td>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center p-6">
              <div class="text-500">
                @if (loading()) {
                  <p class="text-lg">Chargement en cours...</p>
                } @else {
                  <p class="text-lg">Aucune caisse trouvée</p>
                  <p class="text-sm">Sélectionnez un magasin ou créez une nouvelle caisse</p>
                }
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
 

    <!-- Dialog for New/Edit -->
    <p-dialog [(visible)]="cashRegisterDialog" 
              [style]="{width: '500px'}" 
              header="Détails de la Caisse" 
              [modal]="true"
              class="p-fluid">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Numéro de Caisse *</label>
          <input pInputText 
                 [(ngModel)]="cashRegister.registerNumber"
                 placeholder="Ex: Caisse-01"
                 class="w-full" />
        <small class="p-error" *ngIf="submitted() && !cashRegister.registerNumber">
            Le numéro est obligatoire
          </small>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Nom *</label>
          <input pInputText 
                 [(ngModel)]="cashRegister.name"
                 placeholder="Ex: Caisse Principale"
                 class="w-full" />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Magasin *</label>
          <p-select [options]="storeOptions()" 
                     [(ngModel)]="cashRegister.storeId"
                     placeholder="Sélectionnez un magasin"
                     class="w-full">
          </p-select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Emplacement</label>
          <input pInputText 
                 [(ngModel)]="cashRegister.location"
                 placeholder="Ex: Rez-de-chaussée, Étage 1..."
                 class="w-full" />
        </div>
      </div>
      
      <ng-template pTemplate="footer">
        <button pButton 
                label="Annuler" 
                icon="pi pi-times" 
                class="p-button-text"
                (click)="hideDialog()">
        </button>
        <button pButton 
                label="Enregistrer" 
                icon="pi pi-check" 
                class="p-button-success"
                (click)="saveCashRegister()"
                [disabled]="loading()">
        </button>
      </ng-template>
    </p-dialog>
  `
})
export class CashRegisterListComponent implements OnInit {
  private cashRegistersService = inject(CashRegistersService);
  private storesService = inject(StoresService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);

  // Signals
  cashRegisters = this.cashRegistersService.cashRegisters;
  loading = this.cashRegistersService.loading;
  selectedStoreId = signal<string>('');
  searchQuery = signal<string>('');
  submitted = signal(false);

  // Dialog state
  cashRegisterDialog = false;
  cashRegister: CashRegisterRequest = {
    registerNumber: '',
    name: '',
    storeId: '',
    location: ''
  };
  editingId: string | null = null;

  storeOptions = signal<{label: string, value: string}[]>([]);

  ngOnInit() {
    this.loadStores();
  }

  loadStores() {
    this.storesService.loadStores(1, 100).subscribe(() => {
      const stores = this.storesService.items();
      this.storeOptions.set(
        stores.map((store: Store) => ({
          label: `${store.name} - ${store.city}`,
          value: store.storeId
        }))
      );
    });
  }

  onStoreChange(event: any) {
    const storeId = event.value;
    this.selectedStoreId.set(storeId);
    if (storeId) {
      this.loadCashRegisters(storeId);
    }
  }

  loadCashRegisters(storeId: string) {
    this.cashRegistersService.getCashRegistersByStore(storeId).subscribe();
  }

  // Computed
  filteredCashRegisters = signal<CashRegister[]>([]);
  
  activeCashRegistersCount = computed(() => 
    this.cashRegisters().filter(r => r.isActive).length
  );
  
  inactiveCashRegistersCount = computed(() => 
    this.cashRegisters().filter(r => !r.isActive).length
  );

  canManageCashRegisters(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]);
  }

  // Dialog operations
  openNew() {
    this.cashRegister = {
      registerNumber: '',
      name: '',
      storeId: this.selectedStoreId() || '',
      location: ''
    };
    this.editingId = null;
     this.submitted.set(false);
    this.cashRegisterDialog = true;
  }

  editCashRegister(register: CashRegister) {
    this.cashRegister = {
      registerNumber: register.registerNumber,
      name: register.name,
      storeId: register.storeId,
      location: register.location || ''
    };
    this.editingId = register.cashRegisterId;
    this.cashRegisterDialog = true;
  }

  hideDialog() {
    this.cashRegisterDialog = false;
    this.submitted.set(false);
  }

  saveCashRegister() {
    this.submitted.set(true);

    if (!this.cashRegister.registerNumber || !this.cashRegister.name || !this.cashRegister.storeId) {
      return;
    }

    if (this.editingId) {
      this.cashRegistersService.updateCashRegister(this.editingId, this.cashRegister).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Caisse mise à jour'
          });
          this.cashRegisterDialog = false;
          this.loadCashRegisters(this.cashRegister.storeId);
        }
      });
    } else {
      this.cashRegistersService.createCashRegister(this.cashRegister).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Caisse créée'
          });
          this.cashRegisterDialog = false;
          this.selectedStoreId.set(this.cashRegister.storeId);
          this.loadCashRegisters(this.cashRegister.storeId);
        }
      });
    }
  }

  // CRUD operations
  activateCashRegister(register: CashRegister) {
    this.cashRegistersService.activateCashRegister(register.cashRegisterId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Caisse activée'
        });
      }
    });
  }

  deactivateCashRegister(register: CashRegister) {
    this.confirmationService.confirm({
      message: `Désactiver la caisse ${register.registerNumber} ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.cashRegistersService.deactivateCashRegister(register.cashRegisterId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Caisse désactivée'
            });
          }
        });
      }
    });
  }

  deleteCashRegister(register: CashRegister) {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer la caisse ${register.registerNumber} ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.cashRegistersService.deleteCashRegister(register.cashRegisterId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Caisse supprimée'
            });
          }
        });
      }
    });
  }

  resetFilters() {
    this.selectedStoreId.set('');
    this.searchQuery.set('');
    this.cashRegistersService.cashRegisters.set([]);
  }
}