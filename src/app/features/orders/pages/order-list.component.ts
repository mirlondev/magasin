import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DatePickerModule } from "primeng/datepicker";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { Select, SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { EmployeeRole, Order, OrderStatus, PaymentStatus } from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { OrdersService } from "../../../core/services/orders.service";

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    DatePickerModule,
    TagModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    SelectModule
],
  template: `
    <div class="p-4">
      <p-toast />
      <p-confirmDialog />

      <!-- Toolbar -->
      <p-toolbar>
        <div class="p-toolbar-group-start">
          <h2 class="text-2xl font-bold">Gestion des Commandes</h2>
        </div>
        
        <div class="p-toolbar-group-end">
          @if (canCreateOrder()) {
            <button pButton 
                    icon="pi pi-plus" 
                    label="Nouvelle Vente" 
                    class="p-button-success"
                    [routerLink]="['/orders/new']">
            </button>
          }
          
          <button pButton 
                  icon="pi pi-file-export" 
                  label="Exporter" 
                  class="p-button-help ml-2"
                  (click)="exportOrders()">
          </button>
        </div>
      </p-toolbar>

      <!-- Filters -->
      <div class="p-4 surface-ground rounded mb-4">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Recherche</label>
            <input pInputText 
                   [(ngModel)]="filters().search"
                   (ngModelChange)="onFilterChange()"
                   placeholder="N° commande, client..." 
                   class="w-full" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Statut</label>
            <p-select [options]="statusOptions" 
                       [(ngModel)]="filters().status"
                       (onChange)="onFilterChange()"
                       placeholder="Tous les statuts"
                       [showClear]="true"
                       class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Paiement</label>
            <p-select [options]="paymentStatusOptions" 
                       [(ngModel)]="filters().paymentStatus"
                       (onChange)="onFilterChange()"
                       placeholder="Tous les statuts"
                       [showClear]="true"
                       class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Période</label>
            <p-datepicker [(ngModel)]="dateRange"
                       (onSelect)="onDateRangeChange()"
                       selectionMode="range" 
                       [showIcon]="true"
                       dateFormat="dd/mm/yy"
                       placeholder="Sélectionner une période"
                       class="w-full"
          />
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
          <div class="text-500 font-medium">Total Commandes</div>
          <div class="text-900 text-3xl font-bold">{{ total() }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">En attente</div>
          <div class="text-900 text-3xl font-bold text-orange-500">{{ pendingOrders().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">En traitement</div>
          <div class="text-900 text-3xl font-bold text-blue-500">{{ processingOrders().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Terminées</div>
          <div class="text-900 text-3xl font-bold text-green-500">{{ completedOrders().length }}</div>
        </div>
      </div>

      <!-- Orders Table -->
      <p-table [value]="orders()" 
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
            <th pSortableColumn="orderNumber">N° Commande <p-sortIcon field="orderNumber" /></th>
            <th pSortableColumn="customer.fullName">Client <p-sortIcon field="customer.fullName" /></th>
            <th pSortableColumn="status">Statut <p-sortIcon field="status" /></th>
            <th pSortableColumn="paymentStatus">Paiement <p-sortIcon field="paymentStatus" /></th>
            <th pSortableColumn="totalAmount">Montant <p-sortIcon field="totalAmount" /></th>
            <th pSortableColumn="createdAt">Date <p-sortIcon field="createdAt" /></th>
            <th>Actions</th>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="body" let-order>
          <tr>
            <td class="font-semibold">
              <a [routerLink]="['/orders', order.orderId]" 
                 class="text-primary-600 hover:text-primary-500">
                {{ order.orderNumber }}
              </a>
            </td>
            <td>{{ order.customer?.fullName || 'N/A' }}</td>
            <td>
              <p-tag [value]="getStatusLabel(order.status)" 
                     [severity]="getStatusSeverity(order.status)" />
            </td>
            <td>
              <p-tag [value]="getPaymentStatusLabel(order.paymentStatus)" 
                     [severity]="getPaymentStatusSeverity(order.paymentStatus)" />
            </td>
            <td class="font-semibold">{{ order.totalAmount | currency:'EUR':'symbol':'1.2-2' }}</td>
            <td>{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
            <td>
              <div class="flex gap-2">
                <button pButton 
                        icon="pi pi-eye" 
                        class="p-button-rounded p-button-info p-button-text"
                        [routerLink]="['/orders', order.orderId]">
                </button>
                
                @if (canProcessPayment(order)) {
                  <button pButton 
                          icon="pi pi-credit-card" 
                          class="p-button-rounded p-button-success p-button-text"
                          (click)="processPayment(order)"
                          [disabled]="loading()">
                  </button>
                }
                
                @if (canCompleteOrder(order)) {
                  <button pButton 
                          icon="pi pi-check" 
                          class="p-button-rounded p-button-help p-button-text"
                          (click)="completeOrder(order)"
                          [disabled]="loading()">
                  </button>
                }
                
                @if (canCancelOrder(order)) {
                  <button pButton 
                          icon="pi pi-times" 
                          class="p-button-rounded p-button-danger p-button-text"
                          (click)="confirmCancel(order)"
                          [disabled]="loading()">
                  </button>
                }
                
                <button pButton 
                        icon="pi pi-file-pdf" 
                        class="p-button-rounded p-button-warning p-button-text"
                        (click)="generateInvoice(order.orderId)"
                        [disabled]="loading()">
                </button>
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
                  <p class="text-lg">Aucune commande trouvée</p>
                }
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class OrderListComponent implements OnInit {
  private ordersService = inject(OrdersService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals from service
  orders = this.ordersService.orders;
  loading = this.ordersService.loading;
  total = this.ordersService.total;
  pageSize = this.ordersService.pageSize;
  pendingOrders = this.ordersService.pendingOrders;
  processingOrders = this.ordersService.processingOrders;
  completedOrders = this.ordersService.completedOrders;

  // Local signals
  filters = signal({
    search: '',
    status: null as OrderStatus | null,
    paymentStatus: null as PaymentStatus | null,
    startDate: null as string | null,
    endDate: null as string | null
  });

  dateRange = signal<Date[] | null>(null);

  // Options
  statusOptions = [
    { label: 'En attente', value: OrderStatus.PENDING },
    { label: 'En traitement', value: OrderStatus.PROCESSING },
    { label: 'Prête', value: OrderStatus.READY },
    { label: 'Terminée', value: OrderStatus.COMPLETED },
    { label: 'Annulée', value: OrderStatus.CANCELLED },
    { label: 'Remboursée', value: OrderStatus.REFUNDED }
  ];

  paymentStatusOptions = [
    { label: 'En attente', value: PaymentStatus.PENDING },
    { label: 'Payée', value: PaymentStatus.PAID },
    { label: 'Partiellement payée', value: PaymentStatus.PARTIALLY_PAID },
    { label: 'Échouée', value: PaymentStatus.FAILED },
    { label: 'Remboursée', value: PaymentStatus.REFUNDED },
    { label: 'Annulée', value: PaymentStatus.CANCELLED }
  ];

  ngOnInit() {
    this.loadOrders();
  }

  // Permission checks
  canCreateOrder(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]);
  }

  canProcessPayment(order: Order): boolean {
    if (!this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])) {
      return false;
    }
    return order.paymentStatus === PaymentStatus.PENDING || 
           order.paymentStatus === PaymentStatus.PARTIALLY_PAID;
  }

  canCompleteOrder(order: Order): boolean {
    if (!this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])) {
      return false;
    }
    return order.status === OrderStatus.PENDING || 
           order.status === OrderStatus.PROCESSING;
  }

  canCancelOrder(order: Order): boolean {
    if (!this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])) {
      return false;
    }
    return order.status !== OrderStatus.CANCELLED && 
           order.status !== OrderStatus.COMPLETED;
  }

  // UI Helpers
  getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING: return 'En attente';
      case OrderStatus.PROCESSING: return 'En traitement';
      case OrderStatus.READY: return 'Prête';
      case OrderStatus.COMPLETED: return 'Terminée';
      case OrderStatus.CANCELLED: return 'Annulée';
      case OrderStatus.REFUNDED: return 'Remboursée';
      default: return status;
    }
  }

  getStatusSeverity(status: OrderStatus): "warn" | "info" | "danger"| "secondary" | "success" {
    switch (status) {
      case OrderStatus.PENDING: return 'warn';
      case OrderStatus.PROCESSING: return 'info';
      case OrderStatus.READY: return 'info';
      case OrderStatus.COMPLETED: return 'success';
      case OrderStatus.CANCELLED: return 'danger';
      case OrderStatus.REFUNDED: return 'secondary';
      default: return 'info';
    }
  }

  getPaymentStatusLabel(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PENDING: return 'En attente';
      case PaymentStatus.PAID: return 'Payée';
      case PaymentStatus.PARTIALLY_PAID: return 'Partiellement payée';
      case PaymentStatus.FAILED: return 'Échouée';
      case PaymentStatus.REFUNDED: return 'Remboursée';
      case PaymentStatus.CANCELLED: return 'Annulée';
      default: return status;
    }
  }

  getPaymentStatusSeverity(status: PaymentStatus): "warn" | "info" | "danger"| "secondary" | "success"  {
    switch (status) {
      case PaymentStatus.PENDING: return 'warn';
      case PaymentStatus.PAID: return 'success';
      case PaymentStatus.PARTIALLY_PAID: return 'info';
      case PaymentStatus.FAILED: return 'danger';
      case PaymentStatus.REFUNDED: return 'secondary';
      case PaymentStatus.CANCELLED: return 'danger';
      default: return 'info';
    }
  }

  // Event Handlers
  loadOrders() {
    const filters: any = {};
    const currentFilters = this.filters();
    
    if (currentFilters.search) filters.search = currentFilters.search;
    if (currentFilters.status) filters.status = currentFilters.status;
    if (currentFilters.paymentStatus) filters.paymentStatus = currentFilters.paymentStatus;
    if (currentFilters.startDate) filters.startDate = currentFilters.startDate;
    if (currentFilters.endDate) filters.endDate = currentFilters.endDate;

    this.ordersService.loadOrders(1, this.pageSize(), filters);
  }

  onFilterChange() {
    this.loadOrders();
  }

  onDateRangeChange() {
    const range = this.dateRange();
    if (range && range[0] && range[1]) {
      this.filters.update(f => ({
        ...f,
        startDate: range[0].toISOString().split('T')[0],
        endDate: range[1].toISOString().split('T')[0]
      }));
      this.loadOrders();
    }
  }

  resetFilters() {
    this.filters.set({
      search: '',
      status: null,
      paymentStatus: null,
      startDate: null,
      endDate: null
    });
    this.dateRange.set(null);
    this.loadOrders();
  }

  onLazyLoad(event: any) {
    const page = (event.first / event.rows) + 1;
    this.ordersService.setPage(page);
    this.ordersService.setPageSize(event.rows);
  }

  // Operations
  processPayment(order: Order) {
    this.router.navigate(['/orders', order.orderId, 'payment']);
  }

  completeOrder(order: Order) {
    this.ordersService.completeOrder(order.orderId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Commande terminée avec succès'
        });
      }
    });
  }

  confirmCancel(order: Order) {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir annuler la commande ${order.orderNumber} ?`,
      header: 'Confirmation d\'annulation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Oui',
      rejectLabel: 'Non',
      accept: () => this.cancelOrder(order.orderId)
    });
  }

  cancelOrder(orderId: string) {
    this.ordersService.cancelOrder(orderId, 'Annulée par l\'utilisateur').subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Commande annulée avec succès'
        });
      }
    });
  }

  generateInvoice(orderId: string) {
    this.ordersService.generateInvoice(orderId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-${orderId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  exportOrders() {
    // Implémenter l'export CSV/Excel
    this.messageService.add({
      severity: 'info',
      summary: 'Export',
      detail: 'Fonctionnalité d\'export bientôt disponible'
    });
  }
}