import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal, computed, effect } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MessageService, ConfirmationService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { DataViewModule } from "primeng/dataview";
import { DialogModule } from "primeng/dialog";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { TabsModule } from "primeng/tabs";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { RippleModule } from "primeng/ripple";
import { PaginatorModule } from "primeng/paginator";
import {
  Category,
  Product,
  Order,
  OrderRequest,
  OrderItemRequest,
  PaymentMethod,
  Customer,
  ShiftStatus,
  PaymentRequest,
  CartItem,
  OrderType
} from "../../../core/models";
import { ProductsService } from "../../../core/services/products.service";
import { CategoriesService } from "../../../core/services/categories.service";
import { OrderService } from "../../../core/services/orders.service";
import { CustomersService } from "../../../core/services/customers.service";
import { AuthService } from "../../../core/services/auth.service";
import { ShiftReportsService } from "../../../core/services/shift-reports.service";
import { CashRegistersService } from "../../../core/services/cash-registers.service";
import { CashRegister } from "../../../core/models";
import { Toolbar } from "primeng/toolbar";
import { cartCount, cartSubtotal } from "../../../core/utils/cart.utils";
import { XafPipe } from "../../../core/pipes/xaf-currency-pipe";
import { getStockLabel, getStockSeverity } from "../../../core/utils/status-ui.utils";

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DataViewModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TabsModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    RippleModule,
    Toolbar,
    XafPipe,
    PaginatorModule
  ],
  template: `
<div class="p-4">
  <p-toast />
  <p-confirmDialog />

  <!-- Header -->
  <p-toolbar class="mb-4">
    <div class="p-toolbar-group-start">
      <div class="flex items-center">
        <button pButton 
                icon="pi pi-arrow-left" 
                class="p-button-text p-button-rounded mr-3"
                (click)="goBack()">
        </button>
        <h1 class="text-2xl font-bold m-0">Point de Vente</h1>
      </div>
    </div>
    
    <div class="p-toolbar-group-end">
      <div class="flex items-center gap-4">
        @if (currentShift(); as shift) {
          <p-tag [value]="'Caisse #' + shift.shiftNumber" 
                 severity="success" 
                 class="mr-2" />
        } @else {
          <div class="flex items-center gap-2">
            <p-tag value="Caisse Fermée" severity="danger" class="mr-2" />
            <button pButton 
                    label="Ouvrir Caisse" 
                    icon="pi pi-lock-open"
                    class="p-button-sm p-button-success"
                    (click)="showOpenShiftDialog = true">
            </button>
          </div>
        }
        
        <div class="text-right">
          <div class="font-semibold">{{ currentUserName() }}</div>
          <div class="text-sm text-gray-500">{{ currentStoreName() }}</div>
        </div>
        
        <button pButton 
                icon="pi pi-refresh" 
                class="p-button-rounded p-button-outlined"
                (click)="refreshData()"
                [disabled]="loadingData()">
        </button>
      </div>
    </div>
  </p-toolbar>

  <!-- Main Content -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <!-- Products Column -->
    <div class="lg:col-span-2">
      <p-card header="Sélection des Produits">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-2">Recherche</label>
            <div class="p-input-icon-left w-full">
              <i class="pi pi-search"></i>
              <input pInputText 
                     type="text" 
                     [(ngModel)]="searchTerm"
                     (ngModelChange)="onFilterChange()"
                     placeholder="Nom, SKU, code-barres..."
                     class="w-full" 
                     [disabled]="!canSell()" />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Catégorie</label>
            <p-select [options]="categoryOptions()"
                     [(ngModel)]="selectedCategoryId"
                     (onChange)="onFilterChange()"
                     class="w-full"
                     [disabled]="!canSell()">
            </p-select>
          </div>
        </div>

        <!-- Products Grid -->
        <div class="border rounded-lg p-4">
          @if (loadingData()) {
            <div class="text-center py-8">
              <i class="pi pi-spin pi-spinner text-4xl text-primary mb-4"></i>
              <p class="text-gray-600">Chargement des produits...</p>
            </div>
          } @else if (products().length === 0) {
            <div class="text-center py-8">
              <i class="pi pi-box text-4xl text-gray-400 mb-4"></i>
              <p class="text-gray-600">Aucun produit trouvé</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              @for (product of products(); track product.productId) {
                <div class="product-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                     [class.opacity-50]="!canSell()"
                     [class.cursor-not-allowed]="!canSell()"
                     (click)="canSell() && addToCart(product)">
                  <div class="aspect-square bg-gray-100 relative overflow-hidden">
                    @if (getProductImage(product)) {
                      <img [src]="getProductImage(product)" 
                           [alt]="product.name"
                           class="w-full h-full object-cover" />
                    } @else {
                      <div class="w-full h-full flex items-center justify-center">
                        <i class="pi pi-image text-gray-300 text-3xl"></i>
                      </div>
                    }
                    <div class="absolute top-2 right-2">
                      <p-tag [value]="getStockLabel(product)" 
                             [severity]="getStockSeverity(product)"
                             size="small" />
                    </div>
                  </div>
                  <div class="p-3">
                    <div class="font-semibold text-sm truncate mb-1">{{ product.name }}</div>
                    <div class="flex justify-between items-center">
                      <div class="text-xs text-gray-500">{{ product.sku || 'N/A' }}</div>
                      <div class="font-bold text-primary">{{ product.price | xaf }}</div>
                    </div>
                    @if (product.quantity > 0) {
                      <div class="text-xs text-gray-500 mt-1">
                        Stock: {{ product.quantity }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <p-paginator 
              [rows]="pageSize()"
              [totalRecords]="total()"
              [rowsPerPageOptions]="[12, 24, 48, 96]"
              (onPageChange)="onPageChange($event)"
              [showCurrentPageReport]="true"
              currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} produits">
            </p-paginator>
          }
        </div>
      </p-card>
    </div>

    <!-- Cart Column -->
    <div>
      <p-card header="Panier">
        <div class="space-y-4">
          <!-- Cart Header -->
          <div class="flex justify-between items-center mb-4">
            <div class="font-semibold">Articles: {{ cartCount() }}</div>
            <button pButton 
                    icon="pi pi-trash" 
                    label="Vider" 
                    class="p-button-text p-button-danger"
                    (click)="clearCart()"
                    [disabled]="cartCount() === 0">
            </button>
          </div>

          <!-- Cart Items -->
          @if (cart().length === 0) {
            <div class="text-center py-8 border rounded-lg">
              <i class="pi pi-shopping-cart text-4xl text-gray-300 mb-3"></i>
              <p class="text-gray-500">Votre panier est vide</p>
              <p class="text-sm text-gray-400">Ajoutez des produits en cliquant dessus</p>
            </div>
          } @else {
            <div class="border rounded-lg max-h-96 overflow-auto">
              <table class="w-full">
                <tbody>
                  @for (item of cart(); track item.product.productId; let i = $index) {
                    <tr class="border-b last:border-0 hover:bg-gray-50">
                      <td class="p-3">
                        <div class="flex items-center">
                          @if (getProductImage(item.product)) {
                            <img [src]="getProductImage(item.product)" 
                                 [alt]="item.product.name"
                                 class="w-10 h-10 object-cover rounded mr-3" />
                          } @else {
                            <div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-3">
                              <i class="pi pi-image text-gray-400"></i>
                            </div>
                          }
                          <div class="flex-1 min-w-0">
                            <div class="font-medium text-sm truncate">{{ item.product.name }}</div>
                            <div class="text-xs text-gray-500">{{ item.product.price | xaf }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="p-3">
                        <div class="flex items-center justify-center gap-2">
                          <button pButton 
                                  icon="pi pi-minus" 
                                  class="p-button-rounded p-button-text p-button-sm"
                                  (click)="updateQuantity(i, -1)">
                          </button>
                          <span class="font-bold w-6 text-center">{{ item.quantity }}</span>
                          <button pButton 
                                  icon="pi pi-plus" 
                                  class="p-button-rounded p-button-text p-button-sm"
                                  (click)="updateQuantity(i, 1)">
                          </button>
                        </div>
                      </td>
                      <td class="p-3 text-right">
                        <div class="font-bold">{{ ((item.product.price || 0) * item.quantity) | xaf }}</div>
                      </td>
                      <td class="p-3">
                        <button pButton 
                                icon="pi pi-times" 
                                class="p-button-rounded p-button-text p-button-danger p-button-sm"
                                (click)="removeFromCart(i)">
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Customer Selection -->
            <div class="p-4 border rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <label class="font-medium">Client</label>
                <button pButton 
                        icon="pi pi-user" 
                        label="Sélectionner" 
                        class="p-button-outlined p-button-sm"
                        (click)="showCustomerDialog = true">
                </button>
              </div>
              
              @if (selectedCustomer(); as customer) {
                <div class="bg-blue-50 p-3 rounded-lg">
                  <div class="flex justify-between items-center">
                    <div>
                      <div class="font-semibold">{{ customer.fullName }}</div>
                      <div class="text-sm text-gray-600">{{ customer.phone || customer.email }}</div>
                    </div>
                    <button pButton 
                            icon="pi pi-times" 
                            class="p-button-rounded p-button-text p-button-sm"
                            (click)="selectedCustomer.set(null)">
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Discount Input -->
            <div class="p-4 border rounded-lg">
              <label class="block font-medium mb-2">Remise (XAF)</label>
              <p-inputNumber [(ngModel)]="discountAmount"
                             mode="decimal"
                             [min]="0"
                             [max]="cartSubtotal()"
                             class="w-full">
              </p-inputNumber>
            </div>

            <!-- Totals -->
            <div class="space-y-2 p-4 bg-gray-50 rounded-lg">
              <div class="flex justify-between">
                <span class="text-gray-600">Sous-total</span>
                <span>{{ cartSubtotal() | xaf }}</span>
              </div>
              @if (discountAmount() > 0) {
                <div class="flex justify-between text-red-500">
                  <span>Remise</span>
                  <span>-{{ discountAmount() | xaf }}</span>
                </div>
              }
              <div class="flex justify-between">
                <span class="text-gray-600">Taxe ({{ taxRate() * 100 }}%)</span>
                <span>{{ taxAmount() | xaf }}</span>
              </div>
              <div class="flex justify-between border-t pt-2 mt-2">
                <span class="font-bold text-lg">Total</span>
                <span class="font-bold text-lg text-primary">{{ cartTotal() | xaf }}</span>
              </div>
            </div>

            <!-- Checkout Button -->
            <button pButton 
                    label="PROCÉDER AU PAIEMENT" 
                    icon="pi pi-credit-card" 
                    class="w-full p-button-success mt-4"
                    (click)="showCheckout()"
                    [disabled]="!canProcessPayment()">
            </button>
          }
        </div>
      </p-card>
    </div>
  </div>

  <!-- Checkout Dialog -->
  <p-dialog header="Paiement" 
            [(visible)]="showCheckoutDialog" 
            [modal]="true"
            [style]="{ width: '600px' }"
            [closable]="false">
    <div class="space-y-6">
      <!-- Order Summary -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="font-semibold mb-3">Récapitulatif</h3>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span>Sous-total:</span>
            <span>{{ cartSubtotal() | xaf }}</span>
          </div>
          @if (discountAmount() > 0) {
            <div class="flex justify-between text-red-500">
              <span>Remise:</span>
              <span>-{{ discountAmount() | xaf }}</span>
            </div>
          }
          <div class="flex justify-between">
            <span>Taxe:</span>
            <span>{{ taxAmount() | xaf }}</span>
          </div>
          <div class="flex justify-between border-t pt-2 mt-2">
            <span class="font-bold text-lg">Total à payer:</span>
            <span class="font-bold text-lg text-primary">{{ cartTotal() | xaf }}</span>
          </div>
        </div>
      </div>

      <!-- Payment Method -->
      <div>
        <label class="block font-medium mb-3">Mode de paiement</label>
        <div class="grid grid-cols-2 gap-3">
          @for (method of paymentMethods; track method.value) {
            <button pButton 
                    [label]="method.label" 
                    icon="pi {{ method.icon }}"
                    [class.p-button-primary]="paymentMethod === method.value"
                    [class.p-button-outlined]="paymentMethod !== method.value"
                    (click)="paymentMethod = method.value"
                    class="w-full">
            </button>
          }
        </div>
      </div>

      <!-- Cash Payment -->
      @if (getCashPayment()) {
        <div class="border-t pt-4">
          <label class="block font-medium mb-2">Montant reçu (XAF)</label>
          <p-inputNumber [(ngModel)]="amountPaid"
                         mode="decimal"
                         [minFractionDigits]="0"
                         [maxFractionDigits]="0"
                         [min]="cartTotal()"
                         (onInput)="calculateChange()"
                         class="w-full">
          </p-inputNumber>
          
          @if (changeAmount() > 0) {
            <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div class="flex justify-between items-center">
                <span class="font-semibold">Monnaie à rendre:</span>
                <span class="text-lg font-bold text-green-600">{{ changeAmount() | xaf }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Notes -->
      <div>
        <label class="block font-medium mb-2">Notes</label>
        <textarea pInputTextarea 
                  [(ngModel)]="orderNotes"
                  rows="3"
                  class="w-full"
                  placeholder="Notes optionnelles...">
        </textarea>
      </div>
    </div>
    
    <ng-template pTemplate="footer">
      <button pButton 
              label="Annuler" 
              class="p-button-text"
              (click)="showCheckoutDialog = false"
              [disabled]="submitting()">
      </button>
      <button pButton 
              label="VALIDER LA VENTE" 
              icon="pi pi-check" 
              class="p-button-success"
              (click)="processSale()"
              [loading]="submitting()"
              [disabled]="submitting() || onCheckPaymentMethod()">
      </button>
    </ng-template>
  </p-dialog>

  <!-- Customer Dialog -->
  <p-dialog header="Sélectionner un client" 
            [(visible)]="showCustomerDialog" 
            [modal]="true"
            [style]="{ width: '500px' }">
    <div class="space-y-4">
      <div class="p-input-icon-left w-full">
        <i class="pi pi-search"></i>
        <input pInputText 
               type="text" 
               [(ngModel)]="customerSearchQuery"
               (ngModelChange)="onCustomerSearch()"
               placeholder="Rechercher un client..."
               class="w-full" />
      </div>
      
      <div class="border rounded-lg max-h-60 overflow-auto">
        @for (customer of customers(); track customer.customerId) {
          <div class="p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer"
               (click)="selectCustomer(customer)">
            <div class="flex justify-between items-center">
              <div>
                <div class="font-semibold">{{ customer.fullName }}</div>
                <div class="text-sm text-gray-500">{{ customer.phone || customer.email || 'Pas de contact' }}</div>
              </div>
              <p-tag [value]="customer.loyaltyPoints + ' pts'" severity="info" />
            </div>
          </div>
        }
        @if (customers().length === 0 && customerSearchQuery) {
          <div class="p-6 text-center">
            <i class="pi pi-users text-3xl text-gray-300 mb-3"></i>
            <p class="text-gray-500">Aucun client trouvé</p>
          </div>
        }
      </div>
    </div>
    
    <ng-template pTemplate="footer">
      <button pButton 
              label="Fermer" 
              class="p-button-text"
              (click)="showCustomerDialog = false">
      </button>
    </ng-template>
  </p-dialog>

  <!-- Open Shift Dialog -->
  <p-dialog header="Ouvrir une session de caisse" 
            [(visible)]="showOpenShiftDialog" 
            [modal]="true"
            [style]="{ width: '500px' }">
    <div class="space-y-4">
      <div>
        <label class="block font-medium mb-2">Magasin</label>
        <input pInputText [value]="currentStoreName()" disabled class="w-full" />
      </div>
      
      <div>
        <label class="block font-medium mb-2">Caissier</label>
        <input pInputText [value]="currentUserName() || currentUser()?.username" disabled class="w-full" />
      </div>

      <div>
        <label class="block font-medium mb-2">Sélectionner une caisse *</label>
        <p-select [options]="cashRegisterOptions()"
                  [(ngModel)]="selectedCashRegisterId"
                  placeholder="Choisir une caisse"
                  appendTo="body"
                  class="w-full">
        </p-select>
      </div>
      
      <div>
        <label class="block font-medium mb-2">Montant d'ouverture (XAF) *</label>
        <p-inputNumber [(ngModel)]="openingBalance"
                       mode="decimal"
                       [minFractionDigits]="0"
                       [maxFractionDigits]="0"
                       [min]="0"
                       class="w-full">
        </p-inputNumber>
      </div>
      
      <div>
        <label class="block font-medium mb-2">Notes (optionnel)</label>
        <textarea pInputTextarea 
                  [(ngModel)]="openingNotes"
                  rows="3"
                  class="w-full"
                  placeholder="Notes optionnelles...">
        </textarea>
      </div>
    </div>
    
    <ng-template pTemplate="footer">
      <button pButton 
              label="Annuler" 
              class="p-button-text"
              (click)="showOpenShiftDialog = false">
      </button>
      <button pButton 
              label="Ouvrir la caisse" 
              icon="pi pi-lock-open" 
              class="p-button-success"
              (click)="openShift()"
              [disabled]="openingBalance <= 0 || !selectedCashRegisterId()">
      </button>
    </ng-template>
  </p-dialog>
</div>
  `,
  styles: [`
   .product-card {
  transition: all 0.2s ease;
}

.product-card:hover:not(.opacity-50) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.product-card:active:not(.opacity-50) {
  transform: translateY(0);
}

/* Custom scrollbar for cart */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr !important;
  }
  
  .product-card img {
    height: 120px;
  }
}
  `]
})


