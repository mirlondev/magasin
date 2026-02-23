// features/orders/pages/pos-sale/pos-sale.component.ts
import {
  Component,
  inject,
  signal,
  OnInit,
  ViewContainerRef,
  EnvironmentInjector,
  computed,
  effect
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
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';

import { PaymentDialogComponent, PaymentEntry } from '../../components/payment-dialog/payment-dialog.component';
import { OrderItemsComponent } from '../../components/order-items/order-items.component';
import { OrderSummaryComponent } from '../../components/order-summary/order-summary.component';
import { ReceiptDialogComponent } from '../../components/receipt-dialog/receipt-dialog.component';
import { CustomerSelectorComponent } from '../../components/customer-selector/customer-selector.component';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

import {
  PaymentMethod,
  ShiftStatus,
  OrderType,
  Product,
  Customer,
  CartItem
} from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';
import { OrderService } from '../../../../core/services/orders.service';
import { PrintTarget } from '../../../../core/services/receipt.service';
import { OrderStateService } from '../../services/order-state.service';

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
    InputTextModule,
    TextareaModule,
    ToastModule,
    TagModule,
    SelectModule,
    ConfirmDialogModule,
    SkeletonModule,
    BadgeModule,
    TooltipModule,
    PopoverModule,
    DividerModule,
    PanelModule,
    PaymentDialogComponent,
    OrderItemsComponent,
    OrderSummaryComponent,
    CustomerSelectorComponent,
    ReceiptDialogComponent,
    XafPipe,
  ],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 h-screen-minus-header p-4">
      
      <!-- Left: Products Grid (8 columns) -->
      <div class="lg:col-span-8 flex flex-col gap-4">
        <!-- Header Stats -->
        <div class="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <i class="pi pi-shopping-bag text-primary text-xl"></i>
              <span class="font-semibold">Vente Directe</span>
            </div>
            <p-divider layout="vertical" styleClass="h-8"></p-divider>
            <div class="text-sm text-gray-600">
              <span class="font-medium">{{ productsService.products().length }}</span> produits disponibles
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            @if (currentShift(); as shift) {
              <div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                   [class.bg-green-100]="shift.status === ShiftStatus.OPEN"
                   [class.text-green-700]="shift.status === ShiftStatus.OPEN"
                   [class.bg-yellow-100]="shift.status === ShiftStatus.SUSPENDED"
                   [class.text-yellow-700]="shift.status === ShiftStatus.SUSPENDED">
                <i class="pi pi-circle-fill text-xs"></i>
                <span>Caisse #{{ shift.shiftNumber }} - {{ shift.status }}</span>
              </div>
            }
            <button pButton 
                    icon="pi pi-refresh" 
                    class="p-button-text p-button-sm"
                    (click)="refreshData()"
                    pTooltip="Actualiser (F5)"
                    tooltipPosition="bottom">
            </button>
          </div>
        </div>

        <!-- Filters -->
        <p-panel header="Filtres" [toggleable]="true" [collapsed]="false" styleClass="mb-0">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-input-icon-left w-full">
              <i class="pi pi-search"></i>
              <input pInputText 
                     type="text"
                     [ngModel]="searchTerm()"
                     (ngModelChange)="searchTerm.set($event); onFilterChange()"
                     placeholder="Rechercher par nom, SKU, code-barres..."
                     class="w-full"
                     #searchInput>
            </div>
            
            <p-select [options]="categoryOptions()"
                      [ngModel]="selectedCategoryId()"
                      (ngModelChange)="selectedCategoryId.set($event); onFilterChange()"
                      placeholder="Toutes les catégories"
                      [showClear]="true"
                      class="w-full">
            </p-select>
            
            <div class="flex gap-2">
              <button pButton 
                      icon="pi pi-barcode" 
                      label="Scan"
                      class="p-button-outlined p-button-secondary w-full"
                      (click)="focusBarcode()"
                      pTooltip="F2: Scanner code-barres">
              </button>
              <button pButton 
                      icon="pi pi-filter-slash" 
                      class="p-button-outlined p-button-secondary"
                      (click)="clearFilters()"
                      pTooltip="Effacer filtres">
              </button>
            </div>
          </div>
        </p-panel>

        <!-- Products Grid -->
        <p-card styleClass="flex-1 overflow-hidden">
          <div class="h-full overflow-auto">
            @if (!shiftReady()) {
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2">
                @for (i of skeletonItems; track i) {
                  <div class="border rounded-lg p-3 space-y-3">
                    <p-skeleton height="120px" />
                    <p-skeleton width="80%" height="1.5rem" />
                    <p-skeleton width="60%" height="1rem" />
                    <div class="flex justify-between">
                      <p-skeleton width="40%" height="1.5rem" />
                      <p-skeleton width="30%" height="1.5rem" />
                    </div>
                  </div>
                }
              </div>
            } @else if (productsService.loading()) {
              <div class="flex flex-col items-center justify-center h-64">
                <i class="pi pi-spin pi-spinner text-4xl text-primary mb-4"></i>
                <p class="text-gray-600">Chargement des produits...</p>
              </div>
            } @else if (filteredProducts().length === 0) {
              <div class="flex flex-col items-center justify-center h-64 text-gray-500">
                <i class="pi pi-search text-5xl mb-4 text-gray-300"></i>
                <p class="text-lg">Aucun produit trouvé</p>
                <p class="text-sm">Essayez avec d'autres critères de recherche</p>
              </div>
            } @else {
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2">
                @for (product of filteredProducts(); track product.productId; let i = $index) {
                  <div class="product-card group border rounded-lg overflow-hidden cursor-pointer bg-white hover:shadow-lg transition-all duration-200 relative"
                       (click)="addToCart(product)"
                       [class.opacity-60]="product.quantity === 0"
                       [class.cursor-not-allowed]="product.quantity === 0">
                    
                    <!-- Stock Badge -->
                    <div class="absolute top-2 right-2 z-10">
                      <p-tag [value]="getStockLabel(product)"
                             [severity]="getStockSeverity(product)" 
                             styleClass="text-xs"
                             [rounded]="true">
                      </p-tag>
                    </div>

                    <!-- Quick Add Button (shown on hover) -->
                    @if (product.quantity > 0) {
                      <div class="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button pButton 
                                icon="pi pi-plus" 
                                class="p-button-rounded p-button-sm p-button-success"
                                (click)="addToCart(product); $event.stopPropagation()">
                        </button>
                      </div>
                    }

                    <!-- Product Image -->
                    <div class="aspect-square bg-gray-50 relative overflow-hidden">
                      @if (getProductImage(product)) {
                        <img [src]="getProductImage(product)" 
                             [alt]="product.name"
                             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      } @else {
                        <div class="w-full h-full flex items-center justify-center bg-gray-100">
                          <i class="pi pi-image text-gray-300 text-4xl"></i>
                        </div>
                      }
                    </div>

                    <!-- Product Info -->
                    <div class="p-3 space-y-2">
                      <div class="font-semibold text-sm line-clamp-2 h-10" [title]="product.name">
                        {{ product.name }}
                      </div>
                      <div class="flex justify-between items-end">
                        <div>
                          <div class="text-xs text-gray-500 mb-1">{{ product.sku || 'N/A' }}</div>
                          <div class="font-bold text-primary text-lg">
                            {{ (product.finalPrice || product.price || 0) | xaf }}
                          </div>
                          @if (product.discountPercentage && product.discountPercentage > 0) {
                            <div class="text-xs text-green-600">
                              -{{ product.discountPercentage }}%
                            </div>
                          }
                        </div>
                        <div class="text-right">
                          <div class="text-xs text-gray-400">Stock</div>
                          <div class="font-medium" [class.text-red-500]="product.quantity === 0">
                            {{ product.quantity || 0 }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </p-card>
      </div>

      <!-- Right: Cart & Checkout (4 columns) -->
      <div class="lg:col-span-4 flex flex-col gap-4">
        
        <!-- Customer Section -->
        <p-card styleClass="shadow-sm">
          <div class="flex justify-between items-center mb-3">
            <span class="font-semibold text-gray-700">
              <i class="pi pi-user mr-2"></i>Client
            </span>
            @if (!orderState.customer()) {
              <button pButton 
                      icon="pi pi-plus" 
                      label="Sélectionner"
                      class="p-button-sm p-button-outlined"
                      (click)="showCustomerDialog.set(true)">
              </button>
            }
          </div>
          
          @if (orderState.customer(); as customer) {
            <div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-semibold text-blue-900">{{ customer.fullName }}</div>
                  <div class="text-sm text-blue-700 mt-1">
                    {{ customer.phone || customer.email || 'Pas de contact' }}
                  </div>
                  @if (customer.loyaltyPoints && customer.loyaltyPoints > 0) {
                    <div class="mt-2">
                      <p-tag [value]="customer.loyaltyPoints + ' points'" 
                             severity="info" 
                             styleClass="text-xs">
                      </p-tag>
                    </div>
                  }
                </div>
                <button pButton 
                        icon="pi pi-times" 
                        class="p-button-rounded p-button-text p-button-sm p-button-danger"
                        (click)="removeCustomer()">
                </button>
              </div>
            </div>
          } @else {
            <div class="text-center py-4 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <i class="pi pi-user-plus text-2xl mb-2"></i>
              <div class="text-sm">Client comptant</div>
            </div>
          }
        </p-card>

        <!-- Cart Items -->
        <p-card styleClass="flex-1 shadow-sm">
          <app-order-items
            [items]="orderState.items()"
            [customer]="orderState.customer()"
            (updateQuantity)="onUpdateQuantity($event)"
            (removeItem)="onRemoveItem($event)"
            (clearAll)="onClearCart()"
            (selectCustomer)="showCustomerDialog.set(true)"
            (clearCustomer)="removeCustomer()" />
        </p-card>

        <!-- Order Summary -->
        <p-card styleClass="shadow-sm bg-gray-50">
          <app-order-summary
            [subtotal]="orderState.subtotal()"
            [discountAmount]="orderState.discountAmount()"
            [taxRate]="orderState.taxRate()"
            [taxAmount]="orderState.taxAmount()"
            [totalAmount]="orderState.total()"
            [itemCount]="orderState.itemCount()"
            [uniqueItems]="orderState.items().length" />
          
          <!-- Notes -->
          <div class="mt-4">
            <textarea pInputTextarea 
                      [(ngModel)]="orderNotes"
                      rows="2"
                      class="w-full text-sm"
                      placeholder="Notes sur la vente...">
            </textarea>
          </div>

          <!-- Action Buttons -->
          <div class="mt-4 space-y-2">
            <button pButton
                    [label]="checkoutLabel()"
                    [icon]="checkoutIcon()"
                    class="w-full p-button-success py-3 text-lg font-bold"
                    (click)="initiateCheckout()"
                    [disabled]="!canCheckout()"
                    [loading]="processing()">
            </button>
            
            @if (orderState.items().length > 0) {
              <button pButton
                      label="Sauvegarder comme brouillon"
                      icon="pi pi-save"
                      class="w-full p-button-outlined p-button-secondary"
                      (click)="saveAsDraft()">
              </button>
            }
          </div>
        </p-card>
      </div>
    </div>

    <!-- Customer Selection Dialog -->
    @if (showCustomerDialog()) {
      <app-customer-selector
        [customer]="orderState.customer()"
        (customerSelected)="selectCustomer($event)"
        (customerCleared)="removeCustomer()"
        (close)="showCustomerDialog.set(false)" />
    }

    <!-- Payment Dialog -->
    @if (showPaymentDialog()) {
      <app-payment-dialog
        [totalAmount]="orderState.total()"
        [orderType]="OrderType.POS_SALE"
        [customerName]="orderState.customer()?.fullName || ''"
        (paymentComplete)="onPaymentComplete($event)"
        (cancel)="showPaymentDialog.set(false)" />
    }

    <!-- Receipt Dialog -->
    @if (showReceiptDialog() && completedOrderId()) {
      <app-receipt-dialog
        [orderId]="completedOrderId()!"
        (complete)="onReceiptComplete($event)"
        (cancel)="showReceiptDialog.set(false)" />
    }

    <!-- Barcode Scanner Input (hidden) -->
    <input type="text" 
           #barcodeInput
           class="fixed opacity-0 pointer-events-none"
           (keydown.enter)="onBarcodeScanned($event)">
  `,
  styles: [`
    .product-card {
      transition: all 0.2s ease;
    }
    .product-card:hover:not(.cursor-not-allowed) {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .h-screen-minus-header {
      height: calc(100vh - 80px);
    }
  `]
})
export class PosSaleComponent extends OrderCreateBaseComponent implements OnInit {
  // Services
  private ordersService = inject(OrderService);
  private viewContainerRef = inject(ViewContainerRef);
  private envInjector = inject(EnvironmentInjector);
  protected confirmationService = inject(ConfirmationService);
  protected override router = inject(Router);

  // State
  showPaymentDialog = signal(false);
  showReceiptDialog = signal(false);
  processing = signal(false);
  override showCustomerDialog = signal(false);
  completedOrderId = signal<string | null>(null);
  orderNotes = '';

  readonly skeletonItems = Array.from({ length: 10 }, (_, i) => i);
  readonly ShiftStatus = ShiftStatus;
  readonly OrderType = OrderType;

  // Computed
  filteredProducts = computed(() => {
    const products = this.productsService.products();
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) return products;

    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.barcode?.toLowerCase().includes(term)
    );
  });

  canCheckout = computed(() =>
    this.orderState.items().length > 0 &&
    !!this.currentShift() &&
    this.currentShift()!.status === ShiftStatus.OPEN &&
    !this.processing()
  );

  checkoutLabel = computed(() => {
    const total = this.orderState.total();
    const items = this.orderState.items().length;
    if (items === 0) return 'PANIER VIDE';
    return `PAYER ${total.toLocaleString()} XAF`;
  });

  checkoutIcon = computed(() => {
    if (this.orderState.items().length === 0) return 'pi pi-shopping-cart';
    return 'pi pi-credit-card';
  });

  override ngOnInit() {
    super.ngOnInit();
    this.setupHotkeys();
  }

  private setupHotkeys() {
    // Shortcut stubs - implement with @angular/cdk or similar if needed
  }

  // Override base methods
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
    } else if (this.currentShift()!.status !== ShiftStatus.OPEN) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Session suspendue',
        detail: "Reprenez la session de caisse pour continuer",
      });
    }
  }

  // Event Handlers
  onUpdateQuantity(e: { productId: string; delta: number }): void {
    this.orderState.updateItemQuantity(e.productId, e.delta);
  }

  onRemoveItem(productId: string): void {
    this.orderState.removeItem(productId);
    this.messageService.add({
      severity: 'info',
      summary: 'Article retiré',
      detail: 'Produit retiré du panier',
      life: 1000
    });
  }

  onClearCart(): void {
    this.confirmClearCart();
  }

  confirmClearCart(): void {
    this.confirmationService.confirm({
      message: 'Voulez-vous vraiment vider le panier?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.orderState.clear();
        this.messageService.add({
          severity: 'info',
          summary: 'Panier vidé',
          life: 1000
        });
      }
    });
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

  override removeCustomer(): void {
    this.orderState.setCustomer(null);
  }

  onFilterChange(): void {
    this.loadProducts();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategoryId.set('all');
    this.onFilterChange();
  }

  // Barcode handling
  focusBarcode(): void {
    // Implementation would focus hidden input
    this.messageService.add({
      severity: 'info',
      summary: 'Scan code-barres',
      detail: 'Scannez un produit...',
      life: 2000
    });
  }

  onBarcodeScanned(event: Event): void {
    const barcode = (event.target as HTMLInputElement).value;
    if (barcode) {
      this.searchByBarcode(barcode);
      (event.target as HTMLInputElement).value = '';
    }
  }

  searchByBarcode(barcode: string): void {
    const product = this.productsService.products().find(p => p.barcode === barcode);
    if (product) {
      this.addToCart(product);
      this.messageService.add({
        severity: 'success',
        summary: 'Produit scanné',
        detail: product.name,
        life: 1000
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Produit non trouvé',
        detail: `Code-barres: ${barcode}`,
        life: 3000
      });
    }
  }

  // Checkout flow
  initiateCheckout(): void {
    if (!this.canCheckout()) return;

    const validation = this.orderState.validateForPosSale();
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

    this.showPaymentDialog.set(true);
  }

  onPaymentComplete(payments: PaymentEntry[]): void {
    this.processOrderWithPayments(payments);
  }

  private processOrderWithPayments(payments: PaymentEntry[]): void {
    if (this.processing()) return;

    this.processing.set(true);
    this.showPaymentDialog.set(false);

    const req = this.orderState.toOrderRequest(
      this.currentShift()!.storeId,
      payments[0]?.method || PaymentMethod.CASH,
      payments[0]?.amount || this.orderState.total()
    );

    req.orderType = OrderType.POS_SALE;
    req.notes = this.orderNotes || undefined;

    // Add additional payment info to notes
    if (payments.length > 1) {
      const paymentDetails = payments.map((p, i) =>
        `Paiement ${i + 1}: ${this.getPaymentMethodLabel(p.method)} ${p.amount} XAF`
      ).join('\n');
      req.notes = req.notes ? `${req.notes}\n${paymentDetails}` : paymentDetails;
    }

    this.ordersService.createOrder(req).subscribe({
      next: (order) => {
        // Handle additional payments if any
        if (payments.length > 1) {
          this.addAdditionalPayments(order.orderId, order.orderNumber, payments.slice(1));
        } else {
          this.finalizeSale(order.orderId, order.orderNumber);
        }
      },
      error: (err) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message ?? 'Erreur lors de la création de la commande'
        });
      }
    });
  }

  private addAdditionalPayments(
    orderId: string,
    orderNumber: string,
    extraPayments: PaymentEntry[]
  ): void {
    Promise.all(
      extraPayments.map(p =>
        this.ordersService.addPayment(orderId, {
          method: p.method,
          amount: p.amount,
          notes: p.notes
        }).toPromise()
      )
    ).then(() => {
      this.finalizeSale(orderId, orderNumber);
    }).catch(() => {
      // Even if additional payments fail, sale was created
      this.finalizeSale(orderId, orderNumber);
    });
  }

  private finalizeSale(orderId: string, orderNumber: string): void {
    this.processing.set(false);
    this.orderState.clear();
    this.orderNotes = '';
    this.completedOrderId.set(orderId);

    this.messageService.add({
      severity: 'success',
      summary: 'Vente validée!',
      detail: `Commande #${orderNumber} enregistrée`,
      life: 5000
    });

    // Auto-show receipt after short delay
    setTimeout(() => {
      this.showReceiptDialog.set(true);
    }, 500);
  }

  onReceiptComplete(target: PrintTarget): void {
    this.showReceiptDialog.set(false);
    this.completedOrderId.set(null);

    if (target === 'later') {
      this.router.navigate(['/orders']);
    }
    // Otherwise stay on POS for next sale
  }

  saveAsDraft(): void {
    // Implementation for saving draft order
    this.messageService.add({
      severity: 'info',
      summary: 'Brouillon sauvegardé',
      detail: 'La commande a été sauvegardée comme brouillon'
    });
  }

  private getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Espèces',
      [PaymentMethod.CREDIT_CARD]: 'Carte',
      [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
      [PaymentMethod.BANK_TRANSFER]: 'Virement',
      [PaymentMethod.CHECK]: 'Chèque',
      [PaymentMethod.CREDIT]: 'Crédit',
      [PaymentMethod.DEBIT_CARD]: 'Débit',
      [PaymentMethod.LOYALTY_POINTS]: 'Points',
      [PaymentMethod.MIXED]: 'Mixte'
    };
    return labels[method] || method;
  }
}