// pos-sale.component.ts
import { Component, inject, signal, OnInit, ViewContainerRef, EnvironmentInjector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { PaymentCashComponent } from '../../components/payment-cash/payment-cash.component';
import { PaymentMethod, ShiftStatus } from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';
import { OrderItemsComponent } from "../../components/order-items/order-items.component";
import { OrderSummaryComponent } from "../../components/order-summary/order-summary.component";
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { OrderService } from '../../../../core/services/orders.service';
import { OrderHelper } from '../../../../core/utils/helpers';
import { SkeletonModule } from 'primeng/skeleton';
import { PrintTarget, ReceiptService } from '../../../../core/services/receipt.service';
import { ReceiptDialogComponent } from '../../components/receipt-dialog/receipt-dialog.component';

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

          <button pButton 
                  label="PAYER" 
                  icon="pi pi-credit-card" 
                  class="w-full p-button-success mt-4 text-lg font-bold py-3"
                  (click)="showPaymentDialog = true"
                  [disabled]="!canProcess()">
          </button>
                  </p-card>
          @if (orderState.notes()) {
            <div class="mt-4 p-3 bg-gray-50 rounded">
              <div class="text-sm text-gray-500">Notes:</div>
              <div class="text-sm">{{ orderState.notes() }}</div>
            </div>
          }

      </div>
    </div>

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
export class PosSaleComponent extends OrderCreateBaseComponent implements OnInit {
  private ordersService = inject(OrderService);
  private confirmationService = inject(ConfirmationService);
  private receiptService = inject(ReceiptService);
  private viewContainerRef = inject(ViewContainerRef);
  private envInjector = inject(EnvironmentInjector);

  showPaymentDialog = false;
  processing = signal(false);

  override pageTitle(): string {
    return 'Vente en Caisse';
  }

  override canProcess(): boolean {
    const validation = this.orderState.validateForPosSale();
    return validation.valid && !!this.currentShift() && this.currentShift()!.status === ShiftStatus.OPEN;
  }

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




  // CORRECTION PRINCIPALE : La méthode d'impression
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

    // Délai pour s'assurer que le toast s'affiche avant la confirmation
    setTimeout(() => {
      this.confirmationService.confirm({
        message: 'Voulez-vous imprimer le ticket de caisse ?',
        header: 'Impression du ticket',
        icon: 'pi pi-print',
        acceptLabel: 'Imprimer',
        rejectLabel: 'Plus tard',
        accept: () => {
          console.log('Impression acceptée pour orderId:', orderId); // Debug
          this.printReceipt(orderId);
        },
        reject: () => {
          console.log('Impression refusée'); // Debug
          this.goBack();
        }
      });
    }, 100);
  }

  // CORRECTION : Méthode printReceipt avec meilleure gestion d'erreurs
  private printReceipt(orderId: string) {
    console.log('Début impression ticket:', orderId);
    
    this.ordersService.generateThermalReceipt(orderId).subscribe({
      next: (blob) => {
        console.log('Ticket thermique généré avec succès');
        this.downloadBlob(blob, `ticket-thermal-${orderId}.bin`);
        
        // Proposer le PDF en plus
        this.confirmationService.confirm({
          message: 'Voulez-vous également télécharger le ticket en PDF ?',
          header: 'Téléchargement PDF',
          icon: 'pi pi-file-pdf',
          acceptLabel: 'Oui',
          rejectLabel: 'Non',
          accept: () => {
            this.downloadReceiptPdf(orderId);
          },
          reject: () => {
            this.goBack();
          }
        });
      },
      error: (error) => {
        console.error('Erreur génération ticket thermique:', error);
        // Fallback vers PDF
        this.messageService.add({
          severity: 'warn',
          summary: 'Impression thermique indisponible',
          detail: 'Fallback vers PDF...'
        });
        this.downloadReceiptPdf(orderId);
      }
    });
  }

  // CORRECTION : Méthode downloadReceiptPdf avec gestion d'erreurs
  private downloadReceiptPdf(orderId: string) {
    console.log('Téléchargement PDF pour orderId:', orderId);
    
    this.ordersService.generateReceipt(orderId).subscribe({
      next: (blob) => {
        console.log('PDF généré avec succès');
        this.downloadBlob(blob, `ticket-${orderId}.pdf`);
        this.messageService.add({
          severity: 'success',
          summary: 'Ticket généré',
          detail: 'Le ticket PDF a été téléchargé'
        });
        this.goBack();
      },
      error: (error) => {
        console.error('Erreur génération PDF:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de générer le ticket PDF'
        });
        this.goBack();
      }
    });
  }

  // CORRECTION : Méthode downloadBlob améliorée
  private downloadBlob(blob: Blob, filename: string) {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); // Important pour Firefox
      a.click();
      document.body.removeChild(a); // Nettoyage
      window.URL.revokeObjectURL(url);
      console.log('Téléchargement initié:', filename);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Erreur lors du téléchargement du fichier'
      });
    }
  }

  override processOrder() {
    // Non utilisé - logique dans onPaymentComplete
  }




  //new methodes


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

    const firstPayment = payments[0];
    const orderRequest = this.orderState.toOrderRequest(
      this.currentShift()!.storeId,
      firstPayment.method,
      firstPayment.amount
    );

    const paymentNotes = payments
      .filter(p => p.notes)
      .map(p => `${this.getPaymentMethodLabel(p.method)}: ${p.notes}`)
      .join('\n');

    if (paymentNotes) {
      orderRequest.notes = orderRequest.notes
        ? `${orderRequest.notes}\n${paymentNotes}`
        : paymentNotes;
    }

    this.ordersService.createOrder(orderRequest).subscribe({
      next: (order) => {
        if (payments.length > 1) {
          this.addAdditionalPayments(order.orderId, payments.slice(1), order.orderNumber);
        } else {
          this.finalizeSale(order.orderId, order.orderNumber);
        }
      },
      error: (error) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error?.error?.message || 'Erreur lors de la création'
        });
      }
    });
  }

  private addAdditionalPayments(orderId: string, additionalPayments: PaymentEntry[], orderNumber: string) {
    const paymentRequests = additionalPayments.map(p => ({
      method: p.method,
      amount: p.amount,
      notes: p.notes
    }));

    Promise.all(
      paymentRequests.map(req => 
        this.ordersService.addPayment(orderId, req).toPromise()
      )
    ).then(() => {
      this.finalizeSale(orderId, orderNumber);
    }).catch(() => {
      this.finalizeSale(orderId, orderNumber); // Continue quand même
    });
  }

  /**
   * FINALISATION : Affiche le dialog d'impression
**/
private finalizeSale(orderId: string, orderNumber: string) {
  this.processing.set(false);
  this.showPaymentDialog = false;
  this.orderState.clear();

  this.messageService.add({
    severity: 'success',
    summary: 'Vente validée',
    detail: `Commande #${orderNumber} enregistrée`,
    life: 3000
  });

  // Ouvrir dialog d'impression après succès
  setTimeout(() => {
    this.openReceiptDialog(orderId);
  }, 500);
}

private openReceiptDialog(orderId: string) {
  const componentRef = this.viewContainerRef.createComponent(ReceiptDialogComponent, {
    environmentInjector: this.envInjector
  });
  
  const instance = componentRef.instance;
  instance.orderId.set(orderId);
  instance.visible.set(true);
  
  instance.onComplete = (target: PrintTarget) => {
    componentRef.destroy();
    
    if (target === 'later') {
      this.goBack(); // Retour liste commandes
    }
    // Sinon rester pour nouvelle vente (panier déjà vidé)
  };
  
  instance.onCancelCb = () => {
    componentRef.destroy();
    this.goBack();
  };
}

  private getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<string, string> = {
      'CASH': 'Espèces',
      'CREDIT_CARD': 'Carte',
      'MOBILE_MONEY': 'Mobile Money'
    };
    return labels[method] || method;
  }

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
    }
  }

}