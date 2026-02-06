import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal, computed } from "@angular/core";
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
    RippleModule
  ],
  template: `
    <div class="pos-container flex flex-col h-screen overflow-hidden m-4">
      <p-toast />
      <p-confirmDialog />

      <!-- Top Header -->
      <header class="bg-white border-b p-3 flex justify-between items-center shadow-sm">
        <div class="flex items-center gap-3">
          <button pButton icon="pi pi-arrow-left" class="p-button-text p-button-rounded" (click)="goBack()"></button>
          <h1 class="text-xl font-bold m-0">Point de Vente</h1>
          @if (currentShift()) {
            <p-tag [value]="'Caisse #' + currentShift()?.shiftNumber" severity="success" class="ml-2" />
          } @else {
            <p-tag value="Caisse Fermée" severity="danger" class="ml-2" />
          }
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="text-sm font-semibold">{{ currentUserName }}</div>
            <div class="text-xs text-gray-500">{{ currentStoreName }}</div>
          </div>
          <p-button icon="pi pi-refresh" (click)="refreshData()" [loading]="loading()" severity="secondary" rounded text />
        </div>
      </header>

      <main class="flex-1 flex overflow-hidden bg-gray-100">
        <!-- Left Side: Product Browsing -->
        <div class="w-full lg:w-8/12 flex flex-col p-4 overflow-hidden">
          <!-- Search & Filter Area -->
          <div class="flex gap-4 mb-4">
            <div class="p-input-icon-left flex-1">
              <i class="pi pi-search"></i>
              <input pInputText type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearch()" placeholder="Rechercher un produit (Nom, SKU, Code-barres)..." class="w-full" />
            </div>
          </div>

          <!-- Categories Tabs -->
          <div class="mb-4">
             <p-tabs [value]="selectedCategoryId()" (valueChange)="onCategorySelect($event)">
                <p-tablist>
                    <p-tab value="all">Tout</p-tab>
                    @for (cat of activeCategories(); track cat.categoryId) {
                        <p-tab [value]="cat.categoryId">{{ cat.name }}</p-tab>
                    }
                </p-tablist>
             </p-tabs>
          </div>

          <!-- Products Grid -->
          <div class="flex-1 overflow-auto bg-white rounded-xl p-4 shadow-sm">
            @if (loadingProducts()) {
                <div class="flex justify-center items-center h-full">
                    <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
                </div>
            } @else if (filteredProducts().length === 0) {
                <div class="flex flex-col justify-center items-center h-full text-gray-400">
                    <i class="pi pi-box text-5xl mb-2"></i>
                    <p>Aucun produit trouvé</p>
                </div>
            } @else {
                <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    @for (product of filteredProducts(); track product.productId) {
                        <div class="product-card cursor-pointer group" (click)="addToCart(product)">
                            <div class="bg-gray-50 rounded-lg aspect-square mb-2 relative overflow-hidden flex items-center justify-center">
                                @if (product.imageUrl) {
                                    <img [src]="product.imageUrl" class="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                } @else {
                                    <i class="pi pi-image text-3xl text-gray-300"></i>
                                }
                                <div class="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button pButton icon="pi pi-plus" class="p-button-success p-button-sm rounded-full"></button>
                                </div>
                            </div>
                            <div class="font-bold text-sm truncate">{{ product.name }}</div>
                            <div class="flex justify-between items-center mt-1">
                                <span class="text-xs text-gray-500">{{ product.sku }}</span>
                                <span class="text-primary font-bold">{{ product.price | currency:'EUR' }}</span>
                            </div>
                        </div>
                    }
                </div>
            }
          </div>
        </div>

        <!-- Right Side: Cart Summary -->
        <div class="hidden lg:flex w-4/12 bg-white border-l shadow-2xl flex-col overflow-hidden">
          <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 class="text-lg font-bold m-0 flex items-center gap-2">
                <i class="pi pi-shopping-cart"></i> Panier
                <span class="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{{ cartCount() }}</span>
            </h2>
            <button pButton icon="pi pi-trash" class="p-button-text p-button-danger p-button-sm" (click)="clearCart()" [disabled]="cartCount() === 0"></button>
          </div>

          <!-- Cart Items List -->
          <div class="flex-1 overflow-auto p-4 space-y-4">
            @if (cart().length === 0) {
                <div class="flex flex-col justify-center items-center h-full text-gray-400">
                    <i class="pi pi-shopping-cart text-5xl mb-2"></i>
                    <p>Votre panier est vide</p>
                </div>
            } @else {
                @for (item of cart(); track item.product.productId; let i = $index) {
                    <div class="cart-item flex gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div class="w-12 h-12 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
                            @if (item.product.imageUrl) {
                                <img [src]="item.product.imageUrl" class="w-full h-full object-cover" />
                            } @else {
                                <i class="pi pi-image text-gray-300"></i>
                            }
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-sm truncate">{{ item.product.name }}</div>
                            <div class="text-primary font-bold text-sm">{{ item.product.price | currency:'EUR' }}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button pButton icon="pi pi-minus" class="p-button-text p-button-secondary p-button-sm" (click)="updateQuantity(i, -1)"></button>
                            <span class="font-bold w-6 text-center text-sm">{{ item.quantity }}</span>
                            <button pButton icon="pi pi-plus" class="p-button-text p-button-secondary p-button-sm" (click)="updateQuantity(i, 1)"></button>
                        </div>
                        <button pButton icon="pi pi-times" class="p-button-text p-button-danger p-button-sm" (click)="removeFromCart(i)"></button>
                    </div>
                }
            }
          </div>

          <!-- Summary & Actions -->
          <div class="p-4 bg-gray-50 border-t space-y-4">
            <div class="customer-selection p-3 bg-white rounded-lg border border-dashed flex items-center gap-3 cursor-pointer hover:border-primary transition-colors" (click)="showCustomerDialog = true">
                <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <i class="pi pi-user text-blue-500"></i>
                </div>
                <div class="flex-1 min-w-0">
                    @if (selectedCustomer()) {
                        <div class="font-bold text-sm truncate">{{ selectedCustomer()?.fullName }}</div>
                        <div class="text-xs text-blue-500">FID : {{ selectedCustomer()?.loyaltyPoints }} pts</div>
                    } @else {
                        <div class="text-sm font-medium text-gray-500">Sélectionner un client (Facultatif)</div>
                    }
                </div>
                @if (selectedCustomer()) {
                    <button pButton icon="pi pi-times" class="p-button-text p-button-secondary p-button-sm" (click)="$event.stopPropagation(); selectedCustomer.set(null)"></button>
                }
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-gray-600">
                    <span>Sous-total</span>
                    <span>{{ cartSubtotal() | currency:'EUR' }}</span>
                </div>
                <div class="flex justify-between text-gray-600">
                    <span>Remise</span>
                    <span class="text-danger">-{{ discountAmount() | currency:'EUR' }}</span>
                </div>
                <!-- <div class="flex justify-between text-gray-600">
                    <span>Taxe ({{ taxRate() * 100 }}%)</span>
                    <span>{{ taxAmount() | currency:'EUR' }}</span>
                </div> -->
                <div class="flex justify-between items-center pt-2 border-t mt-2">
                    <span class="text-xl font-bold">TOTAL</span>
                    <span class="text-2xl font-black text-primary">{{ cartTotal() | currency:'EUR' }}</span>
                </div>
            </div>

            <button pButton 
                    label="PROCÉDER AU PAIEMENT" 
                    icon="pi pi-credit-card" 
                    class="w-full p-button-xl p-button-success shadow-md py-4 font-black"
                    [disabled]="cart().length === 0 || !canSell()"
                    (click)="showCheckout()"></button>
          </div>
        </div>
      </main>

      <!-- Customer Selection Dialog -->
      <p-dialog header="Sélectionner un client" [(visible)]="showCustomerDialog" [modal]="true" [style]="{width: '500px'}" [breakpoints]="{'960px': '75vw', '640px': '90vw'}">
        <div class="space-y-4 pt-2">
            <div class="p-input-icon-left w-full">
                <i class="pi pi-search"></i>
                <input pInputText type="text" [(ngModel)]="customerSearchQuery" (ngModelChange)="onCustomerSearch()" placeholder="Rechercher par nom, email ou mobile..." class="w-full" />
            </div>
            
            <div class="max-h-60 overflow-auto border rounded-lg">
                @for (customer of customers(); track customer.customerId) {
                    <div class="p-3 border-b last:border-0 hover:bg-blue-50 cursor-pointer flex justify-between items-center" (click)="selectCustomer(customer)">
                        <div>
                            <div class="font-bold">{{ customer.fullName }}</div>
                            <div class="text-xs text-gray-500">{{ customer.email || customer.phone }}</div>
                        </div>
                        <p-tag [value]="customer.loyaltyPoints + ' pts'" severity="info" rounded />
                    </div>
                }
                @if (customers().length === 0) {
                    <div class="p-8 text-center text-gray-400">
                        <i class="pi pi-users text-4xl mb-2"></i>
                        <p>Aucun client trouvé</p>
                    </div>
                }
            </div>
            <div class="pt-2">
                <!-- <button pButton label="Nouveau Client" icon="pi pi-user-plus" class="w-full p-button-outlined"></button> -->
            </div>
        </div>
      </p-dialog>

      <!-- Checkout Dialog -->
      <p-dialog header="Paiement Final" [(visible)]="showCheckoutDialog" [modal]="true" [style]="{width: '600px'}" [breakpoints]="{'960px': '75vw', '640px': '90vw'}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <!-- Left: Bill Details -->
            <div class="space-y-4">
                <div class="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-gray-600">Total à payer</span>
                        <span class="text-2xl font-black">{{ cartTotal() | currency:'EUR' }}</span>
                    </div>
                    @if (paymentMethod === PaymentMethod.CASH) {
                        <div class="pt-3 border-t">
                            <label class="block text-sm font-medium mb-1">Montant Reçu</label>
                            <p-inputNumber [(ngModel)]="amountPaid" 
                                          mode="currency" currency="EUR" locale="fr-FR"
                                          [min]="cartTotal()"
                                          (onInput)="calculateChange()"
                                          class="w-full text-2xl" 
                                          styleClass="w-full"
                                          autofocus />
                        </div>
                        <div class="flex justify-between items-center text-green-600 font-bold text-lg">
                            <span>Rendue</span>
                            <span>{{ changeAmount() | currency:'EUR' }}</span>
                        </div>
                    }
                </div>
                
                <div class="notes">
                    <label class="block text-sm font-medium mb-1">Notes internes</label>
                    <textarea pInputTextarea [(ngModel)]="orderNotes" rows="3" class="w-full p-3 border rounded-lg" placeholder="Notes optionnelles pour cette commande..."></textarea>
                </div>
            </div>

            <!-- Right: Payment Methods -->
            <div class="space-y-3">
                <label class="block text-sm font-medium mb-1">Mode de règlement</label>
                @for (method of paymentMethods; track method.value) {
                    <div class="p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all"
                         [class.border-primary]="paymentMethod === method.value"
                         [class.bg-blue-50]="paymentMethod === method.value"
                         (click)="paymentMethod = method.value">
                        <i class="pi {{ method.icon }} text-xl" [class.text-primary]="paymentMethod === method.value"></i>
                        <span class="font-bold">{{ method.label }}</span>
                        @if (paymentMethod === method.value) {
                            <i class="pi pi-check-circle text-primary ml-auto"></i>
                        }
                    </div>
                }
            </div>
        </div>

        <ng-template pTemplate="footer">
            <button pButton label="Annuler" class="p-button-text" (click)="showCheckoutDialog = false"></button>
            <p-button label="VALIDER LA VENTE" 
                      severity="success" 
                      icon="pi pi-check" 
                      [loading]="submitting()"
                      [disabled]="paymentMethod === PaymentMethod.CASH && amountPaid < cartTotal()"
                      (click)="processSale()" />
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .pos-container {
        --primary-color: #3B82F6;
        --secondary-color: #64748B;
        --success-color: #10B981;
    }
    
    .product-card {
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .product-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    ::-webkit-scrollbar {
        width: 6px;
    }
    ::-webkit-scrollbar-track {
        background: transparent;
    }
    ::-webkit-scrollbar-thumb {
        background: #CBD5E1;
        border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #94A3B8;
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
  
  // Products
  products = signal<Product[]>([]);
  activeCategories = this.categoriesService.activeCategories;
  selectedCategoryId = signal<string>('all');
  searchTerm = '';
  loadingProducts = signal(false);

  // Cart
  cart = signal<{ product: Product; quantity: number }[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  discountAmount = signal(0);
  taxRate = signal(0.20); // 20% default

  // Computed
  cartCount = computed(() => this.cart().reduce((acc, item) => acc + item.quantity, 0));
  cartSubtotal = computed(() => this.cart().reduce((acc, item) => acc + (item.product.price * item.quantity), 0));
  taxAmount = computed(() => (this.cartSubtotal() - this.discountAmount()) * this.taxRate());
  cartTotal = computed(() => this.cartSubtotal() - this.discountAmount()); // Simplified for now, tax included in price usually

  filteredProducts = computed(() => {
    let items = this.products();
    if (this.selectedCategoryId() !== 'all') {
      items = items.filter(p => p.category?.categoryId === this.selectedCategoryId());
    }
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      items = items.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.sku.toLowerCase().includes(search) || 
        (p.barcode && p.barcode.includes(search))
      );
    }
    return items;
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
  currentUserName = this.authService.currentUser()?.username;
  currentStoreName = '';

  ngOnInit() {
    this.refreshData();
    this.loadCurrentShift();
  }

  refreshData() {
    this.loading.set(true);
    this.loadingProducts.set(true);
    
    // Load categories
    this.categoriesService.loadCategories(1, 100);
    
    // Load products
    this.productsService.loadProducts(1, 1000, { inStock: true });
    
    // Subscribe to products update
    // Note: this is a simple implementation, in real app we'd use a better state management
    setTimeout(() => {
        this.products.set(this.productsService.products());
        this.loadingProducts.set(false);
        this.loading.set(false);
    }, 1000);

    // Get current user store name
    const user = this.authService.currentUser();
    if (user?.assignedStore) {
        this.currentStoreName = user.assignedStore.name;
    }
  }

  loadCurrentShift() {
    this.shiftReportsService.getCurrentShift().subscribe(shift => {
      this.shiftReportsService.selectedShiftReport.set(shift);
    });
  }

  canSell(): boolean {
    return this.currentShift()?.status === ShiftStatus.OPEN;
  }

 onCategorySelect(id: string | number | undefined): void {
  if (!id) {
    this.selectedCategoryId.set('all');
    return;
  }

  this.selectedCategoryId.set(String(id));
}


  onSearch() {
    // Computed signal handles filtering
  }

  addToCart(product: Product) {
    if (!this.canSell()) {
        this.messageService.add({ 
            severity: 'warn', 
            summary: 'Caisse Fermée', 
            detail: 'Vous devez ouvrir une caisse avant de vendre' 
        });
        return;
    }

    const currentCart = this.cart();
    const existingPos = currentCart.findIndex(p => p.product.productId === product.productId);

    if (existingPos > -1) {
      currentCart[existingPos].quantity += 1;
      this.cart.set([...currentCart]);
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
    const currentCart = this.cart();
    currentCart.splice(index, 1);
    this.cart.set([...currentCart]);
  }

  updateQuantity(index: number, delta: number) {
    const currentCart = this.cart();
    const newQty = currentCart[index].quantity + delta;
    if (newQty > 0) {
      currentCart[index].quantity = newQty;
      this.cart.set([...currentCart]);
    } else {
      this.removeFromCart(index);
    }
  }

  clearCart() {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir vider le panier ?',
      header: 'Vider le panier',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.cart.set([])
    });
  }

  onCustomerSearch() {
    if (this.customerSearchQuery.length < 2) {
        this.customers.set([]);
        return;
    }
    this.customersService.searchCustomers(this.customerSearchQuery).subscribe(data => {
      this.customers.set(data);
    });
  }

  selectCustomer(customer: Customer) {
    this.selectedCustomer.set(customer);
    this.showCustomerDialog = false;
    this.messageService.add({ severity: 'info', summary: 'Client sélectionné', detail: customer.fullName });
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

    this.submitting.set(true);

    const orderItems: OrderItemRequest[] = this.cart().map(item => ({
      productId: item.product.productId,
      quantity: item.quantity
    }));

    const orderRequest: OrderRequest = {
      storeId: this.authService.currentUser()?.assignedStore?.storeId || '',
      customerId: this.selectedCustomer()?.customerId,
      items: orderItems,
      paymentMethod: this.paymentMethod,
      amountPaid: this.amountPaid,
      discountAmount: this.discountAmount(),
      notes: this.orderNotes,
      isTaxable: true
    };

    this.ordersService.createOrder(orderRequest).subscribe({
      next: (order) => {
        this.submitting.set(false);
        this.showCheckoutDialog = false;
        this.cart.set([]);
        this.selectedCustomer.set(null);
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
                // Logic for invoice generation would go here
            }
        });
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/orders']);
  }
}
