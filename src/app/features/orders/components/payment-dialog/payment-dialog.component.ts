// features/orders/components/payment-dialog/payment-dialog.component.ts
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
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { PaymentMethod, OrderType } from '../../../../core/models';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

export interface PaymentEntry {
    method: PaymentMethod;
    amount: number;
    notes?: string;
    reference?: string; // For card/Mobile Money transactions
}

@Component({
    selector: 'app-payment-dialog',
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
        TooltipModule,
        ChipModule,
        XafPipe
    ],
    template: `
    <p-dialog 
      [header]="dialogTitle()"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '750px' }"
      [closable]="false"
      (onHide)="onCancel()"
      class="payment-dialog">
      
      <div class="space-y-6">
        <!-- Amount Summary Cards -->
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-primary-50 p-4 rounded-lg text-center border border-primary-200">
            <div class="text-sm text-primary-600 font-medium mb-1">Montant total</div>
            <div class="text-2xl font-bold text-primary">{{ totalAmount() | xaf }}</div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg text-center border border-green-200">
            <div class="text-sm text-green-600 font-medium mb-1">Payé</div>
            <div class="text-2xl font-bold text-green-600">{{ totalPaid() | xaf }}</div>
          </div>
          <div class="p-4 rounded-lg text-center border"
               [class.bg-orange-50]="remainingAmount() > 0"
               [class.border-orange-200]="remainingAmount() > 0"
               [class.bg-green-50]="remainingAmount() === 0"
               [class.border-green-200]="remainingAmount() === 0">
            <div class="text-sm font-medium mb-1"
                 [class.text-orange-600]="remainingAmount() > 0"
                 [class.text-green-600]="remainingAmount() === 0">
              {{ remainingAmount() === 0 ? 'Paiement complet' : 'Reste à payer' }}
            </div>
            <div class="text-2xl font-bold"
                 [class.text-orange-600]="remainingAmount() > 0"
                 [class.text-green-600]="remainingAmount() === 0">
              {{ remainingAmount() | xaf }}
            </div>
          </div>
        </div>

        <!-- Existing Payments List -->
        @if (payments().length > 0) {
          <div class="border rounded-lg p-4 bg-gray-50">
            <div class="flex justify-between items-center mb-3">
              <span class="font-semibold text-gray-700">
                <i class="pi pi-list mr-2"></i>Paiements enregistrés ({{ payments().length }})
              </span>
              <p-chip [label]="'Total: ' + (totalPaid() | xaf)" styleClass="bg-green-100 text-green-800" />
            </div>
            <div class="space-y-2">
              @for (payment of payments(); track $index; let i = $index) {
                <div class="flex justify-between items-center p-3 bg-white rounded border">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center"
                         [class.bg-green-100]="payment.method === PaymentMethod.CASH"
                         [class.bg-blue-100]="payment.method === PaymentMethod.CREDIT_CARD || payment.method === PaymentMethod.DEBIT_CARD"
                         [class.bg-purple-100]="payment.method === PaymentMethod.MOBILE_MONEY"
                         [class.bg-orange-100]="payment.method === PaymentMethod.CREDIT">
                      <i class="pi text-lg"
                         [class.pi-money-bill]="payment.method === PaymentMethod.CASH"
                         [class.pi-credit-card]="payment.method === PaymentMethod.CREDIT_CARD || payment.method === PaymentMethod.DEBIT_CARD"
                         [class.pi-mobile]="payment.method === PaymentMethod.MOBILE_MONEY"
                         [class.pi-clock]="payment.method === PaymentMethod.CREDIT"
                         [class.text-green-600]="payment.method === PaymentMethod.CASH"
                         [class.text-blue-600]="payment.method === PaymentMethod.CREDIT_CARD || payment.method === PaymentMethod.DEBIT_CARD"
                         [class.text-purple-600]="payment.method === PaymentMethod.MOBILE_MONEY"
                         [class.text-orange-600]="payment.method === PaymentMethod.CREDIT">
                      </i>
                    </div>
                    <div>
                      <div class="font-semibold">{{ getPaymentLabel(payment.method) }}</div>
                      @if (payment.reference) {
                        <div class="text-xs text-gray-500">Réf: {{ payment.reference }}</div>
                      }
                      @if (payment.notes) {
                        <div class="text-xs text-gray-400 italic">{{ payment.notes }}</div>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="font-bold text-lg">{{ payment.amount | xaf }}</span>
                    <button pButton 
                            icon="pi pi-times" 
                            class="p-button-rounded p-button-text p-button-danger p-button-sm"
                            (click)="removePayment(i)"
                            pTooltip="Supprimer ce paiement"
                            tooltipPosition="left">
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Payment Method Selection -->
        @if (remainingAmount() > 0) {
          <div>
            <label class="block font-semibold mb-3 text-gray-700">
              <i class="pi pi-wallet mr-2"></i>Mode de paiement
            </label>
            <div class="grid grid-cols-3 gap-3">
              @for (method of availablePaymentMethods(); track method.value) {
                <div class="payment-method-card p-3 border-2 rounded-lg cursor-pointer transition-all duration-200"
                     [class.border-primary]="selectedMethod === method.value"
                     [class.bg-primary-50]="selectedMethod === method.value"
                     [class.border-gray-200]="selectedMethod !== method.value"
                     [class.hover:border-primary-300]="selectedMethod !== method.value"
                     (click)="selectedMethod = method.value">
                  <div class="flex flex-col items-center text-center">
                    <i class="pi text-2xl mb-2"
                       [class.pi-money-bill]="method.value === PaymentMethod.CASH"
                       [class.pi-credit-card]="method.value === PaymentMethod.CREDIT_CARD || method.value === PaymentMethod.DEBIT_CARD"
                       [class.pi-mobile]="method.value === PaymentMethod.MOBILE_MONEY"
                       [class.pi-building]="method.value === PaymentMethod.BANK_TRANSFER"
                       [class.pi-file]="method.value === PaymentMethod.CHECK"
                       [class.pi-star]="method.value === PaymentMethod.LOYALTY_POINTS"
                       [class.pi-clock]="method.value === PaymentMethod.CREDIT"
                       [class.text-primary]="selectedMethod === method.value"
                       [class.text-gray-400]="selectedMethod !== method.value">
                    </i>
                    <span class="font-medium text-sm" [class.text-primary]="selectedMethod === method.value">
                      {{ method.label }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Cash Payment Details -->
          @if (selectedMethod === PaymentMethod.CASH) {
            <div class="border-t pt-4 space-y-4">
              <div>
                <label class="block font-medium mb-2">Montant reçu</label>
                <div class="flex gap-3">
                  <p-inputNumber [(ngModel)]="amountReceived"
                                 mode="decimal"
                                 [minFractionDigits]="0"
                                 [maxFractionDigits]="0"
                                 [min]="0"
                                 placeholder="0"
                                 class="flex-1"
                                 inputStyleClass="w-full text-lg p-3"
                                 (onInput)="calculateChange()">
                  </p-inputNumber>
                  
                  <button pButton 
                          label="Montant exact"
                          class="p-button-outlined p-button-secondary"
                          (click)="setExactAmount()">
                  </button>
                </div>
              </div>
              
              <!-- Change Calculation -->
              @if (amountReceived > 0) {
                <div class="p-4 rounded-lg"
                     [class.bg-green-50]="changeAmount() > 0"
                     [class.border]="changeAmount() > 0"
                     [class.border-green-200]="changeAmount() > 0"
                     [class.bg-orange-50]="changeAmount() === 0 && amountReceived < remainingAmount()"
                     [class.border-orange-200]="changeAmount() === 0 && amountReceived < remainingAmount()">
                  @if (changeAmount() > 0) {
                    <div class="flex justify-between items-center text-green-700">
                      <span class="font-semibold text-lg">Monnaie à rendre:</span>
                      <span class="text-2xl font-bold">{{ changeAmount() | xaf }}</span>
                    </div>
                  } @else if (amountReceived < remainingAmount()) {
                    <div class="space-y-2">
                      <div class="flex justify-between items-center text-orange-700">
                        <span class="font-semibold">Paiement partiel:</span>
                        <span class="text-xl font-bold">{{ amountReceived | xaf }}</span>
                      </div>
                      <div class="text-sm text-orange-600">
                        Reste à payer: {{ (remainingAmount() - amountReceived) | xaf }}
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Quick Amount Buttons -->
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Montants rapides</label>
                <div class="flex flex-wrap gap-2">
                  @for (amount of quickAmounts; track amount) {
                    <button pButton 
                            [label]="amount | xaf"
                            class="p-button-outlined p-button-sm"
                            (click)="setAmount(amount)">
                    </button>
                  }
                  <button pButton 
                          icon="pi pi-calculator"
                          class="p-button-outlined p-button-secondary p-button-sm"
                          (click)="calculateSuggestedAmounts()"
                          pTooltip="Calculer montants suggérés"
                          tooltipPosition="top">
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Non-Cash Payment Details -->
          @if (selectedMethod !== PaymentMethod.CASH && selectedMethod !== PaymentMethod.CREDIT) {
            <div class="border-t pt-4 space-y-4">
              <div>
                <label class="block font-medium mb-2">Montant à payer</label>
                <p-inputNumber [(ngModel)]="amountReceived"
                               mode="decimal"
                               [minFractionDigits]="0"
                               [maxFractionDigits]="0"
                               [min]="1"
                               [max]="remainingAmount()"
                               placeholder="Montant"
                               class="w-full"
                               inputStyleClass="w-full text-lg p-3">
                </p-inputNumber>
                <div class="text-sm text-gray-500 mt-1">
                  Maximum: {{ remainingAmount() | xaf }}
                </div>
              </div>

              <!-- Reference number for electronic payments -->
              @if (requiresReference()) {
                <div>
                  <label class="block font-medium mb-2">Numéro de référence / Transaction</label>
                  <input pInputText 
                         [(ngModel)]="referenceNumber"
                         placeholder="Ex: TRX123456"
                         class="w-full p-2" />
                </div>
              }
            </div>
          }

          <!-- Credit Payment (for known customers) -->
          @if (selectedMethod === PaymentMethod.CREDIT) {
            <div class="border-t pt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div class="flex items-start gap-3">
                <i class="pi pi-info-circle text-orange-500 text-xl mt-0.5"></i>
                <div>
                  <div class="font-semibold text-orange-800">Paiement à crédit</div>
                  <div class="text-sm text-orange-700 mt-1">
                    Le montant restant sera enregistré comme créance client. 
                    Une facture sera générée avec date d'échéance.
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- Notes -->
          <div>
            <label class="block font-medium mb-2">Notes (optionnel)</label>
            <textarea pInputTextarea 
                      [(ngModel)]="notes"
                      rows="2"
                      class="w-full"
                      placeholder="Informations complémentaires sur ce paiement...">
            </textarea>
          </div>
        }

        <!-- Final Summary -->
        @if (remainingAmount() === 0) {
          <div class="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <i class="pi pi-check-circle text-4xl text-green-500 mb-2"></i>
            <div class="font-semibold text-green-800 text-lg">Paiement complet!</div>
            <div class="text-green-600">La commande peut être finalisée</div>
          </div>
        }
      </div>
      
      <ng-template pTemplate="footer">
        <div class="flex justify-between w-full">
          <button pButton 
                  label="Annuler" 
                  icon="pi pi-times"
                  class="p-button-text"
                  (click)="onCancel()">
          </button>
          
          <div class="flex gap-2">
            @if (remainingAmount() > 0 && canAddPayment()) {
              <button pButton 
                      label="AJOUTER CE PAIEMENT" 
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
                    [label]="finalizeLabel()"
                    [icon]="remainingAmount() === 0 ? 'pi pi-check' : 'pi pi-save'"
                    class="p-button-success"
                    (click)="onSubmit()"
                    [disabled]="!canFinalize()">
              @if (loading()) {
                <i class="pi pi-spin pi-spinner ml-2"></i>
              }
            </button>
          </div>
        </div>
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .payment-method-card {
      transition: all 0.2s ease;
    }
    .payment-method-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  `]
})
export class PaymentDialogComponent {
    // Inputs
    totalAmount = input.required<number>();
    orderType = input<OrderType>(OrderType.POS_SALE);
    customerName = input<string>('');

