// features/orders/pages/document-sale/document-sale.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ViewContainerRef,
  EnvironmentInjector
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';
import { TabsModule } from 'primeng/tabs';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { SelectButtonModule } from 'primeng/selectbutton';

import { PaymentDialogComponent, PaymentEntry } from '../../components/payment-dialog/payment-dialog.component';
import { OrderItemsComponent } from '../../components/order-items/order-items.component';
import { OrderSummaryComponent } from '../../components/order-summary/order-summary.component';
import { CustomerSelectorComponent } from '../../components/customer-selector/customer-selector.component';
import { DocumentPreviewComponent } from '../../components/document-preview/document-preview.component';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

import {
  PaymentMethod,
  OrderType,
  DocumentType,
  Customer,
  OrderStatus
} from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';
import { OrderService } from '../../../../core/services/orders.service';
import { InvoiceService } from '../../../../core/services/invoice.service';
import { CustomersService } from '../../../../core/services/customers.service';

interface DocumentConfig {
  type: DocumentType;
  title: string;
  icon: string;
  requiresCustomer: boolean;
  allowsPartialPayment: boolean;
  defaultValidityDays: number;
}

@Component({
  selector: 'app-document-sale',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    SelectModule,
    DatePickerModule,
    DividerModule,
    PanelModule,
    TabsModule,
    ChipModule,
    TooltipModule,
    TableModule,
    SelectButtonModule,
    PaymentDialogComponent,
    OrderItemsComponent,
    OrderSummaryComponent,
    CustomerSelectorComponent,
    DocumentPreviewComponent,
    XafPipe,
  ],
  template: `
    <div class="p-4 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
          <button pButton 
                  icon="pi pi-arrow-left" 
                  class="p-button-text"
                  (click)="goBack()">
          </button>
          <div>
            <h1 class="text-2xl font-bold flex items-center gap-3">
              <i [class]="currentDocument().icon" class="text-primary"></i>
              {{ currentDocument().title }}
            </h1>
            <p class="text-gray-600 text-sm mt-1">
              Créer un document commercial pour client connu
            </p>
          </div>
        </div>
        
        <div class="flex gap-2">
          <p-selectButton [options]="documentTypes"
                          [(ngModel)]="selectedDocumentType"
                          (onChange)="onDocumentTypeChange()"
                          optionLabel="label"
                          optionValue="value">
          </p-selectButton>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Column: Customer & Products -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Customer Section (Required) -->
          <p-panel header="Informations Client" [toggleable]="true">
            <div class="flex justify-between items-center mb-4">
              <div class="flex items-center gap-2 text-gray-600">
                <i class="pi pi-info-circle"></i>
                <span class="text-sm">Client obligatoire pour les documents commerciaux</span>
              </div>
              <button pButton 
                      icon="pi pi-plus" 
                      label="Nouveau client"
                      class="p-button-sm p-button-outlined"
                      (click)="createNewCustomer()">
              </button>
            </div>

            @if (orderState.customer(); as customer) {
              <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div class="flex justify-between items-start">
                  <div class="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <label class="text-xs text-gray-500 uppercase">Client</label>
                      <div class="font-semibold text-lg">{{ customer.fullName }}</div>
                    </div>
                    <div>
                      <label class="text-xs text-gray-500 uppercase">Contact</label>
                      <div class="text-sm">{{ customer.phone || customer.email }}</div>
                    </div>
                    <div>
                      <label class="text-xs text-gray-500 uppercase">Adresse</label>
                      <div class="text-sm">{{ customer.address || 'Non renseignée' }}</div>
                    </div>
                    <div>
                      <label class="text-xs text-gray-500 uppercase">Fidélité</label>
                      <div class="flex items-center gap-2">
                        <p-tag [value]="customer.loyaltyTier || 'BRONZE'" severity="info"></p-tag>
                        <span class="text-sm text-gray-600">{{ customer.loyaltyPoints || 0 }} points</span>
                      </div>
                    </div>
                  </div>
                  <button pButton 
                          icon="pi pi-pencil" 
                          class="p-button-rounded p-button-text p-button-sm"
                          (click)="showCustomerDialog.set(true)"
                          pTooltip="Changer de client">
                  </button>
                </div>
              </div>
            } @else {
              <div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                   (click)="showCustomerDialog.set(true)">
                <i class="pi pi-user-plus text-4xl text-gray-400 mb-3"></i>
                <div class="font-medium text-gray-700">Sélectionner un client</div>
                <div class="text-sm text-gray-500 mt-1">Requis pour générer un document</div>
              </div>
            }
          </p-panel>

          <!-- Products Selection -->
          <p-panel header="Sélection des Produits" [toggleable]="true">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div class="p-input-icon-left w-full">
                <i class="pi pi-search"></i>
                <input pInputText 
                       type="text"
                       [(ngModel)]="searchTerm"
                       (ngModelChange)="onSearchChange($event)"
                       placeholder="Rechercher un produit..."
                       class="w-full">
              </div>
              <p-select [options]="categoryOptions()"
                        [(ngModel)]="selectedCategoryId"
                        (onChange)="onFilterChange()"
                        placeholder="Filtrer par catégorie"
                        [showClear]="true"
                        class="w-full">
              </p-select>
            </div>

            <div class="border rounded-lg overflow-hidden">
              @if (productsService.loading()) {
                <div class="p-8 text-center">
                  <i class="pi pi-spin pi-spinner text-3xl text-primary mb-3"></i>
                  <p>Chargement des produits...</p>
                </div>
              } @else {
                <p-table [value]="filteredProducts()" 
                         [paginator]="true" 
                         [rows]="8"
                         [responsiveLayout]="'scroll'"
                         selectionMode="single"
                         (onRowSelect)="onProductSelect($event)"
                         styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Produit</th>
                      <th>Prix</th>
                      <th>Stock</th>
                      <th></th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-product>
                    <tr [class.opacity-50]="product.quantity === 0">
                      <td>
                        <div class="flex items-center gap-3">
                          @if (product.imageUrl) {
                            <img [src]="product.imageUrl" class="w-10 h-10 object-cover rounded" [alt]="product.name">
                          } @else {
                            <div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                              <i class="pi pi-image text-gray-400"></i>
                            </div>
                          }
                          <div>
                            <div class="font-medium">{{ product.name }}</div>
                            <div class="text-xs text-gray-500">{{ product.sku }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="font-semibold">{{ (product.finalPrice || product.price) | xaf }}</td>
                      <td>
                        <p-tag [value]="product.quantity + ' unités'" 
                               [severity]="product.quantity > 10 ? 'success' : product.quantity > 0 ? 'warn' : 'danger'"
                               styleClass="text-xs">
                        </p-tag>
                      </td>
                      <td>
                        <button pButton 
                                icon="pi pi-plus" 
                                class="p-button-rounded p-button-sm p-button-success"
                                (click)="addToCart(product); $event.stopPropagation()"
                                [disabled]="product.quantity === 0">
                        </button>
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              }
            </div>
          </p-panel>

          <!-- Cart Items -->
          <p-panel header="Détail de la commande">
            <app-order-items
              [items]="orderState.items()"
              [customer]="orderState.customer()"
              (updateQuantity)="onUpdateQuantity($event)"
              (removeItem)="onRemoveItem($event)"
              (clearAll)="onClearCart()" />
          </p-panel>
        </div>

        <!-- Right Column: Document Configuration -->
        <div class="space-y-6">
          
          <!-- Document Settings -->
          <p-panel header="Paramètres du document" styleClass="shadow-sm">
            <div class="space-y-4">
              <!-- Validity (for proforma/quotes) -->
              @if (showValiditySettings()) {
                <div>
                  <label class="block text-sm font-medium mb-2">Validité (jours)</label>
                  <p-inputNumber [(ngModel)]="validityDays"
                                 [min]="1"
                                 [max]="90"
                                 class="w-full">
                  </p-inputNumber>
                </div>
                
                <div>
                  <label class="block text-sm font-medium mb-2">Date d'échéance</label>
                  <p-datepicker [(ngModel)]="dueDate"
                              [minDate]="minDate"
                              [showIcon]="true"
                              class="w-full">
                  </p-datepicker>
                </div>
              }

              <!-- Payment Terms -->
              <div>
                <label class="block text-sm font-medium mb-2">Conditions de paiement</label>
                <p-select [options]="paymentTerms"
                          [(ngModel)]="selectedPaymentTerm"
                          placeholder="Sélectionner..."
                          class="w-full">
                </p-select>
              </div>

              <!-- Delivery Info (for delivery notes) -->
              @if (selectedDocumentType === 'DELIVERY_NOTE') {
                <div>
                  <label class="block text-sm font-medium mb-2">Adresse de livraison</label>
                  <textarea pInputTextarea 
                            [(ngModel)]="deliveryAddress"
                            rows="3"
                            class="w-full"
                            placeholder="Si différente de l'adresse client...">
                  </textarea>
                </div>
              }

              <!-- Notes -->
              <div>
                <label class="block text-sm font-medium mb-2">Notes / Conditions</label>
                <textarea pInputTextarea 
                          [(ngModel)]="documentNotes"
                          rows="4"
                          class="w-full"
                          placeholder="Conditions particulières, mentions légales...">
                </textarea>
              </div>

              <!-- Reference Numbers -->
              <div>
                <label class="block text-sm font-medium mb-2">Référence client (optionnel)</label>
                <input pInputText 
                       [(ngModel)]="customerReference"
                       placeholder="N° de bon de commande client..."
                       class="w-full">
              </div>
            </div>
          </p-panel>

          <!-- Summary -->
          <p-panel header="Récapitulatif" styleClass="shadow-sm bg-gray-50">
            <app-order-summary
              [subtotal]="orderState.subtotal()"
              [discountAmount]="orderState.discountAmount()"
              [taxRate]="orderState.taxRate()"
              [taxAmount]="orderState.taxAmount()"
              [totalAmount]="orderState.total()"
              [itemCount]="orderState.itemCount()"
              [uniqueItems]="orderState.items().length" />

            <div class="mt-4 space-y-2">
              <button pButton
                      [label]="generateButtonLabel()"
                      [icon]="generateButtonIcon()"
                      class="w-full p-button-primary py-3 font-bold"
                      (click)="generateDocument()"
                      [disabled]="!canGenerateDocument()"
                      [loading]="processing()">
              </button>
              
              @if (selectedDocumentType === 'PROFORMA') {
                <button pButton
                        label="Convertir en facture"
                        icon="pi pi-file-edit"
                        class="w-full p-button-outlined p-button-secondary"
                        (click)="convertToInvoice()"
                        [disabled]="!canGenerateDocument()">
                </button>
              }
              
              <button pButton
                      label="Aperçu PDF"
                      icon="pi pi-eye"
                      class="w-full p-button-outlined p-button-secondary"
                      (click)="previewDocument()"
                      [disabled]="orderState.items().length === 0">
              </button>
            </div>
          </p-panel>

          <!-- Document History -->
          @if (recentDocuments().length > 0) {
            <p-panel header="Documents récents" [toggleable]="true" [collapsed]="true">
              <div class="space-y-2">
                @for (doc of recentDocuments(); track doc.id) {
                  <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <div>
                      <div class="font-medium">{{ doc.number }}</div>
                      <div class="text-xs text-gray-500">{{ doc.date | date:'dd/MM/yy' }}</div>
                    </div>
                    <button pButton 
                            icon="pi pi-download" 
                            class="p-button-text p-button-sm"
                            (click)="downloadDocument(doc.id)">
                    </button>
                  </div>
                }
              </div>
            </p-panel>
          }
        </div>
      </div>

      <!-- Customer Dialog -->
      @if (showCustomerDialog()) {
        <app-customer-selector
          [customer]="orderState.customer()"
          (customerSelected)="selectCustomer($event)"
          (customerCleared)="removeCustomer()"
          (close)="showCustomerDialog.set(false)" />
      }

      <!-- Payment Dialog (for immediate payment) -->
      @if (showPaymentDialog()) {
        <app-payment-dialog
          [totalAmount]="orderState.total()"
          [orderType]="OrderType.CREDIT_SALE"
          [customerName]="orderState.customer()?.fullName || ''"
          (paymentComplete)="onPaymentComplete($event)"
          (cancel)="showPaymentDialog.set(false)" />
      }

      <!-- Preview Dialog -->
      @if (showPreviewDialog()) {
        <app-document-preview
          [documentType]="selectedDocumentType"
          [items]="orderState.items()"
          [customer]="orderState.customer()"
          [totals]="{ subtotal: orderState.subtotal(), tax: orderState.taxAmount(), total: orderState.total() }"
          [config]="{ validityDays, notes: documentNotes, reference: customerReference }"
          (close)="showPreviewDialog.set(false)"
          (print)="printDocument()"
          (download)="downloadDocument()" />
      }
    </div>
  `
})
export class DocumentSaleComponent extends OrderCreateBaseComponent implements OnInit {
  // Services
  private ordersService = inject(OrderService);
  private invoiceService = inject(InvoiceService);
  protected override customersService = inject(CustomersService);
  private viewContainerRef = inject(ViewContainerRef);
  private envInjector = inject(EnvironmentInjector);
  protected override router = inject(Router);
  protected confirmationService = inject(ConfirmationService);

