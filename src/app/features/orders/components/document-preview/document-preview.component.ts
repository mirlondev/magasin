// features/orders/components/document-preview/document-preview.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DocumentType } from '../../../../core/models';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

@Component({
  selector: 'app-document-preview',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, DividerModule, XafPipe],
  template: `
    <p-dialog [header]="'Aperçu: ' + documentTitle()"
              [(visible)]="visible"
              [modal]="true"
              [style]="{ width: '800px' }"
              [maximizable]="true"
              (onHide)="close.emit()">
      
      <div class="bg-white p-8 shadow-lg min-h-[600px]" id="document-preview">
        <!-- Header -->
        <div class="flex justify-between items-start mb-8 border-b pb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-800">{{ documentTitle() }}</h1>
            <div class="text-gray-500 mt-1">N° {{ documentNumber() }}</div>
            <div class="text-gray-400 text-sm">Date: {{ currentDate | date:'dd/MM/yyyy' }}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-xl">VOTRE ENTREPRISE</div>
            <div class="text-gray-500 text-sm">Adresse de la société</div>
            <div class="text-gray-500 text-sm">Tél: +XXX XX XX XX XX</div>
          </div>
        </div>

        <!-- Client Info -->
        <div class="grid grid-cols-2 gap-8 mb-8">
          <div class="bg-gray-50 p-4 rounded">
            <div class="font-semibold text-gray-600 mb-2">CLIENT</div>
            @if (customer(); as cust) {
              <div class="font-bold">{{ cust.fullName }}</div>
              <div class="text-gray-600">{{ cust.address }}</div>
              <div class="text-gray-600">{{ cust.phone }} | {{ cust.email }}</div>
              @if (cust.loyaltyTier) {
                <div class="mt-2 text-sm text-blue-600">Niveau: {{ cust.loyaltyTier }}</div>
              }
            } @else {
              <div class="text-gray-400 italic">Client comptant</div>
            }
          </div>
          
          <div class="text-right space-y-1">
            @if (config().validityDays) {
              <div class="text-gray-600">Validité: {{ config().validityDays }} jours</div>
            }
            @if (config().reference) {
              <div class="text-gray-600">Votre réf: {{ config().reference }}</div>
            }
          </div>
        </div>

        <!-- Items Table -->
        <table class="w-full mb-8">
          <thead class="bg-gray-100">
            <tr class="text-left">
              <th class="p-3">Produit</th>
              <th class="p-3 text-center">Qté</th>
              <th class="p-3 text-right">Prix unit.</th>
              <th class="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.product.productId) {
              <tr class="border-b">
                <td class="p-3">
                  <div class="font-medium">{{ item.product.name }}</div>
                  <div class="text-sm text-gray-500">{{ item.product.sku }}</div>
                </td>
                <td class="p-3 text-center">{{ item.quantity }}</td>
                <td class="p-3 text-right">{{ item.product.price | xaf }}</td>
                <td class="p-3 text-right font-medium">
                  {{ (item.product.price || 0) * item.quantity | xaf }}
                </td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Totals -->
        <div class="flex justify-end mb-8">
          <div class="w-1/3 space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600">Sous-total HT</span>
              <span>{{ totals().subtotal | xaf }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">TVA ({{ (totals().tax / totals().subtotal * 100) | number:'1.0-0' }}%)</span>
              <span>{{ totals().tax | xaf }}</span>
            </div>
            <p-divider />
            <div class="flex justify-between text-xl font-bold">
              <span>TOTAL TTC</span>
              <span>{{ totals().total | xaf }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        @if (config().notes) {
          <div class="bg-yellow-50 p-4 rounded border border-yellow-200 mb-8">
            <div class="font-semibold text-yellow-800 mb-1">Notes & Conditions:</div>
            <div class="text-yellow-700 text-sm whitespace-pre-line">{{ config().notes }}</div>
          </div>
        }

        <!-- Footer -->
        <div class="text-center text-gray-400 text-sm mt-8 pt-4 border-t">
          <p>Document généré électroniquement - Valide sans signature</p>
          <p>MERCI DE VOTRE CONFIANCE</p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button pButton 
                label="Fermer" 
                icon="pi pi-times"
                class="p-button-text"
                (click)="close.emit()">
        </button>
        <button pButton 
                label="Imprimer" 
                icon="pi pi-print"
                class="p-button-secondary"
                (click)="print.emit()">
        </button>
        <button pButton 
                label="Télécharger PDF" 
                icon="pi pi-download"
                class="p-button-primary"
                (click)="download.emit()">
        </button>
      </ng-template>
    </p-dialog>
  `
})
export class DocumentPreviewComponent {
  documentType = input.required<DocumentType>();
  items = input.required<any[]>();
  customer = input<any>(null);
  totals = input.required<{ subtotal: number; tax: number; total: number }>();
  config = input<{ validityDays?: number; notes?: string; reference?: string }>({});

  close = output<void>();
  print = output<void>();
  download = output<void>();

  visible = true;
  currentDate = new Date();

  documentTitle(): string {
    const titles: Record<DocumentType, string> = {
      [DocumentType.PROFORMA]: 'FACTURE PROFORMA',
      [DocumentType.INVOICE]: 'FACTURE',
      [DocumentType.QUOTE]: 'DEVIS',
      [DocumentType.DELIVERY_NOTE]: 'BON DE LIVRAISON',
      [DocumentType.TICKET]: 'TICKET',
      [DocumentType.RECEIPT]: 'REÇU'
    };
    return titles[this.documentType()] || 'DOCUMENT';
  }

  documentNumber(): string {
    return 'PRV-' + Date.now().toString().slice(-6);
  }
}