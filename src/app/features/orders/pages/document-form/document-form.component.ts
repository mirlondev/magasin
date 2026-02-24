import { CommonModule } from "@angular/common";
import { Component, OnInit, ViewChild, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { BadgeModule } from "primeng/badge";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DatePickerModule } from "primeng/datepicker";
import { DialogModule } from "primeng/dialog";
import { DividerModule } from "primeng/divider";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { StepperModule } from "primeng/stepper";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import { ToastModule } from "primeng/toast";
import { TooltipModule } from "primeng/tooltip";
import { XafPipe } from "../../../../core/pipes/xaf-currency-pipe";
import { AuthService } from "../../../../core/services/auth.service";
import { CustomersService } from "../../../../core/services/customers.service";
import { DocumentSalesService } from "../../../../core/services/document-sales.service";
import { ProductsService } from "../../../../core/services/products.service";
import { OrderStateService } from "../../../orders/services/order-state.service";
import { StyleClassModule } from "primeng/styleclass";
import {
  OrderType, DocumentType, Product, Customer, OrderItemRequest, PaymentMethod
} from '../../../../core/models';

type DocumentFormStep = 0 | 1 | 2 | 3;

interface DocumentConfig {
  type: OrderType;
  title: string;
  icon: string;
  color: string;
  requiresCustomer: boolean;
  allowPartialPayment: boolean;
  defaultValidityDays: number;
}

