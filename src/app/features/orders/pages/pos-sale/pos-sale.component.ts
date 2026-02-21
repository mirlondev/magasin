// features/orders/pages/pos-sale/pos-sale.component.ts
import {
  Component,
  inject,
  signal,
  OnInit,
  ViewContainerRef,
  EnvironmentInjector,
} from '@angular/core';
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

import { PaymentCashComponent } from '../../components/payment-cash/payment-cash.component';
import { OrderItemsComponent } from '../../components/order-items/order-items.component';
import { OrderSummaryComponent } from '../../components/order-summary/order-summary.component';
import { ReceiptDialogComponent } from '../../components/receipt-dialog/receipt-dialog.component';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

import { PaymentMethod, ShiftStatus, OrderType } from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';
import { OrderService } from '../../../../core/services/orders.service';
import { PrintTarget } from '../../../../core/services/receipt.service';

interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  notes?: string;
}

@Component({
  selector: 'app-pos-sale',
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
    TagModule,
    SelectModule,
    ConfirmDialogModule,
    SkeletonModule,
    PaymentCashComponent,
    OrderItemsComponent,
    OrderSummaryComponent,
    XafPipe,
  ],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

      <!-- ── Left: products ──────────────────────────────────────────── -->
      <div class="lg:col-span-2">
        <p-card header="Sélection des Produits">

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-2">Recherche</label>
              <div class="p-input-icon-left w-full">
                <i class="pi pi-search"></i>
                <input pInputText type="text"
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
                        class="w-full" />
            </div>
          </div>

          <div class="border rounded-lg p-4">
            @if (!shiftReady()) {
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
                  <div class="product-card border rounded-lg overflow-hidden cursor-pointer"
                       (click)="addToCart(product)">
                    <div class="aspect-square bg-gray-100 relative overflow-hidden">
                      @if (getProductImage(product)) {
                        <img [src]="getProductImage(product)" [alt]="product.name"
                             class="w-full h-full object-cover" />
                      } @else {
                        <div class="w-full h-full flex items-center justify-center">
                          <i class="pi pi-image text-gray-300 text-3xl"></i>
                        </div>
                      }
                      <div class="absolute top-2 right-2">
                        <p-tag [value]="getStockLabel(product)"
                               [severity]="getStockSeverity(product)" size="small" />
                      </div>
                    </div>
                    <div class="p-3">
                      <div class="font-semibold text-sm truncate mb-1">{{ product.name }}</div>
                      <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-500">{{ product.sku || 'N/A' }}</span>
                        <span class="font-bold text-primary">{{ product.price | xaf }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </p-card>
      </div>

      <!-- ── Right: cart ──────────────────────────────────────────────── -->
      <div>
        <p-card header="Panier">

          <app-order-items
            [items]="orderState.items()"
            [customer]="orderState.customer()"
            (updateQuantity)="onUpdateQuantity($event)"
            (removeItem)="onRemoveItem($event)"
            (selectCustomer)="showCustomerDialog.set(true)"
            (clearCustomer)="removeCustomer()" />

          <!--
            [totalAmount] = Order.totalAmount (backend field name)
            Previously wrong: [total] caused the input to be ignored.
          -->
          <app-order-summary
            [subtotal]="orderState.subtotal()"
            [discountAmount]="orderState.discountAmount()"
            [taxRate]="orderState.taxRate()"
            [taxAmount]="orderState.taxAmount()"
            [totalAmount]="orderState.total()"
            [itemCount]="orderState.itemCount()"
            [uniqueItems]="orderState.items().length" />

          <button pButton
                  label="PAYER"
                  icon="pi pi-credit-card"
                  class="w-full p-button-success mt-4 text-lg font-bold py-3"
                  (click)="showPaymentDialog = true"
                  [disabled]="!canProcess()">
          </button>

        </p-card>

        @if (orderState.notes()) {
          <div class="mt-4 p-3 bg-gray-50 rounded text-sm">
            <div class="text-gray-500 mb-1">Notes:</div>
            <div>{{ orderState.notes() }}</div>
          </div>
        }
      </div>
    </div>

    <!-- Payment dialog — emits PaymentEntry[] on confirm -->
    @if (showPaymentDialog) {
      <app-payment-cash
        [totalAmount]="orderState.total()"
        [orderNotes]="orderState.notes()"
        (paymentComplete)="onPaymentComplete($event)"
        (cancel)="showPaymentDialog = false" />
    }
  `,
  styles: [`
    .product-card { transition: transform .2s ease, box-shadow .2s ease; }
    .product-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
  `],
})
export class PosSaleComponent extends OrderCreateBaseComponent implements OnInit {

  // ── Services ──────────────────────────────────────────────────────────────
  private ordersService    = inject(OrderService);
  private viewContainerRef = inject(ViewContainerRef);
  private envInjector      = inject(EnvironmentInjector);
  // Receipt logic is fully delegated to ReceiptDialogComponent (uses ReceiptService internally)

  // ── State ─────────────────────────────────────────────────────────────────
  showPaymentDialog = false;
  processing        = signal(false);
  readonly skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8];

  // ── OrderCreateBaseComponent hooks ────────────────────────────────────────

  override pageTitle(): string { return 'Vente en Caisse'; }

  override canProcess(): boolean {
    return (
      this.orderState.validateForPosSale().valid &&
      !!this.currentShift() &&
      this.currentShift()!.status === ShiftStatus.OPEN
    );
  }

  protected override canAddToCart(): boolean {
    return !!this.currentShift() && this.currentShift()!.status === ShiftStatus.OPEN;
  }

  protected override showCannotAddToCartMessage(): void {
    if (!this.currentShift()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Caisse fermée',
        detail: "Ouvrez une caisse avant d'ajouter des produits",
      });
    }
  }

  /** Payment flow is driven by onPaymentComplete — not used here. */
  override processOrder(): void {}

  // ── Event handlers ────────────────────────────────────────────────────────

  onUpdateQuantity(e: { productId: string; delta: number }): void {
    this.orderState.updateItemQuantity(e.productId, e.delta);
  }

  onRemoveItem(productId: string): void {
    this.orderState.removeItem(productId);
  }

  onFilterChange(): void { this.loadProducts(); }

  onPaymentComplete(payments: PaymentEntry[]): void {
    this.processOrderWithPayments(payments);
  }

  // ── Sale flow ─────────────────────────────────────────────────────────────

  /**
   * Step 1 → POST /orders                   (OrderType.POS_SALE)
   * Step 2 → POST /orders/{id}/payments ×N  (multi-tender)
   * Step 3 → ReceiptDialogComponent:
   *            POST /receipts/order/{id}      → ReceiptDocumentStrategy
   *            GET  /receipts/{rid}/pdf       → PDF download
   *            GET  /receipts/{rid}/thermal   → ESC/POS
   *            POST /receipts/{rid}/reprint   → reprint counter
   */
  private processOrderWithPayments(payments: PaymentEntry[]): void {
    if (this.processing()) return;

    const { valid, errors } = this.orderState.validateForPosSale();
    if (!valid) {
      errors.forEach((msg) =>
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: msg })
      );
      return;
    }

    if (!this.currentShift()) {
      this.messageService.add({ severity: 'error', summary: 'Session invalide',
        detail: 'Aucune session de caisse ouverte' });
      return;
    }

    if (!payments.length) {
      this.messageService.add({ severity: 'warn', summary: 'Aucun paiement',
        detail: 'Veuillez ajouter au moins un paiement' });
      return;
    }

    this.processing.set(true);

    // OrderType.POS_SALE → DocumentStrategyFactory selects ReceiptDocumentStrategy
    const req     = this.orderState.toOrderRequest(
      this.currentShift()!.storeId, payments[0].method, payments[0].amount
    );
    req.orderType = OrderType.POS_SALE;

    const paymentNotes = payments.filter((p) => p.notes)
      .map((p) => `${this.labelForMethod(p.method)}: ${p.notes}`).join('\n');
    if (paymentNotes) req.notes = req.notes ? `${req.notes}\n${paymentNotes}` : paymentNotes;

    this.ordersService.createOrder(req).subscribe({
      next: (order) =>
        payments.length > 1
          ? this.addAdditionalPayments(order.orderId, order.orderNumber, payments.slice(1))
          : this.finalizeSale(order.orderId, order.orderNumber),
      error: (err) => {
        this.processing.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur',
          detail: err?.error?.message ?? 'Erreur lors de la création de la commande' });
      },
    });
  }

  private addAdditionalPayments(
    orderId: string, orderNumber: string, extra: PaymentEntry[]
  ): void {
    Promise.all(
      extra.map((p) =>
        this.ordersService.addPayment(orderId, { method: p.method, amount: p.amount, notes: p.notes }).toPromise()
      )
    )
      .then(() => this.finalizeSale(orderId, orderNumber))
      .catch(() => this.finalizeSale(orderId, orderNumber));
  }

  private finalizeSale(orderId: string, orderNumber: string): void {
    this.processing.set(false);
    this.showPaymentDialog = false;
    this.orderState.clear();

    this.messageService.add({
      severity: 'success', summary: 'Vente validée',
      detail: `Commande #${orderNumber} enregistrée`, life: 3000,
    });

    setTimeout(() => this.openReceiptDialog(orderId), 500);
  }

  private openReceiptDialog(orderId: string): void {
    const ref  = this.viewContainerRef.createComponent(ReceiptDialogComponent, {
      environmentInjector: this.envInjector,
    });
    const inst = ref.instance;
    inst.orderId.set(orderId);
    inst.visible.set(true);

    inst.onComplete = (target: PrintTarget) => {
      ref.destroy();
      if (target === 'later') this.goBack();
      // 'pdf'|'thermal' → stay on page; cart cleared, ready for next sale
    };
    inst.onCancelCb = () => { ref.destroy(); this.goBack(); };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private labelForMethod(method: PaymentMethod): string {
    const map: Partial<Record<PaymentMethod, string>> = {
      [PaymentMethod.CASH]:          'Espèces',
      [PaymentMethod.CREDIT_CARD]:   'Carte',
      [PaymentMethod.MOBILE_MONEY]:  'Mobile Money',
      [PaymentMethod.BANK_TRANSFER]: 'Virement',
    };
    return map[method] ?? method;
  }
}