    // Outputs
    paymentComplete = output<PaymentEntry[]>();
    cancel = output<void>();

    // State
    visible = signal(true);
    loading = signal(false);
    selectedMethod: PaymentMethod = PaymentMethod.CASH;
    amountReceived = 0;
    changeAmount = signal(0);
    notes = '';
    referenceNumber = '';

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

    quickAmounts = [5000, 10000, 20000, 50000, 100000];

    dialogTitle = computed<string>(() => {
        const typeLabels: Record<OrderType, string> = {
            [OrderType.POS_SALE]: 'Paiement - Vente directe',
            [OrderType.CREDIT_SALE]: 'Paiement - Vente \u00e0 cr\u00e9dit',
            [OrderType.PROFORMA]: 'Acompte - Proforma',
            [OrderType.ONLINE]: 'Paiement - Commande en ligne'
        };
        return typeLabels[this.orderType()] || 'Paiement';
    });

    availablePaymentMethods = computed<Array<{ label: string; value: PaymentMethod; icon: string }>>(() => {
        const base = [
            { label: 'Esp\u00e8ces', value: PaymentMethod.CASH, icon: 'pi-money-bill' },
            { label: 'Carte Bancaire', value: PaymentMethod.CREDIT_CARD, icon: 'pi-credit-card' },
            { label: 'Mobile Money', value: PaymentMethod.MOBILE_MONEY, icon: 'pi-mobile' },
            { label: 'Virement', value: PaymentMethod.BANK_TRANSFER, icon: 'pi-building' },
            { label: 'Ch\u00e8que', value: PaymentMethod.CHECK, icon: 'pi-file' }
        ];

        // Add credit option for known customers or credit sales
        if (this.orderType() === OrderType.CREDIT_SALE || this.customerName()) {
            base.push({ label: 'Cr\u00e9dit', value: PaymentMethod.CREDIT, icon: 'pi-clock' });
        }

        return base;
    });