export class OrderCreateComponent implements OnInit {
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private ordersService = inject(OrderService);
  private customersService = inject(CustomersService);
  private authService = inject(AuthService);
  private shiftReportsService = inject(ShiftReportsService);
  private cashRegistersService = inject(CashRegistersService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  // Loading states
  loading = signal(false);
  submitting = signal(false);

  // Current shift
  currentShift = this.shiftReportsService.selectedShiftReport;

  // Products data
  products = this.productsService.products;
  loadingData = this.productsService.loading;
  total = this.productsService.total;
  pageSize = this.productsService.pageSize;

  // Categories
  activeCategories = this.categoriesService.activeCategories;
  selectedCategoryId = signal<string>('all');
  searchTerm = '';

  // Cart state
  cart = signal<CartItem[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  discountAmount = signal(0);
  taxRate = signal(0.20); // 20% tax rate

  // Computed cart values
  cartCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0)
  );

  cartSubtotal = computed(() =>
    this.cart().reduce((sum, item) => sum + ((item.product.price || 0) * item.quantity), 0)
  );

  // ✅ Tax calculated on discounted amount
  taxAmount = computed(() => {
    const taxableAmount = this.cartSubtotal() - this.discountAmount();
    return taxableAmount > 0 ? taxableAmount * this.taxRate() : 0;
  });

