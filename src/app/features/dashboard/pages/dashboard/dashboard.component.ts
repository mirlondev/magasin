// dashboard.component.ts
import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { BadgeModule } from "primeng/badge";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ChartModule } from "primeng/chart";
import { ProgressBarModule } from "primeng/progressbar";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { SkeletonModule } from "primeng/skeleton";
import { EmployeeRole } from "../../../../core/models";
import { AuthService } from "../../../../core/services/auth.service";
import { DashboardService } from "../../../../core/services/dashboard.service";
import { PosPermissionService } from "../../../../core/services/pos-permission.service";
import { ShiftReportsService } from "../../../../core/services/shift-reports.service";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    ChartModule,
    TableModule,
    TagModule,
    BadgeModule,
    ProgressBarModule,
    SkeletonModule
  ],
  template: `
    <div class="p-4">
      <!-- Loading State -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          @for (i of [1,2,3,4]; track i) {
            <p-card>
              <p-skeleton width="100%" height="120px" />
            </p-card>
          }
        </div>
      }

      <!-- Dashboard Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Bonjour, {{ userName() }} 👋
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Voici ce qui se passe dans votre système aujourd'hui
        </p>
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Sales -->
        <p-card class="shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-500 font-medium">Ventes totales</div>
              <div class="text-900 text-3xl font-bold">{{ stats().totalSales | currency:'EUR':'symbol':'1.2-2' }}</div>
              <div class="text-500 text-sm mt-1">Période en cours</div>
            </div>
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <i class="pi pi-euro text-2xl text-blue-600 dark:text-blue-300"></i>
            </div>
          </div>
          <div class="mt-4">
            <div class="flex items-center text-sm" [class.text-green-500]="stats().salesGrowth >= 0" [class.text-red-500]="stats().salesGrowth < 0">
              <i class="pi mr-2" [class.pi-arrow-up]="stats().salesGrowth >= 0" [class.pi-arrow-down]="stats().salesGrowth < 0"></i>
              <span class="font-semibold">{{ abs(stats().salesGrowth) | number:'1.1-1' }}%</span>
              <span class="text-500 ml-2">vs période précédente</span>
            </div>
          </div>
        </p-card>

        <!-- Total Orders -->
        <p-card class="shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-500 font-medium">Commandes</div>
              <div class="text-900 text-3xl font-bold">{{ stats().totalOrders }}</div>
              <div class="text-500 text-sm mt-1">Période en cours</div>
            </div>
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <i class="pi pi-shopping-cart text-2xl text-green-600 dark:text-green-300"></i>
            </div>
          </div>
          <div class="mt-4">
            <div class="flex items-center text-sm" [class.text-green-500]="stats().orderGrowth >= 0" [class.text-red-500]="stats().orderGrowth < 0">
              <i class="pi mr-2" [class.pi-arrow-up]="stats().orderGrowth >= 0" [class.pi-arrow-down]="stats().orderGrowth < 0"></i>
              <span class="font-semibold">{{ abs(stats().orderGrowth) | number:'1.1-1' }}%</span>
              <span class="text-500 ml-2">vs période précédente</span>
            </div>
          </div>
        </p-card>

        <!-- Low Stock Products -->
        <p-card class="shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-500 font-medium">Alertes stock</div>
              <div class="text-900 text-3xl font-bold">{{ stats().lowStockCount }}</div>
              <div class="text-500 text-sm mt-1">Produits concernés</div>
            </div>
            <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
              <i class="pi pi-exclamation-triangle text-2xl text-orange-600 dark:text-orange-300"></i>
            </div>
          </div>
          <div class="mt-4">
            <a [routerLink]="['/inventory']" 
               class="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center">
              Voir détails
              <i class="pi pi-arrow-right ml-1"></i>
            </a>
          </div>
        </p-card>

        <!-- Open Shifts -->
        <p-card class="shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-500 font-medium">Caisses ouvertes</div>
              <div class="text-900 text-3xl font-bold">{{ stats().openShifts }}</div>
              <div class="text-500 text-sm mt-1">Actuellement</div>
            </div>
            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <i class="pi pi-clock text-2xl text-purple-600 dark:text-purple-300"></i>
            </div>
          </div>
          <div class="mt-4">
            <a [routerLink]="['/shift-reports']" 
               class="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center">
              Gérer les caisses
              <i class="pi pi-arrow-right ml-1"></i>
            </a>
          </div>
        </p-card>
      </div>

      <!-- Charts and Tables -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Sales Chart -->
        <div>
          <p-card header="Évolution des ventes" class="shadow-lg">
            @if (salesChartData()) {
              <p-chart type="line" [data]="salesChartData()" [options]="chartOptions" height="300px" />
            } @else {
              <div class="flex items-center justify-center h-[300px] text-gray-500">
                Aucune donnée disponible
              </div>
            }
          </p-card>
        </div>

        <!-- Recent Orders -->
        <div>
          <p-card header="Commandes récentes" class="shadow-lg">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b">
                    <th class="pb-3">N° Commande</th>
                    <th class="pb-3">Client</th>
                    <th class="pb-3">Montant</th>
                    <th class="pb-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  @for (order of recentOrders(); track order.orderId) {
                    <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td class="py-3">
                        <a [routerLink]="['/orders', order.orderId]" 
                           class="text-primary-600 hover:text-primary-500 font-medium">
                          {{ order.orderNumber }}
                        </a>
                      </td>
                      <td class="py-3">{{ order.customerName || 'N/A' }}</td>
                      <td class="py-3 font-semibold">{{ order.totalAmount | currency:'EUR':'symbol':'1.2-2' }}</td>
                      <td class="py-3">
                        <p-tag [value]="getOrderStatusLabel(order.status)" 
                               [severity]="getOrderStatusSeverity(order.status)" />
                      </td>
                    </tr>
                  }
                  @empty {
                    <tr>
                      <td colspan="4" class="text-center py-8 text-gray-500">
                        Aucune commande récente
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="mt-4">
              <a [routerLink]="['/orders']" 
                 class="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center justify-center">
                Voir toutes les commandes
                <i class="pi pi-arrow-right ml-1"></i>
              </a>
            </div>
          </p-card>
        </div>

        <!-- Low Stock Products -->
        @if (lowStockProducts().length > 0) {
          <div>
            <p-card header="Produits en alerte de stock" class="shadow-lg">
              <div class="space-y-4">
                @for (product of lowStockProducts(); track product.productId) {
                  <div class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div class="flex items-center">
                      @if (product.imageUrl) {
                        <img [src]="product.imageUrl" 
                             [alt]="product.name"
                             class="w-12 h-12 rounded-lg object-cover mr-4" />
                      } @else {
                        <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-4">
                          <i class="pi pi-image text-gray-400"></i>
                        </div>
                      }
                      <div>
                        <div class="font-semibold">{{ product.name }}</div>
                        <div class="text-sm text-gray-500">SKU: {{ product.sku }}</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="font-semibold" [class.text-red-500]="product.quantity === 0" [class.text-orange-600]="product.quantity > 0 && product.quantity <= (product.minStock)">
                        {{ product.quantity }} unités
                      </div>
                      <div class="text-sm" [class.text-red-600]="product.quantity === 0" [class.text-orange-600]="product.quantity > 0">
                        <i class="pi pi-exclamation-triangle mr-1"></i>
                        {{ product.quantity === 0 ? 'Rupture' : 'Stock faible' }}
                      </div>
                    </div>
                  </div>
                }
              </div>
              <div class="mt-4">
                <a [routerLink]="['/inventory']" 
                   class="text-primary-600 hover:text-primary-500 text-sm font-medium flex items-center justify-center">
                  Gérer l'inventaire
                  <i class="pi pi-arrow-right ml-1"></i>
                </a>
              </div>
            </p-card>
          </div>
        }

        <!-- Quick Actions -->
        <div>
          <p-card header="Actions rapides" class="shadow-lg">
            <div class="grid grid-cols-2 gap-4">
              @if (canCreateOrder()) {
                <button pButton 
                        label="Nouvelle vente" 
                        icon="pi pi-plus" 
                        class="p-button-success w-full"
                        [routerLink]="['/orders/pos-sale/']">
                </button>
              }
              
              @if (canManageInventory()) {
                <button pButton 
                        label="Gérer inventaire" 
                        icon="pi pi-warehouse" 
                        class="p-button-help w-full"
                        [routerLink]="['/inventory']">
                </button>
              }
              
              @if (canManageCustomers()) {
                <button pButton 
                        label="Ajouter client" 
                        icon="pi pi-user-plus" 
                        class="p-button-info w-full"
                        [routerLink]="['/customers/new']">
                </button>
              }
              
              @if (canManageShifts()) {
                @if (openShift()) {
                  <button pButton 
                        label="Fermer caisse" 
                        icon="pi pi-calculator" 
                        class="p-button-warning w-full"
                        [routerLink]="['/shift-reports/close']">
                  </button>
                }
                @else {
                <button pButton 
                        label="Ouvrir caisse" 
                        icon="pi pi-calculator" 
                        class="p-button-warning w-full"
                        [routerLink]="['/shift-reports/new']">
                </button>
              }
            }
            </div>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DashboardComponent implements OnInit {


  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private permissionService = inject(PosPermissionService);
  private shiftService = inject(ShiftReportsService);

  // Data signals
  stats = this.dashboardService.stats;
  recentOrders = this.dashboardService.recentOrders;
  lowStockProducts = this.dashboardService.lowStockProducts;
  salesChartData = this.dashboardService.salesChartData;
  loading = this.dashboardService.loading;
  openShift =computed( () => this.shiftService.getCurrentShift().subscribe(shift => shift?.status === 'OPEN'));

  // Computed values
  userName = computed(() => this.authService.currentUser()?.username || 'Utilisateur');
  

  // Chart options
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `€${value}`
        }
      }
    }
  };

  ngOnInit() {
    this.dashboardService.loadDashboardData();
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  getOrderStatusLabel(status: string | undefined): string {
    if (!status) return 'Inconnu';
    const labels: Record<string, string> = {
      'PENDING': 'En attente',
      'PROCESSING': 'En traitement',
      'READY': 'Prête',
      'COMPLETED': 'Terminée',
      'CANCELLED': 'Annulée',
      'REFUNDED': 'Remboursée'
    };
    return labels[status] || status;
  }

  getOrderStatusSeverity(status: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    if (!status) return 'info';
    const severities: Record<string, any> = {
      'PENDING': 'warn',
      'PROCESSING': 'info',
      'READY': 'contrast',
      'COMPLETED': 'success',
      'CANCELLED': 'danger',
      'REFUNDED': 'secondary'
    };
    return severities[status] || 'info';
  }
    // Permissions
      canManageShifts() {
      return this.permissionService.canManageShifts();
      }
      canManageCustomers() {
      return this.permissionService.canManageCustomers();
      }
      canManageInventory() {
      return this.permissionService.canManageInventory();
      }
      canCreateOrder() {
      return this.permissionService.canCreateOrder();
      }
}