    requiresReference(): boolean {
        return [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD, PaymentMethod.MOBILE_MONEY, PaymentMethod.BANK_TRANSFER].includes(this.selectedMethod);
    }

    finalizeLabel(): string {
        if (this.remainingAmount() === 0) return 'FINALISER LA VENTE';
        if (this.payments().length > 0) return 'FINALISER (Paiement partiel)';
        return 'ENREGISTRER COMME CRÉDIT';
    }

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

    calculateSuggestedAmounts() {
        // Calculate common denominations based on remaining amount
        const remaining = this.remainingAmount();
        const suggestions: number[] = [];

        // Round up to nearest 5000
        suggestions.push(Math.ceil(remaining / 5000) * 5000);

        // Add common bill denominations
        [5000, 10000, 20000, 50000, 10000].forEach(bill => {
            if (bill >= remaining && !suggestions.includes(bill)) {
                suggestions.push(bill);
            }
        });

        this.quickAmounts = suggestions.slice(0, 5);
    }

    canAddPayment(): boolean {
        if (this.amountReceived <= 0) return false;

        // For cash, allow overpayment (change will be calculated)
        if (this.selectedMethod === PaymentMethod.CASH) return true;

        // For others, cannot exceed remaining
        return this.amountReceived <= this.remainingAmount();
    }