  // ✅ Total includes tax (matches backend calculation)
  cartTotal = computed(() => {
    const subtotal = this.cartSubtotal();
    const discount = this.discountAmount();
    const tax = this.taxAmount();
    return (subtotal - discount) + tax;
  });

  // Dialog visibility
  showCustomerDialog = false;
  showCheckoutDialog = false;
  showOpenShiftDialog = false;

  // Customer search
  customerSearchQuery = '';
  customers = signal<Customer[]>([]);

  // Shift opening
  openingBalance = 0;
  openingNotes = '';

  // Cash Registers
  activeCashRegisters = this.cashRegistersService.cashRegisters;
  selectedCashRegisterId = signal<string>('');

  // Payment
  paymentMethod = PaymentMethod.CASH;
  amountPaid = 0;
  changeAmount = signal(0);
  orderNotes = '';

  paymentMethods = [
    { label: 'Espèces', value: PaymentMethod.CASH, icon: 'pi-money-bill' },
    { label: 'Carte Bancaire', value: PaymentMethod.CREDIT_CARD, icon: 'pi-credit-card' },
    { label: 'Mobile Money', value: PaymentMethod.MOBILE_MONEY, icon: 'pi-mobile' },
    { label: 'Virement', value: PaymentMethod.BANK_TRANSFER, icon: 'pi-send' }
  ];