@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, CardModule, StepperModule,
    InputTextModule, InputNumberModule, TextareaModule, SelectModule,
    DatePickerModule, TableModule, TagModule, DividerModule, TooltipModule,
    BadgeModule, DialogModule, ToastModule, ConfirmDialogModule, XafPipe
  ],
  template: `
    <div class="min-h-screen bg-surface-ground">
      <!-- Header -->
      <div class="bg-surface-card border-b border-surface-border shadow-sm sticky top-0 z-30">
        <div class="max-w-7xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <p-button
                icon="pi pi-arrow-left"
                text="true"
                (onClick)="goBack()"
              ></p-button>
              <div>
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg flex items-center justify-center"
                    [style.background-color]="config().color + '20'"
                    [style.color]="config().color"
                  >
                    <i [class]="config().icon"></i>
                  </div>
                  <div>
                    <h1 class="text-xl font-bold text-surface-900">{{ config().title }}</h1>
                    <p class="text-sm text-surface-500">{{ isEditMode() ? 'Modification' : 'Nouveau document' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <p-button
                label="Brouillon"
                icon="pi pi-save"
                outlined="true"
                (onClick)="saveAsDraft()"
                [disabled]="!canSaveDraft()"
              ></p-button>
              <p-button
                [label]="submitLabel()"
                [icon]="submitIcon()"
                [severity]="submitSeverity()"
                (onClick)="submitDocument()"
                [loading]="submitting()"
                [disabled]="!canSubmit()"
              ></p-button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto p-6">
        <p-stepper [(value)]="currentStep" class="document-stepper">
          <p-step-list>
            <p-step [value]="0">Client</p-step>
            <p-step [value]="1">Articles</p-step>
            <p-step [value]="2">Configuration</p-step>
            <p-step [value]="3">Récapitulatif</p-step>
          </p-step-list>

          <p-step-panels>
            <!-- Step 1: Customer -->
            <p-step-panel [value]="0">
              <ng-template pTemplate="content" let-nextCallback="nextCallback">
                <div class="max-w-2xl mx-auto py-8">
                  <div class="bg-surface-card rounded-xl border border-surface-border p-6">
                    <div class="flex items-center justify-between mb-6">
                      <h2 class="text-lg font-semibold text-surface-900">Informations Client</h2>
                      @if (config().requiresCustomer) {
                        <span class="text-sm text-red-500">* Requis</span>
                      }
                    </div>

                    @if (selectedCustomer(); as customer) {
                      <div class="bg-primary-50 border border-primary-200 rounded-xl p-6">
                        <div class="flex items-start justify-between">
                          <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold">
                              {{ getInitials(customer) }}
                            </div>
                            <div>
                              <h3 class="font-bold text-lg text-surface-900">{{ customer.fullName }}</h3>
                              <div class="space-y-1 mt-2 text-sm text-surface-600">
                                @if (customer.email) {
                                  <div class="flex items-center gap-2">
                                    <i class="pi pi-envelope text-primary-500"></i>
                                    <span>{{ customer.email }}</span>
                                  </div>
                                }
                                @if (customer.phone) {
                                  <div class="flex items-center gap-2">
                                    <i class="pi pi-phone text-primary-500"></i>
                                    <span>{{ customer.phone }}</span>
                                  </div>
                                }
                                @if (customer.address) {
                                  <div class="flex items-center gap-2">
                                    <i class="pi pi-map-marker text-primary-500"></i>
                                    <span>{{ customer.address }}, {{ customer.city }}</span>
                                  </div>
                                }
                              </div>
                            </div>
                          </div>
                          <div class="flex gap-2">
                            <p-button
                              icon="pi pi-pencil"
                              text="true"
                              (onClick)="showCustomerSearch.set(true)"
                            ></p-button>
                            <p-button
                              icon="pi pi-times"
                              text="true"
                              severity="danger"
                              (onClick)="clearCustomer()"
                            ></p-button>
                          </div>
                        </div>
                      </div>
                    } @else {
                      <div class="text-center py-12 border-2 border-dashed border-surface-border rounded-xl">
                        <i class="pi pi-user-plus text-5xl text-surface-300 mb-4"></i>
                        <h3 class="font-medium text-surface-700 mb-2">Aucun client sélectionné</h3>
                        <p class="text-sm text-surface-500 mb-6">
                          {{ config().requiresCustomer ? 'Veuillez sélectionner un client pour continuer' : 'Client comptant ou sélectionnez un client' }}
                        </p>
                        <div class="flex justify-center gap-3">
                          <p-button
                            icon="pi pi-search"
                            label="Rechercher un client"
                            (onClick)="showCustomerSearch.set(true)"
                          ></p-button>
                          <p-button
                            icon="pi pi-plus"
                            label="Nouveau client"
                            outlined="true"
                            (onClick)="showNewCustomerForm.set(true)"
                          ></p-button>
                        </div>
                      </div>
                    }
                  </div>

                  <div class="flex justify-end mt-6">
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

            <!-- Step 2: Items -->
            <p-step-panel [value]="1">
              <ng-template pTemplate="content" let-prevCallback="prevCallback" let-nextCallback="nextCallback">
                <div class="py-6">
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Product Selection -->
                    <div class="lg:col-span-2 space-y-4">
                      <div class="bg-surface-card rounded-xl border border-surface-border p-4">
                        <div class="flex gap-3 mb-4">
                          <div class="flex-1 relative">
                            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"></i>
                            <input
                              pInputText
                              [(ngModel)]="productSearchTerm"
                              (ngModelChange)="searchProducts($event)"
                              placeholder="Rechercher un produit..."
                              class="w-full pl-10"
                            >
                          </div>
                          <p-select
                            [options]="categoryOptions()"
                            [(ngModel)]="selectedCategory"
                            placeholder="Catégorie"
                            [showClear]="true"
                            styleClass="w-40"
                          ></p-select>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                          @for (product of filteredProducts(); track product.productId) {
                            <div
                              class="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:border-primary hover:shadow-md transition-all cursor-pointer"
                              [class.opacity-50]="product.quantity === 0"
                              (click)="addToCart(product)"
                            >
                              @if (product.imageUrl) {
                                <img [src]="product.imageUrl" class="w-16 h-16 object-cover rounded-lg" [alt]="product.name">
                              } @else {
                                <div class="w-16 h-16 bg-surface-100 rounded-lg flex items-center justify-center">
                                  <i class="pi pi-image text-surface-400 text-xl"></i>
                                </div>
                              }
                              <div class="flex-1 min-w-0">
                                <h4 class="font-medium text-surface-900 truncate">{{ product.name }}</h4>
                                <p class="text-sm text-surface-500">{{ product.sku }}</p>
                                <div class="flex items-center gap-2 mt-1">
                                  <span class="font-bold text-primary-600">{{ product.finalPrice || product.price || 0 | xaf }}</span>
                                  @if (product.discountPercentage) {
                                    <span class="text-xs text-green-600">-{{ product.discountPercentage }}%</span>
                                  }
                                </div>
                              </div>
                              <p-button
                                icon="pi pi-plus"
                                rounded="true"
                                severity="success"
                                [disabled]="product.quantity === 0"
                                (onClick)="addToCart(product); $event.stopPropagation()"
                              ></p-button>
                            </div>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Cart -->
                    <div class="space-y-4">
                      <div class="bg-surface-card rounded-xl border border-surface-border p-4">
                        <div class="flex items-center justify-between mb-4">
                          <h3 class="font-semibold text-surface-900">Panier ({{ cartItems().length }})</h3>
                          @if (cartItems().length > 0) {
                            <p-button
                              icon="pi pi-trash"
                              text="true"
                              severity="danger"
                              (onClick)="clearCart()"
                            ></p-button>
                          }
                        </div>

                        @if (cartItems().length > 0) {
                          <div class="space-y-3 max-h-[400px] overflow-y-auto">
                            @for (item of cartItems(); track item.product.productId) {
                              <div class="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                                <div class="flex-1">
                                  <h4 class="font-medium text-sm text-surface-900">{{ item.product.name }}</h4>
                                  <div class="flex items-center gap-2 mt-1">
                                    <span class="text-xs text-surface-500">{{ (item.product.finalPrice || item.product.price || 0) | xaf }} x {{ item.quantity }}</span>
                                    @if (item.discountPercentage > 0) {
                                      <span class="text-xs text-green-600">-{{ item.discountPercentage }}%</span>
                                    }
                                  </div>
                                </div>
                                <div class="flex items-center gap-2">
                                  <p-button
                                    icon="pi pi-minus"
                                    rounded="true"
                                    text="true"
                                    (onClick)="updateQuantity(item.product.productId, -1)"
                                  ></p-button>
                                  <span class="w-8 text-center font-medium">{{ item.quantity }}</span>
                                  <p-button
                                    icon="pi pi-plus"
                                    rounded="true"
                                    text="true"
                                    (onClick)="updateQuantity(item.product.productId, 1)"
                                  ></p-button>
                                  <p-button
                                    icon="pi pi-times"
                                    rounded="true"
                                    text="true"
                                    severity="danger"
                                    (onClick)="removeItem(item.product.productId)"
                                  ></p-button>
                                </div>
                              </div>
                            }
                          </div>

                          <p-divider></p-divider>

                          <div class="space-y-2">
                            <div class="flex justify-between text-sm">
                              <span class="text-surface-500">Sous-total</span>
                              <span class="font-medium">{{ subtotal() | xaf }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-surface-500">Remise</span>
                              <span class="font-medium text-green-600">-{{ discountAmount() | xaf }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-surface-500">Taxe ({{ taxRate() }}%)</span>
                              <span class="font-medium">{{ taxAmount() | xaf }}</span>
                            </div>
                            <p-divider></p-divider>
                            <div class="flex justify-between text-lg font-bold">
                              <span>Total</span>
                              <span class="text-primary-600">{{ totalAmount() | xaf }}</span>
                            </div>
                          </div>
                        } @else {
                          <div class="text-center py-8 text-surface-400">
                            <i class="pi pi-shopping-cart text-4xl mb-2"></i>
                            <p class="text-sm">Panier vide</p>
                          </div>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="flex justify-between mt-6">
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
                      [disabled]="cartItems().length === 0"
                    ></p-button>
                  </div>
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 3: Configuration -->
            <p-step-panel [value]="2">
              <ng-template pTemplate="content" let-prevCallback="prevCallback" let-nextCallback="nextCallback">
                <div class="max-w-2xl mx-auto py-8 space-y-6">
                  <!-- Validity -->
                  @if (showValidityConfig()) {
                    <div class="bg-surface-card rounded-xl border border-surface-border p-6">
                      <h3 class="font-semibold text-surface-900 mb-4">Validité du document</h3>
                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <label class="block text-sm font-medium text-surface-700 mb-2">Durée de validité (jours)</label>
                          <p-inputNumber
                            [(ngModel)]="validityDays"
                            [min]="1"
                            [max]="365"
                            styleClass="w-full"
                          ></p-inputNumber>
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-surface-700 mb-2">Date d'échéance</label>
                          <p-datepicker
                            [(ngModel)]="dueDate"
                            [minDate]="minDate"
                            [showIcon]="true"
                            styleClass="w-full"
                          ></p-datepicker>
                        </div>
                      </div>
                    </div>
                  }

                  <!-- Payment Terms -->
                  <div class="bg-surface-card rounded-xl border border-surface-border p-6">
                    <h3 class="font-semibold text-surface-900 mb-4">Conditions de paiement</h3>
                    <div class="space-y-4">
                      <p-select
                        [options]="paymentTerms"
                        [(ngModel)]="selectedPaymentTerm"
                        placeholder="Sélectionner les conditions..."
                        pStyleClass="w-full"
                      ></p-select>

                      @if (selectedPaymentTerm() === 'INSTALLMENT') {
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <label class="block text-sm font-medium mb-2">Acompte (%)</label>
                            <p-inputNumber
                              [(ngModel)]="depositPercentage"
                              [min]="0"
                              [max]="100"
                              suffix="%"
                              pStyleClass="w-full"
                            ></p-inputNumber>
                          </div>
                          <div>
                            <label class="block text-sm font-medium mb-2">Nombre d'échéances</label>
                            <p-inputNumber
                              [(ngModel)]="installmentCount"
                              [min]="1"
                              [max]="12"
                              pStyleClass="w-full"
                            ></p-inputNumber>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Notes -->
                  <div class="bg-surface-card rounded-xl border border-surface-border p-6">
                    <h3 class="font-semibold text-surface-900 mb-4">Notes et conditions</h3>
                    <textarea
                      pInputTextarea
                      [(ngModel)]="documentNotes"
                      rows="4"
                      class="w-full"
                      placeholder="Conditions particulières, notes pour le client..."
                    ></textarea>
                  </div>

                  <div class="flex justify-between">
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
                    ></p-button>
                  </div>
                </div>
              </ng-template>
            </p-step-panel>

            <!-- Step 4: Summary -->
            <p-step-panel [value]="3">
              <ng-template pTemplate="content" let-prevCallback="prevCallback">
                <div class="max-w-3xl mx-auto py-8">
                  <div class="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
                    <!-- Header -->
                    <div class="bg-surface-50 p-6 border-b border-surface-border">
                      <div class="flex justify-between items-start">
                        <div>
                          <div class="flex items-center gap-3 mb-2">
                            <div
                              class="w-10 h-10 rounded-lg flex items-center justify-center"
                              [style.background-color]="config().color + '20'"
                              [style.color]="config().color"
                            >
                              <i [class]="config().icon"></i>
                            </div>
                            <div>
                              <h2 class="text-xl font-bold text-surface-900">{{ config().title }}</h2>
                              <p class="text-sm text-surface-500">{{ isEditMode() ? 'Modification' : 'Nouveau' }}</p>
                            </div>
                          </div>
                        </div>
                        <div class="text-right">
                          <p class="text-sm text-surface-500">Date</p>
                          <p class="font-medium">{{ today | date:'dd/MM/yyyy' }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Content -->
                    <div class="p-6 space-y-6">
                      <!-- Customer -->
                      <div>
                        <h3 class="text-sm font-semibold text-surface-500 uppercase mb-3">Client</h3>
                        @if (selectedCustomer(); as customer) {
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                              {{ getInitials(customer) }}
                            </div>
                            <div>
                              <p class="font-medium text-surface-900">{{ customer.fullName }}</p>
                              <p class="text-sm text-surface-500">{{ customer.email }} • {{ customer.phone }}</p>
                            </div>
                          </div>
                        } @else {
                          <p class="text-surface-400 italic">Client comptant</p>
                        }
                      </div>

                      <!-- Items -->
                      <div>
                        <h3 class="text-sm font-semibold text-surface-500 uppercase mb-3">Articles</h3>
                        <div class="space-y-2">
                          @for (item of cartItems(); track item.product.productId) {
                            <div class="flex justify-between items-center py-2 border-b border-surface-border last:border-0">
                              <div>
                                <p class="font-medium text-surface-900">{{ item.product.name }}</p>
                                <p class="text-sm text-surface-500">
                                  {{ item.quantity }} x {{ (item.product.finalPrice || item.product.price || 0) | xaf }}
                                  @if (item.discountPercentage > 0) {
                                    <span class="text-green-600 ml-2">(-{{ item.discountPercentage }}%)</span>
                                  }
                                </p>
                              </div>
                              <p class="font-medium">{{ getItemTotal(item) | xaf }}</p>
                            </div>
                          }
                        </div>
                      </div>

                      <!-- Totals -->
                      <div class="bg-surface-50 rounded-lg p-4">
                        <div class="space-y-2">
                          <div class="flex justify-between text-sm">
                            <span class="text-surface-600">Sous-total</span>
                            <span>{{ subtotal() | xaf }}</span>
                          </div>
                          <div class="flex justify-between text-sm">
                            <span class="text-surface-600">Remise</span>
                            <span class="text-green-600">-{{ discountAmount() | xaf }}</span>
                          </div>
                          <div class="flex justify-between text-sm">
                            <span class="text-surface-600">Taxe</span>
                            <span>{{ taxAmount() | xaf }}</span>
                          </div>
                          <p-divider></p-divider>
                          <div class="flex justify-between text-xl font-bold">
                            <span>Total TTC</span>
                            <span class="text-primary-600">{{ totalAmount() | xaf }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Config -->
                      <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span class="text-surface-500">Validité:</span>
                          <span class="ml-2 font-medium">{{ validityDays() }} jours</span>
                        </div>
                        <div>
                          <span class="text-surface-500">Paiement:</span>
                          <span class="ml-2 font-medium">{{ getPaymentTermLabel() }}</span>
                        </div>
                      </div>

                      @if (documentNotes()) {
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p class="text-sm text-yellow-800">{{ documentNotes() }}</p>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="flex justify-between mt-6">
                    <p-button
                      label="Retour"
                      icon="pi pi-arrow-left"
                      text="true"
                      (onClick)="prevCallback.emit()"
                    ></p-button>
                    <p-button
                      [label]="submitLabel()"
                      [icon]="submitIcon()"
                      [severity]="submitSeverity()"
                      (onClick)="submitDocument()"
                      [loading]="submitting()"
                    ></p-button>
                  </div>
                </div>
              </ng-template>
            </p-step-panel>
          </p-step-panels>
        </p-stepper>
      </div>

      <!-- Customer Search Dialog -->
      @if (showCustomerSearch()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-surface-card rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div class="p-6 border-b border-surface-border">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold">Rechercher un client</h3>
                <p-button
                  icon="pi pi-times"
                  text="true"
                  (onClick)="showCustomerSearch.set(false)"
                ></p-button>
              </div>
              <div class="mt-4">
                <input
                  pInputText
                  [(ngModel)]="customerSearchTerm"
                  (ngModelChange)="searchCustomers($event)"
                  placeholder="Nom, email, téléphone..."
                  class="w-full"
                >
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              @if (filteredCustomers().length > 0) {
                <div class="space-y-2">
                  @for (customer of filteredCustomers(); track customer.customerId) {
                    <div
                      class="flex items-center gap-4 p-4 rounded-lg border border-surface-border hover:border-primary hover:bg-primary-50 cursor-pointer transition-all"
                      (click)="selectCustomer(customer)"
                    >
                      <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
                        {{ getInitials(customer) }}
                      </div>
                      <div class="flex-1">
                        <h4 class="font-bold text-surface-900">{{ customer.fullName }}</h4>
                        <div class="flex gap-4 text-sm text-surface-500 mt-1">
                          @if (customer.email) {
                            <span><i class="pi pi-envelope mr-1"></i>{{ customer.email }}</span>
                          }
                          @if (customer.phone) {
                            <span><i class="pi pi-phone mr-1"></i>{{ customer.phone }}</span>
                          }
                        </div>
                      </div>
                      <i class="pi pi-chevron-right text-surface-400"></i>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-12 text-surface-400">
                  <i class="pi pi-search text-4xl mb-4"></i>
                  <p>Aucun client trouvé</p>
                </div>
              }
            </div>

            <div class="p-4 border-t border-surface-border">
              <p-button
                icon="pi pi-plus"
                label="Créer un nouveau client"
                outlined="true"
                class="w-full"
                (onClick)="showNewCustomerForm.set(true); showCustomerSearch.set(false)"
              ></p-button>
            </div>
          </div>
        </div>
      }

      <!-- New Customer Form Dialog -->
      @if (showNewCustomerForm()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-surface-card rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 class="text-xl font-bold mb-6">Nouveau Client</h3>
            
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Prénom *</label>
                  <input pInputText [(ngModel)]="newCustomer.firstName" class="w-full">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2">Nom *</label>
                  <input pInputText [(ngModel)]="newCustomer.lastName" class="w-full">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Email</label>
                <input pInputText type="email" [(ngModel)]="newCustomer.email" class="w-full">
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Téléphone *</label>
                <input pInputText [(ngModel)]="newCustomer.phone" class="w-full">
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Adresse</label>
                <textarea pInputTextarea [(ngModel)]="newCustomer.address" rows="2" class="w-full"></textarea>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <p-button
                label="Annuler"
                outlined="true"
                (onClick)="showNewCustomerForm.set(false)"
              ></p-button>
              <p-button
                label="Créer"
                severity="primary"
                (onClick)="createCustomer()"
                [loading]="creatingCustomer()"
              ></p-button>
            </div>
          </div>
        </div>
      }

      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>
    </div>
  `,
  styles: [`
    :host ::ng-deep .document-stepper .p-stepper-panel .p-stepper-content {
      padding: 0;
    }
  `]
})
export class DocumentFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentSalesService);
  private productsService = inject(ProductsService);
  private customersService = inject(CustomersService);
  private orderState = inject(OrderStateService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // Document type configuration
  documentType = signal<OrderType>(OrderType.CREDIT_SALE);
  isEditMode = signal(false);
  editDocumentId = signal<string | null>(null);

  config = computed<DocumentConfig>(() => {
    const configs: Record<OrderType, DocumentConfig> = {
      'CREDIT_SALE': {
        type: OrderType.CREDIT_SALE,
        title: 'Facture - Vente à Crédit',
        icon: 'pi pi-file-pdf',
        color: '#ef4444',
        requiresCustomer: true,
        allowPartialPayment: true,
        defaultValidityDays: 30
      },
      'PROFORMA': {
        type: OrderType.PROFORMA,
        title: 'Facture Proforma',
        icon: 'pi pi-file-o',
        color: '#3b82f6',
        requiresCustomer: true,
        allowPartialPayment: false,
        defaultValidityDays: 30
      },
      'ONLINE': {
        type: OrderType.ONLINE,
        title: 'Devis Commercial',
        icon: 'pi pi-calculator',
        color: '#10b981',
        requiresCustomer: true,
        allowPartialPayment: false,
        defaultValidityDays: 15
      },
      'POS_SALE': {
        type: OrderType.POS_SALE,
        title: 'Vente Comptant',
        icon: 'pi pi-shopping-bag',
        color: '#8b5cf6',
        requiresCustomer: false,
        allowPartialPayment: false,
        defaultValidityDays: 0
      }
    };
    return configs[this.documentType()];
  });

  // Stepper
  currentStep = signal<DocumentFormStep>(0);

  // Customer
  selectedCustomer = signal<Customer | null>(null);
  showCustomerSearch = signal(false);
  showNewCustomerForm = signal(false);
  customerSearchTerm = signal('');
  customers = signal<Customer[]>([]);
  creatingCustomer = signal(false);
  newCustomer = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  };

  // Products
  productSearchTerm = signal('');
  selectedCategory = signal<string>('all');
  products = this.productsService.products;

  // Cart
  cartItems = signal<Array<{ product: Product; quantity: number; discountPercentage: number }>>([]);

  // Config
  validityDays = signal(30);
  dueDate = signal<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  minDate = new Date();
  selectedPaymentTerm = signal<string>('IMMEDIATE');
  depositPercentage = signal(30);
  installmentCount = signal(3);
  documentNotes = signal('');

  // Submission
  submitting = signal(false);

  paymentTerms = [
    { label: 'Paiement immédiat', value: 'IMMEDIATE' },
    { label: 'À 15 jours', value: 'NET_15' },
    { label: 'À 30 jours', value: 'NET_30' },
    { label: 'À 60 jours', value: 'NET_60' },
    { label: 'Fin de mois', value: 'END_OF_MONTH' },
    { label: 'Paiement échelonné', value: 'INSTALLMENT' }
  ];

  categoryOptions = computed(() => [
    { label: 'Toutes', value: 'all' },
    ...this.productsService.products().map(p => ({
      label: p.categoryName || 'Sans catégorie',
      value: p.categoryId
    }))
  ]);

  filteredProducts = computed(() => {
    let prods = this.products();
    if (this.productSearchTerm()) {
      const term = this.productSearchTerm().toLowerCase();
      prods = prods.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term)
      );
    }
    if (this.selectedCategory() !== 'all') {
      prods = prods.filter(p => p.categoryId === this.selectedCategory());
    }
    return prods;
  });

  filteredCustomers = computed(() => {
    let custs = this.customers();
    if (this.customerSearchTerm()) {
      const term = this.customerSearchTerm().toLowerCase();
      custs = custs.filter(c =>
        c.fullName?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(term)
      );
    }
    return custs;
  });

  subtotal = computed(() =>
    this.cartItems().reduce((sum, item) =>
      sum + (item.product.finalPrice || item.product.price || 0) * item.quantity, 0
    )
  );

  discountAmount = computed(() =>
    this.cartItems().reduce((sum, item) => {
      const price = item.product.finalPrice || item.product.price || 0;
      return sum + (price * item.quantity * item.discountPercentage / 100);
    }, 0)
  );

  taxRate = signal(19.25); // Default VAT
  taxAmount = computed(() => (this.subtotal() - this.discountAmount()) * this.taxRate() / 100);
  totalAmount = computed(() => this.subtotal() - this.discountAmount() + this.taxAmount());

  showValidityConfig = computed(() =>
    this.documentType() === 'PROFORMA' || this.documentType() === 'ONLINE'
  );

  canProceedToItems = computed(() =>
    !this.config().requiresCustomer || !!this.selectedCustomer()
  );

  canSaveDraft = computed(() =>
    this.cartItems().length > 0 || !!this.selectedCustomer()
  );

  canSubmit = computed(() =>
    this.cartItems().length > 0 &&
    (!this.config().requiresCustomer || !!this.selectedCustomer()) &&
    !this.submitting()
  );

  submitLabel = computed(() => {
    switch (this.documentType()) {
      case 'CREDIT_SALE': return 'Créer la facture';
      case 'PROFORMA': return 'Générer le proforma';
      case 'ONLINE': return 'Générer le devis';
      default: return 'Valider';
    }
  });

  submitIcon = computed(() => {
    switch (this.documentType()) {
      case 'CREDIT_SALE': return 'pi pi-file-pdf';
      case 'PROFORMA': return 'pi pi-file-o';
      case 'ONLINE': return 'pi pi-calculator';
      default: return 'pi pi-check';
    }
  });

  submitSeverity = computed(() => {
    switch (this.documentType()) {
      case 'CREDIT_SALE': return 'danger';
      case 'PROFORMA': return 'info';
      case 'ONLINE': return 'success';
      default: return 'primary';
    }
  }) as () => 'danger' | 'info' | 'success' | 'primary';

  today = new Date();

  ngOnInit() {
    // Load initial data
    this.productsService.loadProducts(1, 50);
    this.customersService.loadCustomers(1, 100);

    // Check route for document type
    const url = this.router.url;
    if (url.includes('credit-sale')) {
      this.documentType.set(OrderType.CREDIT_SALE);
    } else if (url.includes('proforma')) {
      this.documentType.set(OrderType.PROFORMA);
    } else if (url.includes('quote')) {
      this.documentType.set(OrderType.ONLINE);
    }

    // Check for edit mode
    const docId = this.route.snapshot.paramMap.get('id');
    if (docId) {
      this.isEditMode.set(true);
      this.editDocumentId.set(docId);
      this.loadDocumentForEdit(docId);
    }

    // Set default validity
    this.validityDays.set(this.config().defaultValidityDays);
  }

  loadDocumentForEdit(id: string) {
    this.documentService.getInvoiceById(id).subscribe({
      next: (doc:any) => {
        this.selectedCustomer.set(doc.customer || null);
        this.cartItems.set(doc.items.map((item:any) => ({
          product: item.product!,
          quantity: item.quantity,
          discountPercentage: item.discountPercentage || 0
        })));
        this.documentNotes.set(doc.notes || '');
      }
    });
  }

  getItemTotal(item: any) {
    return item.quantity * (item.product.finalPrice || item.product.price || 0) * (1 - (item.discountPercentage || 0) / 100);
  }
  searchProducts(term: string) {
    this.productSearchTerm.set(term);
    if (term.length > 2) {
      this.productsService.searchProducts(term).subscribe();
    }
  }

  searchCustomers(term: string) {
    this.customerSearchTerm.set(term);
    if (term.length > 2) {
      this.customersService.searchCustomers(term).subscribe({
        next: (customers) => this.customers.set(customers)
      });
    }
  }

  addToCart(product: Product) {
    const existing = this.cartItems().find(item => item.product.productId === product.productId);
    if (existing) {
      this.cartItems.update(items =>
        items.map(item =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      this.cartItems.update(items => [...items, { product, quantity: 1, discountPercentage: 0 }]);
    }
    this.messageService.add({
      severity: 'success',
      summary: 'Produit ajouté',
      detail: product.name,
      life: 1000
    });
  }

  updateQuantity(productId: string, delta: number) {
    this.cartItems.update(items =>
      items.map(item => {
        if (item.product.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  }

  removeItem(productId: string) {
    this.cartItems.update(items => items.filter(item => item.product.productId !== productId));
  }

  clearCart() {
    this.cartItems.set([]);
  }

  selectCustomer(customer: Customer) {
    this.selectedCustomer.set(customer);
    this.showCustomerSearch.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Client sélectionné',
      detail: customer.fullName
    });
  }

  clearCustomer() {
    this.selectedCustomer.set(null);
  }

  createCustomer() {
    if (!this.newCustomer.firstName || !this.newCustomer.lastName || !this.newCustomer.phone) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez remplir les champs obligatoires'
      });
      return;
    }

    this.creatingCustomer.set(true);
    this.customersService.createCustomer({
      firstName: this.newCustomer.firstName,
      lastName: this.newCustomer.lastName,
      email: this.newCustomer.email,
      phone: this.newCustomer.phone,
      address: this.newCustomer.address
    }).subscribe({
      next: (customer) => {
        this.creatingCustomer.set(false);
        this.selectCustomer(customer);
        this.showNewCustomerForm.set(false);
        this.newCustomer = { firstName: '', lastName: '', email: '', phone: '', address: '' };
      },
      error: () => {
        this.creatingCustomer.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de créer le client'
        });
      }
    });
  }

  getInitials(customer: Customer): string {
    return ((customer.firstName?.[0] || '') + (customer.lastName?.[0] || '')).toUpperCase();
  }

  getPaymentTermLabel(): string {
    const term = this.paymentTerms.find(t => t.value === this.selectedPaymentTerm());
    return term?.label || this.selectedPaymentTerm();
  }

  saveAsDraft() {
    const draft = {
      type: this.documentType(),
      customer: this.selectedCustomer(),
      items: this.cartItems(),
      config: {
        validityDays: this.validityDays(),
        paymentTerm: this.selectedPaymentTerm(),
        notes: this.documentNotes()
      },
      timestamp: new Date().toISOString()
    };
    const drafts = JSON.parse(localStorage.getItem('document_drafts') || '[]');
    drafts.push(draft);
    localStorage.setItem('document_drafts', JSON.stringify(drafts));
    this.messageService.add({
      severity: 'success',
      summary: 'Brouillon sauvegardé',
      detail: 'Le document a été sauvegardé'
    });
  }

  submitDocument() {
    if (!this.canSubmit()) return;

    this.submitting.set(true);

    const request = {
      storeId: this.authService.currentUser()?.storeId || '',
      customerId: this.selectedCustomer()?.customerId,
      items: this.cartItems().map(item => ({
        productId: item.product.productId,
        quantity: item.quantity,
        discountPercentage: item.discountPercentage,
        unitType: item.product.unitType
      })),
      orderType: this.documentType(),
      notes: this.documentNotes(),
      validityDays: this.showValidityConfig() ? this.validityDays() : undefined,
      dueDate: this.dueDate().toISOString(),
      taxRate: this.taxRate()
    };

    let operation;
    switch (this.documentType()) {
      case 'CREDIT_SALE':
        operation = this.documentService.createOrderWithPayment(request);
        break;
      case 'PROFORMA':
        operation = this.documentService.createOrder(request);
        break;
      case 'ONLINE':
        operation = this.documentService.createOrder(request);
        break;
      default:
        operation = this.documentService.createOrder(request);
    }

    operation.subscribe({
      next: (doc:any) => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Document créé',
          detail: `${this.config().title} #${doc.orderNumber} généré avec succès`
        });

        // Navigate to list or view
        setTimeout(() => {
          this.router.navigate([this.getListRoute()]);
        }, 1500);
      },
      error: (err:any) => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Impossible de créer le document'
        });
      }
    });
  }

  getListRoute(): string {
    switch (this.documentType()) {
      case 'CREDIT_SALE': return '/sales/credit-sales';
      case 'PROFORMA': return '/sales/proformas';
      case 'ONLINE': return '/sales/quotes';
      default: return '/sales/documents';
    }
  }

  goBack() {
    if (this.cartItems().length > 0) {
      this.confirmationService.confirm({
        message: 'Les modifications seront perdues. Continuer?',
        header: 'Confirmation',
        accept: () => this.router.navigate([this.getListRoute()])
      });
    } else {
      this.router.navigate([this.getListRoute()]);
    }
  }
}