    canFinalize(): boolean {
        // Can finalize if fully paid OR has at least one payment (partial) OR is credit sale
        return this.remainingAmount() === 0 ||
            this.payments().length > 0 ||
            (this.selectedMethod === PaymentMethod.CREDIT && this.orderType() === OrderType.CREDIT_SALE);
    }

    onAddPayment() {
        if (!this.canAddPayment()) return;

        let paymentAmount: number;

        if (this.selectedMethod === PaymentMethod.CASH) {
            // For cash, only record the amount that covers the bill (up to remaining)
            paymentAmount = Math.min(this.amountReceived, this.remainingAmount());
        } else {
            paymentAmount = this.amountReceived;
        }

        const payment: PaymentEntry = {
            method: this.selectedMethod,
            amount: paymentAmount,
            notes: this.notes || undefined,
            reference: this.referenceNumber || undefined
        };

        this.payments.update(payments => [...payments, payment]);

        // Reset form for next payment
        this.amountReceived = 0;
        this.changeAmount.set(0);
        this.notes = '';
        this.referenceNumber = '';

        // Auto-select cash for next payment if there's remaining
        if (this.remainingAmount() > 0) {
            this.selectedMethod = PaymentMethod.CASH;
        }
    }

    removePayment(index: number) {
        this.payments.update(payments => payments.filter((_, i) => i !== index));
    }

    onSubmit() {
        if (!this.canFinalize()) return;

        // Add pending payment if exists and valid
        if (this.amountReceived > 0 && this.canAddPayment()) {
            this.onAddPayment();
        }

        // If credit sale and not fully paid, add credit entry for remaining
        if (this.remainingAmount() > 0 && this.orderType() === OrderType.CREDIT_SALE) {
            this.payments.update(payments => [
                ...payments,
                {
                    method: PaymentMethod.CREDIT,
                    amount: this.remainingAmount(),
                    notes: 'Solde crédit'
                }
            ]);
        }

        this.loading.set(true);
        this.paymentComplete.emit(this.payments());
    }

    onCancel() {
        this.cancel.emit();
    }

    getPaymentLabel(method: PaymentMethod): string {
        const labels: Record<PaymentMethod, string> = {
            [PaymentMethod.CASH]: 'Espèces',
            [PaymentMethod.CREDIT_CARD]: 'Carte Bancaire',
            [PaymentMethod.DEBIT_CARD]: 'Carte Débit',
            [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
            [PaymentMethod.BANK_TRANSFER]: 'Virement',
            [PaymentMethod.CHECK]: 'Chèque',
            [PaymentMethod.LOYALTY_POINTS]: 'Points Fidélité',
            [PaymentMethod.CREDIT]: 'Crédit',
            [PaymentMethod.MIXED]: 'Mixte'
        };
        return labels[method] ?? method;
    }
}