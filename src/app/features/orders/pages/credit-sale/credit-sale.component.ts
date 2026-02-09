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
import { PaymentCreditComponent } from '../../components/payment-credit/payment-credit.component';
import { OrderSummaryComponent } from '../../components/order-summary/order-summary.component';
import { OrdersService } from '../../../../core/services/orders.service';
import { PaymentMethod, OrderStatus, PaymentStatus } from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';

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
    OrderCreateBaseComponent
],
  template: `
    <app-order-create-base>
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
              @if (productsService.loading()) {
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

            <app-order-items 
              [items]="orderState.items()"
              [customer]="orderState.customer()"
              (updateQuantity)="onUpdateQuantity($event)"
              (removeItem)="onRemoveItem($event)"
              (customerSelected)="showCustomerDialog.set(true)"
              (customerRemoved)="removeCustomer()">
            </app-order-items>

            <app-order-summary
              [subtotal]="orderState.subtotal()"
              [discountAmount]="orderState.discountAmount()"
              [taxRate]="orderState.taxRate()"
              [taxAmount]="orderState.taxAmount()"
              [total]="orderState.total()">
            </app-order-summary>

            <!-- Credit Terms -->
            <div class="mt-4 p-4 border rounded-lg">
              <h3 class="font-semibold mb-3">Conditions du crédit</h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-600">Montant du crédit:</span>
                  <span class="font-bold">{{ orderState.total() | xaf }}</span>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Date d'échéance</label>
                  <input type="date" 
                         [(ngModel)]="dueDate"
                         class="w-full p-2 border rounded"
                         [min]="today">
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
                    [disabled]="!canProcess()">
            </button>

            @if (!canProcess() && orderState.itemCount() > 0) {
              <div class="text-center text-sm text-red-500 mt-2">
                @if (!orderState.customer()) {
                  Sélectionnez un client pour continuer
                }
              </div>
            }
          </p-card>
        </div>
      </div>
    </app-order-create-base>
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
  private ordersService = inject(OrdersService);
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
    return validation.valid;
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

    const orderRequest = this.orderState.toOrderRequest(
      this.currentShift()?.storeId || '', // Store ID is required
      PaymentMethod.CREDIT, // Always CREDIT for credit sales
      0 // No payment received initially
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

    this.ordersService.createOrder(orderRequest).subscribe({
      next: (order) => {
        this.processing.set(false);
        this.orderState.clear();
        this.dueDate = '';
        this.creditNotes = '';
        
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Crédit créé', 
          detail: `Commande crédit #${order.orderNumber} enregistrée`,
          life: 5000 
        });
        
        // Generate credit invoice
        this.confirmationService.confirm({
          message: 'Voulez-vous imprimer la facture crédit ?',
          header: 'Impression',
          icon: 'pi pi-print',
          acceptLabel: 'Imprimer',
          rejectLabel: 'Plus tard',
          accept: () => this.generateCreditInvoice(order.orderId),
          reject: () => this.goBack()
        });
      },
      error: (error) => {
        this.processing.set(false);
        console.error('Error creating credit sale:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la création du crédit'
        });
      }
    });
  }

  override processOrder() {
    this.createCreditSale();
  }

  private generateCreditInvoice(orderId: string) {
    this.ordersService.generateInvoice(orderId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-credit-${orderId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.goBack();
      },
      error: (error) => {
        console.error('Error generating credit invoice:', error);
        this.messageService.add({
          severity: 'warn',
          summary: 'Impression',
          detail: 'Erreur lors de la génération de la facture'
        });
        this.goBack();
      }
    });
  }
}