  // Constants for template
  readonly OrderType = OrderType;
  readonly DocumentType = DocumentType;

  // Document configuration
  selectedDocumentType: DocumentType = DocumentType.PROFORMA;
  documentTypes = [
    { label: 'Proforma', value: DocumentType.PROFORMA, icon: 'pi pi-file-o' },
    { label: 'Devis', value: DocumentType.QUOTE, icon: 'pi pi-calculator' },
    { label: 'Facture', value: DocumentType.INVOICE, icon: 'pi pi-file-pdf' },
    { label: 'Bon Livraison', value: DocumentType.DELIVERY_NOTE, icon: 'pi pi-truck' }
  ];

  // State
  showPaymentDialog = signal(false);
  showPreviewDialog = signal(false);
  override showCustomerDialog = signal(false);
  processing = signal(false);

  // Document settings
  validityDays = 30;
  dueDate: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  minDate = new Date();
  selectedPaymentTerm = 'IMMEDIATE';
  paymentTerms = [
    { label: 'Paiement immédiat', value: 'IMMEDIATE' },
    { label: '15 jours', value: 'NET_15' },
    { label: '30 jours', value: 'NET_30' },
    { label: '60 jours', value: 'NET_60' },
    { label: 'À réception', value: 'DUE_ON_RECEIPT' }
  ];
  documentNotes = '';
  customerReference = '';
  deliveryAddress = '';

