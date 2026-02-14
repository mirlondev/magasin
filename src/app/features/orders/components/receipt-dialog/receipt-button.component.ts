// components/receipt-button/receipt-button.component.ts
import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { ReceiptService } from '../../../../core/services/receipt.service';

@Component({
  selector: 'app-receipt-button',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule],
  template: `
    <p-button 
      icon="pi pi-print" 
      [outlined]="true"
      severity="help"
      size="small"
      (click)="menu.toggle($event)"
      pTooltip="Imprimer ticket">
    </p-button>
    <p-menu #menu [model]="items" [popup]="true"></p-menu>
  `
})
export class ReceiptButtonComponent {
  private receiptService = inject(ReceiptService);
  private messageService = inject(MessageService);

  orderId = input.required<string>();

  items: MenuItem[] = [
    {
      label: 'Ouvrir PDF (navigateur)',
      icon: 'pi pi-file-pdf',
      command: () => {
        this.receiptService.openPdf(this.orderId());
        this.messageService.add({
          severity: 'success',
          summary: 'PDF ouvert',
          detail: 'Utilisez Ctrl+P pour imprimer'
        });
      }
    },
    {
      label: 'Télécharger PDF',
      icon: 'pi pi-download',
      command: () => {
        this.receiptService.downloadPdf(this.orderId());
      }
    },
    {
      label: 'Imprimante Thermique (.bin)',
      icon: 'pi pi-print',
      command: () => {
        this.receiptService.downloadThermal(this.orderId());
        this.messageService.add({
          severity: 'success',
          summary: 'Téléchargement',
          detail: 'Fichier prêt pour imprimante ESC/POS'
        });
      }
    }
  ];
}