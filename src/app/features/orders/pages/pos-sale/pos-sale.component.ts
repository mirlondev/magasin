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

import { PaymentCashComponent } from '../../components/payment-cash/payment-cash.component';
import { PaymentMethod, OrderStatus, PaymentStatus, ShiftStatus } from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';
import { OrderItemsComponent } from "../../components/order-items/order-items.component";
import { OrderSummaryComponent } from "../../components/order-summary/order-summary.component";
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { OrderService } from '../../../../core/services/orders.service';
import { OrderHelper } from '../../../../core/utils/helpers';
import { SkeletonModule } from 'primeng/skeleton';

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
    PaymentCashComponent,
    OrderItemsComponent,
    OrderSummaryComponent,
    XafPipe,
    SkeletonModule
  ],
  template: `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Colonne gauche - Sélection produits -->
        <div class="lg:col-span-2">
          <p-card header="Sélection des Produits">
            <!-- Barre de recherche et filtres -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium mb-2">Recherche</label>
                <div class="p-input-icon-left w-full">
                  <i class="pi pi-search"></i>
                  <input pInputText 
                         type="text" 
                         [ngModel]="searchTerm()"
                         (ngModelChange)="searchTerm.set($event)"
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

            <!-- Grille produits -->
            <div class="border rounded-lg p-4">
              @if (!shiftReady()) {
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  @for (i of [1,2,3,4,5,6,7,8]; track i) {
                    <p-card>
                      <p-skeleton height="140px" class="mb-3"></p-skeleton>
                      <p-skeleton width="80%" class="mb-2"></p-skeleton>
                      <p-skeleton width="60%"></p-skeleton>
                    </p-card>
                  }
                </div>
              }
              @else {
                @if (productsService.loading()) {
                  <div class="text-center py-8">
                    <i class="pi pi-spin pi-spinner text-4xl text-primary mb-4"></i>
                    <p class="text-gray-600">Chargement des produits...</p>
                  </div>
                }
                @else if (productsService.products().length === 0) {
                  <div class="text-center py-8">
                    <i class="pi pi-box text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">Aucun produit trouvé</p>
                  </div>
                }
                @else {
                  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    @for (product of productsService.products(); track product.productId) {
                      <div class="product-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
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
                            <div class="font-bold text-primary">{{ product.price | xaf}}</div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </p-card>
        </div>

        <!-- Colonne droite - Panier et paiement -->
        <div>
          <p-card header="Panier">
            <app-order-items 
              [items]="orderState.items()"
              [customer]="orderState.customer()"
              (updateQuantity)="onUpdateQuantity($event)"
              (removeItem)="onRemoveItem($event)"
              (selectCustomer)="showCustomerDialog.set(true)"
              (clearCustomer)="removeCustomer()">
            </app-order-items>

            <app-order-summary
              [subtotal]="orderState.subtotal()"
              [discountAmount]="orderState.discountAmount()"
              [taxRate]="orderState.taxRate()"
              [taxAmount]="orderState.taxAmount()"
              [total]="orderState.total()"
              [itemCount]="orderState.itemCount()"
              [uniqueItems]="orderState.items().length">
            </app-order-summary>

            <!-- Bouton PAYER -->
            <button pButton 
                    label="PAYER" 
                    icon="pi pi-credit-card" 
                    class="w-full p-button-success mt-4 text-lg font-bold py-3"
                    (click)="showPaymentDialog = true"
                    [disabled]="!canProcess()">
            </button>

            <!-- Aperçu notes -->
            @if (orderState.notes()) {
              <div class="mt-4 p-3 bg-gray-50 rounded">
                <div class="text-sm text-gray-500">Notes:</div>
                <div class="text-sm">{{ orderState.notes() }}</div>
              </div>
            }
          </p-card>
        </div>
      </div>

      <!-- Dialog paiement -->
      @if (showPaymentDialog) {
        <app-payment-cash
          [totalAmount]="orderState.total()"
          [orderNotes]="orderState.notes()"
          (paymentComplete)="onPaymentComplete($event)"
          (cancel)="showPaymentDialog = false">
        </app-payment-cash>
      }
  `,
  styles: [`
    .product-card {
      transition: all 0.2s ease;
    }
    
    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class PosSaleComponent extends OrderCreateBaseComponent {
  private ordersService = inject(OrderService);
  private confirmationService = inject(ConfirmationService);

  showPaymentDialog = false;
  processing = signal(false);

  // Implémentation des méthodes abstraites
  override pageTitle(): string {
    return 'Vente en Caisse';
  }

  override canProcess(): boolean {
    const validation = this.orderState.validateForPosSale();
    return validation.valid && !!this.currentShift();
  }

  // Méthodes spécifiques POS
  onUpdateQuantity(event: { productId: string; delta: number }) {
    this.orderState.updateItemQuantity(event.productId, event.delta);
  }

  onRemoveItem(productId: string) {
    this.orderState.removeItem(productId);
  }

  onFilterChange() {
    this.loadProducts();
  }

  onPaymentComplete(payments: PaymentEntry[]) {
    this.processOrderWithPayments(payments);
  }

  private processOrderWithPayments(payments: PaymentEntry[]) {
    if (this.processing()) return;

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

    if (!this.currentShift()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Session invalide',
        detail: 'Aucune session de caisse ouverte'
      });
      return;
    }

    if (payments.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aucun paiement',
        detail: 'Veuillez ajouter au moins un paiement'
      });
      return;
    }

    this.processing.set(true);

    // Create order with first payment (for backward compatibility)
    const firstPayment = payments[0];
    const orderRequest = this.orderState.toOrderRequest(
      this.currentShift()!.storeId,
      firstPayment.method,
      firstPayment.amount
    );

    // Combine all payment notes
    const paymentNotes = payments
      .filter(p => p.notes)
      .map(p => `${this.getPaymentMethodLabel(p.method)}: ${p.notes}`)
      .join('\n');

    if (paymentNotes) {
      orderRequest.notes = orderRequest.notes
        ? `${orderRequest.notes}\n${paymentNotes}`
        : paymentNotes;
    }

    // Create the order
    this.ordersService.createOrder(orderRequest).subscribe({
      next: (order) => {
        // If there are additional payments, add them
        if (payments.length > 1) {
          this.addAdditionalPayments(order.orderId, payments.slice(1));
        } else {
          this.handleOrderSuccess(order.orderId, order.orderNumber);
        }
      },
      error: (error) => {
        this.processing.set(false);
        console.error('Error creating POS order:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error?.error?.message || 'Erreur lors de la création de la commande'
        });
      }
    });
  }

  private addAdditionalPayments(orderId: string, additionalPayments: PaymentEntry[]) {
    // Add additional payments sequentially
    const paymentRequests = additionalPayments.map(payment => ({
      method: payment.method,
      amount: payment.amount,
      notes: payment.notes
    }));

    // Process all additional payments
    Promise.all(
      paymentRequests.map(req =>
        this.ordersService.addPayment(orderId, req).toPromise()
      )
    ).then(() => {
      // Get order number for success message
      this.ordersService.getOrderById(orderId).subscribe({
        next: (order) => {
          this.handleOrderSuccess(orderId, order.orderNumber);
        },
        error: () => {
          this.handleOrderSuccess(orderId, 'N/A');
        }
      });
    }).catch(error => {
      console.error('Error adding additional payments:', error);
      this.messageService.add({
        severity: 'warn',
        summary: 'Paiements partiels',
        detail: 'Certains paiements n\'ont pas pu être ajoutés'
      });
      this.handleOrderSuccess(orderId, 'N/A');
    });
  }

  private handleOrderSuccess(orderId: string, orderNumber: string) {
    this.processing.set(false);
    this.showPaymentDialog = false;
    this.orderState.clear();

    this.messageService.add({
      severity: 'success',
      summary: 'Vente validée',
      detail: `Commande #${orderNumber} enregistrée`,
      life: 5000
    });

    // Impression automatique du ticket
    this.confirmationService.confirm({
      message: 'Voulez-vous imprimer le ticket de caisse ?',
      header: 'Impression',
      icon: 'pi pi-print',
      acceptLabel: 'Imprimer',
      rejectLabel: 'Plus tard',
      accept: () => this.generateReceipt(orderId),
      reject: () => this.goBack()
    });
  }

  override processOrder() {
    // Ne pas utiliser - la logique est dans onPaymentComplete
  }

  private generateReceipt(orderId: string) {
    this.ordersService.generateInvoice(orderId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${orderId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.goBack();
      },
      error: (error) => {
        console.error('Error generating receipt:', error);
        this.messageService.add({
          severity: 'warn',
          summary: 'Impression',
          detail: 'Erreur lors de la génération du ticket'
        });
        this.goBack();
      }
    });
  }

  private getPaymentMethodLabel(method: PaymentMethod): string {
    return OrderHelper.getPaymentMethodLabel(method);
  }

  // Surdéfinition pour validation spécifique POS
  protected override canAddToCart(): boolean {
    return !!this.currentShift() && this.currentShift()!.status === ShiftStatus.OPEN;
  }

  protected override showCannotAddToCartMessage() {
    if (!this.currentShift()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Caisse fermée',
        detail: 'Ouvrez une caisse avant d\'ajouter des produits'
      });
    } else if (this.currentShift()!.status !== ShiftStatus.OPEN) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Session suspendue',
        detail: 'La session de caisse n\'est pas ouverte'
      });
    }
  }
}