import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { EmployeeRole, Store, StoreStatus, StoreType } from "../../../../core/models";
import { AuthService } from "../../../../core/services/auth.service";
import { StoresService } from "../../../../core/services/stores.service";
import { StoreFormComponent } from "../../components/store-form.component";

@Component({
  selector: 'app-store-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    TagModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    StoreFormComponent,
    SelectModule
],
  template: `
    <div class="p-4">
      <p-toast />
      <p-confirmDialog />

      <!-- Toolbar -->
      <p-toolbar>
        <div class="p-toolbar-group-start">
          <h2 class="text-2xl font-bold">Gestion des Magasins</h2>
        </div>
        
        <div class="p-toolbar-group-end" *ngIf="canCreate">
          <button pButton 
                  icon="pi pi-plus" 
                  label="Nouveau Magasin" 
                  class="p-button-success"
                  (click)="showCreateDialog()">
          </button>
        </div>
      </p-toolbar>

      <!-- Filters -->
      <div class="p-4 surface-ground rounded mb-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Recherche</label>
            <input pInputText 
                   [(ngModel)]="searchTerm" 
                   (ngModelChange)="onSearch()"
                   placeholder="Nom, ville, email..." 
                   class="w-full" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Type</label>
            <p-select [options]="storeTypeOptions" 
                       [(ngModel)]="selectedType"
                       (onChange)="onFilterChange()"
                       placeholder="Tous les types"
                       [showClear]="true"
                       class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Statut</label>
            <p-select
            [options]="statusOptions"
                       [(ngModel)]="selectedStatus"
                       (onChange)="onFilterChange()"
                       placeholder="Tous les statuts"
                       class="w-full">
            </p-select>
          </div>
          
          <div class="flex items-end">
            <button pButton 
                    icon="pi pi-filter-slash" 
                    label="Réinitialiser" 
                    class="p-button-outlined w-full"
                    (click)="resetFilters()">
            </button>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Total Magasins</div>
          <div class="text-900 text-3xl font-bold">{{ total() }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Magasins Actifs</div>
          <div class="text-900 text-3xl font-bold">{{ activeStoresCount() }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Boutiques</div>
          <div class="text-900 text-3xl font-bold">{{ shopsCount() }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Entrepôts</div>
          <div class="text-900 text-3xl font-bold">{{ warehousesCount() }}</div>
        </div>
      </div>

      <!-- Stores Table -->
      <p-table [value]="stores()" 
               [lazy]="true" 
               [paginator]="true" 
               [rows]="pageSize()"
               [totalRecords]="total()"
               [loading]="loading()"
               (onLazyLoad)="onLazyLoad($event)"
               [rowsPerPageOptions]="[10, 25, 50]"
               [tableStyle]="{'min-width': '75rem'}">
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Nom <p-sortIcon field="name" /></th>
            <th pSortableColumn="storeType">Type <p-sortIcon field="storeType" /></th>
            <th pSortableColumn="status">Statut <p-sortIcon field="status" /></th>
            <th pSortableColumn="city">Ville <p-sortIcon field="city" /></th>
            <th pSortableColumn="email">Email <p-sortIcon field="email" /></th>
            <th pSortableColumn="createdAt">Créé le <p-sortIcon field="createdAt" /></th>
            <th>Actions</th>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="body" let-store>
          <tr>
            <td class="font-semibold">{{ store.name }}</td>
            <td>
              <p-tag [value]="getStoreTypeLabel(store.storeType)" 
                     [severity]="getStoreTypeSeverity(store.storeType)" />
            </td>
            <td>
              <p-tag [value]="getStatusLabel(store.status)" 
                     [severity]="getStatusSeverity(store.status)" />
            </td>
            <td>{{ store.city }}</td>
            <td>{{ store.email }}</td>
            <td>{{ store.createdAt | date:'dd/MM/yyyy' }}</td>
            <td>
              <div class="flex gap-2">
                <button pButton 
                        icon="pi pi-eye" 
                        class="p-button-rounded p-button-info p-button-text"
                        [routerLink]="['/stores', store.storeId]">
                </button>
                
                <button pButton 
                        icon="pi pi-pencil" 
                        class="p-button-rounded p-button-warning p-button-text"
                        (click)="editStore(store)"
                        [disabled]="!canEdit()">
                </button>
                
                <button pButton 
                        icon="pi pi-trash" 
                        class="p-button-rounded p-button-danger p-button-text"
                        (click)="confirmDelete(store)"
                        [disabled]="!canDelete()">
                </button>
                
                @if (store.status === 'ACTIVE' && canManageStatus()) {
                  <button pButton 
                          icon="pi pi-times" 
                          class="p-button-rounded p-button-secondary p-button-text"
                          (click)="closeStore(store.storeId)"
                          [disabled]="loading()">
                  </button>
                }
                
                @if (store.status === 'CLOSED' && canManageStatus()) {
                  <button pButton 
                          icon="pi pi-check" 
                          class="p-button-rounded p-button-success p-button-text"
                          (click)="activateStore(store.storeId)"
                          [disabled]="loading()">
                  </button>
                }
              </div>
            </td>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" class="text-center p-6">
              <div class="text-500">
                @if (loading()) {
                  <p class="text-lg">Chargement en cours...</p>
                } @else {
                  <p class="text-lg">Aucun magasin trouvé</p>
                }
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Dialog -->
      <p-dialog header="{{ isEditing() ? 'Modifier le Magasin' : 'Nouveau Magasin' }}" 
                [(visible)]="displayDialog" 
                [modal]="true" 
                [style]="{ width: '600px' }"
                (onHide)="onDialogHide()">
        <app-store-form 
          [store]="selectedStore()"
          [loading]="loading()"
          (save)="onSave($event)"
          (cancel)="displayDialog.set(false)">
        </app-store-form>
      </p-dialog>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .p-toolbar {
      background: transparent;
      border: none;
      padding-left: 0;
      padding-right: 0;
    }
    
    .store-card:hover {
      transform: translateY(-2px);
      transition: transform 0.2s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class StoreListComponent implements OnInit {
  private storesService = inject(StoresService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  // Signals from service
  stores = this.storesService.items;
  loading = this.storesService.loading;
  total = this.storesService.total;
  pageSize = this.storesService.pageSize;

  // Local signals
  searchTerm = signal<string>('');
  selectedType = signal<StoreType | null>(null);
  selectedStatus = signal<StoreStatus | null>(null);
  displayDialog = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  selectedStore = signal<Store | null>(null);

  // Computed
  activeStoresCount = computed(() => 
    this.stores().filter(s => s.status === StoreStatus.ACTIVE).length
  );

  shopsCount = computed(() => 
    this.stores().filter(s => s.storeType === StoreType.SHOP).length
  );

  warehousesCount = computed(() => 
    this.stores().filter(s => s.storeType === StoreType.WAREHOUSE).length
  );

  // Dropdown options
  storeTypeOptions = [
    { label: 'Boutique', value: StoreType.SHOP },
    { label: 'Entrepôt', value: StoreType.WAREHOUSE }
  ];

  statusOptions = [
    { label: 'Actif', value: StoreStatus.ACTIVE },
    { label: 'Fermé', value: StoreStatus.CLOSED },
    { label: 'En attente', value: StoreStatus.PENDING }
  ];

  // Permission computed
  private role = this.authService.currentUser()?.userRole;

  canCreate = computed(() => {
    return  this.role  === EmployeeRole.ADMIN ||  this.role  === EmployeeRole.STORE_ADMIN;
  });

  canEdit = computed(() => {
    return  this.role  === EmployeeRole.ADMIN ||  this.role  === EmployeeRole.STORE_ADMIN;
  });

  canDelete = computed(() => {
    return this.role=== EmployeeRole.ADMIN;
  });

  canManageStatus = computed(() => {
    return this.role === EmployeeRole.ADMIN ||  this.role  === EmployeeRole.STORE_ADMIN;
  });

  ngOnInit() {
    this.storesService.initialize();
  }

  // UI Helpers
  getStoreTypeLabel(type: StoreType): string {
    return type === StoreType.SHOP ? 'Boutique' : 'Entrepôt';
  }

  getStoreTypeSeverity(type: StoreType): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'  {
    return type === StoreType.SHOP ? 'info' : 'warn';
  }

  getStatusLabel(status: StoreStatus): string {
    switch (status) {
      case StoreStatus.ACTIVE: return 'Actif';
      case StoreStatus.CLOSED: return 'Fermé';
      case StoreStatus.PENDING: return 'En attente';
      default: return status;
    }
  }

  getStatusSeverity(status: StoreStatus):  'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case StoreStatus.ACTIVE: return 'success';
      case StoreStatus.CLOSED: return 'danger';
      case StoreStatus.PENDING: return 'warn';
      default: return 'info';
    }
  }

  // Event Handlers
  onSearch() {
    // Debounce would be better in production
    this.loadWithFilters();
  }

  onFilterChange() {
    this.loadWithFilters();
  }

  resetFilters() {
    this.searchTerm.set('');
    this.selectedType.set(null);
    this.selectedStatus.set(null);
    this.loadWithFilters();
  }

  private loadWithFilters() {
    const filters: any = {};
    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedType()) filters.type = this.selectedType();
    if (this.selectedStatus()) filters.status = this.selectedStatus();
    
    this.storesService.loadStores(1, this.pageSize(), filters).subscribe();
  }

  onLazyLoad(event: any) {
    const page = (event.first / event.rows) + 1;
    this.storesService.setPage(page);
    this.storesService.setPageSize(event.rows);
  }

  // CRUD Operations
  showCreateDialog() {
    this.isEditing.set(false);
    this.selectedStore.set(null);
    this.displayDialog.set(true);
  }

  editStore(store: Store) {
    this.isEditing.set(true);
    this.selectedStore.set(store);
    this.displayDialog.set(true);
  }

  onSave(storeData: Partial<Store>) {
    const operation = this.isEditing() 
      ? this.storesService.updateStore(this.selectedStore()!.storeId, storeData)
      : this.storesService.createStore(storeData);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: this.isEditing() 
            ? 'Magasin mis à jour avec succès' 
            : 'Magasin créé avec succès'
        });
        this.displayDialog.set(false);
      },
      error: () => {
        // Error is handled in service
      }
    });
  }

  confirmDelete(store: Store) {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer le magasin "${store.name}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Oui',
      rejectLabel: 'Non',
      accept: () => this.deleteStore(store.storeId)
    });
  }

  deleteStore(storeId: string) {
    this.storesService.deleteStore(storeId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Magasin supprimé avec succès'
        });
      },
      error: () => {
        // Error handled in service
      }
    });
  }

  activateStore(storeId: string) {
    this.storesService.activateStore(storeId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Magasin activé avec succès'
        });
      }
    });
  }

  closeStore(storeId: string) {
    this.storesService.closeStore(storeId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Magasin fermé avec succès'
        });
      }
    });
  }

  onDialogHide() {
    this.selectedStore.set(null);
  }
}