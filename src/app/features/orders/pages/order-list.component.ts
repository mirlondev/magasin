// features/orders/pages/order-list/order-list.component.ts
// Enhanced version with document type filtering and quick actions

import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DatePickerModule } from "primeng/datepicker";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { MenuModule } from "primeng/menu";
import { SplitButtonModule } from "primeng/splitbutton";
import { BadgeModule } from "primeng/badge";
import { ChipModule } from "primeng/chip";
import { TooltipModule } from "primeng/tooltip";
import { TabsModule } from "primeng/tabs";
import { PanelModule } from "primeng/panel";

import {
  EmployeeRole,
  Order,
  OrderStatus,
  PaymentStatus,
  OrderType,
  DocumentType
} from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { PosPermissionService } from "../../../core/services/pos-permission.service";
import { OrderService } from "../../../core/services/orders.service";
import { InvoiceService } from "../../../core/services/invoice.service";
import { ReceiptButtonComponent } from "../../components/receipt-button/receipt-button.component";
import { XafPipe } from "../../../core/pipes/xaf-currency-pipe";
import { OrderHelper } from "../../../core/utils/helpers";

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
    SelectModule,
    MenuModule,
    SplitButtonModule,
    BadgeModule,
    ChipModule,
    TooltipModule,
    TabsModule,
    PanelModule,
    XafPipe,
    ReceiptButtonComponent
  ],
  template: `
    <div class="p-4">
      <p-toast />
      <p-confirmDialog />

      <!-- Header -->
      <p-toolbar styleClass="mb-4">
        <div class="p-toolbar-group-start">
          <h2 class="text-2xl font-bold m-0">Gestion des Ventes & Documents</h2>
        </div>
        
        <div class="p-toolbar-group-end">
          <p-splitButton label="Nouvelle vente" 
                         icon="pi pi-plus" 
                         [model]="newSaleItems"
                         styleClass="p-button-success mr-2">
          </p-splitButton>
          
          <button pButton 
                  icon="pi pi-file-export" 
                  label="Exporter" 
                  class="p-button-help"
                  (click)="exportOrders()">
          </button>
        </div>
      </p-toolbar>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div class="surface-card p-4 shadow-2 rounded-lg border-l-4 border-primary">
          <div class="text-500 font-medium text-sm">Total Ventes</div>
          <div class="text-900 text-2xl font-bold">{{ total() }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded-lg border-l-4 border-orange-500">
          <div class="text-500 font-medium text-sm">En attente</div>
          <div class="text-900 text-2xl font-bold text-orange-500">{{ pendingOrders().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded-lg border-l-4 border-blue-500">
          <div class="text-500 font-medium text-sm">En traitement</div>
          <div class="text-900 text-2xl font-bold text-blue-500">{{ processingOrders().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded-lg border-l-4 border-green-500">
          <div class="text-500 font-medium text-sm">Terminées</div>
          <div class="text-900 text-2xl font-bold text-green-500">{{ completedOrders().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded-lg border-l-4 border-purple-500">
          <div class="text-500 font-medium text-sm">Créances</div>
          <div class="text-900 text-2xl font-bold text-purple-500">{{ creditOrders().length }}</div>
        </div>
      </div>

      <!-- Filters -->
      <p-panel header="Filtres avancés" [toggleable]="true" styleClass="mb-4">
        <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Recherche</label>
            <input pInputText 
                   [(ngModel)]="filters().search"
                   (ngModelChange)="onFilterChange()"
                   placeholder="N° commande, client..." 
                   class="w-full" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Type</label>
            <p-select [options]="orderTypeOptions" 
                      [(ngModel)]="filters().orderType"
                      (onChange)="onFilterChange()"
                      placeholder="Tous types"
                      [showClear]="true"
                      class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Statut</label>
            <p-select [options]="statusOptions" 
                      [(ngModel)]="filters().status"
                      (onChange)="onFilterChange()"
                      placeholder="Tous statuts"
                      [showClear]="true"
                      class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Paiement</label>
            <p-select [options]="paymentStatusOptions" 
                      [(ngModel)]="filters().paymentStatus"
                      (onChange)="onFilterChange()"
                      placeholder="Tous statuts"
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
                          placeholder="Sélectionner"
                          class="w-full" />
          </div>
          
          <div class="flex items-end gap-2">
            <button pButton 
                    icon="pi pi-filter-slash" 
                    label="Réinitialiser" 
                    class="p-button-outlined w-full"
                    (click)="resetFilters()">
            </button>
          </div>
        </div>
      </p-panel>

      <!-- Orders Tabs -->
      <p-tabs [value]="activeTab" (valueChange)="onTabChange($event)">
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-list mr-2"></i>
            <span>Toutes les ventes</span>
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-shopping-cart mr-2"></i>
            <span>Ventes directes</span>
          </p-tab>
          <p-tab value="2">
            <i class="pi pi-file-pdf mr-2"></i>
            <span>Factures & Proformas</span>
          </p-tab>
          <p-tab value="3">
            <i class="pi pi-clock mr-2"></i>
            <span>Créances</span>
            <p-badge [value]="creditOrders().length.toString()" styleClass="ml-2"></p-badge>
          </p-tab>
        </p-tablist>
        
        <p-tabpanels>
          <p-tabpanel value="0">
            <ng-container *ngTemplateOutlet="ordersTable"></ng-container>
          </p-tabpanel>
          <p-tabpanel value="1">
            <ng-container *ngTemplateOutlet="ordersTable"></ng-container>
          </p-tabpanel>
          <p-tabpanel value="2">
            <ng-container *ngTemplateOutlet="ordersTable"></ng-container>
          </p-tabpanel>
          <p-tabpanel value="3">
            <ng-container *ngTemplateOutlet="ordersTable"></ng-container>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <!-- Orders Table Template -->
      <ng-template #ordersTable>
        <p-table [value]="filteredOrders()" 
                 [lazy]="true" 
                 [paginator]="true" 
                 [rows]="pageSize()"
                 [totalRecords]="total()"
                 [loading]="loading()"
                 (onLazyLoad)="onLazyLoad($event)"
                 [rowsPerPageOptions]="[10, 25, 50]"
                 [tableStyle]="{'min-width': '75rem'}"
                 styleClass="p-datatable-sm">
          
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="orderNumber">
                N° Document <p-sortIcon field="orderNumber" />
              </th>
              <th>Type</th>
              <th>Client</th>
              <th pSortableColumn="status">
                Statut <p-sortIcon field="status" />
              </th>
              <th pSortableColumn="paymentStatus">
                Paiement <p-sortIcon field="paymentStatus" />
              </th>
              <th>Montants</th>
              <th pSortableColumn="createdAt">
                Date <p-sortIcon field="createdAt" />
              </th>
              <th>Actions</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-order>
            <tr [class.bg-blue-50]="order.orderType === OrderType.CREDIT_SALE">
              <td>
                <div class="flex flex-col">
                  <a [routerLink]="['/orders', order.orderId]" 
                     class="text-primary-600 hover:text-primary-500 font-semibold">
                    {{ order.orderNumber }}
                  </a>
                  <span class="text-xs text-gray-500">{{ getOrderTypeLabel(order.orderType) }}</span>
                </div>
              </td>
              <td>
                <p-tag [value]="getOrderTypeLabel(order.orderType)" 
                       [severity]="getOrderTypeSeverity(order.orderType)"
                       styleClass="text-xs" />
              </td>
              <td>
                <div class="flex flex-col">
                  <span class="font-medium">{{ order.customer?.fullName || 'Client comptant' }}</span>
                  @if (order.customer?.phone) {
                    <span class="text-xs text-gray-500">{{ order.customer.phone }}</span>
                  }
                </div>
              </td>
              <td>
                <p-tag [value]="OrderHelper.getOrderStatusLabel(order.status)" 
                       [severity]="OrderHelper.getOrderStatusSeverity(order.status)" />
              </td>
              <td>
                <div class="flex flex-col gap-1">
                  <p-tag [value]="OrderHelper.getPaymentStatusLabel(order.paymentStatus)" 
                         [severity]="OrderHelper.getPaymentStatusSeverity(order.paymentStatus)" 
                         styleClass="text-xs" />
                  @if (order.remainingAmount > 0) {
                    <span class="text-xs text-orange-600 font-medium">
                      Reste: {{ order.remainingAmount | xaf }}
                    </span>
                  }
                </div>
              </td>
              <td>
                <div class="flex flex-col text-right">
                  <span class="font-bold">{{ order.totalAmount | xaf }}</span>
                  @if (order.totalPaid > 0) {
                    <span class="text-xs text-green-600">
                      Payé: {{ order.totalPaid | xaf }}
                    </span>
                  }
                </div>
              </td>
              <td>
                <div class="flex flex-col text-sm">
                  <span>{{ order.createdAt | date:'dd/MM/yyyy' }}</span>
                  <span class="text-xs text-gray-500">{{ order.createdAt | date:'HH:mm' }}</span>
                </div>
              </td>
              <td>
                <div class="flex gap-1">
                  <button pButton 
                          icon="pi pi-eye" 
                          class="p-button-rounded p-button-info p-button-text p-button-sm"
                          [routerLink]="['/orders', order.orderId]"
                          pTooltip="Voir détails">
                  </button>
                  
                  @if (canAddPayment(order)) {
                    <button pButton 
                            icon="pi pi-credit-card" 
                            class="p-button-rounded p-button-success p-button-text p-button-sm"
                            (click)="addPayment(order)"
                            pTooltip="Ajouter paiement">
                    </button>
                  }
                  
                  @if (canGenerateInvoice(order)) {
                    <button pButton 
                            icon="pi pi-file-pdf" 
                            class="p-button-rounded p-button-warning p-button-text p-button-sm"
                            (click)="generateInvoice(order)"
                            pTooltip="Générer facture">
                    </button>
                  }
                  
                  <app-receipt-button [orderId]="order.orderId" />
                  
                  <button pButton 
                          icon="pi pi-ellipsis-v" 
                          class="p-button-rounded p-button-secondary p-button-text p-button-sm"
                          (click)="menu.toggle($event); selectedOrderForMenu = order">
                  </button>
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
                    <div class="flex flex-col items-center">
                      <i class="pi pi-inbox text-4xl text-gray-300 mb-3"></i>
                      <p class="text-lg">Aucune commande trouvée</p>
                      <p class="text-sm text-gray-400">Essayez avec d'autres filtres</p>
                    </div>
                  }
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </ng-template>

      <!-- Context Menu -->
      <p-menu #menu [popup]="true" [model]="contextMenuItems"></p-menu>
    </div>
  `
})
export class OrderListComponent implements OnInit {
  private ordersService = inject(OrderService);
  private invoiceService = inject(InvoiceService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private posPermissionService = inject(PosPermissionService);
  private router = inject(Router);

  // Signals from service
  orders = this.ordersService.orders;
  loading = this.ordersService.loading;
  total = this.ordersService.total;
  pageSize = this.ordersService.pageSize;
  pendingOrders = this.ordersService.pendingOrders;
  processingOrders = this.ordersService.processingOrders;
  completedOrders = this.ordersService.completedOrders;

  // Local computed
  creditOrders = computed(() =>
    this.orders().filter(o => o.paymentStatus === PaymentStatus.CREDIT || o.remainingAmount > 0)
  );

  // State
  activeTab = 0;
  selectedOrderForMenu: Order | null = null;

  filters = signal({
    search: '',
    orderType: null as OrderType | null,
    status: null as OrderStatus | null,
    paymentStatus: null as PaymentStatus | null,
    startDate: null as string | null,
    endDate: null as string | null
  });

  dateRange = signal<Date[] | null>(null);

  // Menu items
  newSaleItems = [
    {
      label: 'Vente directe (POS)',
      icon: 'pi pi-shopping-cart',
      command: () => this.router.navigate(['/orders/pos-sale'])
    },
    {
      label: 'Facture / Proforma',
      icon: 'pi pi-file-pdf',
      command: () => this.router.navigate(['/orders/document-sale'])
    },
    {
      label: 'Devis',
      icon: 'pi pi-calculator',
      command: () => this.router.navigate(['/orders/document-sale'], { queryParams: { type: 'QUOTE' } })
    }
  ];

  get contextMenuItems() {
    const order = this.selectedOrderForMenu;
    if (!order) return [];

    return [
      {
        label: 'Voir d\u00e9tails',
        icon: 'pi pi-eye',
        command: () => this.router.navigate(['/orders', order.orderId])
      },
      {
        label: 'Imprimer ticket',
        icon: 'pi pi-print',
        command: () => this.printReceipt(order.orderId)
      },
      {
        separator: true
      },
      {
        label: 'Dupliquer',
        icon: 'pi pi-copy',
        command: () => this.duplicateOrder(order)
      },
      ...(this.canCancelOrder(order) ? [{
        label: 'Annuler',
        icon: 'pi pi-times',
        styleClass: 'text-red-500',
        command: () => this.confirmCancel(order)
      }] : [])
    ];
  }

  // Options
  orderTypeOptions = [
    { label: 'Vente directe', value: OrderType.POS_SALE },
    { label: 'Vente à crédit', value: OrderType.CREDIT_SALE },
    { label: 'Proforma', value: OrderType.PROFORMA },
    { label: 'En ligne', value: OrderType.ONLINE }
  ];

  statusOptions = [
    { label: 'En attente', value: OrderStatus.PENDING },
    { label: 'En traitement', value: OrderStatus.PROCESSING },
    { label: 'Prête', value: OrderStatus.READY },
    { label: 'Terminée', value: OrderStatus.COMPLETED },
    { label: 'Annulée', value: OrderStatus.CANCELLED }
  ];

  paymentStatusOptions = [
    { label: 'Non payé', value: PaymentStatus.UNPAID },
    { label: 'Partiellement payé', value: PaymentStatus.PARTIALLY_PAID },
    { label: 'Payé', value: PaymentStatus.PAID },
    { label: 'Crédit', value: PaymentStatus.CREDIT },
    { label: 'Remboursé', value: PaymentStatus.REFUNDED }
  ];

  protected readonly OrderHelper = OrderHelper;
  protected readonly OrderType = OrderType;

  ngOnInit() {
    this.loadOrders();
  }

  filteredOrders() {
    let filtered = this.orders();

    switch (this.activeTab) {
      case 1: // Direct sales
        filtered = filtered.filter(o => o.orderType === OrderType.POS_SALE);
        break;
      case 2: // Invoices/Proformas
        filtered = filtered.filter(o => o.orderType && [OrderType.CREDIT_SALE, OrderType.PROFORMA].includes(o.orderType));
        break;
      case 3: // Credit
        filtered = filtered.filter(o => o.paymentStatus === PaymentStatus.CREDIT || (o.remainingAmount ?? 0) > 0);
        break;
    }

    return filtered;
  }

  onTabChange(event: any) {
    this.activeTab = event.index;
    this.loadOrders();
  }

  // Permission checks
  canAddPayment(order: Order): boolean {
    if (!this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])) {
      return false;
    }
    return OrderHelper.getRemainingAmount(order) > 0;
  }

  canGenerateInvoice(order: Order): boolean {
    return [OrderType.CREDIT_SALE, OrderType.PROFORMA].includes(order.orderType as OrderType) &&
      this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]);
  }

  canCancelOrder(order: Order): boolean {
    if (!this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])) {
      return false;
    }
    return order.status !== OrderStatus.CANCELLED &&
      order.status !== OrderStatus.COMPLETED;
  }

  // Actions
  addPayment(order: Order) {
    this.router.navigate(['/orders', order.orderId], {
      queryParams: { action: 'add-payment' }
    });
  }

  generateInvoice(order: Order) {
    this.invoiceService.generateInvoice(order.orderId).subscribe({
      next: (invoice) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Facture générée',
          detail: `N° ${invoice.invoiceNumber}`
        });
        this.invoiceService.openPdfInTab(invoice.invoiceId);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de générer la facture'
        });
      }
    });
  }

  printReceipt(orderId: string) {
    // Implementation
  }

  duplicateOrder(order: Order) {
    // Implementation to duplicate order as new draft
    this.messageService.add({
      severity: 'info',
      summary: 'Commande dupliquée',
      detail: 'Nouveau brouillon créé'
    });
  }

  confirmCancel(order: Order) {
    this.confirmationService.confirm({
      message: `Annuler la commande ${order.orderNumber}?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.cancelOrder(order.orderId)
    });
  }

  cancelOrder(orderId: string) {
    this.ordersService.cancelOrder(orderId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Annulée',
          detail: 'Commande annulée avec succès'
        });
      }
    });
  }

  // Helpers
  getOrderTypeLabel(type?: OrderType): string {
    const labels: Record<OrderType, string> = {
      [OrderType.POS_SALE]: 'Vente directe',
      [OrderType.CREDIT_SALE]: 'Facture',
      [OrderType.PROFORMA]: 'Proforma',
      [OrderType.ONLINE]: 'En ligne'
    };
    return type ? labels[type] : 'Vente';
  }

  getOrderTypeSeverity(type?: OrderType): any {
    const map: Record<OrderType, any> = {
      [OrderType.POS_SALE]: 'success',
      [OrderType.CREDIT_SALE]: 'info',
      [OrderType.PROFORMA]: 'warning',
      [OrderType.ONLINE]: 'secondary'
    };
    return type ? map[type] : 'secondary';
  }

  // Data loading
  loadOrders() {
    const filters: any = { ...this.filters() };
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
        startDate: range[0].toISOString(),
        endDate: range[1].toISOString()
      }));
      this.loadOrders();
    }
  }

  resetFilters() {
    this.filters.set({
      search: '',
      orderType: null,
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
  }

  exportOrders() {
    this.messageService.add({
      severity: 'info',
      summary: 'Export',
      detail: 'Préparation du fichier...'
    });
  }
}