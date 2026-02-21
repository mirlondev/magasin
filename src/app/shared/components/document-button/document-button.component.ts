// components/document-button/document-button.component.ts
import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

import { Order, OrderType, DocumentType } from '../../../core/models';
import { InvoiceService } from '../../../core/services/invoice.service';
import { ReceiptService } from '../../../core/services/receipt.service';

@Component({
  selector: 'app-document-button',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonModule, 
    MenuModule, 
    DialogModule, 
    RadioButtonModule, 
    FormsModule,
    TooltipModule
  ],
  template: `
    <div class="flex gap-1">
      <!-- Bouton principal : document recommandé -->
      <button pButton 
              [icon]="mainIcon()"
              [class]="mainButtonClass()"
              (click)="generateMainDocument()"
              [disabled]="loading()"
              [loading]="loading()"
              [pTooltip]="mainTooltip()"
              size="small">
      </button>
      
      <!-- Menu pour autres options -->
      <button pButton 
              icon="pi pi-chevron-down" 
              [class]="menuButtonClass()"
              (click)="menu.toggle($event)"
              [disabled]="loading()"
              size="small">
      </button>
    </div>
    
    <p-menu 
      #menu 
      [model]="menuItems()" 
      [popup]="true"
      appendTo="body">
    </p-menu>

    <!-- Dialog choix manuel -->
    <p-dialog 
      header="Choisir le type de document" 
      [(visible)]="showDialog"
      [modal]="true"
      [style]="{ width: '400px' }">
      
      <div class="space-y-3">
        @for (doc of availableDocuments(); track doc.value) {
          <div class="flex items-center p-3 border rounded cursor-pointer"
               [class.bg-primary-50]="selectedType === doc.value"
               (click)="selectedType = doc.value">
            <p-radioButton [value]="doc.value" [(ngModel)]="selectedType"></p-radioButton>
            <div class="ml-3">
              <div class="font-semibold">{{ doc.label }}</div>
              <div class="text-sm text-gray-500">{{ doc.description }}</div>
            </div>
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <button pButton label="Annuler" class="p-button-text" (click)="showDialog.set(false)"></button>
        <button pButton label="Générer" (click)="confirmManualSelection()"></button>
      </ng-template>
    </p-dialog>
  `
})
export class DocumentButtonComponent {
  private invoiceService = inject(InvoiceService);
  private receiptService = inject(ReceiptService);
  private messageService = inject(MessageService);

  order = input.required<Order>();
  loading = signal(false);
  showDialog = signal(false);
  selectedType: DocumentType = DocumentType.TICKET;

  // ─── Document type determination ─────────────────────────────────────────
  mainDocType = () => this.getDocumentTypeForOrder(this.order());
  
  mainIcon = () => this.getDocumentIcon(this.mainDocType());
  
  mainTooltip = () => `Générer ${this.getDocumentLabel(this.mainDocType())}`;
  
  mainButtonClass = () => {
    const type = this.mainDocType();
    switch (type) {
      case DocumentType.INVOICE: return 'p-button-primary p-button-sm';
      case DocumentType.PROFORMA: return 'p-button-help p-button-sm';
      default: return 'p-button-secondary p-button-sm';
    }
  };
  
  menuButtonClass = () => {
    const base = 'p-button-sm ';
    switch (this.mainDocType()) {
      case DocumentType.INVOICE: return base + 'p-button-primary p-button-outlined';
      case DocumentType.PROFORMA: return base + 'p-button-help p-button-outlined';
      default: return base + 'p-button-secondary p-button-outlined';
    }
  };

  // Documents disponibles selon le type de commande
  availableDocuments = () => {
    const order = this.order();
    const docs: Array<{value: DocumentType, label: string, description: string}> = [];
    
    // Ticket toujours disponible pour vente caisse
    if (order.orderType === OrderType.POS_SALE || !order.orderType) {
      docs.push({
        value: DocumentType.TICKET,
        label: 'Ticket de caisse',
        description: 'Pour vente payée immédiatement'
      });
    }
    
    // Facture si crédit ou partiellement payé
    if (order.paymentStatus === 'PARTIALLY_PAID' || 
        order.paymentStatus === 'CREDIT' ||
        order.orderType === OrderType.CREDIT_SALE) {
      docs.push({
        value: DocumentType.INVOICE,
        label: 'Facture',
        description: 'Pour vente à crédit ou partielle'
      });
    }
    
    // Proforma si type proforma
    if (order.orderType === OrderType.PROFORMA) {
      docs.push({
        value: DocumentType.PROFORMA,
        label: 'Proforma/Devis',
        description: 'Document prévisionnel'
      });
    }
    
    // Reçu simple toujours disponible
    docs.push({
      value: DocumentType.RECEIPT,
      label: 'Reçu simple',
      description: 'Justificatif de paiement'
    });
    
    return docs;
  };

