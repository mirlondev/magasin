import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { BadgeModule } from "primeng/badge";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DatePickerModule } from "primeng/datepicker";
import { DialogModule } from "primeng/dialog";
import { DividerModule } from "primeng/divider";
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from "primeng/inputicon";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { SkeletonModule } from "primeng/skeleton";
import { StyleClassModule } from "primeng/styleclass";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { TooltipModule } from "primeng/tooltip";
import { XafPipe } from "../../../../core/pipes/xaf-currency-pipe";
import { AuthService } from "../../../../core/services/auth.service";
import { DocumentSalesService } from "../../../../core/services/document-sales.service";

import {
  Component, inject, signal, computed, OnInit
} from '@angular/core';

import {
  OrderResponse, OrderStatus, PaymentStatus, InvoiceStatus, Customer,
  PaymentMethod
} from '../../../../core/models';

type FilterStatus = 'ALL' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

@Component({
  selector: 'app-credit-sales-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, ButtonModule, CardModule,
    TableModule, TagModule, InputTextModule, IconFieldModule, InputIconModule,
    SelectModule, DatePickerModule, DialogModule, ConfirmDialogModule,
    TooltipModule, BadgeModule, DividerModule, SkeletonModule, ToastModule, StyleClassModule,
    XafPipe
  ],
  template: `
    <div class="min-h-screen bg-surface-ground">
      <!-- Header -->
      <div class="bg-surface-card border-b border-surface-border shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-surface-900">Factures - Ventes à Crédit</h1>
              <p class="text-surface-500 mt-1">Gestion des ventes à crédit et paiements</p>
            </div>
            <div class="flex gap-3">
              <p-button
                icon="pi pi-refresh"
                outlined="true"
                (onClick)="refreshData()"
                pTooltip="Actualiser"
              ></p-button>
              <p-button
                icon="pi pi-plus"
                label="Nouvelle Facture"
                severity="primary"
                (onClick)="createNewInvoice()"
              ></p-button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto p-6 space-y-6">
        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-surface-card rounded-xl p-6 border border-surface-border shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-surface-500">Total Factures</p>
                <p class="text-2xl font-bold text-surface-900">{{ statistics()?.totalDocuments || 0 }}</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <i class="pi pi-file text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div class="bg-surface-card rounded-xl p-6 border border-surface-border shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-surface-500">Montant Total</p>
                <p class="text-2xl font-bold text-surface-900">{{ (statistics()?.totalAmount || 0) | xaf }}</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <i class="pi pi-money-bill text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div class="bg-surface-card rounded-xl p-6 border border-surface-border shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-surface-500">En Attente</p>
                <p class="text-2xl font-bold text-orange-600">{{ (statistics()?.pendingAmount || 0) | xaf }}</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <i class="pi pi-clock text-orange-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div class="bg-surface-card rounded-xl p-6 border border-surface-border shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-surface-500">En Retard</p>
                <p class="text-2xl font-bold text-red-600">{{ statistics()?.overdueCount || 0 }}</p>
              </div>
              <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <i class="pi pi-exclamation-triangle text-red-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-surface-card rounded-xl p-4 border border-surface-border shadow-sm">
          <div class="flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[300px]">
              <p-iconField iconPosition="left">
                <p-inputIcon styleClass="pi pi-search"></p-inputIcon>
                <input
                  pInputText
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onSearch($event)"
                  placeholder="Rechercher par n°, client..."
                  class="w-full"
                >
              </p-iconField>
            </div>

            <p-select
              [options]="statusOptions"
              [(ngModel)]="selectedStatus"
              (onChange)="onStatusChange($event)"
              placeholder="Statut de paiement"
              pStyleClass="w-48"
            ></p-select>

            <p-datepicker
              [(ngModel)]="dateRange"
              (onSelect)="onDateChange()"
              selectionMode="range"
              placeholder="Période"
              pStyleClass="w-64"
            ></p-datepicker>

            <p-button
              icon="pi pi-filter-slash"
              outlined="true"
              (onClick)="clearFilters()"
              pTooltip="Effacer les filtres"
            ></p-button>
          </div>
        </div>

        <!-- Data Table -->
        <div class="bg-surface-card rounded-xl border border-surface-border shadow-sm overflow-hidden">
          <p-table
            [value]="filteredDocuments()"
            [paginator]="true"
            [rows]="pageSize()"
            [totalRecords]="total()"
            [loading]="loading"
            [rowsPerPageOptions]="[10, 25, 50]"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="{first} à {last} sur {totalRecords}"
            (onPage)="onPageChange($event)"
            pStyleClass="p-datatable-sm"
            [tableStyle]="{ 'min-width': '75rem' }"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>N° Facture</th>
                <th>Client</th>
                <th>Date</th>
                <th>Échéance</th>
                <th class="text-right">Montant</th>
                <th class="text-right">Payé</th>
                <th class="text-right">Reste</th>
                <th>Statut</th>
                <th style="width: 150px">Actions</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-invoice>
              <tr [class.bg-red-50]="isOverdue(invoice)" [class.dark:bg-red-900]="isOverdue(invoice)">
                <td>
                  <div class="font-semibold text-surface-900">{{ invoice.orderNumber }}</div>
                  <div class="text-xs text-surface-500">{{ invoice.orderType }}</div>
                </td>
                <td>
                  @if (invoice.customerName; as name) {
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span class="text-xs font-bold text-primary-700">{{ getInitials(name) }}</span>
                      </div>
                      <div>
                        <div class="font-medium text-surface-900">{{ name }}</div>
                        @if (invoice.customerPhone) {
                          <div class="text-xs text-surface-500">{{ invoice.customerPhone }}</div>
                        }
                      </div>
                    </div>
                  } @else {
                    <span class="text-surface-400 italic">Client comptant</span>
                  }
                </td>
                <td>
                  <div class="text-surface-700">{{ invoice.createdAt | date:'dd/MM/yyyy' }}</div>
                  <div class="text-xs text-surface-500">{{ invoice.createdAt | date:'HH:mm' }}</div>
                </td>
                <td>
                  @if (invoice.dueDate) {
                    <div [class.text-red-600]="isOverdue(invoice)" class="font-medium">
                      {{ invoice.dueDate | date:'dd/MM/yyyy' }}
                    </div>
                    @if (isOverdue(invoice)) {
                      <p-tag value="En retard" severity="danger" pStyleClass="text-xs"></p-tag>
                    }
                  } @else {
                    <span class="text-surface-400">-</span>
                  }
                </td>
                <td class="text-right">
                  <div class="font-semibold text-surface-900">{{ invoice.totalAmount | xaf }}</div>
                </td>
                <td class="text-right">
                  <div class="text-green-600 font-medium">{{ invoice.totalPaid | xaf }}</div>
                </td>
                <td class="text-right">
                  <div class="font-bold" [class.text-red-600]="invoice.remainingAmount > 0">
                    {{ invoice.remainingAmount | xaf }}
                  </div>
                </td>
                <td>
                  <p-tag
                    [value]="getPaymentStatusLabel(invoice.paymentStatus)"
                    [severity]="getPaymentStatusSeverity(invoice.paymentStatus)"
                    pStyleClass="text-xs"
                  ></p-tag>
                </td>
                <td>
                  <div class="flex gap-1">
                    <p-button
                      icon="pi pi-eye"
                      text="true"
                      (onClick)="viewInvoice(invoice)"
                      pTooltip="Détails"
                    ></p-button>
                    <p-button
                      icon="pi pi-file-pdf"
                      text="true"
                      (onClick)="downloadPdf(invoice)"
                      pTooltip="Télécharger PDF"
                    ></p-button>
                    @if (invoice.remainingAmount > 0) {
                      <p-button
                        icon="pi pi-money-bill"
                        text="true"
                        severity="success"
                        (onClick)="recordPayment(invoice)"
                        pTooltip="Enregistrer paiement"
                      ></p-button>
                    }
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="9" class="text-center py-12">
                  <div class="flex flex-col items-center text-surface-400">
                    <i class="pi pi-inbox text-5xl mb-4"></i>
                    <p class="text-lg">Aucune facture trouvée</p>
                    <p class="text-sm">Créez une nouvelle facture pour commencer</p>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>

      <!-- Payment Dialog -->
      @if (showPaymentDialog()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-surface-card rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 class="text-xl font-bold mb-4">Enregistrer un Paiement</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Montant restant</label>
                <div class="text-2xl font-bold text-surface-900">
                  {{ selectedInvoiceForPayment()?.remainingAmount | xaf }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">Montant à payer</label>
                <input
                  pInputText
                  type="number"
                  [(ngModel)]="paymentAmount"
                  class="w-full"
                  [max]="selectedInvoiceForPayment()?.remainingAmount ?? 0"
                >
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">Mode de paiement</label>
                <p-select
                  [options]="paymentMethods"
                  [(ngModel)]="selectedPaymentMethod"
                  placeholder="Sélectionner..."
                  class="w-full"
                  optionLabel="label"
                  optionValue="value"
                ></p-select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  pTextarea
                  [(ngModel)]="paymentNotes"
                  rows="2"
                  class="w-full"
                ></textarea>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <p-button
                label="Annuler"
                outlined="true"
                (onClick)="showPaymentDialog.set(false)"
              ></p-button>
              <p-button
                label="Valider le paiement"
                severity="success"
                (onClick)="confirmPayment()"
                [loading]="processingPayment()"
              ></p-button>
            </div>
          </div>
        </div>
      }

      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>
    </div>
  `
})
export class CreditSalesListComponent implements OnInit {
  private documentService = inject(DocumentSalesService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  // State
  loading = this.documentService.loading;
  documents = this.documentService.orders;
  total = this.documentService.total;
  pageSize = this.documentService.pageSize;
  statistics = this.documentService.statistics;

  // Filters
  searchQuery = signal('');
  selectedStatus = signal<FilterStatus>('ALL');
  dateRange = signal<Date[] | null>(null);

  // Payment Dialog
  showPaymentDialog = signal(false);
  selectedInvoiceForPayment = signal<OrderResponse | null>(null);
  paymentAmount = signal<number>(0);
  selectedPaymentMethod = signal<string>('CASH');
  paymentNotes = signal('');
  processingPayment = signal(false);

  statusOptions = [
    { label: 'Tous les statuts', value: 'ALL' },
    { label: 'En attente', value: 'UNPAID' },
    { label: 'Partiellement payé', value: 'PARTIALLY_PAID' },
    { label: 'Payé', value: 'PAID' },
    { label: 'En retard', value: 'OVERDUE' }
  ];

  paymentMethods = [
    { label: 'Espèces', value: 'CASH', code: 'CASH' },
    { label: 'Chèque', value: 'CHECK', code: 'CHECK' },
    { label: 'Virement', value: 'BANK_TRANSFER', code: 'BANK_TRANSFER' },
    { label: 'Mobile Money', value: 'MOBILE_MONEY', code: 'MOBILE_MONEY' }
  ];

  filteredDocuments = computed(() => {
    let docs = this.documents().filter(d => d.orderType === 'CREDIT_SALE');

    if (this.selectedStatus() === 'OVERDUE') {
      return docs.filter(d => this.isOverdue(d));
    }

    if (this.selectedStatus() !== 'ALL') {
      docs = docs.filter(d => d.paymentStatus === this.selectedStatus());
    }

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      docs = docs.filter(d =>
        d.orderNumber.toLowerCase().includes(query) ||
        d.customerName?.toLowerCase().includes(query) ||
        d.customerPhone?.includes(query)
      );
    }

    return docs;
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.documentService.loadOrders(1, 10, {
      orderType: 'CREDIT_SALE'
    });
    this.documentService.getStatistics().subscribe();
  }

  refreshData() {
    this.loadData();
    this.messageService.add({
      severity: 'success',
      summary: 'Actualisation',
      detail: 'Données mises à jour'
    });
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
  }

  onStatusChange(event: any) {
    this.selectedStatus.set(event.value);
  }

  onDateChange() {
    if (this.dateRange()) {
      const [start, end] = this.dateRange()!;
      this.documentService.getOrdersByDateRange(
        start.toISOString(),
        end.toISOString()
      ).subscribe();
    }
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedStatus.set('ALL');
    this.dateRange.set(null);
    this.loadData();
  }

  onPageChange(event: any) {
    this.documentService.setPage(event.page + 1);
  }

  createNewInvoice() {
    this.router.navigate(['/orders/credit-sales/new']);
  }

  viewInvoice(invoice: OrderResponse) {
    this.router.navigate(['/orders/credit-sales', invoice.orderId]);
  }

  downloadPdf(invoice: OrderResponse) {
    this.documentService.downloadInvoicePdf(invoice.orderId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-${invoice.orderNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de télécharger le PDF'
        });
      }
    });
  }

  recordPayment(invoice: OrderResponse) {
    this.selectedInvoiceForPayment.set(invoice);
    this.paymentAmount.set(invoice.remainingAmount || 0);
    this.showPaymentDialog.set(true);
  }

  confirmPayment() {
    const invoice = this.selectedInvoiceForPayment();
    if (!invoice) return;

    this.processingPayment.set(true);
    
    this.documentService.addPaymentToOrder(invoice.orderId, {
      method: this.selectedPaymentMethod() as PaymentMethod,
      amount: this.paymentAmount(),
      notes: this.paymentNotes()
    }).subscribe({
      next: () => {
        this.processingPayment.set(false);
        this.showPaymentDialog.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Paiement enregistré',
          detail: 'Le paiement a été enregistré avec succès'
        });
        this.refreshData();
      },
      error: () => {
        this.processingPayment.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible d\'enregistrer le paiement'
        });
      }
    });
  }

  isOverdue(invoice: OrderResponse): boolean {
    if (!invoice.dueDate || invoice.paymentStatus === PaymentStatus.PAID) return false;
    return new Date(invoice.dueDate) < new Date();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getPaymentStatusLabel(status: PaymentStatus): string {
    const labels: Record<string, string> = {
      'UNPAID': 'Non payé',
      'PARTIALLY_PAID': 'Partiel',
      'PAID': 'Payé',
      'CREDIT': 'Crédit',
      'CANCELLED': 'Annulé'
    };
    return labels[status] || status;
  }

  getPaymentStatusSeverity(status: PaymentStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      'UNPAID': 'danger',
      'PARTIALLY_PAID': 'warn',
      'PAID': 'success',
      'CREDIT': 'info',
      'CANCELLED': 'secondary'
    };
    return map[status] || 'secondary';
  }
}