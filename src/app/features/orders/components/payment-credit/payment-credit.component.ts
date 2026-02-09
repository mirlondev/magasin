import { Component, inject, input, output, signal, OnInit, model } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { CustomersService } from '../../../../core/services/customers.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { Customer, Order, PaymentMethod, PaymentStatus } from '../../../../core/models';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

@Component({
  selector: 'app-payment-credit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputNumberModule,
    TableModule,
    TagModule,
    ToastModule,
    XafPipe
  ],
  template: `
    <p-dialog header="Paiement à Crédit" 
              [(visible)]="visible"
              [modal]="true"
              [style]="{ width: '800px' }"
              (onHide)="onCancel()">
      <div class="space-y-6">
        <!-- Customer Credit Summary -->
        @if (customer()) {
          <div class="bg-blue-50 p-4 rounded-lg">
            <div class="grid grid-cols-3 gap-4">
              <div>
                <div class="text-sm text-gray-500">Client</div>
                <div class="font-semibold">{{ customer().fullName }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Solde crédit total</div>
                <div class="font-bold text-lg">{{ totalCreditAmount() | xaf }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">Commandes impayées</div>
                <div class="font-bold text-lg">{{ pendingOrders().length }}</div>
              </div>
            </div>
          </div>
        }

        <!-- Pending Orders -->
        <div>
          <h3 class="font-semibold mb-3">Commandes en attente de paiement</h3>
          <div class="border rounded-lg overflow-hidden">
            <p-table [value]="pendingOrders()" [tableStyle]="{'min-width': '50rem'}">
              <ng-template pTemplate="header">
                <tr>
                  <th>Commande</th>
                  <th>Date</th>
                  <th>Montant total</th>
                  <th>Payé</th>
                  <th>Restant</th>
                  <th>Action</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-order>
                <tr>
                  <td class="font-semibold">{{ order.orderNumber }}</td>
                  <td>{{ order.createdAt | date:'dd/MM/yy' }}</td>
                  <td>{{ order.totalAmount | xaf }}</td>
                  <td>{{ order.amountPaid | xaf }}</td>
                  <td>
                    <span class="font-bold text-red-600">
                      {{ (order.totalAmount - order.amountPaid) | xaf }}
                    </span>
                  </td>
                  <td>
                    <button pButton 
                            icon="pi pi-money-bill" 
                            label="Payer" 
                            class="p-button-sm p-button-success"
                            (click)="selectOrder(order)">
                    </button>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="summary">
                <tr>
                  <td colspan="4" class="text-right font-bold">Total restant:</td>
                  <td class="font-bold text-lg text-red-600">{{ remainingTotal() | xaf }}</td>
                  <td></td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>

        <!-- Payment Form -->
        @if (selectedOrder()) {
          <div class="border-t pt-4">
            <h3 class="font-semibold mb-3">
              Paiement pour commande #{{ selectedOrder()?.orderNumber }}
            </h3>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-gray-50 p-4 rounded-lg">
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Montant total:</span>
                    <span class="font-semibold">{{ selectedOrder()?.totalAmount | xaf }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Déjà payé:</span>
                    <span class="text-green-600">{{ selectedOrder()?.amountPaid | xaf }}</span>
                  </div>
                  <div class="flex justify-between border-t pt-2">
                    <span class="font-bold">Restant à payer:</span>
                    <span class="font-bold text-lg text-red-600">
                      {{ (selectedOrder()!.totalAmount - selectedOrder()!.amountPaid) | xaf }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block font-medium mb-2">Montant à payer</label>
                  <p-inputNumber [(ngModel)]="paymentAmount"
                                 mode="decimal"
                                 [minFractionDigits]="0"
                                 [maxFractionDigits]="0"
                                 [min]="0"
                                 [max]="selectedOrder()!.totalAmount - selectedOrder()!.amountPaid"
                                 class="w-full">
                  </p-inputNumber>
                </div>

                <div>
                  <label class="block font-medium mb-2">Mode de paiement</label>
                  <select [(ngModel)]="paymentMethod" class="w-full p-2 border rounded">
                    <option value="CASH">Espèces</option>
                    <option value="CREDIT_CARD">Carte bancaire</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="BANK_TRANSFER">Virement</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="mt-4">
              <label class="block font-medium mb-2">Notes (optionnel)</label>
              <textarea [(ngModel)]="notes"
                        class="w-full p-2 border rounded"
                        rows="2"
                        placeholder="Référence paiement..."></textarea>
            </div>
          </div>
        }
      </div>
      
      <ng-template pTemplate="footer">
        <button pButton 
                label="Annuler" 
                class="p-button-text"
                (click)="onCancel()">
        </button>
        
        <button pButton 
                label="ENREGISTRER LE PAIEMENT" 
                icon="pi pi-check" 
                class="p-button-success"
                (click)="processPayment()"
                [disabled]="!canProcessPayment()">
          @if (processing()) {
            <i class="pi pi-spin pi-spinner ml-2"></i>
          }
        </button>
      </ng-template>
    </p-dialog>
  `
})
export class PaymentCreditComponent implements OnInit {
  private ordersService = inject(OrdersService);
  private customersService = inject(CustomersService);
  private messageService = inject(MessageService);

