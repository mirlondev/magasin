// features/orders/pages/document-sale/document-sale.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ViewContainerRef,
  EnvironmentInjector
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { PanelModule } from 'primeng/panel';
import { TabsModule } from 'primeng/tabs';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { SelectButtonModule } from 'primeng/selectbutton';
import { StepperModule } from 'primeng/stepper';
import { AccordionModule } from 'primeng/accordion';
import { ToolbarModule } from 'primeng/toolbar';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';


import { PaymentDialogComponent } from '../../components/payment-dialog/payment-dialog.component';
import { OrderItemsComponent } from '../../components/order-items/order-items.component';
import { OrderSummaryComponent } from '../../components/order-summary/order-summary.component';
import { CustomerSelectorComponent } from '../../components/customer-selector/customer-selector.component';
import { DocumentPreviewComponent } from '../../components/document-preview/document-preview.component';
import { CustomerFormComponent } from '../../../customers/components/customer-form.component';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

import {
  PaymentMethod, OrderType, DocumentType, Customer, OrderStatus,
  InvoiceStatus, PaymentStatus, Product, OrderItem
} from '../../../../core/models';
import { OrderCreateBaseComponent } from '../shared/order-create-base.component';
import { OrderService } from '../../../../core/services/orders.service';
import { InvoiceService } from '../../../../core/services/invoice.service';
import { CustomersService } from '../../../../core/services/customers.service';

type DocumentTab = 'details' | 'items' | 'preview' | 'history';

interface DocumentTemplate {
  type: DocumentType;
  title: string;
  icon: string;
  color: string;
  requiresCustomer: boolean;
  allowsPartialPayment: boolean;
  defaultValidityDays: number;
  description: string;
  features: string[];
}

