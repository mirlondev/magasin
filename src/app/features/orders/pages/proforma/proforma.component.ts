import { Component, inject, OnInit, signal } from '@angular/core';
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

import { OrderItemsComponent } from '../../components/order-items/order-items.component';
import { OrderSummaryComponent } from '../../components/order-summary/order-summary.component';
import { OrderStatus } from '../../../../core/models';
import { OrderCreateBaseComponent } from "../shared/order-create-base.component";
import { OrdersService } from '../../../../core/services/orders.service';
import { Tag } from "primeng/tag";
import { SelectModule } from 'primeng/select';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

@Component({
  selector: 'app-proforma',
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
    SelectModule,
    ConfirmDialogModule,
    OrderItemsComponent,
    OrderSummaryComponent,
    OrderCreateBaseComponent,
    Tag,
    XafPipe
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
          <p-card header="Devis / Proforma">
            <!-- Proforma Info -->
            <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center gap-2">
                <i class="pi pi-info-circle text-blue-500"></i>
                <div class="text-sm text-blue-700">
                  <strong>Document non contraignant</strong> - À utiliser pour validation client
                </div>
              </div>
            </div>

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

            <!-- Proforma Details -->
            <div class="mt-4 p-4 border rounded-lg">
              <h3 class="font-semibold mb-3">Détails du devis</h3>
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium mb-2">Référence devis</label>
                  <input type="text" 
                         [(ngModel)]="proformaReference"
                         class="w-full p-2 border rounded"
                         placeholder="DEV-2024-001">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Date de validité (jours)</label>
                  <input type="number" 
                         [(ngModel)]="validityDays"
                         min="1"
                         max="90"
                         class="w-full p-2 border rounded"
                         placeholder="30">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Notes (optionnel)</label>
                  <textarea [(ngModel)]="proformaNotes"
                            class="w-full p-2 border rounded"
                            rows="3"
                            placeholder="Conditions spécifiques, délais de livraison..."></textarea>
                </div>
              </div>
            </div>

            <!-- Bouton ENREGISTRER PROFORMA -->
            <button pButton 
                    label="ENREGISTRER PROFORMA" 
                    icon="pi pi-file-edit" 
                    class="w-full p-button-help mt-4 text-lg font-bold py-3"
                    (click)="createProforma()"
                    [disabled]="!canProcess()">
            </button>

            <!-- Additional Actions -->
            <div class="flex gap-2 mt-4">
              <button pButton 
                      label="Sauvegarder comme brouillon" 
                      icon="pi pi-save" 
                      class="p-button-outlined flex-1"
                      (click)="saveAsDraft()">
              </button>
              
              <button pButton 
                      label="Transformer en vente" 
                      icon="pi pi-sync" 
                      class="p-button-success flex-1"
                      (click)="convertToSale()"
                      [disabled]="!orderState.itemCount()">
              </button>
            </div>
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
export class ProformaComponent extends OrderCreateBaseComponent implements OnInit{
  private ordersService = inject(OrdersService);
  private confirmationService = inject(ConfirmationService);
  
  processing = signal(false);
  proformaReference = '';
  validityDays = 30;
  proformaNotes = '';

  // Implémentation des méthodes abstraites
  override pageTitle(): string {
    return 'Devis / Proforma';
  }

  override canProcess(): boolean {
    const validation = this.orderState.validateForProforma();
    return validation.valid;
  }

  // Méthodes spécifiques Proforma
  onUpdateQuantity(event: { productId: string; delta: number }) {
    this.orderState.updateItemQuantity(event.productId, event.delta);
  }

  onRemoveItem(productId: string) {
    this.orderState.removeItem(productId);
  }

  onFilterChange() {
    this.loadProducts();
  }

  createProforma() {
    if (this.processing()) return;

    const validation = this.orderState.validateForProforma();
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

    this.processing.set(true);

    const orderRequest = this.orderState.toOrderRequest(
      this.currentShift()?.storeId || '',
      undefined, // No payment method for proforma
      0 // No payment
    );

    // Add proforma-specific notes
    let notes = `DEVIS - Référence: ${this.proformaReference || 'Auto-généré'}`;
    notes += `\nValidité: ${this.validityDays} jours`;
    if (this.proformaNotes) {
      notes += `\n${this.proformaNotes}`;
    }
    if (orderRequest.notes) {
      notes += `\n${orderRequest.notes}`;
    }
    orderRequest.notes = notes;

    // Create order with DRAFT status
    const proformaRequest = {
      ...orderRequest,
      status: OrderStatus.PENDING // Or DRAFT depending on your backend
    };

    this.ordersService.createOrder(proformaRequest).subscribe({
      next: (order) => {
        this.processing.set(false);
        
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Devis créé', 
          detail: `Proforma #${order.orderNumber} enregistré`,
          life: 5000 
        });
        
        // Generate proforma PDF
        this.confirmationService.confirm({
          message: 'Voulez-vous générer le PDF du devis ?',
          header: 'Génération PDF',
          icon: 'pi pi-file-pdf',
          acceptLabel: 'Générer',
          rejectLabel: 'Plus tard',
          accept: () => this.generateProformaPdf(order.orderId),
          reject: () => {
            this.orderState.clear();
            this.resetForm();
            this.goBack();
          }
        });
      },
      error: (error) => {
        this.processing.set(false);
        console.error('Error creating proforma:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la création du devis'
        });
      }
    });
  }

  override processOrder() {
    this.createProforma();
  }

  saveAsDraft() {
    // Save current state locally without creating order
    const draft = {
      items: this.orderState.items(),
      customer: this.orderState.customer(),
      notes: this.orderState.notes(),
      discountAmount: this.orderState.discountAmount(),
      taxRate: this.orderState.taxRate(),
      proformaReference: this.proformaReference,
      validityDays: this.validityDays,
      proformaNotes: this.proformaNotes,
      savedAt: new Date().toISOString()
    };

    // Save to localStorage or service
    localStorage.setItem('proforma-draft', JSON.stringify(draft));
    
    this.messageService.add({
      severity: 'info',
      summary: 'Brouillon sauvegardé',
      detail: 'Le devis a été sauvegardé comme brouillon',
      life: 3000
    });
  }

  convertToSale() {
    this.confirmationService.confirm({
      message: 'Transformer ce devis en vente immédiate ?',
      header: 'Conversion en vente',
      icon: 'pi pi-exclamation-circle',
      acceptLabel: 'Convertir',
      rejectLabel: 'Annuler',
      accept: () => {
        // Navigate to POS sale with current items
        this.router.navigate(['/orders/pos-sale']);
      }
    });
  }

  private generateProformaPdf(orderId: string) {
    this.ordersService.generateInvoice(orderId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devis-${orderId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.orderState.clear();
        this.resetForm();
        this.goBack();
      },
      error: (error) => {
        console.error('Error generating proforma PDF:', error);
        this.messageService.add({
          severity: 'warn',
          summary: 'Génération PDF',
          detail: 'Erreur lors de la génération du PDF'
        });
        
        this.orderState.clear();
        this.resetForm();
        this.goBack();
      }
    });
  }

  private resetForm() {
    this.proformaReference = '';
    this.validityDays = 30;
    this.proformaNotes = '';
  }

  // Optionally load draft on init
  override ngOnInit() {
    super.ngOnInit();
    this.loadDraft();
  }

  private loadDraft() {
    const draftJson = localStorage.getItem('proforma-draft');
    if (draftJson) {
      try {
        const draft = JSON.parse(draftJson);
        // Load draft data
        // Note: This would need product loading logic
        console.log('Loaded draft:', draft);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }
}