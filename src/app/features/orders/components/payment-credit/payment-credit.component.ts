import { Component, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DividerModule } from 'primeng/divider';
import { PaymentMethod } from '../../../../core/models';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  notes?: string;
}

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
    DividerModule,
    XafPipe
  ],
  template: `
    <p-dialog header="Paiement" 
              [(visible)]="visible"
              [modal]="true"
              [style]="{ width: '700px' }"
              (onHide)="onCancel()">
      <div class="space-y-6">
        <!-- Amount Due and Remaining -->
        <div class="grid grid-cols-2 gap-4">
          <div class="dark:bg-gray-800 bg-gray-50 p-4 rounded-lg">
            <div class="text-center">
              <div class="text-sm text-gray-500">Montant total</div>
              <div class="text-2xl font-bold text-primary">{{ totalAmount() | xaf }}</div>
            </div>
          </div>
          <div class="dark:bg-gray-800 bg-gray-50 p-4 rounded-lg">
            <div class="text-center">
              <div class="text-sm text-gray-500">Reste à payer</div>
              <div class="text-2xl font-bold" [class.text-green-600]="remainingAmount() === 0" 
                   [class.text-orange-600]="remainingAmount() > 0">
                {{ remainingAmount() | xaf }}
              </div>
            </div>
          </div>
        </div>

        <!-- Existing Payments (if any) -->
        @if (payments().length > 0) {
          <div class="border rounded-lg p-3">
            <div class="flex justify-between items-center mb-2">
              <div class="text-sm font-medium">Paiements enregistrés:</div>
              <div class="text-xs text-gray-500">Total: {{ totalPaid() | xaf }}</div>
            </div>
            @for (payment of payments(); track $index) {
              <div class="flex justify-between items-center py-2 border-b last:border-0">
                <div class="flex items-center gap-2">
                  <i class="pi {{ getPaymentIcon(payment.method) }}"></i>
                  <span class="text-sm">{{ getPaymentLabel(payment.method) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{{ payment.amount | xaf }}</span>
                  <button pButton 
                          icon="pi pi-times" 
                          class="p-button-text p-button-sm p-button-danger"
                          (click)="removePayment($index)"
                          pTooltip="Supprimer">
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Payment Method Selection -->
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
                             [min]="0"
                             (onInput)="calculateChange()"
                             class="flex-1">
              </p-inputNumber>
              
              <button pButton 
                      label="Exact"
                      class="p-button-outlined"
                      (click)="setExactAmount()">
              </button>
            </div>
            
            <!-- Change or Insufficient Display -->
            @if (amountReceived >= remainingAmount() && amountReceived > 0) {
              <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="font-semibold">Monnaie à rendre:</span>
                  <span class="text-lg font-bold text-green-600">{{ changeAmount() | xaf }}</span>
                </div>
              </div>
            } @else if (amountReceived > 0 && amountReceived < remainingAmount()) {
              <div class="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="font-semibold">Paiement partiel:</span>
                  <span class="text-lg font-bold text-orange-600">
                    {{ amountReceived | xaf }}
                  </span>
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  Restera {{ (remainingAmount() - amountReceived) | xaf }} à payer
                </div>
              </div>
            }
          </div>

          <!-- Quick Amounts -->
          <div>
            <label class="block font-medium mb-2">Montants rapides</label>
            <div class="grid grid-cols-4 gap-2">
              @for (amount of quickAmounts; track amount) {
                <button pButton 
                        [label]="amount + ' XAF'"
                        class="p-button-outlined p-button-sm"
                        (click)="setAmount(amount)">
                </button>
              }
            </div>
          </div>
        }

        <!-- Non-Cash Payment Amount -->
        @if (selectedMethod !== PaymentMethod.CASH) {
          <div>
            <label class="block font-medium mb-2">Montant</label>
            <p-inputNumber [(ngModel)]="amountReceived"
                           mode="decimal"
                           [minFractionDigits]="0"
                           [maxFractionDigits]="0"
                           [min]="0"
                           [max]="remainingAmount()"
                           placeholder="Montant payé"
                           class="w-full">
            </p-inputNumber>
            <div class="text-sm text-gray-500 mt-1">
              Maximum: {{ remainingAmount() | xaf }}
            </div>
          </div>
        }

        <!-- Notes -->
        <div>
          <label class="block font-medium mb-2">Notes de paiement</label>
          <textarea pInputTextarea 
                    [(ngModel)]="notes"
                    rows="2"
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
        
        @if (remainingAmount() > 0) {
          <button pButton 
                  label="AJOUTER PAIEMENT" 
                  icon="pi pi-plus" 
                  class="p-button-primary"
                  (click)="onAddPayment()"
                  [disabled]="!canAddPayment()">
            @if (loading()) {
              <i class="pi pi-spin pi-spinner ml-2"></i>
            }
          </button>
        }
        
        <button pButton 
                label="FINALISER LA VENTE" 
                icon="pi pi-check" 
                class="p-button-success"
                (click)="onSubmit()"
                [disabled]="!canFinalize()">
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
  paymentComplete = output<PaymentEntry[]>();
  cancel = output<void>();

  // State
  visible = signal(true);
  loading = signal(false);
  selectedMethod: PaymentMethod = PaymentMethod.CASH;
  amountReceived = 0;
  changeAmount = signal(0);
  notes = '';
  
  // Payment tracking
  payments = signal<PaymentEntry[]>([]);
  
  // Computed
  totalPaid = computed(() => 
    this.payments().reduce((sum, p) => sum + p.amount, 0)
  );
  
  remainingAmount = computed(() => 
    Math.max(0, this.totalAmount() - this.totalPaid())
  );

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
    if (this.selectedMethod === PaymentMethod.CASH) {
      const change = this.amountReceived - this.remainingAmount();
      this.changeAmount.set(change > 0 ? change : 0);
    }
  }

  setExactAmount() {
    this.amountReceived = this.remainingAmount();
    this.calculateChange();
  }

  setAmount(amount: number) {
    this.amountReceived = amount;
    this.calculateChange();
  }

  canAddPayment(): boolean {
    if (this.amountReceived <= 0) return false;
    if (this.amountReceived > this.remainingAmount()) {
      // For cash, allow overpayment (will calculate change)
      if (this.selectedMethod !== PaymentMethod.CASH) return false;
    }
    return true;
  }

  canFinalize(): boolean {
    // Can finalize if total is fully paid or has at least one payment
    return this.remainingAmount() === 0 || this.payments().length > 0;
  }

  onAddPayment() {
    if (!this.canAddPayment()) return;

    const paymentAmount = this.selectedMethod === PaymentMethod.CASH 
      ? Math.min(this.amountReceived, this.remainingAmount())
      : this.amountReceived;

    const payment: PaymentEntry = {
      method: this.selectedMethod,
      amount: paymentAmount,
      notes: this.notes || undefined
    };

    this.payments.update(payments => [...payments, payment]);
    
    // Reset form
    this.amountReceived = 0;
    this.notes = '';
    this.changeAmount.set(0);
  }

  removePayment(index: number) {
    this.payments.update(payments => payments.filter((_, i) => i !== index));
  }

  onSubmit() {
    if (!this.canFinalize()) return;

    // If there's a pending payment to add, add it first
    if (this.amountReceived > 0 && this.canAddPayment()) {
      this.onAddPayment();
    }

    // Emit all collected payments
    this.paymentComplete.emit(this.payments());
  }

  onCancel() {
    this.cancel.emit();
  }

  getPaymentIcon(method: PaymentMethod): string {
    const icons: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'pi-money-bill',
      [PaymentMethod.CREDIT_CARD]: 'pi-credit-card',
      [PaymentMethod.DEBIT_CARD]: 'pi-credit-card',
      [PaymentMethod.MOBILE_MONEY]: 'pi-mobile',
      [PaymentMethod.BANK_TRANSFER]: 'pi-building',
      [PaymentMethod.CHECK]: 'pi-file',
      [PaymentMethod.LOYALTY_POINTS]: 'pi-star',
      [PaymentMethod.CREDIT]: 'pi-clock',
      [PaymentMethod.MIXED]: 'pi-sliders-h'
    };

    return icons[method];
  }

  getPaymentLabel(method: PaymentMethod): string {
    const labels: Partial<Record<PaymentMethod, string>> = {
      [PaymentMethod.CASH]: 'Espèces',
      [PaymentMethod.CREDIT_CARD]: 'Carte Bancaire',
      [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
      [PaymentMethod.CREDIT]: 'Crédit'
    };

    return labels[method] ?? method;
  }
}