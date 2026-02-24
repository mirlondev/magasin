import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { BadgeModule } from "primeng/badge";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from "primeng/inputicon";
import { InputTextModule } from "primeng/inputtext";
import { MenuModule } from "primeng/menu";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { TooltipModule } from "primeng/tooltip";
import { DocumentType, OrderResponse, OrderStatus, OrderType } from "../../../../core/models";
import { XafPipe } from "../../../../core/pipes/xaf-currency-pipe";
import { DocumentSalesService } from "../../../../core/services/document-sales.service";

import {
  Component, inject, signal, computed, OnInit
} from '@angular/core';

interface DocumentTypeFilter {
  label: string;
  value: OrderType | 'ALL';
  icon: string;
  color: string;
}

@Component({
  selector: 'app-non-commercial-documents',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, ButtonModule, CardModule,
    TableModule, TagModule, InputTextModule, IconFieldModule, InputIconModule,
    SelectModule, DialogModule, ConfirmDialogModule, TooltipModule,
    BadgeModule, MenuModule, ToastModule, XafPipe
  ],
  template: `
    <div class="min-h-screen bg-surface-ground">
      <!-- Header -->
      <div class="bg-surface-card border-b border-surface-border shadow-sm">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-surface-900">Documents Non Commerciaux</h1>
              <p class="text-surface-500 mt-1">Proformas, Devis et autres documents</p>
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
                label="Nouveau Document"
                severity="primary"
                (onClick)="showNewDocumentDialog.set(true)"
              ></p-button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto p-6 space-y-6">
        <!-- Document Type Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (type of documentTypes; track type.value) {
            <div
              class="bg-surface-card rounded-xl p-6 border-2 cursor-pointer transition-all duration-200 hover:shadow-md"
              [class.border-primary]="selectedType() === type.value"
              [class.bg-primary-50]="selectedType() === type.value"
              [class.border-surface-border]="selectedType() !== type.value"
              (click)="selectType(type.value)"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  [style.background-color]="type.color + '20'"
                  [style.color]="type.color"
                >
                  <i [class]="type.icon"></i>
                </div>
                <div>
                  <h3 class="font-bold text-surface-900">{{ type.label }}</h3>
                  <p class="text-sm text-surface-500">{{ getCountByType(type.value) }} documents</p>
                </div>
              </div>
            </div>
          }
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
              placeholder="Statut"
              styleClass="w-40"
            ></p-select>
          </div>
        </div>

        <!-- Data Table -->
        <div class="bg-surface-card rounded-xl border border-surface-border shadow-sm overflow-hidden">
          <p-table
            [value]="filteredDocuments()"
            [paginator]="true"
            [rows]="pageSize()"
            [totalRecords]="total()"
            [loading]="loading()"
            [rowsPerPageOptions]="[10, 25, 50]"
            styleClass="p-datatable-sm"
            [tableStyle]="{ 'min-width': '75rem' }"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>N° Document</th>
                <th>Type</th>
                <th>Client</th>
                <th>Date Création</th>
                <th>Validité</th>
                <th class="text-right">Montant</th>
                <th>Statut</th>
                <th style="width: 180px">Actions</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-doc>
              <tr>
                <td>
                  <div class="font-semibold text-surface-900">{{ doc.orderNumber }}</div>
                </td>
                <td>
                  <p-tag
                    [value]="getTypeLabel(doc.orderType)"
                    [severity]="getTypeSeverity(doc.orderType)"
                    [icon]="getTypeIcon(doc.orderType)"
                    styleClass="text-xs"
                  ></p-tag>
                </td>
                <td>
                  @if (doc.customerName; as name) {
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center">
                        <span class="text-xs font-bold text-surface-600">{{ getInitials(name) }}</span>
                      </div>
                      <span class="font-medium text-surface-900">{{ name }}</span>
                    </div>
                  } @else {
                    <span class="text-surface-400 italic">Sans client</span>
                  }
                </td>
                <td>
                  <div class="text-surface-700">{{ doc.createdAt | date:'dd/MM/yyyy' }}</div>
                </td>
                <td>
                  @if (doc.validUntil) {
                    <div [class.text-red-600]="isExpired(doc)">
                      {{ doc.validUntil | date:'dd/MM/yyyy' }}
                      @if (isExpired(doc)) {
                        <p-tag value="Expiré" severity="danger" styleClass="text-xs ml-2"></p-tag>
                      }
                    </div>
                  } @else {
                    <span class="text-surface-400">-</span>
                  }
                </td>
                <td class="text-right">
                  <div class="font-semibold text-surface-900">{{ doc.totalAmount | xaf }}</div>
                </td>
                <td>
                  <p-tag
                    [value]="getStatusLabel(doc.status)"
                    [severity]="getStatusSeverity(doc.status)"
                    styleClass="text-xs"
                  ></p-tag>
                </td>
                <td>
                  <div class="flex gap-1">
                    <p-button
                      icon="pi pi-eye"
                      text="true"
                      (onClick)="viewDocument(doc)"
                      pTooltip="Détails"
                    ></p-button>
                    <p-button
                      icon="pi pi-file-pdf"
                      text="true"
                      (onClick)="downloadPdf(doc)"
                      pTooltip="PDF"
                    ></p-button>
                    @if (canConvert(doc)) {
                      <p-button
                        icon="pi pi-check-circle"
                        text="true"
                        severity="success"
                        (onClick)="convertToInvoice(doc)"
                        pTooltip="Convertir en facture"
                      ></p-button>
                    }
                    <p-button
                      icon="pi pi-ellipsis-v"
                      text="true"
                      (onClick)="menu.toggle($event); selectedDocForMenu.set(doc)"
                    ></p-button>
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="8" class="text-center py-12">
                  <div class="flex flex-col items-center text-surface-400">
                    <i class="pi pi-inbox text-5xl mb-4"></i>
                    <p class="text-lg">Aucun document trouvé</p>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>

      <!-- New Document Dialog -->
      @if (showNewDocumentDialog()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-surface-card rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 class="text-xl font-bold mb-6">Nouveau Document</h3>
            
            <div class="grid grid-cols-1 gap-4">
              @for (type of documentTypes; track type.value) {
                @if (type.value !== 'ALL') {
                  <button
                    class="flex items-center gap-4 p-4 rounded-xl border-2 border-surface-border hover:border-primary hover:bg-primary-50 transition-all text-left"
                    (click)="createNewDocument(type.value)"
                  >
                    <div
                      class="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                      [style.background-color]="type.color + '20'"
                      [style.color]="type.color"
                    >
                      <i [class]="type.icon"></i>
                    </div>
                    <div>
                      <h4 class="font-bold text-surface-900">{{ type.label }}</h4>
                      <p class="text-sm text-surface-500">
                        {{ type.value === 'PROFORMA' ? 'Facture proforma avec validité' : 'Devis commercial' }}
                      </p>
                    </div>
                    <i class="pi pi-arrow-right ml-auto text-surface-400"></i>
                  </button>
                }
              }
            </div>

            <div class="flex justify-end mt-6">
              <p-button
                label="Annuler"
                outlined="true"
                (onClick)="showNewDocumentDialog.set(false)"
              ></p-button>
            </div>
          </div>
        </div>
      }

      <p-menu #menu [model]="menuItems()" [popup]="true"></p-menu>
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>
    </div>
  `
})
export class NonCommercialDocumentsComponent implements OnInit {
  private documentService = inject(DocumentSalesService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  // State
  loading = this.documentService.loading;
  documents = this.documentService.orders;
  total = this.documentService.total;
  pageSize = this.documentService.pageSize;

  // Filters
  searchQuery = signal('');
  selectedType = signal<OrderType | 'ALL'>('ALL');
  selectedStatus = signal<string>('ALL');
  showNewDocumentDialog = signal(false);
  selectedDocForMenu = signal<OrderResponse | null>(null);

  documentTypes: DocumentTypeFilter[] = [
    { label: 'Tous', value: 'ALL', icon: 'pi pi-folder', color: '#6b7280' },
    { label: 'Proformas', value: OrderType.PROFORMA, icon: 'pi pi-file-o', color: '#3b82f6' },
    { label: 'Devis', value: OrderType.ONLINE, icon: 'pi pi-calculator', color: '#10b981' }
  ];

  statusOptions = [
    { label: 'Tous', value: 'ALL' },
    { label: 'Brouillon', value: 'PENDING' },
    { label: 'Envoyé', value: 'PROCESSING' },
    { label: 'Accepté', value: 'COMPLETED' },
    { label: 'Expiré', value: 'CANCELLED' }
  ];

  menuItems = computed(() => [
    {
      label: 'Actions',
      items: [
        {
          label: 'Dupliquer',
          icon: 'pi pi-copy',
          command: () => this.duplicateDocument(this.selectedDocForMenu()!)
        },
        {
          label: 'Envoyer par email',
          icon: 'pi pi-envelope',
          command: () => this.sendByEmail(this.selectedDocForMenu()!)
        },
        {
          separator: true
        },
        {
          label: 'Supprimer',
          icon: 'pi pi-trash',
          severity: 'danger',
          command: () => this.deleteDocument(this.selectedDocForMenu()!)
        }
      ]
    }
  ]);

  filteredDocuments = computed(() => {
    let docs = this.documents().filter(d =>
      d.orderType === 'PROFORMA' || d.orderType === 'ONLINE'
    );

    if (this.selectedType() !== 'ALL') {
      docs = docs.filter(d => d.orderType === this.selectedType());
    }

    if (this.selectedStatus() !== 'ALL') {
      docs = docs.filter(d => d.status === this.selectedStatus());
    }

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      docs = docs.filter(d =>
        d.orderNumber.toLowerCase().includes(query) ||
        d.customerName?.toLowerCase().includes(query)
      );
    }

    return docs;
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.documentService.loadOrders(1, 10, {
      orderType: OrderType.PROFORMA
    });
  }

  refreshData() {
    this.loadData();
    this.messageService.add({
      severity: 'success',
      summary: 'Actualisation',
      detail: 'Données mises à jour'
    });
  }

  selectType(type: OrderType | 'ALL') {
    this.selectedType.set(type);
  }

  getCountByType(type: OrderType | 'ALL'): number {
    if (type === 'ALL') return this.documents().length;
    return this.documents().filter((d: any) => d.orderType === type).length;
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
  }

  onStatusChange(event: any) {
    this.selectedStatus.set(event.value);
  }

  createNewDocument(type: OrderType) {
    this.showNewDocumentDialog.set(false);
    const route = type === 'PROFORMA' ? '/orders/proformas/new' : '/orders/quotes/new';
    this.router.navigate([route]);
  }

  viewDocument(doc: OrderResponse) {
    const route = doc.orderType === 'PROFORMA'
      ? `/orders/proformas/${doc.orderId}`
      : `/orders/quotes/${doc.orderId}`;
    this.router.navigate([route]);
  }

  downloadPdf(doc: OrderResponse) {
    this.documentService.downloadProformaPdf(doc.orderId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-${doc.orderNumber}.pdf`;
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

  canConvert(doc: OrderResponse): boolean {
    return (doc.orderType === 'PROFORMA' || doc.orderType === 'ONLINE')
      && doc.status !== OrderStatus.CANCELLED;
  }

  convertToInvoice(doc: OrderResponse) {
    this.confirmationService.confirm({
      message: `Convertir le ${this.getTypeLabel(doc.orderType || '')} #${doc.orderNumber} en facture ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-circle',
      accept: () => {
        const operation = doc.orderType === 'PROFORMA'
          ? this.documentService.convertProformaToSale(doc.orderId)
          : this.documentService.generateInvoice(doc.orderId);

        operation.subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Conversion réussie',
              detail: 'Document converti en facture'
            });
            this.refreshData();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Impossible de convertir le document'
            });
          }
        });
      }
    });
  }

  duplicateDocument(doc: OrderResponse) {
    this.router.navigate(['/salpes/documents/new'], {
      queryParams: { duplicate: doc.orderId }
    });
  }

  sendByEmail(doc: OrderResponse) {
    this.messageService.add({
      severity: 'info',
      summary: 'Email',
      detail: 'Fonctionnalité en développement'
    });
  }

  deleteDocument(doc: OrderResponse) {
    this.confirmationService.confirm({
      message: `Supprimer le document #${doc.orderNumber} ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.documentService.cancelOrder(doc.orderId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Supprimé',
              detail: 'Document supprimé avec succès'
            });
            this.refreshData();
          }
        });
      }
    });
  }

  isExpired(doc: OrderResponse): boolean {
    if (!doc.validUntil) return false;
    return new Date(doc.validUntil) < new Date();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'PROFORMA': 'Proforma',
      'ONLINE': 'Devis',
      'CREDIT_SALE': 'Facture'
    };
    return labels[type] || type;
  }

  getTypeSeverity(type: string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
      'PROFORMA': 'info',
      'ONLINE': 'success',
      'CREDIT_SALE': 'warn'
    };
    return map[type] || 'secondary';
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      'PROFORMA': 'pi pi-file-o',
      'ONLINE': 'pi pi-calculator',
      'CREDIT_SALE': 'pi pi-file-pdf'
    };
    return map[type] || 'pi pi-file';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Brouillon',
      'PROCESSING': 'Envoyé',
      'COMPLETED': 'Accepté',
      'CANCELLED': 'Annulé'
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): 'info' | 'success' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'info' | 'success' | 'warn' | 'danger' | 'secondary'> = {
      'PENDING': 'secondary',
      'PROCESSING': 'info',
      'COMPLETED': 'success',
      'CANCELLED': 'danger'
    };
    return map[status] || 'secondary';
  }
}