  // Inputs/Outputs
  customer = input.required<Customer>();
  visible = model(true);
  paymentComplete = output<{
    orderId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }>();
  cancel = output<void>();

  // State
  processing = signal(false);
  pendingOrders = signal<Order[]>([]);
  selectedOrder = signal<Order | null>(null);
  paymentAmount = 0;
  paymentMethod: PaymentMethod = PaymentMethod.CASH;
  notes = '';

  // Computed
  totalCreditAmount = signal(0);
  remainingTotal = signal(0);

  ngOnInit() {
    this.loadCustomerOrders();
  }

  loadCustomerOrders() {
    if (this.customer()) {
      this.ordersService.loadOrders(1, 50, {
        customerId: this.customer()!.customerId,
        paymentStatus: PaymentStatus.PARTIALLY_PAID
      });
      
      // Subscribe to orders changes
      toObservable(this.ordersService.orders).subscribe(orders => {
        const pending = orders.filter(order => 
          order.paymentStatus === PaymentStatus.PARTIALLY_PAID ||
          order.paymentStatus === PaymentStatus.PENDING
        );
        this.pendingOrders.set(pending);
        
        this.calculateTotals(pending);
      });
    }
  }

  calculateTotals(orders: Order[]) {
    const totalCredit = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const remaining = orders.reduce((sum, order) => 
      sum + (order.totalAmount - order.amountPaid), 0
    );
    
    this.totalCreditAmount.set(totalCredit);
    this.remainingTotal.set(remaining);
  }

  selectOrder(order: Order) {
    this.selectedOrder.set(order);
    this.paymentAmount = order.totalAmount - order.amountPaid;
  }

  canProcessPayment(): boolean {
    if (!this.selectedOrder()) return false;
    if (this.paymentAmount <= 0) return false;
    
    const remaining = this.selectedOrder()!.totalAmount - this.selectedOrder()!.amountPaid;
    return this.paymentAmount <= remaining;
  }

  processPayment() {
    if (!this.selectedOrder() || !this.canProcessPayment()) return;

    this.processing.set(true);

    const paymentData = {
      paymentMethod: this.paymentMethod,
      amountPaid: this.paymentAmount
    };

    this.ordersService.processPayment(this.selectedOrder()!.orderId, paymentData).subscribe({
      next: (updatedOrder) => {
        this.processing.set(false);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Paiement enregistré',
          detail: `Paiement de ${this.paymentAmount} enregistré pour la commande #${updatedOrder.orderNumber}`
        });

        this.paymentComplete.emit({
          orderId: this.selectedOrder()!.orderId,
          amount: this.paymentAmount,
          paymentMethod: this.paymentMethod,
          notes: this.notes || undefined
        });

        this.resetForm();
      },
      error: (error) => {
        this.processing.set(false);
        console.error('Error processing credit payment:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du traitement du paiement'
        });
      }
    });
  }

  onCancel() {
    this.resetForm();
    this.cancel.emit();
  }

  private resetForm() {
    this.selectedOrder.set(null);
    this.paymentAmount = 0;
    this.paymentMethod = PaymentMethod.CASH;
    this.notes = '';
  }
}