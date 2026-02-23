// inventory-detail.component.ts - Show Inventory Details
import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MessageService, ConfirmationService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { TagModule } from "primeng/tag";
import { DividerModule } from "primeng/divider";
import { TimelineModule } from "primeng/timeline";
import { TableModule } from "primeng/table";
import { ChartModule } from "primeng/chart";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { SkeletonModule } from "primeng/skeleton";
import { TooltipModule } from "primeng/tooltip";
import { BadgeModule } from "primeng/badge";
import { ProgressBarModule } from "primeng/progressbar";
import { DialogModule } from "primeng/dialog";
import { InputNumberModule } from "primeng/inputnumber";

import { InventoryService } from "../../../core/services/inventory.service";
import { AuthService } from "../../../core/services/auth.service";
import { Inventory, EmployeeRole, StockStatus, Store } from "../../../core/models";
import { XafPipe } from "../../../core/pipes/xaf-currency-pipe";
import { StoresService } from "../../../core/services/stores.service";
import { SelectModule } from "primeng/select";
import { TextareaModule } from "primeng/textarea";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    TagModule,
    DividerModule,
    TimelineModule,
    TableModule,
    ChartModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
    TooltipModule,
    BadgeModule,
    ProgressBarModule,
    DialogModule,
    InputNumberModule,
    TextareaModule,
    XafPipe,
    SelectModule
  ],
  template: `
    <div class="p-4 max-w-7xl mx-auto">
      <p-toast />
      <p-confirmDialog />
      
      <!-- Header -->
      <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <button pButton 
                    icon="pi pi-arrow-left" 
                    class="p-button-rounded p-button-text"
                    [routerLink]="['/inventory']">
            </button>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ inventoryItem()?.productName || 'Chargement...' }}</h1>
          </div>
          <p class="text-gray-600 dark:text-gray-400 ml-12">
            SKU: <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ inventoryItem()?.productSku || 'N/A' }}</code>
            | Magasin: {{ inventoryItem()?.storeName }}
          </p>
        </div>
        
        <div class="flex gap-2">
          @if (canEdit()) {
            <button pButton 
                    icon="pi pi-pencil" 
                    label="Modifier"
                    class="p-button-warning"
                    [routerLink]="['/inventory', inventoryId(), 'edit']">
            </button>
            
            <button pButton 
                    icon="pi pi-plus" 
                    label="Réapprovisionner"
                    class="p-button-success"
                    (click)="showRestockDialog = true">
            </button>
            
            <button pButton 
                    icon="pi pi-truck" 
                    label="Transférer"
                    class="p-button-help"
                    (click)="showTransferDialog = true">
            </button>
            
            <button pButton 
                    icon="pi pi-trash" 
                    label="Supprimer"
                    class="p-button-danger"
                    (click)="confirmDelete()">
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          @for (i of [1,2,3,4,5,6]; track i) {
            <p-skeleton height="300px" />
          }
        </div>
      } @else if (inventoryItem()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Product Info -->
          <div class="lg:col-span-1 space-y-6">
            <p-card styleClass="overflow-hidden">
              @if (inventoryItem()?.productImageUrl) {
                <img [src]="inventoryItem()?.productImageUrl" 
                     [alt]="inventoryItem()?.productName"
                     class="w-full h-64 object-cover rounded-lg">
              } @else {
                <div class="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <i class="pi pi-image text-6xl text-gray-400"></i>
                </div>
              }
              
              <div class="mt-4 flex flex-wrap gap-2">
                <p-tag [value]="getStockStatusLabel(inventoryItem()?.stockStatus)"
                       [severity]="getStockStatusSeverity(inventoryItem()?.stockStatus)"
                       icon="pi pi-box">
                </p-tag>
                <p-tag [value]="inventoryItem()?.isActive ? 'Actif' : 'Inactif'"
                       [severity]="inventoryItem()?.isActive ? 'info' : 'warn'"
                       icon="pi pi-power-off">
                </p-tag>
                <p-tag [value]="inventoryItem()?.storeType"
                       severity="secondary"
                       icon="pi pi-building">
                </p-tag>
              </div>
            </p-card>

            <!-- Stock Status Card -->
            <p-card header="État du Stock">
              <div class="text-center mb-4">
                <div class="text-5xl font-bold mb-2" 
                     [class.text-green-500]="stockStatus() === 'ok'"
                     [class.text-yellow-500]="stockStatus() === 'low'"
                     [class.text-red-500]="stockStatus() === 'out'"
                     [class.text-blue-500]="stockStatus() === 'over'">
                  {{ inventoryItem()?.quantity || 0 }}
                </div>
                <div class="text-gray-500">unités disponibles</div>
              </div>
              
              <p-progressBar [value]="stockPercentage()" 
                             [showValue]="true"
                             [class]="stockProgressClass()"
                             styleClass="mb-4">
              </p-progressBar>
              
              <div class="grid grid-cols-3 gap-2 text-center text-sm">
                <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div class="font-semibold">{{ inventoryItem()?.minStock || 0 }}</div>
                  <div class="text-gray-500">Min</div>
                </div>
                <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div class="font-semibold">{{ inventoryItem()?.reorderPoint || 0 }}</div>
                  <div class="text-gray-500">Alerte</div>
                </div>
                <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div class="font-semibold">{{ inventoryItem()?.maxStock || 0 }}</div>
                  <div class="text-gray-500">Max</div>
                </div>
              </div>

              @if (inventoryItem()?.isLowStock) {
                <div class="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded">
                  <div class="flex items-center">
                    <i class="pi pi-exclamation-triangle text-orange-500 mr-2"></i>
                    <span class="text-orange-700 dark:text-orange-300 text-sm">Stock faible - Réapprovisionnement recommandé</span>
                  </div>
                </div>
              }
              
              @if (inventoryItem()?.isOutOfStock) {
                <div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
                  <div class="flex items-center">
                    <i class="pi pi-times-circle text-red-500 mr-2"></i>
                    <span class="text-red-700 dark:text-red-300 text-sm font-medium">RUPTURE DE STOCK - Action urgente requise</span>
                  </div>
                </div>
              }
            </p-card>

            <!-- Pricing Card -->
            <p-card header="Informations Financières">
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-gray-500">Coût unitaire</span>
                  <span class="font-medium">{{ inventoryItem()?.unitCost | xaf }}</span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-gray-500">Prix de vente</span>
                  <span class="font-medium">{{ inventoryItem()?.sellingPrice | xaf }}</span>
                </div>
                
                @if (margin() > 0) {
                  <div class="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span class="text-green-700 dark:text-green-300">Marge</span>
                    <span class="font-bold text-green-700 dark:text-green-300">{{ margin() | xaf }} ({{ marginPercent() }}%)</span>
                  </div>
                }
                
                <p-divider />
                
                <div class="flex justify-between items-center">
                  <span class="text-gray-500">Valeur totale du stock</span>
                  <span class="text-xl font-bold text-green-600">{{ inventoryItem()?.totalValue | xaf }}</span>
                </div>
              </div>
            </p-card>
          </div>

          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Quick Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="surface-card p-4 shadow-2 rounded text-center">
                <div class="text-3xl font-bold text-blue-500">{{ stockMovements().length }}</div>
                <div class="text-sm text-gray-500">Mouvements</div>
              </div>
              <div class="surface-card p-4 shadow-2 rounded text-center">
                <div class="text-3xl font-bold text-green-500">{{ totalInbound() }}</div>
                <div class="text-sm text-gray-500">Entrées</div>
              </div>
              <div class="surface-card p-4 shadow-2 rounded text-center">
                <div class="text-3xl font-bold text-orange-500">{{ totalOutbound() }}</div>
                <div class="text-sm text-gray-500">Sorties</div>
              </div>
              <div class="surface-card p-4 shadow-2 rounded text-center">
                <div class="text-3xl font-bold text-purple-500">{{ avgDailyUsage() }}</div>
                <div class="text-sm text-gray-500">Conso. jour</div>
              </div>
            </div>

            <!-- Stock Movements -->
            <p-card header="Historique des Mouvements">
              <p-table [value]="stockMovements()" [paginator]="true" [rows]="5" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Quantité</th>
                    <th>Utilisateur</th>
                    <th>Notes</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-movement>
                  <tr>
                    <td>{{ movement.date | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>
                      <p-tag [value]="movement.type" 
                             [severity]="movement.type === 'IN' ? 'success' : movement.type === 'OUT' ? 'danger' : 'info'"
                             icon="{{ movement.type === 'IN' ? 'pi pi-arrow-down' : movement.type === 'OUT' ? 'pi pi-arrow-up' : 'pi pi-refresh' }}">
                      </p-tag>
                    </td>
                    <td [class.text-green-600]="movement.type === 'IN'" [class.text-red-600]="movement.type === 'OUT'">
                      {{ movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : '' }}{{ movement.quantity }}
                    </td>
                    <td>{{ movement.user }}</td>
                    <td>{{ movement.notes || '-' }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr>
                    <td colspan="5" class="text-center p-4 text-gray-500">
                      Aucun mouvement enregistré
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </p-card>

            <!-- Stock Chart -->
            <p-card header="Évolution du Stock (30 derniers jours)">
              @if (stockChartData()) {
                <p-chart type="line" [data]="stockChartData()" [options]="chartOptions" height="300px" />
              } @else {
                <div class="flex items-center justify-center h-[300px] text-gray-500">
                  <div class="text-center">
                    <i class="pi pi-chart-line text-4xl mb-3"></i>
                    <p>Aucune donnée disponible</p>
                  </div>
                </div>
              }
            </p-card>

            <!-- Meta Info -->
            <p-card header="Informations Système">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                <div>
                  <div class="text-gray-400 mb-1">ID Inventaire</div>
                  <code class="text-xs">{{ inventoryItem()?.inventoryId }}</code>
                </div>
                <div>
                  <div class="text-gray-400 mb-1">ID Produit</div>
                  <code class="text-xs">{{ inventoryItem()?.productId }}</code>
                </div>
                <div>
                  <div class="text-gray-400 mb-1">Créé le</div>
                  <div>{{ inventoryItem()?.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                </div>
                <div>
                  <div class="text-gray-400 mb-1">Modifié le</div>
                  <div>{{ inventoryItem()?.updatedAt | date:'dd/MM/yyyy HH:mm' }}</div>
                </div>
              </div>
              
              @if (inventoryItem()?.notes) {
                <p-divider />
                <div>
                  <div class="text-gray-400 mb-1">Notes</div>
                  <p class="text-gray-700 dark:text-gray-300">{{ inventoryItem()?.notes }}</p>
                </div>
              }
            </p-card>
          </div>
        </div>
      } @else {
        <div class="text-center py-12">
          <i class="pi pi-exclamation-circle text-6xl text-gray-400 mb-4"></i>
          <h2 class="text-2xl font-bold text-gray-700 mb-2">Article non trouvé</h2>
          <p class="text-gray-500 mb-4">L'article d'inventaire que vous recherchez n'existe pas ou a été supprimé</p>
          <button pButton label="Retour à la liste" icon="pi pi-arrow-left" [routerLink]="['/inventory']"></button>
        </div>
      }
    </div>

    <!-- Restock Dialog -->
    <p-dialog header="Réapprovisionnement" [(visible)]="showRestockDialog" [modal]="true" [style]="{ width: '400px' }">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Quantité à ajouter</label>
          <p-inputNumber [(ngModel)]="restockQuantity" [min]="1" [showButtons]="true" class="w-full"></p-inputNumber>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Coût unitaire (€)</label>
          <p-inputNumber [(ngModel)]="restockUnitCost" mode="currency" currency="EUR" locale="fr-FR" class="w-full"></p-inputNumber>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Notes</label>
          <textarea pInputTextarea [(ngModel)]="restockNotes" rows="3" class="w-full"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton label="Annuler" class="p-button-outlined" (click)="showRestockDialog = false"></button>
        <button pButton label="Réapprovisionner" class="p-button-success" (click)="executeRestock()" [disabled]="restockQuantity <= 0"></button>
      </ng-template>
    </p-dialog>

    <!-- Transfer Dialog -->
    <p-dialog header="Transfert de Stock" [(visible)]="showTransferDialog" [modal]="true" [style]="{ width: '400px' }">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Magasin destination</label>
          <p-select [options]="availableStores()" [(ngModel)]="transferStoreId" optionLabel="name" optionValue="storeId" placeholder="Sélectionner un magasin" class="w-full"></p-select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Quantité à transférer</label>
          <p-inputNumber [(ngModel)]="transferQuantity" [min]="1" [max]="inventoryItem()?.quantity" [showButtons]="true" class="w-full"></p-inputNumber>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Notes</label>
          <textarea pTextarea [(ngModel)]="transferNotes" rows="3" class="w-full"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton label="Annuler" class="p-button-outlined" (click)="showTransferDialog = false"></button>
        <button pButton label="Transférer" class="p-button-help" (click)="executeTransfer()" [disabled]="!transferStoreId || transferQuantity <= 0"></button>
      </ng-template>
    </p-dialog>
  `
})
export class InventoryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private storesService = inject(StoresService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  inventoryId = signal<string | null>(null);
  inventoryItem = signal<Inventory | null>(null);
  loading = signal(true);

  // Dialog states
  showRestockDialog = false;
  showTransferDialog = false;

  // Restock data
  restockQuantity = 10;
  restockUnitCost = 0;
  restockNotes = '';

  // Transfer data
  transferStoreId = '';
  transferQuantity = 1;
  transferNotes = '';
  availableStores = signal<Store[]>([]);

  // Chart data
  stockChartData = signal<any>(null);
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true }
    }
  };

  // Mock data
  stockMovements = signal<any[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.inventoryId.set(id);
      this.loadInventoryItem(id);
      this.loadStores();
    } else {
      this.loading.set(false);
    }
  }

  loadInventoryItem(id: string) {
    this.loading.set(true);
    this.inventoryService.getInventoryItemById(id).subscribe({
      next: (item) => {
        this.inventoryItem.set(item);
        this.restockUnitCost = item.unitCost || 0;
        this.loadHistory(id);
        this.loadChartData();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadStores() {
    this.storesService.loadStores(1, 100).subscribe({
      next: (response) => {
        // Filter out current store
        const currentStoreId = this.inventoryItem()?.storeId;
        this.availableStores.set((response.items || []).filter(s => s.storeId !== currentStoreId));
      }
    });
  }

  loadHistory(id: string) {
    this.inventoryService.getHistory(id).subscribe({
      next: (history) => {
        this.stockMovements.set(history || []);
      },
      error: () => {
        this.stockMovements.set([]);
      }
    });
  }

  loadChartData() {
    // Mock chart data
    const labels = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    });

    const data = Array.from({ length: 30 }, () =>
      Math.floor(Math.random() * 50) + (this.inventoryItem()?.quantity || 0) - 25
    );

    this.stockChartData.set({
      labels,
      datasets: [{
        label: 'Niveau de stock',
        data,
        fill: true,
        borderColor: '#42A5F5',
        backgroundColor: 'rgba(66, 165, 245, 0.1)',
        tension: 0.4
      }]
    });
  }

  stockStatus(): 'ok' | 'low' | 'out' | 'over' {
    const item = this.inventoryItem();
    if (!item) return 'ok';
    if (item.isOutOfStock) return 'out';
    if (item.isLowStock) return 'low';
    if (item.isOverStock) return 'over';
    return 'ok';
  }

  stockPercentage(): number {
    const item = this.inventoryItem();
    if (!item || !item.maxStock || item.maxStock === 0) return 0;
    return Math.min((item.quantity / item.maxStock) * 100, 100);
  }

  stockProgressClass(): string {
    const status = this.stockStatus();
    return status === 'ok' ? 'p-progressbar-success' :
      status === 'low' ? 'p-progressbar-warning' :
        status === 'out' ? 'p-progressbar-danger' : 'p-progressbar-info';
  }

  margin(): number {
    const item = this.inventoryItem();
    if (!item) return 0;
    return (item.sellingPrice || 0) - (item.unitCost || 0);
  }

  marginPercent(): number {
    const item = this.inventoryItem();
    if (!item || !item.unitCost || item.unitCost === 0) return 0;
    return Math.round(((item.sellingPrice || 0) - item.unitCost) / item.unitCost * 100);
  }

  totalInbound(): number {
    return this.stockMovements()
      .filter(m => m.type === 'IN')
      .reduce((sum, m) => sum + m.quantity, 0);
  }

  totalOutbound(): number {
    return this.stockMovements()
      .filter(m => m.type === 'OUT')
      .reduce((sum, m) => sum + m.quantity, 0);
  }

  avgDailyUsage(): number {
    return Math.round(this.totalOutbound() / 30 * 10) / 10;
  }

  getStockStatusLabel(status?: StockStatus): string {
    switch (status) {
      case StockStatus.IN_STOCK: return 'En stock';
      case StockStatus.LOW_STOCK: return 'Stock faible';
      case StockStatus.OUT_OF_STOCK: return 'Rupture';
      case StockStatus.OVER_STOCK: return 'Excédent';
      default: return 'Inconnu';
    }
  }

  getStockStatusSeverity(status?: StockStatus): any {
    switch (status) {
      case StockStatus.IN_STOCK: return 'success';
      case StockStatus.LOW_STOCK: return 'warn';
      case StockStatus.OUT_OF_STOCK: return 'danger';
      case StockStatus.OVER_STOCK: return 'info';
      default: return 'info';
    }
  }

  executeRestock() {
    this.inventoryService.restock(
      this.inventoryId()!,
      this.restockQuantity,
      this.restockUnitCost,
      this.restockNotes
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Réapprovisionnement effectué avec succès'
        });
        this.showRestockDialog = false;
        this.loadInventoryItem(this.inventoryId()!);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du réapprovisionnement'
        });
      }
    });
  }

  executeTransfer() {
    this.inventoryService.transfer(
      this.inventoryId()!,
      this.transferStoreId,
      this.transferQuantity,
      this.transferNotes
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Transfert effectué avec succès'
        });
        this.showTransferDialog = false;
        this.loadInventoryItem(this.inventoryId()!);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du transfert'
        });
      }
    });
  }

  canEdit(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER]);
  }

  confirmDelete() {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer cet article d\'inventaire ?',
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.inventoryService.deleteInventoryItem(this.inventoryId()!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Article supprimé avec succès'
            });
            this.router.navigate(['/inventory']);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de la suppression'
            });
          }
        });
      }
    });
  }
}