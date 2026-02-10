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
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

import { OrderItemsComponent } from '../../components/order-items/order-items.component';
import { OrderSummaryComponent } from '../../components/order-summary/order-summary.component';
import { PaymentMethod, OrderStatus, PaymentStatus, Customer } from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';
import { OrderService } from '../../../../core/services/orders.service';
import { CustomerSelectorComponent } from '../../components/customer-selector/customer-selector.component';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePickerModule } from 'primeng/datepicker';
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
    XafPipe,
    OrderItemsComponent,
    OrderSummaryComponent,
    CustomerSelectorComponent,
    SkeletonModule,
    DatePickerModule
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

        <!-- Colonne droite - Panier et validation -->
        <div>
          <p-card header="Vente à Crédit">
            <!-- Customer Required Warning -->
            @if (!orderState.customer()) {
              <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div class="flex items-center gap-2">
                  <i class="pi pi-exclamation-triangle text-yellow-500"></i>
                  <div class="text-sm text-yellow-700">
                    Un client est <strong>obligatoire</strong> pour une vente à crédit
                  </div>
                </div>
              </div>
            }
            
            <app-customer-selector
              [customer]="orderState.customer()"
              (customerSelected)="onCustomerSelected($event)"
              (customerCleared)="removeCustomer()">
            </app-customer-selector>

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

            <!-- Credit Terms -->
            <div class="mt-4 p-4 border rounded-lg">
              <h3 class="font-semibold mb-3">Conditions du crédit</h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Montant du crédit:</span>
                  <span class="font-bold text-orange-600">{{ orderState.total() | xaf }}</span>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Date d'échéance</label>
                   <p-datepicker type="date" 
                         [(ngModel)]="dueDate"
                         class="w-full p-2 border rounded"
                          [showIcon]="true" inputId="buttondisplay"  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Notes (optionnel)</label>
                  <textarea [(ngModel)]="creditNotes"
                            class="w-full p-2 border rounded"
                            rows="2"
                            placeholder="Conditions particulières..."></textarea>
                </div>
              </div>
            </div>

            <!-- Bouton CRÉER CRÉDIT -->
            <button pButton 
                    label="CRÉER CRÉDIT" 
                    icon="pi pi-file-export" 
                    class="w-full p-button-warning mt-4 text-lg font-bold py-3"
                    (click)="createCreditSale()"
                    [disabled]="!canProcess() || processing()">
              @if (processing()) {
                <i class="pi pi-spin pi-spinner ml-2"></i>
              }
            </button>

            @if (!canProcess() && orderState.itemCount() > 0) {
              <div class="text-center text-sm text-red-500 mt-2">
                @if (!orderState.customer()) {
                  Sélectionnez un client pour continuer
                } @else if (!dueDate) {
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
      transition: all 0.2s ease;
    }
    
    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class CreditSaleComponent extends OrderCreateBaseComponent {
  onCustomerSelected(customer: Customer) {
    this.orderState.setCustomer(customer);
  }

  private ordersService = inject(OrderService);
  private confirmationService = inject(ConfirmationService);
  
  processing = signal(false);
  dueDate = '';
  creditNotes = '';
  today = new Date().toISOString().split('T')[0];

  // Implémentation des méthodes abstraites
  override pageTitle(): string {
    return 'Vente à Crédit';
  }

  override canProcess(): boolean {
    const validation = this.orderState.validateForCreditSale();
    return validation.valid && !!this.dueDate;
  }

  // Méthodes spécifiques Credit Sale
  onUpdateQuantity(event: { productId: string; delta: number }) {
    this.orderState.updateItemQuantity(event.productId, event.delta);
  }

  onRemoveItem(productId: string) {
    this.orderState.removeItem(productId);
  }

  onFilterChange() {
    this.loadProducts();
  }

  createCreditSale() {
    if (this.processing()) return;

    const validation = this.orderState.validateForCreditSale();
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

    if (!this.dueDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Date d\'échéance requise',
        detail: 'Veuillez spécifier une date d\'échéance'
      });
      return;
    }

    this.processing.set(true);

    // Create order request WITHOUT initial payment
    const orderRequest = this.orderState.toOrderRequest(
      this.currentShift()?.storeId || '',
      undefined, // No payment method on order creation
      undefined  // No initial amount
    );

    // Add credit-specific notes
    let notes = `Vente à crédit - Échéance: ${this.dueDate}`;
    if (this.creditNotes) {
      notes += `\n${this.creditNotes}`;
    }
    if (orderRequest.notes) {
      notes += `\n${orderRequest.notes}`;
    }
    orderRequest.notes = notes;

    // Create the order first
    this.ordersService.createOrder(orderRequest).subscribe({
      next: (order) => {
        // Now add the CREDIT payment entry via the payment endpoint
        const creditPayment = {
          method: PaymentMethod.CREDIT,
          amount: order.totalAmount,
          notes: `Crédit - Échéance: ${this.dueDate}`
        };

        this.ordersService.addPayment(order.orderId, creditPayment).subscribe({
          next: () => {
            this.handleCreditSuccess(order.orderId, order.orderNumber);
          },
          error: (error) => {
            console.error('Error adding credit payment:', error);
            // Order created but payment failed - show partial success
            this.messageService.add({
              severity: 'warn',
              summary: 'Commande créée',
              detail: 'Mais le paiement crédit n\'a pas pu être enregistré'
            });
            this.handleCreditSuccess(order.orderId, order.orderNumber);
          }
        });
      },
      error: (error) => {
        this.processing.set(false);
        console.error('Error creating credit sale:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error?.error?.message || 'Erreur lors de la création du crédit'
        });
      }
    });
  }

  private handleCreditSuccess(orderId: string, orderNumber: string) {
    this.processing.set(false);
    this.orderState.clear();
    this.dueDate = '';
    this.creditNotes = '';
    
    this.messageService.add({ 
      severity: 'success', 
      summary: 'Crédit créé', 
      detail: `Commande crédit #${orderNumber} enregistrée`,
      life: 5000 
    });
    
    // Generate invoice automatically for credit sales
    this.generateAndDownloadInvoice(orderId);
  }

  private generateAndDownloadInvoice(orderId: string) {
    this.messageService.add({
      severity: 'info',
      summary: 'Génération de la facture',
      detail: 'Veuillez patienter...'
    });

    // Generate the invoice
    this.ordersService.generateInvoice(orderId).subscribe({
      next: (invoice) => {
        // Download the invoice PDF
        this.downloadInvoicePdf(invoice.invoiceId);
      },
      error: (error) => {
        console.error('Error generating invoice:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la génération de la facture'
        });
        
        // Still ask if they want to try again
        this.confirmationService.confirm({
          message: 'La facture n\'a pas pu être générée automatiquement. Voulez-vous réessayer ?',
          header: 'Erreur de génération',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Réessayer',
          rejectLabel: 'Plus tard',
          accept: () => this.generateAndDownloadInvoice(orderId),
          reject: () => this.goBack()
        });
      }
    });
  }

  private downloadInvoicePdf(invoiceId: string) {
    this.ordersService.downloadInvoicePdf(invoiceId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-credit-${invoiceId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Facture générée',
          detail: 'La facture a été téléchargée avec succès'
        });
        
        this.goBack();
      },
      error: (error) => {
        console.error('Error downloading invoice:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du téléchargement de la facture'
        });
        this.goBack();
      }
    });
  }

  override processOrder() {
    this.createCreditSale();
  }
}