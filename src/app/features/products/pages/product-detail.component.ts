// product-detail.component.ts - Show Product Details
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
import { Product, EmployeeRole } from "../../../core/models";
import { XafPipe } from "../../../core/pipes/xaf-currency-pipe";
import { AuthService } from "../../../core/services/auth.service";
import { ProductsService } from "../../../core/services/products.service";


@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
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
    XafPipe
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
                    [routerLink]="['/products']">
            </button>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ product()?.name || 'Chargement...' }}</h1>
          </div>
          <p class="text-gray-600 dark:text-gray-400 ml-12">
            SKU: <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ product()?.sku || 'N/A' }}</code>
          </p>
        </div>
        
        <div class="flex gap-2">
          @if (canEdit()) {
            <button pButton 
                    icon="pi pi-pencil" 
                    label="Modifier"
                    class="p-button-warning"
                    [routerLink]="['/products', productId(), 'edit']">
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
      } @else if (product()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Product Image & Quick Info -->
          <div class="lg:col-span-1 space-y-6">
            <p-card styleClass="overflow-hidden">
              @if (product()?.imageUrl) {
                <img [src]="product()?.imageUrl" 
                     [alt]="product()?.name"
                     class="w-full h-64 object-cover rounded-lg">
              } @else {
                <div class="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <i class="pi pi-image text-6xl text-gray-400"></i>
                </div>
              }
              
              <div class="mt-4 flex flex-wrap gap-2">
                <p-tag [value]="product()?.inStock ? 'En stock' : 'Rupture'"
                       [severity]="product()?.inStock ? 'success' : 'danger'"
                       icon="pi pi-box">
                </p-tag>
                <p-tag [value]="product()?.isActive ? 'Actif' : 'Inactif'"
                       [severity]="product()?.isActive ? 'info' : 'warn'"
                       icon="pi pi-power-off">
                </p-tag>
                <p-tag [value]="product()?.categoryName"
                       severity="secondary"
                       icon="pi pi-tag">
                </p-tag>
              </div>
            </p-card>

            <!-- Stock Status Card -->
            <p-card header="État du stock">
              <div class="text-center mb-4">
                <div class="text-5xl font-bold mb-2" [class.text-green-500]="stockStatus() === 'ok'" [class.text-yellow-500]="stockStatus() === 'low'" [class.text-red-500]="stockStatus() === 'out'">
                  {{ product()?.quantity || 0 }}
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
                  <div class="font-semibold">{{ product()?.minStock || 0 }}</div>
                  <div class="text-gray-500">Min</div>
                </div>
                <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div class="font-semibold">{{ product()?.maxStock || 0 }}</div>
                  <div class="text-gray-500">Max</div>
                </div>
                <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div class="font-semibold">{{ product()?.totalStock || 0 }}</div>
                  <div class="text-gray-500">Total</div>
                </div>
              </div>

              @if (canEdit()) {
                <div class="mt-4 pt-4 border-t">
                  <button pButton 
                          icon="pi pi-plus" 
                          label="Ajuster le stock"
                          class="p-button-outlined w-full"
                          [routerLink]="['/products', productId(), 'stock']">
                  </button>
                </div>
              }
            </p-card>

            <!-- Pricing Card -->
            <p-card header="Tarification">
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-gray-500">Prix de vente</span>
                  <span class="text-2xl font-bold text-green-600">{{ product()?.price | xaf }}</span>
                </div>
                
                @if (product()?.costPrice) {
                  <div class="flex justify-between items-center">
                    <span class="text-gray-500">Prix d'achat</span>
                    <span class="font-medium">{{ product()?.costPrice | xaf }}</span>
                  </div>
                  
                  <div class="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <span class="text-green-700 dark:text-green-300">Marge</span>
                    <span class="font-bold text-green-700 dark:text-green-300">{{ margin() | xaf }} ({{ marginPercent() }}%)</span>
                  </div>
                }
                
                @if (product()?.taxRate) {
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-500">TVA ({{ product()?.taxRate }}%)</span>
                    <span>{{ calculeTaxe() | xaf }}</span>
                  </div>
                }
              </div>
            </p-card>
          </div>

          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Description Card -->
            <p-card header="Description">
              <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                {{ product()?.description || 'Aucune description disponible' }}
              </p>
              
              <p-divider />
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div class="text-gray-500 mb-1">Code-barres</div>
                  <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ product()?.barcode || 'N/A' }}</code>
                </div>
                <div>
                  <div class="text-gray-500 mb-1">Créé le</div>
                  <div>{{ product()?.createdAt | date:'dd/MM/yyyy' }}</div>
                </div>
                <div>
                  <div class="text-gray-500 mb-1">Dernière modif</div>
                  <div>{{ product()?.updatedAt | date:'dd/MM/yyyy' }}</div>
                </div>
                <div>
                  <div class="text-gray-500 mb-1">ID Produit</div>
                  <code class="text-xs">{{ product()?.productId }}</code>
                </div>
              </div>
            </p-card>

            <!-- Sales Chart -->
            <p-card header="Ventes des 30 derniers jours">
              @if (salesChartData()) {
                <p-chart type="line" [data]="salesChartData()" [options]="chartOptions" height="300px" />
              } @else {
                <div class="flex items-center justify-center h-[300px] text-gray-500">
                  <div class="text-center">
                    <i class="pi pi-chart-line text-4xl mb-3"></i>
                    <p>Aucune donnée de vente disponible</p>
                  </div>
                </div>
              }
            </p-card>

            <!-- Recent Movements -->
            <p-card header="Mouvements récents">
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
                             [severity]="movement.type === 'IN' ? 'success' : 'danger'"
                             icon="{{ movement.type === 'IN' ? 'pi pi-arrow-down' : 'pi pi-arrow-up' }}">
                      </p-tag>
                    </td>
                    <td [class.text-green-600]="movement.type === 'IN'" [class.text-red-600]="movement.type === 'OUT'">
                      {{ movement.type === 'IN' ? '+' : '-' }}{{ movement.quantity }}
                    </td>
                    <td>{{ movement.user }}</td>
                    <td>{{ movement.notes || '-' }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr>
                    <td colspan="5" class="text-center p-4 text-gray-500">
                      Aucun mouvement récent
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </p-card>

            <!-- Inventory by Store -->
            @if (inventoryByStore().length > 0) {
              <p-card header="Inventaire par magasin">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (inv of inventoryByStore(); track inv.storeId) {
                    <div class="p-4 border rounded-lg">
                      <div class="flex justify-between items-start mb-2">
                        <div>
                          <div class="font-semibold">{{ inv.storeName }}</div>
                          <div class="text-sm text-gray-500">{{ inv.storeType }}</div>
                        </div>
                        <p-badge [value]="inv.quantity.toString()" severity="info"></p-badge>
                      </div>
                      <p-progressBar [value]="inv.percentage" [showValue]="false" styleClass="h-2"></p-progressBar>
                    </div>
                  }
                </div>
              </p-card>
            }
          </div>
        </div>
      } @else {
        <div class="text-center py-12">
          <i class="pi pi-exclamation-circle text-6xl text-gray-400 mb-4"></i>
          <h2 class="text-2xl font-bold text-gray-700 mb-2">Produit non trouvé</h2>
          <p class="text-gray-500 mb-4">Le produit que vous recherchez n'existe pas ou a été supprimé</p>
          <button pButton label="Retour à la liste" icon="pi pi-arrow-left" [routerLink]="['/products']"></button>
        </div>
      }
    </div>
  `
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  productId = signal<string | null>(null);
  product = signal<Product | null>(null);
  loading = signal(true);
  
  // Chart data
  salesChartData = signal<any>(null);
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v: number) => `€${v}` } }
    }
  };

  // Mock data - replace with actual API calls
  stockMovements = signal<any[]>([]);
  inventoryByStore = signal<any[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productId.set(id);
      this.loadProduct(id);
      this.loadProductHistory(id);
      this.loadSalesData(id);
    } else {
      this.loading.set(false);
    }
  }

  loadProduct(id: string) {
    this.loading.set(true);
    this.productsService.getProductById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadProductHistory(id: string) {
    this.productsService.getProductHistory(id).subscribe({
      next: (history) => {
        this.stockMovements.set(history || []);
      },
      error: () => {
        this.stockMovements.set([]);
      }
    });
  }

  loadSalesData(id: string) {
    // Mock sales data - replace with actual API
    const labels = Array.from({length: 30}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    });
    
    const data = Array.from({length: 30}, () => Math.floor(Math.random() * 50));
    
    this.salesChartData.set({
      labels,
      datasets: [{
        label: 'Ventes',
        data,
        fill: true,
        borderColor: '#42A5F5',
        backgroundColor: 'rgba(66, 165, 245, 0.1)',
        tension: 0.4
      }]
    });
  }

  stockStatus(): 'ok' | 'low' | 'out' {
    const qty = this.product()?.quantity || 0;
    const min = this.product()?.minStock || 0;
    if (qty <= 0) return 'out';
    if (qty <= min) return 'low';
    return 'ok';
  }

  stockPercentage(): number {
    const qty = this.product()?.quantity || 0;
    const max = this.product()?.maxStock || 100;
    return Math.min((qty / max) * 100, 100);
  }

  stockProgressClass(): string {
    const status = this.stockStatus();
    return status === 'ok' ? 'p-progressbar-success' : status === 'low' ? 'p-progressbar-warning' : 'p-progressbar-danger';
  }

  margin(): number {
    const price = this.product()?.price || 0;
    const cost = this.product()?.costPrice || 0;
    return price - cost;
  }

  marginPercent(): number {
    const price = this.product()?.price || 0;
    const cost = this.product()?.costPrice || 0;
    if (cost === 0) return 0;
    return Math.round(((price - cost) / cost) * 100);
  }

  canEdit(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER]);
  }

  calculeTaxe(): number {
    const price = this.product()?.price || 0;
    const taxRate = this.product()?.taxRate || 0;
    return price * taxRate / 100;
  }

  confirmDelete() {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.',
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.productsService.deleteProduct(this.productId()!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Produit supprimé avec succès'
            });
            this.router.navigate(['/products']);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de la suppression du produit'
            });
          }
        });
      }
    });
  }
}