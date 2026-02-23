// components/receipt-dialog/receipt-dialog.component.ts
import { Component, inject, signal, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ReceiptService, ReceiptData, PrintTarget } from '../../../../core/services/receipt.service';

@Component({
  selector: 'app-receipt-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    CardModule,
    RadioButtonModule,
    FormsModule
  ],
  template: `
    <p-dialog 
      header="Imprimer le Ticket" 
      [(visible)]="visible"
      [modal]="true"
      [closable]="false"
      [style]="{ width: '450px' }">
      
      <div class="space-y-4">
        <!-- Aperçu minimal -->
        @if (receiptData(); as data) {
          <div class="bg-gray-100 p-3 rounded text-center">
            <div class="font-bold">{{ data.storeName }}</div>
            <div class="text-sm text-gray-600">#{{ data.orderNumber }}</div>
            <div class="text-xl font-bold text-primary mt-1">
              {{ data.totalAmount | number:'1.0-0' }} FCFA
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ data.createdAt | date:'dd/MM/yyyy HH:mm' }}
            </div>
          </div>
        }

        <!-- Options -->
        <div class="space-y-2">
          <label class="font-medium text-sm">Choisir le format :</label>
          
          <div class="flex flex-col gap-2">
            <div class="flex items-center p-3 border rounded cursor-pointer"
                 [class.bg-primary-50]="selectedTarget() === 'pdf'"
                 (click)="selectedTarget.set('pdf')">
              <p-radioButton value="pdf" [(ngModel)]="selectedTarget"></p-radioButton>
              <div class="ml-3">
                <div class="font-semibold text-sm">Ouvrir PDF (navigateur)</div>
                <div class="text-xs text-gray-500">Impression via Ctrl+P</div>
              </div>
            </div>

            <div class="flex items-center p-3 border rounded cursor-pointer"
                 [class.bg-primary-50]="selectedTarget() === 'thermal'"
                 (click)="selectedTarget.set('thermal')">
              <p-radioButton value="thermal" [(ngModel)]="selectedTarget"></p-radioButton>
              <div class="ml-3">
                <div class="font-semibold text-sm">Imprimante Thermique</div>
                <div class="text-xs text-gray-500">Fichier .bin pour ESC/POS</div>
              </div>
            </div>

            <div class="flex items-center p-3 border rounded cursor-pointer"
                 [class.bg-primary-50]="selectedTarget() === 'later'"
                 (click)="selectedTarget.set('later')">
              <p-radioButton value="later" [(ngModel)]="selectedTarget"></p-radioButton>
              <div class="ml-3">
                <div class="font-semibold text-sm">Imprimer plus tard</div>
                <div class="text-xs text-gray-500">Disponible dans l'historique</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button pButton 
                label="Annuler" 
                class="p-button-text p-button-sm"
                (click)="onCancel()">
        </button>
        
        <button pButton 
                [label]="actionLabel()"
                [icon]="actionIcon()"
                class="p-button-primary p-button-sm"
                (click)="onConfirm()"
                [disabled]="!selectedTarget()">
        </button>
      </ng-template>
    </p-dialog>
  `
})
export class ReceiptDialogComponent {
  private receiptService = inject(ReceiptService);
  private messageService = inject(MessageService);

  visible = signal(true);
  orderId = input<string>('');
  receiptData = signal<ReceiptData | null>(null);
  selectedTarget = signal<PrintTarget>('pdf');

  complete = output<PrintTarget>();
  cancel = output<void>();

  actionLabel = () => {
    switch (this.selectedTarget()) {
      case 'pdf': return 'Ouvrir PDF';
      case 'thermal': return 'Télécharger .bin';
      case 'later': return 'Confirmer';
      default: return 'Confirmer';
    }
  };

  actionIcon = () => {
    switch (this.selectedTarget()) {
      case 'pdf': return 'pi pi-file-pdf';
      case 'thermal': return 'pi pi-print';
      case 'later': return 'pi pi-clock';
      default: return 'pi pi-check';
    }
  };

  constructor() {
    effect(() => {
      if (this.orderId() && this.visible()) {
        this.loadReceipt();
      }
    });
  }

  private loadReceipt() {
    this.receiptService.getReceipt(this.orderId()).subscribe({
      next: (data) => this.receiptData.set(data),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger le ticket'
        });
      }
    });
  }

  onConfirm() {
    const target = this.selectedTarget();

    switch (target) {
      case 'pdf':
        // Ouvre dans nouvel onglet avec auth
        this.receiptService.openPdf(this.orderId());
        break;
      case 'thermal':
        // Télécharge fichier binaire
        this.receiptService.downloadThermal(this.orderId());
        break;
      case 'later':
        // Rien à faire
        break;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Succès',
      detail: target === 'later' ? 'Ticket enregistré' : 'Impression lancée',
      life: 2000
    });

    this.complete.emit(target);
    this.visible.set(false);
  }

  onCancel() {
    this.cancel.emit();
    this.visible.set(false);
  }
}