@Component({
  selector: 'app-document-sale',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, CardModule, DialogModule,
    InputNumberModule, InputTextModule, TextareaModule, ToastModule,
    ConfirmDialogModule, TagModule, SelectModule, DatePickerModule,
    DividerModule, PanelModule, TabsModule, ChipModule, TooltipModule,
    TableModule, SelectButtonModule, StepperModule, AccordionModule,
    ToolbarModule, BreadcrumbModule, MenuModule, AvatarModule, BadgeModule,
    PaymentDialogComponent, OrderItemsComponent, OrderSummaryComponent,
    CustomerSelectorComponent, DocumentPreviewComponent, CustomerFormComponent,
    XafPipe
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <p-toolbar styleClass="bg-white border-b shadow-sm">
        <div class="flex items-center gap-4 w-full">
          <p-button 
            icon="pi pi-arrow-left" 
            text="true"
            (onClick)="goBack()"
          ></p-button>
          
          <div class="flex-1">
            <p-breadcrumb [model]="breadcrumbs()" styleClass="bg-transparent p-0"></p-breadcrumb>
            <h1 class="text-2xl font-bold flex items-center gap-3 mt-1">
              <i [class]="currentTemplate().icon" [style.color]="currentTemplate().color"></i>
              {{ pageTitle() }}
              @if (isEditMode()) {
                <p-tag value="Modification" severity="warn" styleClass="text-xs"></p-tag>
              }
            </h1>
          </div>

          <div class="flex items-center gap-2">
            <p-button 
              icon="pi pi-eye"
              label="Aperçu"
              outlined="true"
              (onClick)="activeTab.set('preview')"
              [disabled]="!canPreview()"
            ></p-button>
            <p-button 
              icon="pi pi-save"
              label="Brouillon"
              outlined="true"
              (onClick)="saveAsDraft()"
              [disabled]="!canSaveDraft()"
            ></p-button>
            <p-button 
              [icon]="submitIcon()"
              [label]="submitLabel()"
              [severity]="submitSeverity()"
              (onClick)="submitDocument()"
              [disabled]="!canSubmit()"
              [loading]="processing()"
            ></p-button>
          </div>
        </div>
      </p-toolbar>

      <div class="max-w-7xl mx-auto p-6">
        <p-stepper [value]="currentStep()" (valueChange)="onStepChange($event ?? 0)">
          <p-step-list>
            <p-step [value]="0">Type de document</p-step>
            <p-step [value]="1">Client</p-step>
            <p-step [value]="2">Articles</p-step>
            <p-step [value]="3">Validation</p-step>
          </p-step-list>
          <p-step-panels>
            <!-- Step 1: Document Type -->
            <p-step-panel [value]="0">
              <ng-template pTemplate="content" let-nextCallback="nextCallback">
                <div class="py-6">
                  <div class="text-center mb-8">
                    <h2 class="text-xl font-semibold mb-2">Sélectionnez le type de document</h2>
                    <p class="text-gray-500">Choisissez le document commercial adapté à votre besoin</p>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    @for (template of documentTemplates; track template.type) {
                      <div 
                        class="document-card p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg"
                        [class.border-primary]="selectedDocType() === template.type"
                        [class.bg-primary-50]="selectedDocType() === template.type"
                        [class.border-gray-200]="selectedDocType() !== template.type"
                        (click)="selectDocumentType(template.type)"
                      >
                        <div class="flex flex-col items-center text-center">
                          <div 
                            class="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl"
                            [style.background-color]="template.color + '20'"
                            [style.color]="template.color"
                          >
                            <i [class]="template.icon"></i>
                          </div>
                          <h3 class="font-bold text-lg mb-2">{{ template.title }}</h3>
                          <p class="text-sm text-gray-500 mb-4">{{ template.description }}</p>
                          <div class="flex flex-wrap gap-1 justify-center">
                            @for (feature of template.features; track feature) {
                              <p-tag [value]="feature" styleClass="text-xs" severity="secondary"></p-tag>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  </div>

                  <div class="flex justify-end mt-8">
                    <p-button 
                      label="Continuer"
                      icon="pi pi-arrow-right"
                      (onClick)="nextCallback.emit()"
                      [disabled]="!selectedDocType()"
                    ></p-button>
                  </div>
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 2: Customer -->
            <p-step-panel [value]="1">
              <ng-template 
                pTemplate="content" 
                let-prevCallback="prevCallback" 
                let-nextCallback="nextCallback"
              >
                <div class="py-6">
                  @if (selectedDocType() !== DocumentType.TICKET) {
                    <div class="max-w-2xl mx-auto">
                      <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-semibold">Informations client</h2>
                        <p-button 
                          icon="pi pi-plus"
                          label="Nouveau client"
                          outlined="true"
                          (onClick)="showNewCustomerDialog.set(true)"
                        ></p-button>
                      </div>

                      @if (orderState.customer(); as customer) {
                        <div class="bg-blue-50 border border-blue-200 rounded-xl p-6">
                          <div class="flex items-start justify-between">
                            <div class="flex items-center gap-4">
                              <p-avatar 
                                [label]="getCustomerInitials(customer)"
                                styleClass="bg-blue-500 text-white"
                                size="large"
                                shape="circle"
                              ></p-avatar>
                              <div>
                                <h3 class="font-bold text-lg text-blue-900">{{ customer.fullName }}</h3>
                                <div class="text-blue-700 space-y-1 mt-1">
                                  @if (customer.email) {
                                    <div class="flex items-center gap-2">
                                      <i class="pi pi-envelope text-sm"></i>
                                      <span>{{ customer.email }}</span>
                                    </div>
                                  }
                                  @if (customer.phone) {
                                    <div class="flex items-center gap-2">
                                      <i class="pi pi-phone text-sm"></i>
                                      <span>{{ customer.phone }}</span>
                                    </div>
                                  }
                                  @if (customer.address) {
                                    <div class="flex items-center gap-2">
                                      <i class="pi pi-map-marker text-sm"></i>
                                      <span>{{ customer.address }}</span>
                                    </div>
                                  }
                                </div>
                                @if (customer.loyaltyTier) {
                                  <div class="mt-3 flex items-center gap-2">
                                    <p-tag 
                                      [value]="customer.loyaltyTier" 
                                      [severity]="getTierSeverity(customer.loyaltyTier)"
                                      icon="pi pi-star"
                                    ></p-tag>
                                    <span class="text-sm">{{ customer.loyaltyPoints }} points</span>
                                  </div>
                                }
                              </div>
                            </div>
                            <div class="flex gap-2">
                              <p-button 
                                icon="pi pi-pencil"
                                text="true"
                                (onClick)="showCustomerDialog.set(true)"
                                pTooltip="Modifier"
                              ></p-button>
                              <p-button 
                                icon="pi pi-times"
                                text="true"
                                severity="danger"
                                (onClick)="removeCustomer()"
                                pTooltip="Retirer"
                              ></p-button>
                            </div>
                          </div>
                        </div>
                      } @else {
                        <div 
                          class="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                          (click)="showCustomerDialog.set(true)"
                        >
                          <i class="pi pi-user-plus text-5xl text-gray-300 mb-4"></i>
                          <h3 class="font-medium text-gray-700 mb-2">Sélectionner un client</h3>
                          <p class="text-sm text-gray-500 mb-4">Requis pour ce type de document</p>
                          <p-button 
                            icon="pi pi-search"
                            label="Rechercher un client"
                          ></p-button>
                        </div>
                      }

                      <!-- Delivery Address (for delivery notes) -->
                      @if (selectedDocType() === DocumentType.DELIVERY_NOTE && orderState.customer()) {
                        <div class="mt-6">
                          <h3 class="font-semibold mb-3">Adresse de livraison</h3>
                          <textarea 
                            pInputTextarea
                            [(ngModel)]="deliveryAddress"
                            rows="3"
                            class="w-full"
                            placeholder="Si différente de l'adresse client..."
                          ></textarea>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="text-center py-12">
                      <i class="pi pi-ticket text-6xl text-gray-200 mb-4"></i>
                      <h3 class="text-xl font-medium text-gray-600">Ticket de caisse</h3>
                      <p class="text-gray-500">Aucune information client requise</p>
                    </div>
                  }

                  <div class="flex justify-between mt-8">
                    <p-button 
                      label="Retour"
                      icon="pi pi-arrow-left"
                      text="true"
                      (onClick)="prevCallback.emit()"
                    ></p-button>
                    <p-button 
                      label="Continuer"
                      icon="pi pi-arrow-right"
                      (onClick)="nextCallback.emit()"
                      [disabled]="!canProceedToItems()"
                    ></p-button>
                  </div>
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 3: Items -->
            <p-step-panel [value]="2">
              <ng-template 
                pTemplate="content"
                let-prevCallback="prevCallback"
                let-nextCallback="nextCallback"
              >
                <div class="py-6">
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Product Selection -->
                    <div class="lg:col-span-2 space-y-4">
                      <div class="bg-white rounded-lg shadow-sm border p-4">
                        <div class="flex gap-3 mb-4">
                          <div class="flex-1 relative">
                            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input 
                              pInputText
                              [(ngModel)]="itemSearchTerm"
                              (ngModelChange)="onItemSearch($event)"
                              placeholder="Rechercher un produit..."
                              class="w-full pl-10"
                            >
                          </div>
                          <p-select 
                            [options]="categoryOptions()"
                            [(ngModel)]="selectedItemCategory"
                            placeholder="Catégorie"
                            [showClear]="true"
                            styleClass="w-40"
                          ></p-select>
                        </div>

                        <p-table 
                          [value]="availableProducts()"
                          [paginator]="true"
                          [rows]="10"
                          [responsiveLayout]="'scroll'"
                          selectionMode="single"
                          (onRowSelect)="onProductSelect($event)"
                          styleClass="p-datatable-sm"
                        >
                          <ng-template pTemplate="header">
                            <tr>
                              <th>Produit</th>
                              <th>Prix unitaire</th>
                              <th>Stock</th>
                              <th style="width: 100px"></th>
                            </tr>
                          </ng-template>
                          <ng-template pTemplate="body" let-product>
                            <tr [class.opacity-50]="product.quantity === 0">
                              <td>
                                <div class="flex items-center gap-3">
                                  @if (product.imageUrl) {
                                    <img [src]="product.imageUrl" class="w-10 h-10 object-cover rounded" [alt]="product.name">
                                  } @else {
                                    <div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                      <i class="pi pi-image text-gray-400"></i>
                                    </div>
                                  }
                                  <div>
                                    <div class="font-medium">{{ product.name }}</div>
                                    <div class="text-xs text-gray-500">{{ product.sku }}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div class="font-semibold">{{ (product.finalPrice || product.price) | xaf }}</div>
                                @if (product.discountPercentage > 0) {
                                  <div class="text-xs text-green-600">-{{ product.discountPercentage }}%</div>
                                }
                              </td>
                              <td>
                                <p-tag 
                                  [value]="product.quantity + ' unités'"
                                  [severity]="product.quantity > 10 ? 'success' : product.quantity > 0 ? 'warn' : 'danger'"
                                  styleClass="text-xs"
                                ></p-tag>
                              </td>
                              <td>
                                <p-button 
                                  icon="pi pi-plus"
                                  rounded="true"
                                  severity="success"
                                  [disabled]="product.quantity === 0"
                                  (onClick)="addToCart(product); $event.stopPropagation()"
                                ></p-button>
                              </td>
                            </tr>
                          </ng-template>
                        </p-table>
                      </div>
                    </div>

                    <!-- Cart Summary -->
                    <div class="space-y-4">
                      <div class="bg-white rounded-lg shadow-sm border p-4">
                        <h3 class="font-semibold mb-4 flex items-center gap-2">
                          <i class="pi pi-shopping-cart"></i>
                          Panier ({{ orderState.itemCount() }})
                        </h3>
                        
                        <app-order-items
                          [items]="orderState.items()"
                          [customer]="orderState.customer()"
                          (updateQuantity)="onUpdateQuantity($event)"
                          (removeItem)="onRemoveItem($event)"
                          (applyDiscount)="onApplyItemDiscount($any($event))"
                        ></app-order-items>
                      </div>

                      <div class="bg-white rounded-lg shadow-sm border p-4">
                        <app-order-summary
                          [subtotal]="orderState.subtotal()"
                          [discountAmount]="orderState.totalDiscountAmount()"
                          [taxRate]="orderState.taxRate()"
                          [taxAmount]="orderState.taxAmount()"
                          [totalAmount]="orderState.total()"
                          [itemCount]="orderState.itemCount()"
                          [uniqueItems]="orderState.uniqueItemCount()"
                        ></app-order-summary>
                      </div>
                    </div>
                  </div>

                  <div class="flex justify-between mt-8">
                    <p-button 
                      label="Retour"
                      icon="pi pi-arrow-left"
                      text="true"
                      (onClick)="prevCallback.emit()"
                    ></p-button>
                    <p-button 
                      label="Continuer"
                      icon="pi pi-arrow-right"
                      (onClick)="nextCallback.emit()"
                      [disabled]="orderState.items().length === 0"
                    ></p-button>
                  </div>
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 4: Configuration & Review -->
            <p-step-panel [value]="3">
              <ng-template pTemplate="content" let-prevCallback="prevCallback">
                <div class="py-6">
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Document Configuration -->
                    <div class="space-y-6">
                      <div class="bg-white rounded-lg shadow-sm border p-6">
                        <h3 class="font-semibold mb-4 flex items-center gap-2">
                          <i class="pi pi-cog"></i>
                          Paramètres du document
                        </h3>

                        <!-- Validity (for proforma/quotes) -->
                        @if (showValiditySettings()) {
                          <div class="mb-4">
                            <label class="block text-sm font-medium mb-2">Validité (jours)</label>
                            <p-inputNumber 
                              [(ngModel)]="validityDays"
                              [min]="1"
                              [max]="365"
                              class="w-full"
                            ></p-inputNumber>
                          </div>

                          <div class="mb-4">
                            <label class="block text-sm font-medium mb-2">Date d'échéance</label>
                            <p-datePicker 
                              [(ngModel)]="dueDate"
                              [minDate]="minDate"
                              [showIcon]="true"
                              class="w-full"
                            ></p-datePicker>
                          </div>
                        }

                        <!-- Payment Terms -->
                        <div class="mb-4">
                          <label class="block text-sm font-medium mb-2">Conditions de paiement</label>
                          <p-select 
                            [options]="paymentTerms"
                            [(ngModel)]="selectedPaymentTerm"
                            placeholder="Sélectionner..."
                            class="w-full"
                          ></p-select>
                        </div>

                        <!-- Reference -->
                        <div class="mb-4">
                          <label class="block text-sm font-medium mb-2">Référence client</label>
                          <input 
                            pInputText
                            [(ngModel)]="customerReference"
                            placeholder="N° de bon de commande..."
                            class="w-full"
                          >
                        </div>

                        <!-- Notes -->
                        <div>
                          <label class="block text-sm font-medium mb-2">Notes / Conditions</label>
                          <textarea 
                            pInputTextarea
                            [(ngModel)]="documentNotes"
                            rows="4"
                            class="w-full"
                            placeholder="Conditions particulières..."
                          ></textarea>
                        </div>
                      </div>

                      <!-- Document Summary -->
                      <div class="bg-white rounded-lg shadow-sm border p-6">
                        <h3 class="font-semibold mb-4">Récapitulatif</h3>
                        <div class="space-y-2 text-sm">
                          <div class="flex justify-between">
                            <span class="text-gray-600">Type de document</span>
                            <span class="font-medium">{{ currentTemplate().title }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-gray-600">Client</span>
                            <span class="font-medium">{{ orderState.customer()?.fullName || 'Comptant' }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span class="text-gray-600">Nombre d'articles</span>
                            <span class="font-medium">{{ orderState.itemCount() }}</span>
                          </div>
                          <p-divider></p-divider>
                          <div class="flex justify-between text-lg font-bold">
                            <span>Total TTC</span>
                            <span class="text-primary">{{ orderState.total() | xaf }}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Preview -->
                    <div>
                      <div class="bg-white rounded-lg shadow-sm border p-6 h-full">
                        <h3 class="font-semibold mb-4 flex items-center gap-2">
                          <i class="pi pi-eye"></i>
                          Aperçu
                        </h3>
                        <app-document-preview
                          [documentType]="selectedDocType()"
                          [items]="orderState.items()"
                          [customer]="orderState.customer()"
                          [totals]="{
                            subtotal: orderState.subtotal(),
                            tax: orderState.taxAmount(),
                            total: orderState.total()
                          }"
                          [config]="{
                            validityDays: validityDays,
                            dueDate: dueDate,
                            notes: documentNotes,
                            reference: customerReference,
                            paymentTerms: selectedPaymentTerm
                          }"
                        ></app-document-preview>
                      </div>
                    </div>
                  </div>

                  <div class="flex justify-between mt-8">
                    <p-button 
                      label="Retour"
                      icon="pi pi-arrow-left"
                      text="true"
                      (onClick)="prevCallback.emit()"
                    ></p-button>
                    <div class="flex gap-2">
                      <p-button 
                        label="Sauvegarder brouillon"
                        icon="pi pi-save"
                        outlined="true"
                        (onClick)="saveAsDraft()"
                      ></p-button>
                      <p-button 
                        [label]="submitLabel()"
                        [icon]="submitIcon()"
                        [severity]="submitSeverity()"
                        (onClick)="submitDocument()"
                        [loading]="processing()"
                      ></p-button>
                    </div>
                  </div>
                </div>
              </ng-template>
            </p-step-panel>
          </p-step-panels>
        </p-stepper>
      </div>

      <!-- Customer Selection Dialog -->
      @if (showCustomerDialog()) {
        <app-customer-selector
          [customer]="orderState.customer()"
          (customerSelected)="selectCustomer($event)"
          (customerCleared)="removeCustomer()"
          (close)="showCustomerDialog.set(false)"
        ></app-customer-selector>
      }

      <!-- New Customer Dialog -->
      @if (showNewCustomerDialog()) {
        <app-customer-form
          (save)="onNewCustomerSaved($any($event))"
          (cancel)="showNewCustomerDialog.set(false)"
        ></app-customer-form>
      }

      <!-- Payment Dialog (for immediate payment documents) -->
      @if (showPaymentDialog()) {
        <app-payment-dialog
          [totalAmount]="orderState.total()"
          [orderType]="getOrderTypeForDocument()"
          [customerName]="orderState.customer()?.fullName || ''"
          (paymentComplete)="onPaymentComplete($event)"
          (cancel)="showPaymentDialog.set(false)"
        ></app-payment-dialog>
      }
    </div>
  `,
  styles: [`
    .document-card {
      transition: all 0.2s ease;
    }
    
    .document-card:hover {
      transform: translateY(-2px);
    }
    
    :host ::ng-deep .p-stepper .p-stepper-panel .p-stepper-content {
      padding: 0;
    }
  `]
})
export class DocumentSaleComponent extends OrderCreateBaseComponent implements OnInit {
  readonly DocumentType = DocumentType;

  // Services
  private ordersService = inject(OrderService);
  private invoiceService = inject(InvoiceService);
  private confirmationService = inject(ConfirmationService);

  private route = inject(ActivatedRoute);

  // State
  currentStep = signal(0);
  override showCustomerDialog = signal(false);
  selectedDocType = signal<DocumentType>(DocumentType.INVOICE);
  showNewCustomerDialog = signal(false);
  showPaymentDialog = signal(false);
  processing = signal(false);
  isEditMode = signal(false);
  activeTab = signal<DocumentTab>('details');

  // Document Settings
  validityDays = 30;
  dueDate: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  minDate = new Date();
  selectedPaymentTerm = 'IMMEDIATE';
  documentNotes = '';
  customerReference = '';
  deliveryAddress = '';

  // Search
  itemSearchTerm = '';
  selectedItemCategory = 'all';

  // Document Templates
  documentTemplates: DocumentTemplate[] = [
    {
      type: DocumentType.INVOICE,
      title: 'Facture',
      icon: 'pi pi-file-pdf',
      color: '#ef4444',
      requiresCustomer: true,
      allowsPartialPayment: true,
      defaultValidityDays: 30,
      description: 'Facture définitive pour vente à crédit ou comptant',
      features: ['Paiement échelonné', 'Génération PDF', 'Suivi paiement']
    },
    {
      type: DocumentType.PROFORMA,
      title: 'Facture Proforma',
      icon: 'pi pi-file-o',
      color: '#3b82f6',
      requiresCustomer: true,
      allowsPartialPayment: false,
      defaultValidityDays: 30,
      description: 'Devis facture avec validité limitée',
      features: ['Validité configurable', 'Conversion en facture', 'Acompte possible']
    },
    {
      type: DocumentType.QUOTE,
      title: 'Devis',
      icon: 'pi pi-calculator',
      color: '#10b981',
      requiresCustomer: true,
      allowsPartialPayment: false,
      defaultValidityDays: 15,
      description: 'Proposition commerciale détaillée',
      features: ['Négociation', 'Multi-options', 'Signature client']
    },
    {
      type: DocumentType.DELIVERY_NOTE,
      title: 'Bon de Livraison',
      icon: 'pi pi-truck',
      color: '#f59e0b',
      requiresCustomer: true,
      allowsPartialPayment: false,
      defaultValidityDays: 0,
      description: 'Document d\'accompagnement livraison',
      features: ['Adresse livraison', 'Réception client', 'Retour marchandise']
    },
    {
      type: DocumentType.TICKET,
      title: 'Ticket de caisse',
      icon: 'pi pi-ticket',
      color: '#6b7280',
      requiresCustomer: false,
      allowsPartialPayment: false,
      defaultValidityDays: 0,
      description: 'Vente comptant simplifiée',
      features: ['Rapide', 'Sans client', 'Impression immédiate']
    }
  ];

  paymentTerms = [
    { label: 'Paiement immédiat', value: 'IMMEDIATE' },
    { label: 'À 15 jours', value: 'NET_15' },
    { label: 'À 30 jours', value: 'NET_30' },
    { label: 'À 60 jours', value: 'NET_60' },
    { label: 'Fin de mois', value: 'END_OF_MONTH' }
  ];

  // Computed
  currentTemplate = computed(() =>
    this.documentTemplates.find(t => t.type === this.selectedDocType()) || this.documentTemplates[0]
  );

  override pageTitle(): string {
    if (this.isEditMode()) {
      return `Modifier ${this.currentTemplate().title}`;
    }
    return `Nouveau ${this.currentTemplate().title}`;
  }

  breadcrumbs = computed(() => [
    { label: 'Ventes', routerLink: '/orders' },
    { label: 'Documents commerciaux', routerLink: '/orders/documents' },
    { label: this.currentTemplate().title }
  ]);

  availableProducts = computed(() => {
    let products = this.productsService.products();

    if (this.itemSearchTerm) {
      const term = this.itemSearchTerm.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term)
      );
    }

    if (this.selectedItemCategory && this.selectedItemCategory !== 'all') {
      products = products.filter(p => p.categoryId === this.selectedItemCategory);
    }

    return products;
  });

  showValiditySettings = computed(() =>
    [DocumentType.PROFORMA, DocumentType.QUOTE].includes(this.selectedDocType())
  );

  canSubmit = computed(() =>
    this.orderState.items().length > 0 &&
    (!this.currentTemplate().requiresCustomer || !!this.orderState.customer()) &&
    !this.processing()
  );

  canPreview = computed(() => this.orderState.items().length > 0);
  canSaveDraft = computed(() => this.orderState.items().length > 0 || !!this.orderState.customer());

  submitLabel = computed(() => {
    switch (this.selectedDocType()) {
      case DocumentType.INVOICE:
        return 'CRÉER LA FACTURE';
      case DocumentType.PROFORMA:
        return 'GÉNÉRER PROFORMA';
      case DocumentType.QUOTE:
        return 'GÉNÉRER DEVIS';
      case DocumentType.DELIVERY_NOTE:
        return 'CRÉER BON DE LIVRAISON';
      default:
        return 'VALIDER';
    }
  });

  submitIcon = computed(() => {
    switch (this.selectedDocType()) {
      case DocumentType.INVOICE:
        return 'pi pi-file-pdf';
      case DocumentType.PROFORMA:
        return 'pi pi-file-o';
      case DocumentType.QUOTE:
        return 'pi pi-calculator';
      case DocumentType.DELIVERY_NOTE:
        return 'pi pi-truck';
      default:
        return 'pi pi-check';
    }
  });

  submitSeverity = computed<'danger' | 'info' | 'success' | 'primary'>(() => {
    switch (this.selectedDocType()) {
      case DocumentType.INVOICE:
        return 'danger';
      case DocumentType.PROFORMA:
        return 'info';
      case DocumentType.QUOTE:
        return 'success';
      default:
        return 'primary';
    }
  });

  constructor() {
    super();
  }

  override ngOnInit() {
    super.ngOnInit();

    // Check for edit mode
    const orderId = this.route.snapshot.queryParamMap.get('edit');
    if (orderId) {
      this.loadOrderForEdit(orderId);
    }

    // Check for document type in query params
    const docType = this.route.snapshot.queryParamMap.get('type');
    if (docType && Object.values(DocumentType).includes(docType as DocumentType)) {
      this.selectedDocType.set(docType as DocumentType);
    }
  }

  // Step Management
  onStepChange(step: number) {
    this.currentStep.set(step);
  }

  selectDocumentType(type: DocumentType) {
    this.selectedDocType.set(type);
    this.validityDays = this.documentTemplates.find(t => t.type === type)?.defaultValidityDays || 30;
    this.dueDate = new Date(Date.now() + this.validityDays * 24 * 60 * 60 * 1000);
  }

  canProceedToItems(): boolean {
    const template = this.currentTemplate();
    if (!template.requiresCustomer) return true;
    return !!this.orderState.customer();
  }

  // Customer Operations
  override selectCustomer(customer: Customer) {
    this.orderState.setCustomer(customer);
    this.showCustomerDialog.set(false);

    // Auto-fill delivery address
    if (this.selectedDocType() === DocumentType.DELIVERY_NOTE && !this.deliveryAddress) {
      const address = [customer.address, customer.city, customer.postalCode]
        .filter(Boolean)
        .join(', ');
      this.deliveryAddress = address;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Client sélectionné',
      detail: customer.fullName
    });
  }

  onNewCustomerSaved(customer: Customer) {
    this.selectCustomer(customer);
    this.showNewCustomerDialog.set(false);
  }

  getCustomerInitials(customer: Customer): string {
    return (customer.firstName?.[0] || '') + (customer.lastName?.[0] || '');
  }

  getTierSeverity(tier: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      'BRONZE': 'secondary',
      'SILVER': 'info',
      'GOLD': 'warn',
      'PLATINUM': 'success'
    };
    return map[tier] || 'info';
  }

  // Product Operations
  onItemSearch(term: string) {
    // Debounce search
  }

  onProductSelect(event: any) {
    this.addToCart(event.data);
  }

  onUpdateQuantity(event: { productId: string; delta: number }) {
    this.orderState.updateItemQuantity(event.productId, event.delta);
  }

  onRemoveItem(productId: string) {
    this.orderState.removeItem(productId);
  }

  onApplyItemDiscount(event: { productId: string; discountPercentage: number }) {
    this.orderState.updateItemDiscount(event.productId, event.discountPercentage);
  }

  // Document Submission
  submitDocument() {
    if (!this.canSubmit()) return;

    const validation = this.validateDocument();
    if (!validation.valid) {
      validation.errors.forEach(error =>
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur de validation',
          detail: error
        })
      );
      return;
    }

    // For invoices with immediate payment, show payment dialog first
    if (this.selectedDocType() === DocumentType.INVOICE && this.selectedPaymentTerm === 'IMMEDIATE') {
      this.showPaymentDialog.set(true);
      return;
    }

    this.createDocument();
  }

  onPaymentComplete(payments: any[]) {
    this.showPaymentDialog.set(false);
    this.createDocument(payments[0]);
  }

  private createDocument(initialPayment?: any) {
    this.processing.set(true);

    const request = this.buildOrderRequest(initialPayment);

    const operation = initialPayment
      ? this.ordersService.createOrderWithPayment(request, {
        method: initialPayment.method,
        amount: initialPayment.amount,
        notes: initialPayment.notes
      })
      : this.ordersService.createOrder(request);

    operation.subscribe({
      next: (order) => {
        this.processing.set(false);
        this.handleDocumentCreated(order);
      },
      error: (err) => {
        this.processing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Erreur lors de la création du document'
        });
      }
    });
  }

  private buildOrderRequest(payment?: any): any {
    const baseRequest: any = {
      storeId: this.currentShift()?.storeId || '',
      customerId: this.orderState.customer()?.customerId,
      items: this.orderState.items().map(item => ({
        productId: item.product.productId,
        quantity: item.quantity,
        discountPercentage: item.discountPercentage,
        notes: item.notes,
        unitType: item.unitType
      })),
      orderType: this.getOrderTypeForDocument(),
      notes: this.buildDocumentNotes(),
      globalDiscountAmount: this.orderState.totalDiscountAmount(),
      taxRate: this.orderState.taxRate()
    };

    // Add document-specific fields
    if (this.showValiditySettings()) {
      baseRequest.validityDays = this.validityDays;
      baseRequest.dueDate = this.dueDate?.toISOString();
    }

    if (payment) {
      baseRequest.paymentMethod = payment.method;
      baseRequest.amountPaid = payment.amount;
    }

    return baseRequest;
  }

  protected getOrderTypeForDocument(): OrderType {
    switch (this.selectedDocType()) {
      case DocumentType.INVOICE:
      case DocumentType.TICKET:
        return OrderType.CREDIT_SALE;
      case DocumentType.PROFORMA:
        return OrderType.PROFORMA;
      case DocumentType.QUOTE:
        return OrderType.ONLINE;
      default:
        return OrderType.CREDIT_SALE;
    }
  }

  private buildDocumentNotes(): string {
    const parts: string[] = [];

    if (this.documentNotes) {
      parts.push(this.documentNotes);
    }

    if (this.customerReference) {
      parts.push(`Réf. client: ${this.customerReference}`);
    }

    if (this.selectedPaymentTerm !== 'IMMEDIATE') {
      const term = this.paymentTerms.find(t => t.value === this.selectedPaymentTerm);
      if (term) parts.push(`Paiement: ${term.label}`);
    }

    if (this.selectedDocType() === DocumentType.DELIVERY_NOTE && this.deliveryAddress) {
      parts.push(`Livraison: ${this.deliveryAddress}`);
    }

    return parts.join('\n');
  }

  private handleDocumentCreated(order: any) {
    const template = this.currentTemplate();

    this.messageService.add({
      severity: 'success',
      summary: 'Document créé',
      detail: `${template.title} #${order.orderNumber} généré avec succès`,
      life: 5000
    });

    // Generate PDF based on document type
    switch (this.selectedDocType()) {
      case DocumentType.INVOICE:
      case DocumentType.PROFORMA:
      case DocumentType.QUOTE:
        this.invoiceService.generateInvoice(order.orderId).subscribe({
          next: (invoice: any) => {
            this.invoiceService.openPdfInTab(invoice.invoiceId);
          }
        });
        break;
    }

    // Navigate to document list or stay for new document
    this.confirmationService.confirm({
      message: 'Voulez-vous créer un autre document?',
      header: 'Nouveau document',
      icon: 'pi pi-question-circle',
      accept: () => {
        this.orderState.clear();
        this.currentStep.set(0);
      },
      reject: () => {
        this.router.navigate(['/orders/documents']);
      }
    });
  }

  // Validation
  private validateDocument(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const template = this.currentTemplate();

    if (this.orderState.items().length === 0) {
      errors.push('Le document doit contenir au moins un article');
    }

    if (template.requiresCustomer && !this.orderState.customer()) {
      errors.push('Un client est obligatoire pour ce type de document');
    }

    if (this.showValiditySettings() && this.validityDays <= 0) {
      errors.push('La durée de validité doit être supérieure à 0');
    }

    return { valid: errors.length === 0, errors };
  }

  // Edit Mode
  private loadOrderForEdit(orderId: string) {
    this.isEditMode.set(true);
    this.ordersService.getOrderById(orderId).subscribe({
      next: (order) => {
        // Populate state with order data
        this.orderState.setItems(order.items.map((item: OrderItem) => ({
          product: item.product!,
          quantity: item.quantity,
          discountPercentage: item.discountPercentage,
          notes: item.notes
        })));

        if (order.customerId) {
          this.orderState.setCustomer({
            customerId: order.customerId,
            firstName: order.customerName?.split(' ')[0] || '',
            lastName: order.customerName?.split(' ').slice(1).join(' ') || '',
            fullName: order.customerName,
            email: order.customerEmail || '',
            phone: order.customerPhone
          } as Customer);
        }

        // Use documentType if available on order (might need to cast or check source)
        const orderAsAny = order as any;
        this.selectedDocType.set(orderAsAny.documentType || DocumentType.INVOICE);
        this.documentNotes = orderAsAny.notes || '';
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger la commande'
        });
      }
    });
  }

  // Utilities
  saveAsDraft() {
    const draft = {
      type: this.selectedDocType(),
      items: this.orderState.items(),
      customer: this.orderState.customer(),
      config: {
        validityDays: this.validityDays,
        dueDate: this.dueDate,
        paymentTerm: this.selectedPaymentTerm,
        notes: this.documentNotes,
        reference: this.customerReference
      },
      timestamp: new Date().toISOString()
    };

    const drafts = JSON.parse(localStorage.getItem('document_drafts') || '[]');
    drafts.push(draft);
    localStorage.setItem('document_drafts', JSON.stringify(drafts));

    this.messageService.add({
      severity: 'success',
      summary: 'Brouillon sauvegardé',
      detail: 'Le document a été sauvegardé comme brouillon'
    });
  }

  override goBack() {
    if (this.orderState.hasChanges()) {
      this.confirmationService.confirm({
        message: 'Des modifications non sauvegardées seront perdues. Continuer?',
        header: 'Confirmation',
        accept: () => {
          this.orderState.clear();
          this.router.navigate(['/orders/documents']);
        }
      });
    } else {
      this.router.navigate(['/orders/documents']);
    }
  }

  // Required implementations
  // override pageTitle(): string { return this.pageTitle(); }
  override canProcess(): boolean { return this.canSubmit(); }
}