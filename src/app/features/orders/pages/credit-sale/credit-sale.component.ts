// features/orders/pages/credit-sale/credit-sale.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePickerModule } from 'primeng/datepicker';

import { OrderItemsComponent } from '../../components/order-items/order-items.component';
import { OrderSummaryComponent } from '../../components/order-summary/order-summary.component';
import { CustomerSelectorComponent } from '../../components/customer-selector/customer-selector.component';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

import {
  Customer,
  OrderType,
  PaymentMethod,
  Product,
} from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';
import { OrderService } from '../../../../core/services/orders.service';
import { InvoiceService } from '../../../../core/services/invoice.service';

@Component({
  selector: 'app-credit-sale',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputNumberModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    SelectModule,
    SkeletonModule,
    DatePickerModule,
    XafPipe,
    OrderItemsComponent,
    OrderSummaryComponent,
    CustomerSelectorComponent,
  ],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

      <!-- ── Left column: product selection ─────────────────────────────── -->
      <div class="lg:col-span-2">
        <p-card header="Sélection des Produits">

          <!-- Search + category filters -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-2">Recherche</label>
              <div class="p-input-icon-left w-full">
                <i class="pi pi-search"></i>
                <input pInputText
                       type="text"
                       [ngModel]="searchTerm()"
                       (ngModelChange)="searchTerm.set($event); onFilterChange()"
                       placeholder="Nom, SKU, code-barres..."
                       class="w-full" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Catégorie</label>
              <p-select [options]="categoryOptions()"
                        [ngModel]="selectedCategoryId()"
                        (ngModelChange)="selectedCategoryId.set($event); onFilterChange()"
                        class="w-full">
              </p-select>
            </div>
          </div>

          <!-- Product grid -->
          <div class="border rounded-lg p-4">
            @if (!shiftReady()) {
              <!-- Skeleton while shift is loading -->
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                @for (i of skeletonItems; track i) {
                  <p-card>
                    <p-skeleton height="140px" styleClass="mb-3" />
                    <p-skeleton width="80%" styleClass="mb-2" />
                    <p-skeleton width="60%" />
                  </p-card>
                }
              </div>
            } @else if (productsService.loading()) {
              <div class="text-center py-8">
                <i class="pi pi-spin pi-spinner text-4xl text-primary mb-4"></i>
                <p class="text-gray-600">Chargement des produits...</p>
              </div>
            } @else if (productsService.products().length === 0) {
              <div class="text-center py-8">
                <i class="pi pi-box text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">Aucun produit trouvé</p>
              </div>
            } @else {
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                @for (product of productsService.products(); track product.productId) {
                  <div class="product-card border rounded-lg overflow-hidden
                               hover:shadow-lg transition-shadow cursor-pointer"
                       (click)="addToCart(product)">
                    <div class="aspect-square bg-gray-100 relative overflow-hidden">
                      @if (getProductImage(product)) {
                        <img [src]="getProductImage(product)"
                             [alt]="product.name"
                             class="w-full h-full object-cover" />
                      } @else {
                        <div class="w-full h-full flex items-center justify-center">
                          <i class="pi pi-image text-gray-300 text-3xl"></i>
                        </div>
                      }
                      <div class="absolute top-2 right-2">
                        <p-tag [value]="getStockLabel(product)"
                               [severity]="getStockSeverity(product)"
                               size="small" />
                      </div>
                    </div>
                    <div class="p-3">
                      <div class="font-semibold text-sm truncate mb-1">{{ product.name }}</div>
                      <div class="flex justify-between items-center">
                        <div class="text-xs text-gray-500">{{ product.sku || 'N/A' }}</div>
                        <div class="font-bold text-primary">{{ product.price | xaf }}</div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </p-card>
      </div>

      <!-- ── Right column: cart + credit terms ───────────────────────────── -->
      <div>
        <p-card header="Vente à Crédit">

          <!-- Customer required warning -->
          @if (!orderState.customer()) {
            <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="flex items-center gap-2">
                <i class="pi pi-exclamation-triangle text-yellow-500"></i>
                <span class="text-sm text-yellow-700">
                  Un client est <strong>obligatoire</strong> pour une vente à crédit
                </span>
              </div>
            </div>
          }

          <!-- Customer selector -->
          <app-customer-selector
            [customer]="orderState.customer()"
            (customerSelected)="onCustomerSelected($event)"
            (customerCleared)="removeCustomer()">
          </app-customer-selector>

          <!-- Cart items -->
          <app-order-items
            [items]="orderState.items()"
            [customer]="orderState.customer()"
            (updateQuantity)="onUpdateQuantity($event)"
            (removeItem)="onRemoveItem($event)"
            (selectCustomer)="showCustomerDialog.set(true)"
            (clearCustomer)="removeCustomer()">
          </app-order-items>

          <!-- Order totals — [totalAmount] matches Order.totalAmount on backend -->
          <app-order-summary
            [subtotal]="orderState.subtotal()"
            [discountAmount]="orderState.discountAmount()"
            [taxRate]="orderState.taxRate()"
            [taxAmount]="orderState.taxAmount()"
            [totalAmount]="orderState.total()"
            [itemCount]="orderState.itemCount()"
            [uniqueItems]="orderState.items().length">
          </app-order-summary>

          <!-- Credit terms -->
          <div class="mt-4 p-4 border rounded-lg space-y-3">
            <h3 class="font-semibold">Conditions du crédit</h3>

            <div class="flex justify-between">
              <span class="text-gray-600">Montant du crédit:</span>
              <span class="font-bold text-orange-600">
                {{ orderState.total() | xaf }}
              </span>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">
                Date d'échéance <span class="text-red-500">*</span>
              </label>
              <!-- p-datepicker binds to Date; dueDateValue is converted to ISO string before submit -->
              <p-datepicker
                [(ngModel)]="dueDateValue"
                [showIcon]="true"
                inputId="creditDueDate"
                [minDate]="today"
                dateFormat="dd/mm/yy"
                placeholder="Sélectionner une date"
                class="w-full" />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Notes (optionnel)</label>
              <textarea pInputTextarea
                        [(ngModel)]="creditNotes"
                        rows="2"
                        class="w-full"
                        placeholder="Conditions particulières...">
              </textarea>
            </div>
          </div>

          <!-- Submit -->
          <button pButton
                  label="CRÉER CRÉDIT"
                  icon="pi pi-file-export"
                  class="w-full p-button-warning mt-4 text-lg font-bold py-3"
                  (click)="createCreditSale()"
                  [loading]="processing()"
                  [disabled]="!canProcess() || processing()">
          </button>

          <!-- Inline validation hint -->
          @if (!canProcess() && orderState.itemCount() > 0) {
            <div class="text-center text-sm text-red-500 mt-2">
              @if (!orderState.customer()) {
                Sélectionnez un client pour continuer
              } @else if (!dueDateValue) {
                Spécifiez une date d'échéance
              }
            </div>
          }

        </p-card>
      </div>
    </div>
  `,
  styles: [`
    .product-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `],
})
export class CreditSaleComponent extends OrderCreateBaseComponent {

  // ── Service injection ────────────────────────────────────────────────────
  private ordersService   = inject(OrderService);
  private invoiceService  = inject(InvoiceService);
  private confirmationService = inject(ConfirmationService);

  // ── Component state ──────────────────────────────────────────────────────
  processing  = signal(false);

  /**
   * p-datepicker works with Date objects.
   * We convert to ISO string only when building the payload.
   */
  dueDateValue: Date | null = null;
  creditNotes  = '';

  /** Used as [minDate] on p-datepicker so past dates are disabled. */
  readonly today = new Date();

  /** Skeleton placeholder array */
  readonly skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8];

  // ── Base class hooks ─────────────────────────────────────────────────────

  override pageTitle(): string {
    return 'Vente à Crédit';
  }

  override canProcess(): boolean {
    const validation = this.orderState.validateForCreditSale();
    return validation.valid && !!this.dueDateValue;
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  onCustomerSelected(customer: Customer): void {
    this.orderState.setCustomer(customer);
  }

  onUpdateQuantity(event: { productId: string; delta: number }): void {
    this.orderState.updateItemQuantity(event.productId, event.delta);
  }

  onRemoveItem(productId: string): void {
    this.orderState.removeItem(productId);
  }

  onFilterChange(): void {
    this.loadProducts();
  }

  // ── Sale creation flow ───────────────────────────────────────────────────

  /**
   * Full credit-sale flow:
   *   1. Validate locally
   *   2. POST /orders               → create order (OrderType.CREDIT_SALE)
   *   3. POST /orders/{id}/payments  → add CREDIT payment with due date in notes
   *   4. POST /invoices/order/{id}   → generate invoice (InvoiceDocumentStrategy)
   *   5. GET  /invoices/order/{id}/pdf → download cached PDF
   */
  createCreditSale(): void {
    if (this.processing()) return;

    // Local validation
    const validation = this.orderState.validateForCreditSale();
    if (!validation.valid) {
      validation.errors.forEach((msg) =>
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: msg })
      );
      return;
    }

    if (!this.dueDateValue) {
      this.messageService.add({
        severity: 'warn',
        summary: "Date d'échéance requise",
        detail: "Veuillez spécifier une date d'échéance",
      });
      return;
    }

    this.processing.set(true);

    // Convert Date → ISO date string (yyyy-MM-dd) expected by backend notes parsing
    const dueDateIso = this.dueDateValue.toISOString().split('T')[0];

    // Build order request — NO payment on creation, OrderType must be CREDIT_SALE
    // so DocumentStrategyFactory picks InvoiceDocumentStrategy
    const orderRequest = this.orderState.toOrderRequest(
      this.currentShift()?.storeId ?? '',
      undefined,
      undefined
    );
    orderRequest.orderType = OrderType.CREDIT_SALE;

    // Attach due date to notes so InvoiceServiceImpl.extractDueDateFromPayments() can parse it
    const dueDateNote = `Échéance: ${dueDateIso}`;
    orderRequest.notes = [
      `Vente à crédit`,
      dueDateNote,
      this.creditNotes || null,
      orderRequest.notes || null,
    ]
      .filter(Boolean)
      .join('\n');

    // ── Step 1: create order ────────────────────────────────────────────
    this.ordersService.createOrder(orderRequest).subscribe({
      next: (order) => this.addCreditPayment(order.orderId, order.orderNumber, order.totalAmount, dueDateIso),
      error: (err) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Erreur lors de la création de la commande',
        });
      },
    });
  }

  // ── Step 2: add CREDIT payment ─────────────────────────────────────────
  private addCreditPayment(
    orderId: string,
    orderNumber: string,
    totalAmount: number,
    dueDateIso: string
  ): void {
    const creditPayment = {
      method: PaymentMethod.CREDIT,
      amount: totalAmount,
      // Backend InvoiceServiceImpl.extractDueDateFromPayments() parses "Échéance: yyyy-MM-dd"
      notes: `Échéance: ${dueDateIso}${this.creditNotes ? '\n' + this.creditNotes : ''}`,
    };

    this.ordersService.addPayment(orderId, creditPayment).subscribe({
      next: () => this.generateInvoice(orderId, orderNumber),
      error: (err) => {
        // Order created but payment recording failed — still generate invoice
        console.error('Credit payment error:', err);
        this.messageService.add({
          severity: 'warn',
          summary: 'Commande créée',
          detail: "Le paiement crédit n'a pas pu être enregistré",
        });
        this.generateInvoice(orderId, orderNumber);
      },
    });
  }

  // ── Step 3: generate invoice via InvoiceDocumentStrategy ──────────────
  private generateInvoice(orderId: string, orderNumber: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Génération de la facture',
      detail: 'Veuillez patienter...',
    });

    // POST /invoices/order/{orderId}
    this.invoiceService.generateInvoice(orderId).subscribe({
      next: (invoice) => {
        this.onCreditSaleSuccess(orderId, orderNumber);
        // ── Step 4: download cached PDF using orderId-based endpoint ──
        // GET /invoices/order/{orderId}/pdf (InvoiceServiceImpl.getOrGenerateInvoicePdf)
        this.downloadInvoicePdf(orderId, invoice.invoiceNumber);
      },
      error: (err) => {
        console.error('Invoice generation error:', err);
        this.processing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la génération de la facture',
        });
        this.confirmationService.confirm({
          message: "La facture n'a pas pu être générée. Voulez-vous réessayer ?",
          header: 'Erreur de génération',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Réessayer',
          rejectLabel: 'Plus tard',
          accept: () => this.generateInvoice(orderId, orderNumber),
          reject: () => this.goBack(),
        });
      },
    });
  }

  // ── Step 4: download PDF ───────────────────────────────────────────────
  private downloadInvoicePdf(orderId: string, invoiceNumber: string): void {
    // GET /invoices/order/{orderId}/pdf — file-cached on backend
    this.invoiceService.downloadPdfByOrder(orderId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Facture téléchargée',
          detail: `${invoiceNumber} téléchargée avec succès`,
        });

        this.goBack();
      },
      error: (err) => {
        console.error('PDF download error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du téléchargement de la facture',
        });
        this.goBack();
      },
    });
  }

  // ── Reset state on success ─────────────────────────────────────────────
  private onCreditSaleSuccess(orderId: string, orderNumber: string): void {
    this.processing.set(false);
    this.orderState.clear();
    this.dueDateValue = null;
    this.creditNotes  = '';

    this.messageService.add({
      severity: 'success',
      summary: 'Crédit créé',
      detail: `Commande crédit #${orderNumber} enregistrée`,
      life: 5000,
    });
  }

  override processOrder(): void {
    this.createCreditSale();
  }
}