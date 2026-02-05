import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { ProgressBarModule } from "primeng/progressbar";
import { Select, SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { EmployeeRole, StockStatus } from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { InventoryService } from "../../../core/services/inventory.service";

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    TagModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    ProgressBarModule,
    SelectModule
],
  template: `
    <div class="p-4">
      <p-toast />
      <p-confirmDialog />

      <!-- Toolbar -->
      <p-toolbar>
        <div class="p-toolbar-group-start">
          <h2 class="text-2xl font-bold">Gestion de l'Inventaire</h2>
        </div>
        
        <div class="p-toolbar-group-end">
          @if (canManageInventory()) {
            <button pButton 
                    icon="pi pi-plus" 
                    label="Nouvel Article" 
                    class="p-button-success"
                    [routerLink]="['/inventory/new']">
            </button>
          }
          
          <button pButton 
                  icon="pi pi-file-export" 
                  label="Rapport" 
                  class="p-button-help ml-2"
                  (click)="generateReport()">
          </button>
          
          <button pButton 
                  icon="pi pi-refresh" 
                  label="Actualiser" 
                  class="p-button-outlined ml-2"
                  (click)="refresh()"
                  [disabled]="loading()">
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
                   (ngModelChange)="onFilterChange()"
                   placeholder="Nom produit, SKU..." 
                   class="w-full" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Statut</label>
            <p-select [options]="statusOptions" 
                       [(ngModel)]="selectedStockStatus"
                       (onChange)="onFilterChange()"
                       placeholder="Tous les statuts"
                       [showClear]="true"
                       class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Alerte</label>
            <p-select [options]="alertOptions" 
                       [(ngModel)]="selectedAlertType"
                       (onChange)="onFilterChange()"
                       placeholder="Toutes les alertes"
                       [showClear]="true"
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

      <!-- Alerts -->
      @if (lowStockItems().length > 0 || outOfStockItems().length > 0) {
        <div class="mb-6 space-y-3">
          @if (lowStockItems().length > 0) {
            <div class="p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i class="pi pi-exclamation-triangle text-orange-500 text-xl mr-3"></i>
                  <div>
                    <h3 class="font-semibold">{{ lowStockItems().length }} produits en stock faible</h3>
                    <p class="text-sm text-gray-600">Certains produits approchent du niveau de réapprovisionnement</p>
                  </div>
                </div>
                <button pButton 
                        label="Voir" 
                        class="p-button-outlined p-button-sm"
                        (click)="showLowStock = true">
                </button>
              </div>
            </div>
          }
          
          @if (outOfStockItems().length > 0) {
            <div class="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i class="pi pi-times-circle text-red-500 text-xl mr-3"></i>
                  <div>
                    <h3 class="font-semibold">{{ outOfStockItems().length }} produits en rupture de stock</h3>
                    <p class="text-sm text-gray-600">Action requise immédiatement</p>
                  </div>
                </div>
                <button pButton 
                        label="Voir" 
                        class="p-button-outlined p-button-sm"
                        (click)="showOutOfStock = true">
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Articles Total</div>
          <div class="text-900 text-3xl font-bold">{{ total() }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Valeur Totale</div>
          <div class="text-900 text-3xl font-bold">
            {{ totalValue() | currency:'EUR':'symbol':'1.2-2' }}
          </div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Stock Faible</div>
          <div class="text-900 text-3xl font-bold text-orange-500">{{ lowStockItems().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Rupture</div>
          <div class="text-900 text-3xl font-bold text-red-500">{{ outOfStockItems().length }}</div>
        </div>
      </div>

      <!-- Inventory Table -->
      <p-table [value]="inventoryItems()" 
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
            <th>Produit</th>
            <th>SKU</th>
            <th>Magasin</th>
            <th>Quantité</th>
            <th>Statut</th>
            <th>Prix de vente</th>
            <th>Valeur totale</th>
            <th>Actions</th>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="body" let-item>
          <tr>
            <td>
              <div class="flex items-center">
                @if (item.product?.imageUrl) {
                  <img [src]="item.product.imageUrl" 
                       [alt]="item.product.name"
                       class="w-10 h-10 rounded-lg object-cover mr-3" />
                } @else {
                  <div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-3">
                    <i class="pi pi-image text-gray-400"></i>
                  </div>
                }
                <div>
                  <div class="font-semibold">{{ item.product.name }}</div>
                  <div class="text-sm text-gray-500">{{ item.product.category?.name || 'N/A' }}</div>
                </div>
              </div>
            </td>
            <td>{{ item.product.sku || 'N/A' }}</td>
            <td>{{ item.store.name || 'N/A' }}</td>
            <td>
              <div class="space-y-1">
                <div class="font-semibold">{{ item.quantity }}</div>
                <div class="flex items-center text-xs text-gray-500">
                  <span class="mr-2">Min: {{ item.minStock }}</span>
                  <span>Max: {{ item.maxStock }}</span>
                </div>
                <p-progressBar [value]="getStockPercentage(item)" 
                               [showValue]="false"
                               [styleClass]="getProgressBarClass(item)">
                </p-progressBar>
              </div>
            </td>
            <td>
              <p-tag [value]="getStatusLabel(item.stockStatus)" 
                     [severity]="getStatusSeverity(item.stockStatus)" />
              @if (item.lowStock) {
                <p-tag value="Faible" severity="warn" class="ml-1" />
              }
              @if (item.outOfStock) {
                <p-tag value="Rupture" severity="danger" class="ml-1" />
              }
              @if (item.overStock) {
                <p-tag value="Excédent" severity="info" class="ml-1" />
              }
            </td>
            <td class="font-semibold">{{ item.sellingPrice | currency:'EUR':'symbol':'1.2-2' }}</td>
            <td class="font-semibold">{{ item.totalValue | currency:'EUR':'symbol':'1.2-2' }}</td>
            <td>
              <div class="flex gap-2">
                <button pButton 
                        icon="pi pi-eye" 
                        class="p-button-rounded p-button-info p-button-text"
                        [routerLink]="['/inventory', item.inventoryId]">
                </button>
                
                @if (canManageInventory()) {
                  <button pButton 
                          icon="pi pi-plus" 
                          class="p-button-rounded p-button-success p-button-text"
                          (click)="restockItem(item)"
                          [disabled]="loading()">
                  </button>
                  
                  <button pButton 
                          icon="pi pi-pencil" 
                          class="p-button-rounded p-button-warning p-button-text"
                          (click)="editItem(item)"
                          [disabled]="loading()">
                  </button>
                  
                  <button pButton 
                          icon="pi pi-truck" 
                          class="p-button-rounded p-button-help p-button-text"
                          (click)="transferItem(item)"
                          [disabled]="loading()">
                  </button>
                }
              </div>
            </td>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="text-center p-6">
              <div class="text-500">
                @if (loading()) {
                  <p class="text-lg">Chargement en cours...</p>
                } @else {
                  <p class="text-lg">Aucun article d'inventaire trouvé</p>
                }
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Low Stock Dialog -->
      <p-dialog header="Produits en stock faible" 
                [(visible)]="showLowStock" 
                [modal]="true" 
                [style]="{ width: '800px' }">
        <div class="space-y-3">
          @for (item of lowStockItems(); track item.inventoryId) {
            <div class="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i class="pi pi-exclamation-triangle text-orange-500 text-xl mr-3"></i>
                  <div>
                    <div class="font-semibold">{{ item.product.name }}</div>
                    <div class="text-sm text-gray-500">
                      {{ item.store.name }} • Stock actuel: {{ item.quantity }} • Point de réapprovisionnement: {{ item.reorderPoint }}
                    </div>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button pButton 
                          icon="pi pi-plus" 
                          label="Réapprovisionner" 
                          class="p-button-outlined p-button-sm"
                          (click)="restockItem(item)">
                  </button>
                  <button pButton 
                          icon="pi pi-eye" 
                          class="p-button-text p-button-sm"
                          [routerLink]="['/inventory', item.inventoryId]">
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
        <ng-template pTemplate="footer">
          <button pButton 
                  label="Fermer" 
                  class="p-button-outlined"
                  (click)="showLowStock = false">
          </button>
        </ng-template>
      </p-dialog>

      <!-- Out of Stock Dialog -->
      <p-dialog header="Produits en rupture de stock" 
                [(visible)]="showOutOfStock" 
                [modal]="true" 
                [style]="{ width: '800px' }">
        <div class="space-y-3">
          @for (item of outOfStockItems(); track item.inventoryId) {
            <div class="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <i class="pi pi-times-circle text-red-500 text-xl mr-3"></i>
                  <div>
                    <div class="font-semibold">{{ item.product.name }}</div>
                    <div class="text-sm text-gray-500">
                      {{ item.store.name }} • Dernière date de réapprovisionnement: {{ item.lastRestocked | date:'dd/MM/yyyy' }}
                    </div>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button pButton 
                          icon="pi pi-plus" 
                          label="Réapprovisionner urgemment" 
                          class="p-button-danger p-button-sm"
                          (click)="restockItem(item)">
                  </button>
                  <button pButton 
                          icon="pi pi-eye" 
                          class="p-button-text p-button-sm"
                          [routerLink]="['/inventory', item.inventoryId]">
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
        <ng-template pTemplate="footer">
          <button pButton 
                  label="Fermer" 
                  class="p-button-outlined"
                  (click)="showOutOfStock = false">
          </button>
        </ng-template>
      </p-dialog>
    </div>
  `
})
export class InventoryListComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals from service
  inventoryItems = this.inventoryService.inventoryItems;
  loading = this.inventoryService.loading;
  total = this.inventoryService.total;
  pageSize = this.inventoryService.pageSize;
  lowStockItems = this.inventoryService.lowStockItems;
  outOfStockItems = this.inventoryService.outOfStockItems;
  overStockItems = this.inventoryService.overStockItems;

  // Local signals
  searchTerm = '';
  selectedStockStatus: StockStatus | null = null;
  selectedAlertType: string | null = null;

  showLowStock = false;
  showOutOfStock = false;

  // Options
  statusOptions = [
    { label: 'En stock', value: StockStatus.IN_STOCK },
    { label: 'Stock faible', value: StockStatus.LOW_STOCK },
    { label: 'Rupture de stock', value: StockStatus.OUT_OF_STOCK },
    { label: 'Stock excédentaire', value: StockStatus.OVER_STOCK },
   // { label: 'Discontinué', value: StockStatus.DISCONTINUED }
  ];

  alertOptions = [
    { label: 'Stock faible', value: 'low' },
    { label: 'Rupture de stock', value: 'out' },
    { label: 'Stock excédentaire', value: 'over' }
  ];

  ngOnInit() {
    this.loadInventory();
  }

  // Computed
  totalValue = () => {
    return this.inventoryItems().reduce((sum, item) => sum + item.totalValue, 0);
  };

  // Permission checks
  canManageInventory(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER]);
  }

  // UI Helpers
  getStockPercentage(item: any): number {
    if (item.maxStock === 0) return 0;
    return Math.min((item.quantity / item.maxStock) * 100, 100);
  }

  getProgressBarClass(item: any): string {
    if (item.outOfStock) return 'p-progressbar-danger';
    if (item.lowStock) return 'p-progressbar-warning';
    if (item.overStock) return 'p-progressbar-help';
    return 'p-progressbar-success';
  }

  getStatusLabel(status: StockStatus): string {
    switch (status) {
      case StockStatus.IN_STOCK: return 'En stock';
      case StockStatus.LOW_STOCK: return 'Stock faible';
      case StockStatus.OUT_OF_STOCK: return 'Rupture';
      case StockStatus.OVER_STOCK: return 'Excédent';
      case StockStatus.DISCONTINUED: return 'Discontinué';
      default: return status;
    }
  }

  getStatusSeverity(status: StockStatus): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
    switch (status) {
      case StockStatus.IN_STOCK: return 'success';
      case StockStatus.LOW_STOCK: return 'warn';
      case StockStatus.OUT_OF_STOCK: return 'danger';
      case StockStatus.OVER_STOCK: return 'info';
      case StockStatus.DISCONTINUED: return 'secondary';
      default: return 'info';
    }
  }

  // Event Handlers
  loadInventory() {
    const filters: any = {};
    
    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.selectedStockStatus) filters.stockStatus = this.selectedStockStatus;
    if (this.selectedAlertType) {
      if (this.selectedAlertType === 'low') filters.lowStock = true;
      if (this.selectedAlertType === 'out') filters.outOfStock = true;
      if (this.selectedAlertType === 'over') filters.overStock = true;
    }

    this.inventoryService.loadInventory(1, this.pageSize(), filters);
  }

  onFilterChange() {
    this.loadInventory();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedStockStatus = null;
    this.selectedAlertType = null;
    this.loadInventory();
  }

  onLazyLoad(event: any) {
    const page = (event.first / event.rows) + 1;
    this.inventoryService.setPage(page);
    this.inventoryService.setPageSize(event.rows);
  }

  // Operations
  refresh() {
    this.loadInventory();
  }

  restockItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'restock']);
  }

  editItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'edit']);
  }

  transferItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'transfer']);
  }

  generateReport() {
    this.inventoryService.generateReport().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport-inventaire-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Rapport généré avec succès'
        });
      }
    });
  }
}