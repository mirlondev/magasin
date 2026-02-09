import { Injectable, inject, signal, computed } from '@angular/core';
import { CartItem, Customer, Product, OrderStatus, PaymentStatus, PaymentMethod } from '../../../core/models';
import { ProductsService } from '../../../core/services/products.service';

export interface OrderState {
  items: CartItem[];
  customer: Customer | null;
  notes: string;
  discountAmount: number;
  taxRate: number;
}

@Injectable({ providedIn: 'root' })
export class OrderStateService {
  private productsService = inject(ProductsService);

  // État principal
  private state = signal<OrderState>({
    items: [],
    customer: null,
    notes: '',
    discountAmount: 0,
    taxRate: 0.20 // TVA par défaut 20%
  });

  // Signaux publics
  items = computed(() => this.state().items);
  customer = computed(() => this.state().customer);
  notes = computed(() => this.state().notes);
  discountAmount = computed(() => this.state().discountAmount);
  taxRate = computed(() => this.state().taxRate);

  // Computed values
  itemCount = computed(() => 
    this.items().reduce((total, item) => total + item.quantity, 0)
  );

  subtotal = computed(() => 
    this.items().reduce((total, item) => 
      total + (item.product.price * item.quantity), 0
    )
  );

  totalBeforeTax = computed(() => 
    this.subtotal() - this.discountAmount()
  );

  taxAmount = computed(() => 
    this.totalBeforeTax() * this.taxRate()
  );

  total = computed(() => 
    this.totalBeforeTax() + this.taxAmount()
  );

  // Méthodes d'ajustement d'état
  setItems(items: CartItem[]) {
    this.state.update(s => ({ ...s, items }));
  }

  addItem(product: Product, quantity: number = 1) {
    const currentItems = [...this.state().items];
    const existingIndex = currentItems.findIndex(
      item => item.product.productId === product.productId
    );

    if (existingIndex > -1) {
      currentItems[existingIndex].quantity += quantity;
    } else {
      currentItems.push({ product, quantity });
    }

    this.state.update(s => ({ ...s, items: currentItems }));
  }

  updateItemQuantity(productId: string, delta: number) {
    const currentItems = [...this.state().items];
    const index = currentItems.findIndex(
      item => item.product.productId === productId
    );

    if (index > -1) {
      const newQuantity = currentItems[index].quantity + delta;
      
      if (newQuantity > 0) {
        currentItems[index].quantity = newQuantity;
      } else {
        currentItems.splice(index, 1);
      }

      this.state.update(s => ({ ...s, items: currentItems }));
    }
  }

  removeItem(productId: string) {
    const filteredItems = this.state().items.filter(
      item => item.product.productId !== productId
    );
    this.state.update(s => ({ ...s, items: filteredItems }));
  }

  setCustomer(customer: Customer | null) {
    this.state.update(s => ({ ...s, customer }));
  }

  setNotes(notes: string) {
    this.state.update(s => ({ ...s, notes }));
  }

  setDiscountAmount(amount: number) {
    this.state.update(s => ({ ...s, discountAmount: Math.max(0, amount) }));
  }

  setTaxRate(rate: number) {
    this.state.update(s => ({ ...s, taxRate: rate }));
  }

  clear() {
    this.state.set({
      items: [],
      customer: null,
      notes: '',
      discountAmount: 0,
      taxRate: 0.20
    });
  }

  // Validation
  validateForPosSale(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.itemCount() === 0) {
      errors.push('Le panier est vide');
    }

    if (this.total() <= 0) {
      errors.push('Le montant total doit être supérieur à 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateForCreditSale(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.itemCount() === 0) {
      errors.push('Le panier est vide');
    }

    if (!this.customer()) {
      errors.push('Un client est obligatoire pour une vente à crédit');
    }

    if (this.total() <= 0) {
      errors.push('Le montant total doit être supérieur à 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateForProforma(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.itemCount() === 0) {
      errors.push('Le panier est vide');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Conversion en OrderRequest
  toOrderRequest(storeId: string, paymentMethod?: PaymentMethod, amountPaid?: number) {
    return {
      storeId,
      customerId: this.customer()?.customerId,
      items: this.items().map(item => ({
        productId: item.product.productId,
        quantity: item.quantity
      })),
      discountAmount: this.discountAmount(),
      taxRate: this.taxRate(),
      isTaxable: true,
      notes: this.notes() || undefined,
      paymentMethod,
      amountPaid
    };
  }
}