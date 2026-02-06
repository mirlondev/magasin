import { CommonModule } from "@angular/common";
import { Location } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { DividerModule } from "primeng/divider";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { EmployeeRole, OrderStatus, PaymentStatus } from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { OrdersService } from "../../../core/services/orders.service";

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    CardModule,
    TagModule,
    DividerModule,
    TableModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule
  ],
  template: `
    <div class="p-4 m-4">
      <p-toast />
      <p-confirmDialog />

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <button pButton 
                  icon="pi pi-arrow-left" 
                  class="p-button-text mr-4"
                  (click)="goBack()">
          </button>
          <div>
            <h1 class="text-2xl font-bold">Commande #{{ order()?.orderNumber }}</h1>
            <p class="text-gray-600">Créée le {{ order()?.createdAt | date:'dd/MM/yyyy à HH:mm' }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <button pButton 
                  icon="pi pi-file-pdf" 
                  label="Facture" 
                  class="p-button-warning"
                  (click)="generateInvoice()">
          </button>
          
          @if (canUpdateOrder()) {
            <button pButton 
                    icon="pi pi-pencil" 
                    label="Modifier" 
                    class="p-button-info"
                    [routerLink]="['/orders', orderId, 'edit']">
            </button>
          }
          
          @if (canCancelOrder() && order()?.status !== 'CANCELLED') {
            <button pButton 
                    icon="pi pi-times" 
                    label="Annuler" 
                    class="p-button-danger"
                    (click)="confirmCancel()">
            </button>
          }
        </div>
      </div>

      @if (order()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column - Order Details -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Order Summary -->
            <p-card header="Résumé de la commande">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 class="font-semibold text-lg mb-3">Informations</h3>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Statut:</span>
                      @if (order()?.status) {
                        <p-tag [value]="getStatusLabel(order()!.status!)" 
                               [severity]="getStatusSeverity(order()!.status!)" />
                      }
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Paiement:</span>
                      <p-tag [value]="getPaymentStatusLabel(order()!.paymentStatus)" 
                             [severity]="getPaymentStatusSeverity(order()!.paymentStatus)" />
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Méthode de paiement:</span>
                      <span class="font-medium">{{ getPaymentMethodLabel(order()!.paymentMethod) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Caissier:</span>
                      <span class="font-medium">{{ order()!.cashier.username || 'N/A' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Magasin:</span>
                      <span class="font-medium">{{ order()!.store.name || 'N/A' }}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="font-semibold text-lg mb-3">Montants</h3>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Sous-total:</span>
                      <span>{{ order()!.subtotal | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Remise:</span>
                      <span class="text-red-500">-{{ order()!.discountAmount | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Taxe ({{ order()!.taxRate }}%):</span>
                      <span>{{ order()!.taxAmount | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                    <p-divider />
                    <div class="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{{ order()!.totalAmount | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Payé:</span>
                      <span class="font-medium">{{ order()!.amountPaid | currency:'EUR':'symbol':'1.2-2' }}</span>
                    </div>
                    @if (order()!.changeAmount > 0) {
                      <div class="flex justify-between">
                        <span class="text-gray-600">Monnaie rendue:</span>
                        <span class="font-medium">{{ order()!.changeAmount | currency:'EUR':'symbol':'1.2-2' }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- Notes -->
              @if (order()!.notes) {
                <div class="mt-6">
                  <h3 class="font-semibold text-lg mb-2">Notes</h3>
                  <p class="text-gray-700 bg-gray-50 p-3 rounded">{{ order()!.notes }}</p>
                </div>
              }
            </p-card>

            <!-- Order Items -->
            <p-card header="Articles">
              <p-table [value]="order()!.items" [tableStyle]="{'min-width': '50rem'}">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Produit</th>
                    <th>Prix unitaire</th>
                    <th>Quantité</th>
                    <th>Remise</th>
                    <th>Total</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td class="font-medium">{{ item.product?.name }}</td>
                    <td>{{ item.unitPrice | currency:'EUR':'symbol':'1.2-2' }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>
                      @if (item.discountPercentage > 0) {
                        <span class="text-red-500">{{ item.discountPercentage }}% (-{{ item.discountAmount | currency:'EUR':'symbol':'1.2-2' }})</span>
                      } @else {
                        <span>-</span>
                      }
                    </td>
                    <td class="font-semibold">{{ item.totalPrice | currency:'EUR':'symbol':'1.2-2' }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="footer">
                  <tr>
                    <td colspan="4" class="text-right font-bold">Total articles:</td>
                    <td class="font-bold">{{ order()!.subtotal | currency:'EUR':'symbol':'1.2-2' }}</td>
                  </tr>
                </ng-template>
              </p-table>
            </p-card>
          </div>

          <!-- Right Column - Customer & Actions -->
          <div class="space-y-6">
            <!-- Customer Information -->
            <p-card header="Client">
              @if (order()?.customer) {
                <div class="space-y-3">
                  <div>
                    <div class="text-sm text-gray-500">Nom complet</div>
                    <div class="font-medium">{{ order()?.customer?.fullName }}</div>
                  </div>
                  <div>
                    <div class="text-sm text-gray-500">Email</div>
                    <div class="font-medium">{{ order()?.customer?.email || 'Non renseigné' }}</div>
                  </div>
                  <div>
                    <div class="text-sm text-gray-500">Téléphone</div>
                    <div class="font-medium">{{ order()?.customer?.phone || 'Non renseigné' }}</div>
                  </div>
                  <div>
                    <div class="text-sm text-gray-500">Points de fidélité</div>
                    <div class="font-medium">{{ order()?.customer?.loyaltyPoints || 0 }} points</div>
                  </div>
                  <div class="pt-4">
                    <button pButton 
                            label="Voir le profil" 
                            icon="pi pi-user" 
                            class="p-button-outlined w-full"
                            [routerLink]="['/customers', order()?.customer?.customerId]">
                    </button>
                  </div>
                </div>
              } @else {
                <div class="text-center py-6 text-gray-500">
                  <i class="pi pi-user text-4xl mb-3"></i>
                  <p>Client non enregistré</p>
                </div>
              }
            </p-card>

            <!-- Quick Actions -->
            <p-card header="Actions rapides">
              <div class="space-y-3">
                @if (canProcessPayment() && order()!.paymentStatus !== 'PAID') {
                  <button pButton 
                          icon="pi pi-credit-card" 
                          label="Traiter le paiement" 
                          class="p-button-success w-full"
                          (click)="processPayment()">
                  </button>
                }
                
                @if (canUpdateOrderStatus() && order()?.status === 'PENDING') {
                  <button pButton 
                          icon="pi pi-play" 
                          label="Commencer le traitement" 
                          class="p-button-info w-full"
                          (click)="updateStatus(OrderStatus.PROCESSING)">
                  </button>
                }
                
                @if (canUpdateOrderStatus() && order()?.status === 'PROCESSING') {
                  <button pButton 
                          icon="pi pi-check" 
                          label="Marquer comme prête" 
                          class="p-button-help w-full"
                          (click)="updateStatus(OrderStatus.READY)">
                  </button>
                }
                
                @if (canUpdateOrderStatus() && order()!.status === 'READY') {
                  <button pButton 
                          icon="pi pi-check-circle" 
                          label="Terminer la commande" 
                          class="p-button-success w-full"
                          (click)="completeOrder()">
                  </button>
                }
                
                @if (canRefundOrder() && order()!.paymentStatus === 'PAID' && !order()!.fullyRefunded) {
                  <button pButton 
                          icon="pi pi-undo" 
                          label="Demander un remboursement" 
                          class="p-button-warning w-full"
                          [routerLink]="['/refunds/new']" 
                          [queryParams]="{ orderId: order()!.orderId }">
                  </button>
                }
              </div>
            </p-card>

            <!-- Order Timeline -->
            <p-card header="Historique">
              <div class="space-y-4">
                <div class="flex items-start">
                  <div class="w-3 h-3 bg-green-500 rounded-full mt-1 mr-3"></div>
                  <div>
                    <div class="font-medium">Commande créée</div>
                    <div class="text-sm text-gray-500">{{ order()!.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                  </div>
                </div>
                
                @if (order()!.updatedAt !== order()!.createdAt) {
                  <div class="flex items-start">
                    <div class="w-3 h-3 bg-blue-500 rounded-full mt-1 mr-3"></div>
                    <div>
                      <div class="font-medium">Dernière mise à jour</div>
                      <div class="text-sm text-gray-500">{{ order()!.updatedAt | date:'dd/MM/yyyy HH:mm' }}</div>
                    </div>
                  </div>
                }
                
                @if (order()!.completedAt) {
                  <div class="flex items-start">
                    <div class="w-3 h-3 bg-purple-500 rounded-full mt-1 mr-3"></div>
                    <div>
                      <div class="font-medium">Commande terminée</div>
                      <div class="text-sm text-gray-500">{{ order()!.completedAt | date:'dd/MM/yyyy HH:mm' }}</div>
                    </div>
                  </div>
                }
                
                @if (order()!.cancelledAt) {
                  <div class="flex items-start">
                    <div class="w-3 h-3 bg-red-500 rounded-full mt-1 mr-3"></div>
                    <div>
                      <div class="font-medium">Commande annulée</div>
                      <div class="text-sm text-gray-500">{{ order()!.cancelledAt | date:'dd/MM/yyyy HH:mm' }}</div>
                    </div>
                  </div>
                }
              </div>
            </p-card>
          </div>
        </div>
      } @else if (loading()) {
        <div class="text-center py-12">
          <i class="pi pi-spin pi-spinner text-4xl text-primary-500"></i>
          <p class="mt-4 text-gray-600">Chargement de la commande...</p>
        </div>
      } @else {
        <div class="text-center py-12">
          <i class="pi pi-exclamation-circle text-4xl text-gray-400"></i>
          <p class="mt-4 text-gray-600">Commande non trouvée</p>
          <button pButton 
                  label="Retour aux commandes" 
                  class="p-button-outlined mt-4"
                  (click)="goBack()">
          </button>
        </div>
      }
    </div>
  `
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private ordersService = inject(OrdersService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);

  orderId = signal<string>('');
  order = this.ordersService.selectedOrder || undefined;
  loading = this.ordersService.loading;

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.orderId.set(params['id']);
      this.loadOrder();
    });
  }

  loadOrder() {
    if (this.orderId()) {
      this.ordersService.getOrderById(this.orderId()).subscribe();
    }
  }

  // Permission checks
  canUpdateOrder(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]);
  }

  canCancelOrder(): boolean {
    if (!this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN])) {
      return false;
    }
    return this.order()?.status !== 'CANCELLED' && 
           this.order()?.status !== 'COMPLETED';
  }

  canProcessPayment(): boolean {
    if (!this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])) {
      return false;
    }
    const status = this.order()?.paymentStatus;
    return status === 'PENDING' || status === 'PARTIALLY_PAID';
  }

  canUpdateOrderStatus(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]);
  }

  canRefundOrder(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]);
  }

  // UI Helpers
  getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING: return 'En attente';
      case OrderStatus.PROCESSING: return 'En traitement';
      case OrderStatus.READY: return 'Prête';
      case OrderStatus.COMPLETED: return 'Terminée';
      case OrderStatus.CANCELLED: return 'Annulée';
      case OrderStatus.REFUNDED: return 'Remboursée';
      default: return status;
    }
  }

  getStatusSeverity(status: OrderStatus): 'success' | 'warn' | 'info' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case OrderStatus.PENDING: return 'warn';
      case OrderStatus.PROCESSING: return 'info';
      case OrderStatus.READY: return 'info';
      case OrderStatus.COMPLETED: return 'success';
      case OrderStatus.CANCELLED: return 'danger';
      case OrderStatus.REFUNDED: return 'secondary';
      default: return 'info';
    }
  }

  getPaymentStatusLabel(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PENDING: return 'En attente';
      case PaymentStatus.PAID: return 'Payée';
      case PaymentStatus.PARTIALLY_PAID: return 'Partiellement payée';
      case PaymentStatus.FAILED: return 'Échouée';
      case PaymentStatus.REFUNDED: return 'Remboursée';
      case PaymentStatus.CANCELLED: return 'Annulée';
      default: return status;
    }
  }

  getPaymentStatusSeverity(status: PaymentStatus): 'success' | 'warn' | 'info' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case PaymentStatus.PENDING: return 'warn';
      case PaymentStatus.PAID: return 'success';
      case PaymentStatus.PARTIALLY_PAID: return 'info';
      case PaymentStatus.FAILED: return 'danger';
      case PaymentStatus.REFUNDED: return 'secondary';
      case PaymentStatus.CANCELLED: return 'danger';
      default: return 'info';
    }
  }

  getPaymentMethodLabel(method: string): string {
    switch (method) {
      case 'CASH': return 'Espèces';
      case 'CREDIT_CARD': return 'Carte de crédit';
      case 'DEBIT_CARD': return 'Carte de débit';
      case 'MOBILE_MONEY': return 'Mobile Money';
      case 'BANK_TRANSFER': return 'Virement bancaire';
      case 'CHECK': return 'Chèque';
      case 'LOYALTY_POINTS': return 'Points de fidélité';
      case 'MIXED': return 'Mixte';
      default: return method;
    }
  }

  // Operations
  goBack() {
    this.location.back();
  }

  generateInvoice() {
    if (this.orderId()) {
      this.ordersService.generateInvoice(this.orderId()).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `facture-${this.order()?.orderNumber || this.orderId()}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      });
    }
  }

  confirmCancel() {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir annuler la commande ${this.order()?.orderNumber} ?`,
      header: 'Confirmation d\'annulation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Oui',
      rejectLabel: 'Non',
      accept: () => this.cancelOrder()
    });
  }

  cancelOrder() {
    if (this.orderId()) {
      this.ordersService.cancelOrder(this.orderId(), 'Annulée par l\'utilisateur').subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Commande annulée avec succès'
          });
        }
      });
    }
  }

  processPayment() {
    this.router.navigate(['/orders', this.orderId(), 'payment']);
  }

  updateStatus(newStatus: OrderStatus) {
    if (this.orderId()) {
      this.ordersService.updateOrderStatus(this.orderId(), newStatus).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: `Statut mis à jour: ${this.getStatusLabel(newStatus)}`
          });
        }
      });
    }
  }

  completeOrder() {
    if (this.orderId()) {
      this.ordersService.completeOrder(this.orderId()).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Commande terminée avec succès'
          });
        }
      });
    }
  }

  protected readonly OrderStatus = OrderStatus;
}