  // Recent documents signal
  recentDocuments = signal<Array<{ id: string, number: string, date: Date, type: DocumentType }>>([]);

  // Computed
  currentDocument = computed<DocumentConfig>(() => {
    const configs: Record<DocumentType, DocumentConfig> = {
      [DocumentType.PROFORMA]: {
        type: DocumentType.PROFORMA,
        title: 'Facture Proforma',
        icon: 'pi pi-file-o',
        requiresCustomer: true,
        allowsPartialPayment: false,
        defaultValidityDays: 30
      },
      [DocumentType.QUOTE]: {
        type: DocumentType.QUOTE,
        title: 'Devis / Quotation',
        icon: 'pi pi-calculator',
        requiresCustomer: true,
        allowsPartialPayment: false,
        defaultValidityDays: 15
      },
      [DocumentType.INVOICE]: {
        type: DocumentType.INVOICE,
        title: 'Facture',
        icon: 'pi pi-file-pdf',
        requiresCustomer: true,
        allowsPartialPayment: true,
        defaultValidityDays: 30
      },
      [DocumentType.DELIVERY_NOTE]: {
        type: DocumentType.DELIVERY_NOTE,
        title: 'Bon de Livraison',
        icon: 'pi pi-truck',
        requiresCustomer: true,
        allowsPartialPayment: false,
        defaultValidityDays: 0
      },
      [DocumentType.TICKET]: {
        type: DocumentType.TICKET,
        title: 'Ticket',
        icon: 'pi pi-ticket',
        requiresCustomer: false,
        allowsPartialPayment: false,
        defaultValidityDays: 0
      },
      [DocumentType.RECEIPT]: {
        type: DocumentType.RECEIPT,
        title: 'Reçu',
        icon: 'pi pi-check-square',
        requiresCustomer: false,
        allowsPartialPayment: false,
        defaultValidityDays: 0
      }
    };
    return configs[this.selectedDocumentType] || configs[DocumentType.PROFORMA];
  });

