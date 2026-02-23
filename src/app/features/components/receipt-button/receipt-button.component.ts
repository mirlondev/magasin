import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ReceiptService } from '../../../core/services/receipt.service';
import { inject } from '@angular/core';

@Component({
    selector: 'app-receipt-button',
    standalone: true,
    imports: [CommonModule, ButtonModule, TooltipModule],
    template: `
    <button pButton
            icon="pi pi-print"
            class="p-button-rounded p-button-text p-button-sm p-button-secondary"
            (click)="printReceipt()"
            pTooltip="Imprimer le ticket"
            tooltipPosition="top">
    </button>
  `
})
export class ReceiptButtonComponent {
    orderId = input.required<string>();

    private receiptService = inject(ReceiptService);

    printReceipt(): void {
        if (this.orderId()) {
            this.receiptService.openPdf(this.orderId());
        }
    }
}