  menuItems = computed<MenuItem[]>(() => [
    {
      label: 'Ouvrir (aperçu)',
      icon: 'pi pi-eye',
      command: () => this.openDocument()
    },
    { separator: true },
    {
      label: 'Télécharger PDF',
      icon: 'pi pi-download',
      command: () => this.downloadPdf()
    },
    {
      label: 'Imprimante thermique',
      icon: 'pi pi-print',
      command: () => this.downloadThermal(),
      disabled: !this.canUseThermal()
    },
    { separator: true },
    {
      label: 'Autre type de document...',
      icon: 'pi pi-list',
      command: () => this.openManualSelection()
    }
  ]);

  canUseThermal = computed(() => {
    const order = this.order();
    return order.orderType === OrderType.POS_SALE || 
           (!order.orderType && order.paymentStatus === 'PAID');
  });

  // ─── Actions ────────────────────────────────────────────────────────────

  generateMainDocument() {
    this.loading.set(true);
    const type = this.mainDocType();
    
    this.generateDocument(this.order().orderId, type, 'pdf');
    
    this.messageService.add({
      severity: 'success',
      summary: 'Document généré',
      detail: `${this.getDocumentLabel(type)} téléchargé`
    });
    
    setTimeout(() => this.loading.set(false), 500);
  }

  openDocument() {
    const type = this.mainDocType();
    const orderId = this.order().orderId;
    
    if (type === DocumentType.INVOICE || type === DocumentType.PROFORMA) {
      this.invoiceService.openPdfInTab(orderId); // invoiceId? We use orderId
    } else {
      this.receiptService.openPdf(orderId); // receiptId? Uses orderId endpoint
    }
  }

  downloadPdf() {
    const type = this.mainDocType();
    const orderId = this.order().orderId;
    
    if (type === DocumentType.INVOICE || type === DocumentType.PROFORMA) {
      this.invoiceService.savePdfToDisk(orderId, `${type}-${orderId}.pdf`);
    } else {
      this.receiptService.downloadPdf(orderId, `${type}-${orderId}.pdf`);
    }
  }

  downloadThermal() {
    if (!this.canUseThermal()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Non disponible',
        detail: 'Impression thermique uniquement pour ventes caisse'
      });
      return;
    }
    // thermal only available for tickets/receipts
    this.receiptService.downloadThermal(this.order().orderId);
  }

  openManualSelection() {
    this.selectedType = this.mainDocType();
    this.showDialog.set(true);
  }

  confirmManualSelection() {
    this.showDialog.set(false);
    this.loading.set(true);
    
    this.generateDocument(this.order().orderId, this.selectedType, 'pdf');
    
    this.messageService.add({
      severity: 'success',
      summary: 'Document généré',
      detail: `${this.getDocumentLabel(this.selectedType)} téléchargé`
    });
    
    setTimeout(() => this.loading.set(false), 500);
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private getDocumentTypeForOrder(order: Order): DocumentType {
    if (order.orderType === OrderType.POS_SALE || !order.orderType) {
      return DocumentType.TICKET;
    }
    if (order.orderType === OrderType.CREDIT_SALE) {
      return DocumentType.INVOICE;
    }
    if (order.orderType === OrderType.PROFORMA) {
      return DocumentType.PROFORMA;
    }
    return DocumentType.RECEIPT;
  }

  private getDocumentIcon(type: DocumentType): string {
    switch (type) {
      case DocumentType.INVOICE: return 'pi pi-file-pdf';
      case DocumentType.PROFORMA: return 'pi pi-file';
      case DocumentType.TICKET: return 'pi pi-receipt';
      case DocumentType.RECEIPT: return 'pi pi-print';
      default: return 'pi pi-file';
    }
  }

  private getDocumentLabel(type: DocumentType): string {
    switch (type) {
      case DocumentType.INVOICE: return 'Facture';
      case DocumentType.PROFORMA: return 'Proforma';
      case DocumentType.TICKET: return 'Ticket de caisse';
      case DocumentType.RECEIPT: return 'Reçu simple';
      default: return 'Document';
    }
  }

  private generateDocument(orderId: string, type: DocumentType, output: 'pdf' | 'thermal'): void {
    if (output === 'thermal') {
      if (type === DocumentType.TICKET || type === DocumentType.RECEIPT) {
        this.receiptService.downloadThermal(orderId);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impression thermique non disponible pour ce type de document'
        });
      }
      return;
    }

    // PDF output
    if (type === DocumentType.INVOICE || type === DocumentType.PROFORMA) {
      this.invoiceService.savePdfToDisk(orderId, `${type}-${orderId}.pdf`);
    } else {
      this.receiptService.downloadPdf(orderId, `${type}-${orderId}.pdf`);
    }
  }
}