  showValiditySettings = computed(() =>
    [DocumentType.PROFORMA, DocumentType.QUOTE].includes(this.selectedDocumentType)
  );

  canGenerateDocument = computed(() =>
    this.orderState.items().length > 0 &&
    !!this.orderState.customer() &&
    !this.processing()
  );

  generateButtonLabel = computed(() => {
    const labels: Record<DocumentType, string> = {
      [DocumentType.PROFORMA]: 'GÉNÉRER PROFORMA',
      [DocumentType.QUOTE]: 'GÉNÉRER DEVIS',
      [DocumentType.INVOICE]: 'CRÉER FACTURE',
      [DocumentType.DELIVERY_NOTE]: 'CRÉER BON DE LIVRAISON',
      [DocumentType.TICKET]: 'GÉNÉRER TICKET',
      [DocumentType.RECEIPT]: 'GÉNÉRER REÇU'
    };
    return labels[this.selectedDocumentType];
  });

  generateButtonIcon = computed(() => {
    const icons: Record<DocumentType, string> = {
      [DocumentType.PROFORMA]: 'pi pi-file-o',
      [DocumentType.QUOTE]: 'pi pi-calculator',
      [DocumentType.INVOICE]: 'pi pi-file-pdf',
      [DocumentType.DELIVERY_NOTE]: 'pi pi-truck',
      [DocumentType.TICKET]: 'pi pi-ticket',
      [DocumentType.RECEIPT]: 'pi pi-check-square'
    };
    return icons[this.selectedDocumentType];
  });