  // User info
  currentUser = this.authService.currentUser;
  currentUserName = computed(() => this.currentShift()?.cashierName || '');
  currentStoreName = computed(() => this.currentShift()?.storeName || '');
  currentStoreId = computed(() => this.currentShift()?.storeId || this.currentUser()?.storeId || '');

  // Cash Register Options for dropdown
  cashRegisterOptions = computed(() => {
    return this.activeCashRegisters().map(reg => ({
      label: reg.name,
      value: reg.cashRegisterId
    }));
  });

  // Category options for dropdown
  categoryOptions = computed(() => {
    const baseOptions = [{ label: 'Toutes les catégories', value: 'all' }];
    const categories = this.activeCategories();

    if (!categories?.length) return baseOptions;

    const catOptions = categories.map(cat => ({
      label: cat.name,
      value: cat.categoryId
    }));

    return [...baseOptions, ...catOptions];
  });

  ngOnInit() {
    this.initializeUserInfo();
    this.loadInitialData();
  }

  // Effect to load cash registers when store ID is available
  private loadCashRegistersEffect = effect(() => {
    const storeId = this.currentStoreId();
    if (storeId) {
      this.cashRegistersService.getActiveCashRegistersByStore(storeId).subscribe();
    }
  });


  private initializeUserInfo() {
    if (!this.currentShift()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Aucune session de caisse ouverte'
      });
      // Don't redirect immediately, let them open a shift
    }
  }

  private loadInitialData() {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts() {
    const filters: any = {};

    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.selectedCategoryId() && this.selectedCategoryId() !== 'all') {
      filters.categoryId = this.selectedCategoryId();
    }

    this.productsService.loadProducts(
      this.productsService.page(),
      this.pageSize(),
      filters
    );
  }

  loadCategories() {
    this.categoriesService.loadCategories(1, 100);
  }

  refreshData() {
    this.loadProducts();
    this.loadCategories();
    this.messageService.add({
      severity: 'info',
      summary: 'Actualisation',
      detail: 'Données actualisées',
      life: 2000
    });
  }

  // ============================================================================
  // CART OPERATIONS
  // ============================================================================

  addToCart(product: Product) {
    if (!this.canSell()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Caisse Fermée',
        detail: 'Vous devez ouvrir une caisse avant de vendre'
      });
      return;
    }

    if ((product.quantity || 0) <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Stock insuffisant',
        detail: `${product.name} est en rupture de stock`
      });
      return;
    }

    const currentCart = [...this.cart()];
    const existingIndex = currentCart.findIndex(
      p => p.product.productId === product.productId
    );

    if (existingIndex > -1) {
      const newQuantity = currentCart[existingIndex].quantity + 1;
      if (newQuantity > (product.quantity || 0)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Stock insuffisant',
          detail: `Stock disponible: ${product.quantity}`
        });
        return;
      }
      currentCart[existingIndex].quantity = newQuantity;
      this.cart.set(currentCart);
    } else {
      this.cart.set([...currentCart, { product, quantity: 1 }]);
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Produit ajouté',
      detail: `${product.name} ajouté au panier`,
      life: 1000
    });
  }

  removeFromCart(index: number) {
    const currentCart = [...this.cart()];
    const removedProduct = currentCart[index].product.name;
    currentCart.splice(index, 1);
    this.cart.set(currentCart);

    this.messageService.add({
      severity: 'info',
      summary: 'Produit retiré',
      detail: `${removedProduct} retiré du panier`,
      life: 1000
    });
  }

  updateQuantity(index: number, delta: number) {
    const currentCart = [...this.cart()];
    const item = currentCart[index];
    const newQty = item.quantity + delta;

    if (newQty > 0) {
      if (newQty > (item.product.quantity || 0)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Stock insuffisant',
          detail: `Stock disponible: ${item.product.quantity}`
        });
        return;
      }
      item.quantity = newQty;
      this.cart.set(currentCart);
    } else {
      this.removeFromCart(index);
    }
  }

  clearCart() {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir vider le panier ?',
      header: 'Vider le panier',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.cart.set([]);
        this.selectedCustomer.set(null);
        this.discountAmount.set(0);
        this.messageService.add({
          severity: 'info',
          summary: 'Panier vidé',
          detail: 'Le panier a été vidé'
        });
      }
    });
  }

  // ============================================================================
  // CHECKOUT PROCESS
  // ============================================================================

  showCheckout() {
    if (!this.canProcessPayment()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Impossible de procéder',
        detail: 'Vérifiez que la caisse est ouverte et que le panier n\'est pas vide'
      });
      return;
    }

    // Initialize payment amount
    this.amountPaid = this.cartTotal();
    this.changeAmount.set(0);
    this.showCheckoutDialog = true;
  }

  calculateChange() {
    const change = this.amountPaid - this.cartTotal();
    this.changeAmount.set(change > 0 ? change : 0);
  }

  /**
   * ✅ PROPER FLOW: Create order first, then add payment separately
   */
  processSale() {
    if (this.submitting()) return;

    // Validation
    if (!this.validateSale()) return;

    this.submitting.set(true);

    // STEP 1: Build order items (NO prices - backend calculates from product)
    const orderItems: OrderItemRequest[] = this.cart().map(item => ({
      productId: item.product.productId,
      quantity: item.quantity
      // No price info! Backend gets it from Product entity
    }));

    // STEP 2: Build order request (NO payment info!)
    const orderRequest: OrderRequest = {
      storeId: this.currentStoreId(),
      customerId: this.selectedCustomer()?.customerId,
      items: orderItems,
      discountAmount: this.discountAmount(),
      taxRate: this.taxRate(),
      isTaxable: true,
      notes: this.orderNotes || undefined,
      orderType: OrderType.POS_SALE
    };

    console.log('Creating order:', orderRequest);

    // STEP 3: Create order first
    this.ordersService.createOrder(orderRequest).subscribe({
      next: (order: any) => {
        console.log('Order created:', order);
        // STEP 4: Add payments separately
        this.addPaymentToOrder(order.orderId);
      },
      error: (error) => {
        console.error('Error creating order:', error);
        this.submitting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error?.error?.message || 'Erreur lors de la création de la commande'
        });
      }
    });
  }


  private addPaymentToOrder(orderId: string) {
    // Build payment request
    const paymentRequest: PaymentRequest = {
      method: this.paymentMethod,
      amount: this.paymentMethod === PaymentMethod.CASH
        ? this.amountPaid  // Actual money received for cash
        : this.cartTotal(), // Exact amount for other methods
      notes: this.paymentMethod === PaymentMethod.CASH
        ? `Monnaie: ${this.changeAmount()}`
        : this.orderNotes
    };

    this.ordersService.addPayment(orderId, paymentRequest).subscribe({
      next: (updatedOrder) => {
        this.submitting.set(false);
        this.showCheckoutDialog = false;

        // Clear cart
        this.cart.set([]);
        this.selectedCustomer.set(null);
        this.orderNotes = '';
        this.amountPaid = 0;
        this.changeAmount.set(0);

        this.messageService.add({
          severity: 'success',
          summary: 'Vente Validée',
          detail: `Commande #${updatedOrder.orderNumber} - Total: ${updatedOrder.totalAmount} FCFA`,
          life: 5000
        });

        this.confirmPrintReceipt(updatedOrder.orderId);
      },
      error: (error) => {
        console.error('Error adding payment:', error);
        this.submitting.set(false);
        this.messageService.add({
          severity: 'warn',
          summary: 'Attention',
          detail: 'Commande créée mais le paiement a échoué. Ajoutez le paiement manuellement.'
        });
        this.router.navigate(['/orders', orderId]);
      }
    });
  }
  private validateSale(): boolean {
    if (!this.canSell()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Session invalide',
        detail: 'Aucune session de caisse ouverte'
      });
      return false;
    }

    if (this.cart().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Panier vide',
        detail: 'Veuillez ajouter des produits'
      });
      return false;
    }

    if (!this.currentStoreId()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Magasin non défini'
      });
      return false;
    }

    if (this.paymentMethod === PaymentMethod.CASH && this.amountPaid < this.cartTotal()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Montant insuffisant',
        detail: 'Le montant reçu est insuffisant'
      });
      return false;
    }

    return true;
  }

  // ============================================================================
  // RECEIPT & PRINTING
  // ============================================================================

  confirmPrintReceipt(orderId: string) {
    this.confirmationService.confirm({
      message: 'Voulez-vous imprimer le ticket de caisse ?',
      header: 'Impression',
      icon: 'pi pi-print',
      acceptLabel: 'Imprimer',
      rejectLabel: 'Plus tard',
      accept: () => {
        this.printReceipt(orderId);
      },
      reject: () => {
        this.goBack();
      }
    });
  }

  printReceipt(orderId: string) {
    this.ordersService.generateThermalReceipt(orderId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `ticket-thermal-${orderId}.bin`);

        // Offer PDF as well
        this.confirmationService.confirm({
          message: 'Voulez-vous également télécharger le ticket en PDF ?',
          header: 'Téléchargement PDF',
          icon: 'pi pi-file-pdf',
          acceptLabel: 'Oui',
          rejectLabel: 'Non',
          accept: () => {
            this.downloadReceiptPdf(orderId);
          },
          reject: () => {
            this.goBack();
          }
        });
      },
      error: (error) => {
        console.error('Error generating thermal receipt:', error);
        this.downloadReceiptPdf(orderId); // Fallback to PDF
      }
    });
  }

  downloadReceiptPdf(orderId: string) {
    this.ordersService.generateReceipt(orderId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `ticket-${orderId}.pdf`);
        this.messageService.add({
          severity: 'success',
          summary: 'Ticket généré',
          detail: 'Le ticket PDF a été téléchargé'
        });
        this.goBack();
      },
      error: (error) => {
        console.error('Error generating PDF:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de générer le ticket PDF'
        });
        this.goBack();
      }
    });
  }

  private downloadBlob(blob: Blob, filename: string) {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading:', error);
    }
  }

  // ============================================================================
  // CUSTOMER HANDLING
  // ============================================================================

  onCustomerSearch() {
    if (!this.customerSearchQuery || this.customerSearchQuery.length < 2) {
      this.customers.set([]);
      return;
    }

    this.customersService.searchCustomers(this.customerSearchQuery).subscribe({
      next: (data) => this.customers.set(data || []),
      error: (error) => {
        console.error('Error searching customers:', error);
        this.customers.set([]);
      }
    });
  }

  selectCustomer(customer: Customer) {
    this.selectedCustomer.set(customer);
    this.showCustomerDialog = false;
    this.messageService.add({
      severity: 'info',
      summary: 'Client sélectionné',
      detail: customer.fullName
    });
  }

  // ============================================================================
  // SHIFT MANAGEMENT
  // ============================================================================

  openShift() {
    if (!this.currentStoreId()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Aucun magasin assigné'
      });
      return;
    }

    if (this.openingBalance <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Montant invalide',
        detail: 'Le montant d\'ouverture doit être supérieur à 0'
      });
      return;
    }

    this.shiftReportsService.openShift({
      storeId: this.currentStoreId(),
      cashRegisterId: this.selectedCashRegisterId(),
      openingBalance: this.openingBalance,
      notes: this.openingNotes || undefined
    }).subscribe({
      next: (shift) => {
        this.showOpenShiftDialog = false;
        this.shiftReportsService.selectedShiftReport.set(shift);
        this.openingBalance = 0;
        this.openingNotes = '';

        this.messageService.add({
          severity: 'success',
          summary: 'Caisse ouverte',
          detail: `Session ${shift.shiftNumber} ouverte avec succès sur la caisse ${shift.cashRegisterName || ''}`,
          life: 5000
        });
      },
      error: (error) => {
        console.error('Error opening shift:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de l\'ouverture de la caisse'
        });
      }
    });
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  canSell(): boolean {
    const shift = this.currentShift();
    return !!this.currentStoreId() && shift?.status === ShiftStatus.OPEN;
  }

  canProcessPayment(): boolean {
    return this.canSell() && this.cartCount() > 0;
  }

  hasValidStoreAssignment(): boolean {
    return !!this.currentStoreId();
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  getProductImage(product: Product): string {
    return product?.imageUrl || '';
  }

  getStockSeverity(product: Product): 'danger' | 'warn' | 'success' {
    return getStockSeverity(product);
  }

  getStockLabel(product: Product): string {
    return getStockLabel(product);
  }

  goBack() {
    this.router.navigate(['/orders']);
  }

  onFilterChange() {
    this.productsService.setPage(1);
    this.loadProducts();
  }

  onPageChange(event: any) {
    const page = (event.first / event.rows) + 1;
    const rows = event.rows;

    if (this.pageSize() !== rows) {
      this.productsService.setPageSize(rows);
    } else if (this.productsService.page() !== page) {
      this.productsService.setPage(page);
    }

    this.loadProducts();
  }

  onCheckPaymentMethod() {
    if (this.paymentMethod === PaymentMethod.CASH && this.amountPaid < this.cartTotal()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Le montant payé est inférieur au total de la commande'
      });
    }


  }
  getCashPayment() {
    return this.paymentMethod === PaymentMethod.CASH;
  }

  // In your OrderCreateComponent - ADD DEBUG LOGGING
  buildPaymentRequests(): PaymentRequest[] {
    const requests: PaymentRequest[] = [];

    console.log('Building payment request - Method:', this.paymentMethod);
    console.log('PaymentMethod enum:', PaymentMethod);
    console.log('Is CASH?:', this.paymentMethod === PaymentMethod.CASH);

    if (this.paymentMethod === PaymentMethod.CASH && this.amountPaid > 0) {
      requests.push({
        method: PaymentMethod.CASH,  // Make sure this is the actual enum value
        amount: this.amountPaid,
        notes: `Monnaie: ${this.changeAmount()}`
      });
    } else if (this.paymentMethod !== PaymentMethod.CASH) {
      requests.push({
        method: this.paymentMethod,
        amount: this.cartTotal(),
        notes: this.orderNotes
      });
    }

    console.log('Payment requests built:', requests);
    return requests;
  }
}