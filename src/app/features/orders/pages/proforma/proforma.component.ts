// features/orders/pages/proforma/proforma.component.ts
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
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';

import { OrderItemsComponent } from '../../components/order-items/order-items.component';
import { OrderSummaryComponent } from '../../components/order-summary/order-summary.component';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

import { OrderType } from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';
import { OrderService } from '../../../../core/services/orders.service';
import { InvoiceService } from '../../../../core/services/invoice.service';

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
    ConfirmDialogModule,
    TagModule,
    SelectModule,
    SkeletonModule,
    OrderItemsComponent,
    OrderSummaryComponent,
    XafPipe,
  ],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

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

      <div>
        <p-card header="Devis / Proforma">

          <!-- Info banner -->
          <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <i class="pi pi-info-circle text-blue-500 shrink-0"></i>
            <span class="text-sm text-blue-700">
              <strong>Document non contraignant</strong> — À valider par le client.
              Convertible en vente à tout moment.
            </span>
          </div>

          <app-order-items
            [items]="orderState.items()"
            [customer]="orderState.customer()"
            (updateQuantity)="onUpdateQuantity($event)"
            (removeItem)="onRemoveItem($event)"
            (selectCustomer)="showCustomerDialog.set(true)"
            (clearCustomer)="removeCustomer()" />

          <!--
            [totalAmount] = Order.totalAmount (backend field)
            Previously [total] was wrong — component input is now 'totalAmount'.
          -->
          <app-order-summary
            [subtotal]="orderState.subtotal()"
            [discountAmount]="orderState.discountAmount()"
            [taxRate]="orderState.taxRate()"
            [taxAmount]="orderState.taxAmount()"
            [totalAmount]="orderState.total()"
            [itemCount]="orderState.itemCount()"
            [uniqueItems]="orderState.items().length" />

          <!-- Proforma details -->
          <div class="mt-4 p-4 border rounded-lg space-y-3">
            <h3 class="font-semibold">Détails du devis</h3>

            <div>
              <label class="block text-sm font-medium mb-2">Référence devis</label>
              <input pInputText type="text"
                     [(ngModel)]="proformaReference"
                     placeholder="DEV-2024-001 (auto si vide)"
                     class="w-full" />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Durée de validité (jours)</label>
              <p-inputNumber [(ngModel)]="validityDays"
                             [min]="1" [max]="90" [showButtons]="true"
                             class="w-full" />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Notes (optionnel)</label>
              <textarea pInputTextarea [(ngModel)]="proformaNotes" rows="3"
                        class="w-full"
                        placeholder="Conditions spécifiques, délais de livraison...">
              </textarea>
            </div>
          </div>

          <!-- Primary CTA -->
          <button pButton
                  label="ENREGISTRER PROFORMA"
                  icon="pi pi-file-edit"
                  class="w-full p-button-help mt-4 text-lg font-bold py-3"
                  (click)="createProforma()"
                  [loading]="processing()"
                  [disabled]="!canProcess() || processing()">
          </button>

          <!-- Secondary actions -->
          <div class="flex gap-2 mt-3">
            <button pButton
                    label="Brouillon"
                    icon="pi pi-save"
                    class="p-button-outlined flex-1"
                    (click)="saveAsDraft()"
                    [disabled]="orderState.itemCount() === 0">
            </button>

            <button pButton
                    label="Convertir en vente"
                    icon="pi pi-sync"
                    class="p-button-success flex-1"
                    (click)="promptConvertToSale()"
                    [disabled]="orderState.itemCount() === 0 && !lastSavedInvoiceId()">
            </button>
          </div>

          <!-- Conversion status badge (shown after proforma is saved) -->
          @if (lastSavedInvoiceId()) {
            <div class="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg
                        flex items-center justify-between text-sm">
              <span class="text-green-700">
                <i class="pi pi-check-circle mr-1"></i>Proforma enregistré
              </span>
              <button pButton
                      label="PDF"
                      icon="pi pi-download"
                      class="p-button-text p-button-sm"
                      (click)="redownloadPdf()">
              </button>
            </div>
          }

        </p-card>
      </div>
    </div>

    <p-confirmDialog />
    <p-toast />
  `,
  styles: [`
    .product-card { transition: transform .2s ease, box-shadow .2s ease; }
    .product-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
  `],
})
export class ProformaComponent extends OrderCreateBaseComponent implements OnInit {

  // ── Services ──────────────────────────────────────────────────────────────
  private ordersService = inject(OrderService);
  private invoiceService = inject(InvoiceService);
  private confirmationService = inject(ConfirmationService);

  // ── Component state ───────────────────────────────────────────────────────
  processing = signal(false);
  proformaReference = '';
  validityDays = 30;
  proformaNotes = '';

  /**
   * Populated after successful createProforma().
   * Used by "Convertir en vente" to call POST /invoices/{id}/convert-to-sale
   * and by "PDF" to re-download without recreating the order.
   */
  lastSavedOrderId = signal<string | null>(null);
  lastSavedInvoiceId = signal<string | null>(null);
  lastInvoiceNumber = signal<string | null>(null);

  readonly skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8];

  // ── Base class hooks ──────────────────────────────────────────────────────

  override pageTitle(): string { return 'Devis / Proforma'; }

  override canProcess(): boolean {
    return this.orderState.validateForProforma().valid;
  }

  override processOrder(): void { this.createProforma(); }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadDraft();
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  onUpdateQuantity(e: { productId: string; delta: number }): void {
    this.orderState.updateItemQuantity(e.productId, e.delta);
  }

  onRemoveItem(productId: string): void {
    this.orderState.removeItem(productId);
  }

  onFilterChange(): void { this.loadProducts(); }

  // ── Proforma creation flow ────────────────────────────────────────────────

  /**
   * Full proforma flow:
   *   1. POST /orders                   → OrderType.PROFORMA
   *      ProformaDocumentStrategy picks up validityDays from notes.
   *   2. POST /invoices/order/{id}      → InvoiceService.generateInvoice()
   *      Backend DocumentStrategyFactory → ProformaDocumentStrategy → PDF with watermark.
   *   3. GET  /invoices/order/{id}/pdf  → file-cached download.
   */
  createProforma(): void {
    if (this.processing()) return;

    const { valid, errors } = this.orderState.validateForProforma();
    if (!valid) {
      errors.forEach((msg) =>
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: msg })
      );
      return;
    }

    this.processing.set(true);

    // OrderType.PROFORMA → DocumentStrategyFactory → ProformaDocumentStrategy
    const req = this.orderState.toOrderRequest(
      this.currentShift()?.storeId ?? '', undefined, undefined
    );
    req.orderType = OrderType.PROFORMA;

    // ProformaDocumentStrategy.prepareDocumentData() also appends validity,
    // but we send it explicitly so notes are readable in order detail views.
    req.notes = [
      `DEVIS — Référence: ${this.proformaReference || 'Auto-généré'}`,
      `Validité: ${this.validityDays} jours`,
      this.proformaNotes || null,
      req.notes || null,
    ].filter(Boolean).join('\n');

    this.ordersService.createOrder(req).subscribe({
      next: (order) => this.generateInvoice(order.orderId, order.orderNumber),
      error: (err) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'error', summary: 'Erreur',
          detail: err?.error?.message ?? 'Erreur lors de la création du devis'
        });
      },
    });
  }

  // Step 2 — generate proforma invoice via InvoiceDocumentStrategy
  private generateInvoice(orderId: string, orderNumber: string): void {
    // POST /invoices/order/{orderId}
    this.invoiceService.generateInvoice(orderId).subscribe({
      next: (invoice) => {
        this.processing.set(false);

        // Persist refs for convert-to-sale and re-download
        this.lastSavedOrderId.set(orderId);
        this.lastSavedInvoiceId.set(invoice.invoiceId);
        this.lastInvoiceNumber.set(invoice.invoiceNumber);

        this.messageService.add({
          severity: 'success',
          summary: 'Devis créé',
          detail: `Proforma #${orderNumber} — ${invoice.invoiceNumber}`,
          life: 5000,
        });

        localStorage.removeItem('proforma-draft'); // draft promoted to real record

        // Offer PDF download
        this.confirmationService.confirm({
          message: 'Voulez-vous télécharger le PDF du devis ?',
          header: 'Téléchargement PDF',
          icon: 'pi pi-file-pdf',
          acceptLabel: 'Télécharger',
          rejectLabel: 'Plus tard',
          accept: () => this.downloadPdf(orderId, invoice.invoiceNumber),
          reject: () => {
            this.orderState.clear();
            this.resetForm();
          },
        });
      },
      error: (err) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'warn', summary: 'Commande créée',
          detail: "Mais la génération de la facture proforma a échoué"
        });

        this.confirmationService.confirm({
          message: "Réessayer la génération du PDF ?",
          header: 'Erreur PDF',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Réessayer',
          rejectLabel: 'Ignorer',
          accept: () => this.generateInvoice(orderId, orderNumber),
          reject: () => { this.orderState.clear(); this.resetForm(); this.goBack(); },
        });
      },
    });
  }

  // Step 3 — file-cached PDF: GET /invoices/order/{orderId}/pdf
  private downloadPdf(orderId: string, invoiceNumber: string): void {
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
          severity: 'success', summary: 'PDF téléchargé',
          detail: invoiceNumber
        });
        this.orderState.clear();
        this.resetForm();
      },
      error: () => {
        this.messageService.add({
          severity: 'error', summary: 'Erreur PDF',
          detail: 'Impossible de télécharger le PDF'
        });
      },
    });
  }

  /** Re-download PDF without recreating the order (after it was already saved). */
  redownloadPdf(): void {
    const orderId = this.lastSavedOrderId();
    const invoiceNumber = this.lastInvoiceNumber();
    if (orderId && invoiceNumber) this.downloadPdf(orderId, invoiceNumber);
  }

  // ── Convert proforma → real sale ──────────────────────────────────────────

  /**
   * Two paths:
   *   A) Proforma already persisted (lastSavedInvoiceId is set):
   *      POST /invoices/{proformaId}/convert-to-sale
   *      → marks invoice as CONVERTED, returns updated InvoiceResponse.
   *      Navigate to /orders/{orderId} so cashier adds payment.
   *
   *   B) Items only in cart (never saved):
   *      Navigate to /orders/pos-sale — OrderStateService retains the cart.
   */
  promptConvertToSale(): void {
    this.confirmationService.confirm({
      message: 'Transformer ce devis en vente immédiate ?',
      header: 'Conversion en vente',
      icon: 'pi pi-exclamation-circle',
      acceptLabel: 'Convertir',
      rejectLabel: 'Annuler',
      accept: () => this.executeConversion(),
    });
  }

  private executeConversion(): void {
    const invoiceId = this.lastSavedInvoiceId();

    if (invoiceId) {
      // Path A: already a proforma invoice on backend
      this.convertPersistedProforma(invoiceId);
    } else {
      // Path B: items in cart only → take them to POS sale page
      this.router.navigate(['/orders/pos-sale']);
    }
  }

  /**
   * POST /invoices/{proformaId}/convert-to-sale
   * Backend:
   *   - Sets Invoice.status = CONVERTED
   *   - Updates Order.orderType = CREDIT_SALE (or creates new order depending on impl)
   *   - Returns converted InvoiceResponse
   */
  private convertPersistedProforma(proformaId: string): void {
    this.processing.set(true);

    this.invoiceService.convertProformaToSale(proformaId).subscribe({
      next: (converted) => {
        this.processing.set(false);
        this.orderState.clear();
        this.resetForm();

        this.messageService.add({
          severity: 'success',
          summary: 'Proforma converti',
          detail: `Facture ${converted.invoiceNumber} — Commande prête pour paiement`,
          life: 6000,
        });

        // Navigate to order detail so cashier can add payment
        this.router.navigate(['/orders', converted.orderId]);
      },
      error: (err) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'error', summary: 'Erreur de conversion',
          detail: err?.error?.message ?? 'Impossible de convertir le proforma'
        });
      },
    });
  }

  // ── Draft persistence ─────────────────────────────────────────────────────

  saveAsDraft(): void {
    try {
      localStorage.setItem('proforma-draft', JSON.stringify({
        proformaReference: this.proformaReference,
        validityDays: this.validityDays,
        proformaNotes: this.proformaNotes,
        savedAt: new Date().toISOString(),
      }));
      this.messageService.add({
        severity: 'info', summary: 'Brouillon sauvegardé',
        detail: 'Les paramètres du devis ont été sauvegardés', life: 3000
      });
    } catch {
      this.messageService.add({
        severity: 'warn', summary: 'Sauvegarde impossible',
        detail: 'Stockage local indisponible'
      });
    }
  }

  private loadDraft(): void {
    try {
      const raw = localStorage.getItem('proforma-draft');
      if (!raw) return;
      const d = JSON.parse(raw);
      this.proformaReference = d.proformaReference ?? '';
      this.validityDays = d.validityDays ?? 30;
      this.proformaNotes = d.proformaNotes ?? '';
      this.messageService.add({
        severity: 'info', summary: 'Brouillon restauré',
        detail: `Paramètres du ${new Date(d.savedAt).toLocaleDateString('fr-FR')} rechargés`,
        life: 4000
      });
    } catch {
      localStorage.removeItem('proforma-draft');
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private resetForm(): void {
    this.proformaReference = '';
    this.validityDays = 30;
    this.proformaNotes = '';
    // Don't clear lastSaved* — cashier may still want to convert or re-download
  }
}