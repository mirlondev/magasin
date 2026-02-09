import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { PaymentMethod } from '../../../../core/models';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

@Component({
  selector: 'app-payment-cash',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputNumberModule,
    RadioButtonModule,
    SelectModule,
    TextareaModule,
    XafPipe
  ],
  template: `
    <p-dialog header="Paiement" 
              [(visible)]="visible"
              [modal]="true"
              [style]="{ width: '600px' }"
              (onHide)="onCancel()">
      <div class="space-y-6">
        <!-- Amount Due -->
        <div class="dark:bg-gray-800 bg-gray-50  p-4 rounded-lg">
          <div class="text-center">
            <div class="text-sm text-gray-500">Montant à payer</div>
            <div class="text-3xl font-bold text-primary">{{ totalAmount() | xaf }}</div>
          </div>
        </div>

        <!-- Payment Method -->
        <div>
          <label class="block font-medium mb-3">Mode de paiement</label>
          <div class="grid grid-cols-2 gap-3">
            @for (method of paymentMethods; track method.value) {
              <div class="field-radiobutton">
                <p-radioButton [inputId]="method.value"
                               [value]="method.value"
                               [(ngModel)]="selectedMethod"
                               name="paymentMethod">
                </p-radioButton>
                <label [for]="method.value" class="ml-2 cursor-pointer">
                  <i class="pi {{ method.icon }} mr-2"></i>
                  {{ method.label }}
                </label>
              </div>
            }
          </div>
        </div>

        <!-- Cash Details -->
        @if (selectedMethod === PaymentMethod.CASH) {
          <div class="border-t pt-4">
            <label class="block font-medium mb-2">Montant reçu</label>
            <div class="flex gap-2 mb-4">
              <p-inputNumber [(ngModel)]="amountReceived"
                             mode="decimal"
                             [minFractionDigits]="0"
                             [maxFractionDigits]="0"
                             [min]="totalAmount()"
                             (onInput)="calculateChange()"
                             class="flex-1">
              </p-inputNumber>
              
              <button pButton 
                      label="Exact"
                      class="p-button-outlined"
                      (click)="setExactAmount()">
              </button>
            </div>
            
            @if (changeAmount() > 0) {
              <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="font-semibold">Monnaie à rendre:</span>
                  <span class="text-lg font-bold text-green-600">{{ changeAmount() | xaf }}</span>
                </div>
              </div>
            } @else if (amountReceived > 0 && amountReceived < totalAmount()) {
              <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="font-semibold">Montant insuffisant:</span>
                  <span class="text-lg font-bold text-red-600">
                    {{ (totalAmount() - amountReceived) | xaf }}
                  </span>
                </div>
              </div>
            }
          </div>
        }

        <!-- Quick Amounts -->
        @if (selectedMethod === PaymentMethod.CASH) {
          <div>
            <label class="block font-medium mb-2">Montants rapides</label>
            <div class="grid grid-cols-4 gap-2">
              @for (amount of quickAmounts; track amount) {
                <button pButton 
                        [label]="amount + ' XAF'"
                        class="p-button-outlined"
                        (click)="setAmount(amount)">
                </button>
              }
            </div>
          </div>
        }

        <!-- Notes -->
        <div>
          <label class="block font-medium mb-2">Notes de paiement</label>
          <textarea pInputTextarea 
                    [(ngModel)]="notes"
                    rows="3"
                    class="w-full"
                    placeholder="Informations complémentaires...">
          </textarea>
        </div>
      </div>
      
      <ng-template pTemplate="footer">
        <button pButton 
                label="Annuler" 
                class="p-button-text"
                (click)="onCancel()">
        </button>
        
        <button pButton 
                label="VALIDER LE PAIEMENT" 
                icon="pi pi-check" 
                class="p-button-success"
                (click)="onSubmit()"
                [disabled]="!canSubmit()">
          @if (loading()) {
            <i class="pi pi-spin pi-spinner ml-2"></i>
          }
        </button>
      </ng-template>
    </p-dialog>
  `
})
export class PaymentCashComponent {
  // Inputs/Outputs
  totalAmount = input(0);
  orderNotes = input('');
  paymentComplete = output<{
    paymentMethod: PaymentMethod;
    amountPaid: number;
    changeAmount: number;
    notes?: string;
  }>();
  cancel = output<void>();

  // State
  visible = signal(true);
  loading = signal(false);
  selectedMethod: PaymentMethod = PaymentMethod.CASH;
  amountReceived = 0;
  changeAmount = signal(0);
  notes = '';

  // Constants
  PaymentMethod = PaymentMethod;
  paymentMethods = [
    { label: 'Espèces', value: PaymentMethod.CASH, icon: 'pi-money-bill' },
    { label: 'Carte Bancaire', value: PaymentMethod.CREDIT_CARD, icon: 'pi-credit-card' },
    { label: 'Mobile Money', value: PaymentMethod.MOBILE_MONEY, icon: 'pi-mobile' }
  ];

  quickAmounts = [5000, 10000, 20000, 50000];

  // Methods
  calculateChange() {
    const change = this.amountReceived - this.totalAmount();
    this.changeAmount.set(change > 0 ? change : 0);
  }

  setExactAmount() {
    this.amountReceived = this.totalAmount();
    this.calculateChange();
  }

  setAmount(amount: number) {
    this.amountReceived = amount;
    this.calculateChange();
  }

  canSubmit(): boolean {
    if (this.selectedMethod === PaymentMethod.CASH) {
      return this.amountReceived >= this.totalAmount();
    }
    return true;
  }

  onSubmit() {
    if (!this.canSubmit()) return;

    this.paymentComplete.emit({
      paymentMethod: this.selectedMethod,
      amountPaid: this.amountReceived,
      changeAmount: this.changeAmount(),
      notes: this.notes || undefined
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}