  filteredProducts = computed(() => {
    let products = this.productsService.products();
    const term = this.searchTerm();
    if (term) {
      const termLower = term.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(termLower) ||
        p.sku?.toLowerCase().includes(termLower)
      );
    }
    const catId = this.selectedCategoryId();
    if (catId && catId !== 'all') {
      products = products.filter(p => p.categoryId === catId);
    }
    return products;
  });

  override ngOnInit() {
    super.ngOnInit();
    this.loadRecentDocuments();
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.loadProducts();
  }

  onFilterChange(): void {
    this.loadProducts();
  }

  onDocumentTypeChange() {
    this.validityDays = this.currentDocument().defaultValidityDays;
    this.dueDate = new Date(Date.now() + this.validityDays * 24 * 60 * 60 * 1000);
  }

  override selectCustomer(customer: Customer): void {
    this.orderState.setCustomer(customer);
    this.showCustomerDialog.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Client sélectionné',
      detail: customer.fullName
    });
  }

  createNewCustomer(): void {
    // Navigate to customer creation or open modal
    this.router.navigate(['/customers/new'], {
      queryParams: { returnUrl: '/orders/document-sale' }
    });
  }

  onProductSelect(event: any): void {
    this.addToCart(event.data);
  }

  onUpdateQuantity(e: { productId: string; delta: number }): void {
    this.orderState.updateItemQuantity(e.productId, e.delta);
  }

  onRemoveItem(productId: string): void {
    this.orderState.removeItem(productId);
  }

  onClearCart(): void {
    this.confirmationService.confirm({
      message: 'Vider le panier?',
      header: 'Confirmation',
      accept: () => this.orderState.clear()
    });
  }

  generateDocument(): void {
    if (!this.canGenerateDocument()) return;

    const validation = this.orderState.validateForDocumentSale();
    if (!validation.valid) {
      validation.errors.forEach(error =>
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error
        })
      );
      return;
    }

    // For invoices with immediate payment, show payment dialog
    if (this.selectedDocumentType === DocumentType.INVOICE && this.selectedPaymentTerm === 'IMMEDIATE') {
      this.showPaymentDialog.set(true);
      return;
    }

    this.processing.set(true);

    const request = this.buildOrderRequest();

    this.ordersService.createOrder(request).subscribe({
      next: (order) => {
        this.processing.set(false);
        this.handleDocumentCreated(order);
      },
      error: (err) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Erreur lors de la création du document'
        });
      }
    });
  }

  private buildOrderRequest() {
    const customer = this.orderState.customer()!;

    return {
      storeId: this.currentShift()?.storeId || '',
      customerId: customer.customerId,
      items: this.orderState.items().map(item => ({
        productId: item.product.productId,
        quantity: item.quantity,
        discountPercentage: item.discountPercentage,
        notes: item.notes
      })),
      orderType: this.getOrderTypeForDocument(),
      notes: this.buildDocumentNotes(),
      globalDiscountPercentage: 0,
      globalDiscountAmount: this.orderState.discountAmount()
    };
  }

  private getOrderTypeForDocument(): OrderType {
    switch (this.selectedDocumentType) {
      case DocumentType.INVOICE:
        return OrderType.CREDIT_SALE;
      case DocumentType.PROFORMA:
        return OrderType.PROFORMA;
      default:
        return OrderType.CREDIT_SALE;
    }
  }

  private buildDocumentNotes(): string {
    const parts = [];

    if (this.documentNotes) {
      parts.push(this.documentNotes);
    }

    if (this.customerReference) {
      parts.push(`Réf. client: ${this.customerReference}`);
    }

    if (this.selectedPaymentTerm !== 'IMMEDIATE') {
      parts.push(`Paiement: ${this.paymentTerms.find(t => t.value === this.selectedPaymentTerm)?.label}`);
    }

    if (this.validityDays && this.showValiditySettings()) {
      parts.push(`Validité: ${this.validityDays} jours`);
    }

    return parts.join('\n');
  }

  onPaymentComplete(payments: PaymentEntry[]): void {
    this.showPaymentDialog.set(false);
    this.processing.set(true);

    const request = this.buildOrderRequest();

    this.ordersService.createOrderWithPayment(request, {
      method: payments[0].method,
      amount: payments[0].amount,
      notes: payments[0].notes
    }).subscribe({
      next: (order) => {
        this.processing.set(false);
        this.handleDocumentCreated(order);
      },
      error: (err) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Erreur lors de la création'
        });
      }
    });
  }

  private handleDocumentCreated(order: any): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Document créé',
      detail: `${this.currentDocument().title} #${order.orderNumber} généré avec succès`,
      life: 5000
    });

    // Generate PDF/Invoice based on document type
    if (this.selectedDocumentType === DocumentType.INVOICE) {
      this.invoiceService.generateInvoice(order.orderId).subscribe({
        next: (invoice) => {
          this.invoiceService.openPdfInTab(invoice.invoiceId);
        }
      });
    }

    // Clear cart and reload recent documents
    this.orderState.clear();
    this.loadRecentDocuments();
  }

  convertToInvoice(): void {
    this.confirmationService.confirm({
      message: 'Convertir ce proforma en facture définitive?',
      header: 'Conversion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.selectedDocumentType = DocumentType.INVOICE;
        this.generateDocument();
      }
    });
  }

  previewDocument(): void {
    this.showPreviewDialog.set(true);
  }

  printDocument(): void {
    window.print();
  }

  downloadDocument(docId?: string): void {
    // Implementation for downloading document
    this.messageService.add({
      severity: 'info',
      summary: 'Téléchargement',
      detail: 'Le document est en cours de génération...'
    });
  }

  private loadRecentDocuments(): void {
    // Load recent documents for this store/cashier
    this.recentDocuments.set([
      // Mock data - replace with actual service call
    ]);
  }

  override goBack(): void {
    this.router.navigate(['/orders']);
  }
}