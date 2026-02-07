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
import { 
  Category, 
  Product, 
  OrderRequest, 
  OrderItemRequest, 
  PaymentMethod, 
  Customer,
  ShiftStatus
} from "../../../core/models";
import { ProductsService } from "../../../core/services/products.service";
import { CategoriesService } from "../../../core/services/categories.service";
import { OrdersService } from "../../../core/services/orders.service";
import { CustomersService } from "../../../core/services/customers.service";
import { AuthService } from "../../../core/services/auth.service";
import { ShiftReportsService } from "../../../core/services/shift-reports.service";
import { Toolbar } from "primeng/toolbar";

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
    Toolbar
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
        @if (currentShift()) {
          <p-tag [value]="'Caisse #' + currentShift()?.shiftNumber" 
                 severity="success" 
                 class="mr-2" />
        } @else {
          <p-tag value="Caisse Fermée" 
                 severity="danger" 
                 class="mr-2" />
        }
        
        <div class="text-right">
          <div class="font-semibold">{{ currentUserName }}</div>
          <div class="text-sm text-gray-500">{{ currentStoreName }}</div>
        </div>
        
        <button pButton 
                icon="pi pi-refresh" 
                class="p-button-rounded p-button-outlined"
                (click)="refreshData()"
                [disabled]="loading()">
        </button>
      </div>
    </div>
  </p-toolbar>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <!-- Left Column - Product Selection -->
    <div class="lg:col-span-2">
      <p-card header="Sélection des Produits">
        <div class="space-y-4">
          <!-- Search and Filter -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Recherche</label>
              <div class="p-input-icon-left w-full">
                <i class="pi pi-search"></i>
                <input pInputText 
                       type="text" 
                       [(ngModel)]="searchTerm"
                       (ngModelChange)="onSearch()"
                       placeholder="Nom, SKU, code-barres..."
                       class="w-full" />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Catégorie</label>
              <p-select [options]="categoryOptions()"
                       [(ngModel)]="selectedCategoryId"
                       (onChange)="onCategorySelect($event.value)"
                       class="w-full">
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
            } @else if (filteredProducts().length === 0) {
              <div class="text-center py-8">
                <i class="pi pi-box text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600">Aucun produit trouvé</p>
                <p class="text-sm text-gray-500">Essayez de modifier vos critères de recherche</p>
              </div>
            } @else {
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                @for (product of filteredProducts(); track product.productId) {
                  <div class="product-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                       (click)="addToCart(product)">
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
                        <div class="font-bold text-primary">{{ product.price | currency:'EUR':'symbol':'1.2-2' }}</div>
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
            }
          </div>
        </div>
      </p-card>
    </div>

    <!-- Right Column - Cart and Actions -->
    <div>
      <p-card header="Panier">
        <div class="space-y-4">
          <!-- Cart Summary -->
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
                            <div class="text-xs text-gray-500">{{ item.product.price | currency:'EUR':'symbol':'1.2-2' }}</div>
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
                        <div class="font-bold">{{ (item.product.price * item.quantity) | currency:'EUR':'symbol':'1.2-2' }}</div>
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
              
              @if (selectedCustomer()) {
                <div class="bg-blue-50 p-3 rounded-lg">
                  <div class="flex justify-between items-center">
                    <div>
                      <div class="font-semibold">{{ selectedCustomer()?.fullName }}</div>
                      <div class="text-sm text-gray-600">{{ selectedCustomer()?.phone || selectedCustomer()?.email }}</div>
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

            <!-- Totals -->
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Sous-total</span>
                <span>{{ cartSubtotal() | currency:'EUR':'symbol':'1.2-2' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Remise</span>
                <span class="text-red-500">-{{ discountAmount() | currency:'EUR':'symbol':'1.2-2' }}</span>
              </div>
              <div class="flex justify-between border-t pt-2 mt-2">
                <span class="font-bold text-lg">Total</span>
                <span class="font-bold text-lg text-primary">{{ cartTotal() | currency:'EUR':'symbol':'1.2-2' }}</span>
              </div>
            </div>

            <!-- Checkout Button -->
            <button pButton 
                    label="PROCÉDER AU PAIEMENT" 
                    icon="pi pi-credit-card" 
                    class="w-full p-button-success mt-4"
                    (click)="showCheckout()"
                    [disabled]="cartCount() === 0 || !canSell()">
            </button>
          }
        </div>
      </p-card>
    </div>
  </div>

  <!-- Customer Selection Dialog -->
  <p-dialog header="Sélectionner un client" 
            [(visible)]="showCustomerDialog" 
            [modal]="true"
            [style]="{ width: '500px' }">
    <div class="space-y-4">
      <div class="p-input-icon-left">
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
              <p-tag [value]="customer.loyaltyPoints + ' pts'" 
                     severity="info" />
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
              label="Annuler" 
              class="p-button-text"
              (click)="showCustomerDialog = false">
      </button>
    </ng-template>
  </p-dialog>

  <!-- Checkout Dialog -->
  <p-dialog header="Paiement" 
            [(visible)]="showCheckoutDialog" 
            [modal]="true"
            [style]="{ width: '600px' }">
    <div class="space-y-6">
      <!-- Order Summary -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="font-semibold mb-3">Récapitulatif de la commande</h3>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span>Sous-total:</span>
            <span>{{ cartSubtotal() | currency:'EUR':'symbol':'1.2-2' }}</span>
          </div>
          <div class="flex justify-between">
            <span>Remise:</span>
            <span class="text-red-500">-{{ discountAmount() | currency:'EUR':'symbol':'1.2-2' }}</span>
          </div>
          <div class="flex justify-between border-t pt-2 mt-2">
            <span class="font-bold">Total:</span>
            <span class="font-bold text-lg">{{ cartTotal() | currency:'EUR':'symbol':'1.2-2' }}</span>
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
                    [class]="paymentMethod === method.value ? 'p-button-primary' : 'p-button-outlined'"
                    (click)="paymentMethod = method.value"
                    class="w-full">
            </button>
          }
        </div>
      </div>

      <!-- Cash Payment Details -->
      @if (paymentMethod === PaymentMethod.CASH) {
        <div class="border-t pt-4">
          <label class="block font-medium mb-2">Montant reçu</label>
          <p-inputNumber [(ngModel)]="amountPaid"
                         mode="currency"
                         currency="EUR"
                         [min]="cartTotal()"
                         (onInput)="calculateChange()"
                         class="w-full">
          </p-inputNumber>
          
          @if (changeAmount() > 0) {
            <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div class="flex justify-between items-center">
                <span class="font-semibold">Monnaie à rendre:</span>
                <span class="text-lg font-bold text-green-600">{{ changeAmount() | currency:'EUR':'symbol':'1.2-2' }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Order Notes -->
      <div>
        <label class="block font-medium mb-2">Notes</label>
        <textarea pInputTextarea 
                  [(ngModel)]="orderNotes"
                  rows="3"
                  class="w-full"
                  placeholder="Notes optionnelles pour cette commande...">
        </textarea>
      </div>
    </div>
    
    <ng-template pTemplate="footer">
      <button pButton 
              label="Annuler" 
              class="p-button-text"
              (click)="showCheckoutDialog = false">
      </button>
      <button pButton 
              label="VALIDER LA VENTE" 
              icon="pi pi-check" 
              class="p-button-success"
              (click)="processSale()"
              [loading]="submitting()"
              [disabled]="paymentMethod === PaymentMethod.CASH && amountPaid < cartTotal()">
      </button>
    </ng-template>
  </p-dialog>
</div>
  `,
  styles: [`
   .product-card {
  transition: all 0.2s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.product-card:active {
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
  private ordersService = inject(OrdersService);
  private customersService = inject(CustomersService);
  private authService = inject(AuthService);
  private shiftReportsService = inject(ShiftReportsService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  // State
  loading = signal(false);
  submitting = signal(false);
  currentShift = this.shiftReportsService.selectedShiftReport;
  
  // Signals from service (Pattern as in ProductsListComponent)
  products = this.productsService.products;
  loadingData = this.productsService.loading;
  activeCategories = this.categoriesService.activeCategories;
  selectedCategoryId = signal<string>('all');
  searchTerm = '';

  // Cart
  cart = signal<{ product: Product; quantity: number }[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  discountAmount = signal(0);
  taxRate = signal(0.20);

  // Computed values
  cartCount = computed(() => this.cart().reduce((acc, item) => acc + item.quantity, 0));
  cartSubtotal = computed(() => this.cart().reduce((acc, item) => acc + (item.product.price * item.quantity), 0));
  taxAmount = computed(() => (this.cartSubtotal() - this.discountAmount()) * this.taxRate());
  cartTotal = computed(() => this.cartSubtotal() - this.discountAmount());

  filteredProducts = computed(() => {
    const allProducts = this.products();
    
    // Safety check - return empty array if products not loaded yet
    if (!allProducts || allProducts.length === 0) {
      return [];
    }
    
    let items = [...allProducts]; // Create a copy
    
    // Filter by category
    if (this.selectedCategoryId() && this.selectedCategoryId() !== 'all') {
      items = items.filter(p => p.category?.categoryId === this.selectedCategoryId());
    }
    
    // Filter by search term
    if (this.searchTerm && this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      items = items.filter(p => 
        (p.name && p.name.toLowerCase().includes(search)) || 
        (p.sku && p.sku.toLowerCase().includes(search)) || 
        (p.barcode && p.barcode.toLowerCase().includes(search))
      );
    }
    
    // Filter active products only
    return items.filter(p => p.isActive !== false);
  });

  // Dialogs
  showCustomerDialog = false;
  showCheckoutDialog = false;
  customerSearchQuery = '';
  customers = signal<Customer[]>([]);

  // Payment
  PaymentMethod = PaymentMethod;
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

  // User Info
  currentUserName = '';
  currentStoreName = '';

  // Category options for select
  categoryOptions = computed(() => {
    const baseOptions = [{ label: 'Toutes les catégories', value: 'all' }];
    const categories = this.activeCategories();
    
    if (!categories || categories.length === 0) {
      return baseOptions;
    }
    
    const catOptions = categories.map(cat => ({
      label: cat.name,
      value: cat.categoryId
    }));
    
    return [...baseOptions, ...catOptions];
  });

  // Effect to monitor products loading
  private productsLoadEffect = effect(() => {
    const products = this.products();
    console.log('Products loaded:', products?.length || 0);
  });

  ngOnInit() {
    this.initializeUserInfo();
    this.loadInitialData();
  }

  private initializeUserInfo() {
    const user = this.authService.currentUser();
    console.log('Current user:', user);
    
    if (user) {
      this.currentUserName = user.username || '';
      this.currentStoreName = user.storeName || '';
    }
  }

  private loadInitialData() {
    console.log('Loading initial data...');
    this.loadProducts();
    this.loadCategories();
    this.loadCurrentShift();
  }

  loadProducts() {
    console.log('loadProducts called');
    // Load all active products for POS
    this.productsService.loadProducts(1, 1000);
  }

  loadCategories() {
    console.log('loadCategories called');
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

  loadCurrentShift() {
    this.shiftReportsService.getCurrentShift().subscribe({
      next: (shift) => {
        console.log('Current shift:', shift);
        this.shiftReportsService.selectedShiftReport.set(shift);
      },
      error: (error) => {
        console.error('Error loading shift:', error);
      }
    });
  }

  canSell(): boolean {
    const shift = this.currentShift();
    return shift?.status === ShiftStatus.OPEN;
  }

  onCategorySelect(categoryId: string) {
    console.log('Category selected:', categoryId);
    this.selectedCategoryId.set(categoryId);
  }

  onSearch() {
    console.log('Search term:', this.searchTerm);
    // Computed signal handles filtering automatically
  }

  addToCart(product: Product) {
    console.log('Adding to cart:', product);
    
    // Validate product
    if (!product || !product.productId) {
      console.error('Invalid product:', product);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Erreur', 
        detail: 'Produit invalide' 
      });
      return;
    }

    // Check if shift is open
    if (!this.canSell()) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Caisse Fermée', 
        detail: 'Vous devez ouvrir une caisse avant de vendre' 
      });
      return;
    }

    // Check stock
    if (product.quantity <= 0) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Stock insuffisant', 
        detail: `${product.name} est en rupture de stock` 
      });
      return;
    }

    const currentCart = [...this.cart()]; // Create a copy
    const existingIndex = currentCart.findIndex(p => p.product.productId === product.productId);

    if (existingIndex > -1) {
      // Check if we can add more
      const newQuantity = currentCart[existingIndex].quantity + 1;
      if (newQuantity > product.quantity) {
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
      // Check stock availability
      if (newQty > item.product.quantity) {
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
        this.messageService.add({
          severity: 'info',
          summary: 'Panier vidé',
          detail: 'Le panier a été vidé'
        });
      }
    });
  }

  onCustomerSearch() {
    if (!this.customerSearchQuery || this.customerSearchQuery.length < 2) {
      this.customers.set([]);
      return;
    }
    
    this.customersService.searchCustomers(this.customerSearchQuery).subscribe({
      next: (data) => {
        this.customers.set(data || []);
      },
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

  showCheckout() {
    this.amountPaid = this.cartTotal();
    this.changeAmount.set(0);
    this.showCheckoutDialog = true;
  }

  calculateChange() {
    const change = this.amountPaid - this.cartTotal();
    this.changeAmount.set(change > 0 ? change : 0);
  }

  processSale() {
    if (this.submitting()) return;

    // Validate cart
    if (this.cart().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Panier vide',
        detail: 'Veuillez ajouter des produits'
      });
      return;
    }

    // Validate payment for cash
    if (this.paymentMethod === PaymentMethod.CASH && this.amountPaid < this.cartTotal()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Montant insuffisant',
        detail: 'Le montant reçu est insuffisant'
      });
      return;
    }

    // Validate store ID
    const user = this.authService.currentUser();
    if (!user?.storeId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Magasin non défini pour l\'utilisateur'
      });
      return;
    }

    this.submitting.set(true);

    const orderItems: OrderItemRequest[] = this.cart().map(item => ({
      productId: item.product.productId,
      quantity: item.quantity
    }));

    const orderRequest: OrderRequest = {
      storeId: user.storeId,
      customerId: this.selectedCustomer()?.customerId,
      items: orderItems,
      paymentMethod: this.paymentMethod,
      amountPaid: this.amountPaid,
      discountAmount: this.discountAmount(),
      notes: this.orderNotes || undefined,
      isTaxable: true,
      taxRate: this.taxRate()
    };

    console.log('Creating order:', orderRequest);

    this.ordersService.createOrder(orderRequest).subscribe({
      next: (order) => {
        this.submitting.set(false);
        this.showCheckoutDialog = false;
        this.cart.set([]);
        this.selectedCustomer.set(null);
        this.orderNotes = '';
        this.amountPaid = 0;
        
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Vente Validée', 
          detail: `Commande #${order.orderNumber} enregistrée`,
          life: 5000 
        });
        
        this.confirmationService.confirm({
          message: 'Voulez-vous imprimer le ticket de caisse ?',
          header: 'Impression',
          icon: 'pi pi-print',
          acceptLabel: 'Imprimer',
          rejectLabel: 'Plus tard',
          accept: () => {
            this.generateReceipt(order.orderId);
          }
        });
      },
      error: (error) => {
        console.error('Error creating order:', error);
        this.submitting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la création de la commande'
        });
      }
    });
  }

  generateReceipt(orderId: string) {
    this.ordersService.generateInvoice(orderId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${orderId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error generating receipt:', error);
        this.messageService.add({
          severity: 'warn',
          summary: 'Impression',
          detail: 'Erreur lors de la génération du ticket'
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/orders']);
  }

  // UI Helpers
  getProductImage(product: Product): string {
    return product?.imageUrl || '';
  }

  getStockSeverity(product: Product): 'danger' | 'warn' | 'success' {
    if (!product) return 'danger';
    if (product.quantity <= 0) return 'danger';
    if (product.quantity <= (product.minStock || 5)) return 'warn';
    return 'success';
  }

  getStockLabel(product: Product): string {
    if (!product) return 'N/A';
    if (product.quantity <= 0) return 'Rupture';
    if (product.quantity <= (product.minStock || 5)) return 'Faible';
    return 'En stock';
  }
}