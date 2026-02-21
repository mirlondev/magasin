// features/orders/state/order-state.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import {
  CartItem,
  Customer,
  OrderRequest,
  OrderType,
  PaymentMethod,
  Product,
} from '../../../core/models';
import { ProductsService } from '../../../core/services/products.service';

// ── Internal state shape ──────────────────────────────────────────────────────
export interface OrderState {
  items:          CartItem[];
  customer:       Customer | null;
  notes:          string;
  discountAmount: number;
  orderType:      OrderType;
  taxRate:        number;
}

// ── Default / reset values ─────────────────────────────────────────────────
const DEFAULT_STATE: OrderState = {
  items:          [],
  customer:       null,
  notes:          '',
  discountAmount: 0,
  orderType:      OrderType.POS_SALE,
  taxRate:        0.20,   // 20 % — matches backend Order.taxRate decimal convention
};

@Injectable({ providedIn: 'root' })
export class OrderStateService {
  private productsService = inject(ProductsService);

  // ── Core signal ───────────────────────────────────────────────────────────
  private state = signal<OrderState>({ ...DEFAULT_STATE });

  // ── Public read signals ───────────────────────────────────────────────────
  items          = computed(() => this.state().items);
  customer       = computed(() => this.state().customer);
  notes          = computed(() => this.state().notes);
  discountAmount = computed(() => this.state().discountAmount);
  orderType      = computed(() => this.state().orderType);
  taxRate        = computed(() => this.state().taxRate);

  // ── Derived totals (mirror backend Order.calculateTotals()) ───────────────

  /** Sum of (unit price × quantity) for all items */
  itemCount = computed(() =>
    this.items().reduce((acc, item) => acc + item.quantity, 0)
  );

  /** Raw line total before discount or tax */
  subtotal = computed(() =>
    this.items().reduce((acc, item) => acc + item.product.price * item.quantity, 0)
  );

  /** subtotal − discountAmount  (matches Order.subtotal after calculateTotals) */
  totalBeforeTax = computed(() => this.subtotal() - this.discountAmount());

  /** taxAmount = totalBeforeTax × taxRate  (taxRate stored as decimal: 0.20 = 20%) */
  taxAmount = computed(() => this.totalBeforeTax() * this.taxRate());

  /**
   * Final total = totalBeforeTax + taxAmount.
   * Maps to Order.totalAmount on backend.
   * Components pass this as [totalAmount] to OrderSummaryComponent.
   */
  total = computed(() => this.totalBeforeTax() + this.taxAmount());

  // ── Mutations ─────────────────────────────────────────────────────────────

  setItems(items: CartItem[]): void {
    this.state.update((s) => ({ ...s, items }));
  }

  addItem(product: Product, quantity = 1): void {
    const items = [...this.state().items];
    const idx   = items.findIndex((i) => i.product.productId === product.productId);

    if (idx > -1) {
      items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
    } else {
      items.push({ product, quantity });
    }

    this.state.update((s) => ({ ...s, items }));
  }

  updateItemQuantity(productId: string, delta: number): void {
    const items = [...this.state().items];
    const idx   = items.findIndex((i) => i.product.productId === productId);

    if (idx === -1) return;

    const newQty = items[idx].quantity + delta;
    if (newQty > 0) {
      items[idx] = { ...items[idx], quantity: newQty };
    } else {
      items.splice(idx, 1);
    }

    this.state.update((s) => ({ ...s, items }));
  }

  removeItem(productId: string): void {
    this.state.update((s) => ({
      ...s,
      items: s.items.filter((i) => i.product.productId !== productId),
    }));
  }

  setCustomer(customer: Customer | null): void {
    this.state.update((s) => ({ ...s, customer }));
  }

  setNotes(notes: string): void {
    this.state.update((s) => ({ ...s, notes }));
  }

  setDiscountAmount(amount: number): void {
    this.state.update((s) => ({ ...s, discountAmount: Math.max(0, amount) }));
  }

  setTaxRate(rate: number): void {
    this.state.update((s) => ({ ...s, taxRate: rate }));
  }

  /**
   * Set the order type for the current session.
   * Called by page components (PosSaleComponent, CreditSaleComponent, ProformaComponent)
   * on init so the state always reflects the correct DocumentStrategy context.
   */
  setOrderType(orderType: OrderType): void {
    this.state.update((s) => ({ ...s, orderType }));
  }

  /**
   * Reset state to defaults.
   * Uses DEFAULT_STATE so taxRate, orderType, and all fields are consistent.
   * Called after a successful order submission.
   */
  clear(): void {
    this.state.set({ ...DEFAULT_STATE });
  }

  // ── Validation ────────────────────────────────────────────────────────────

  validateForPosSale(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (this.itemCount() === 0) errors.push('Le panier est vide');
    if (this.total() <= 0)     errors.push('Le montant total doit être supérieur à 0');
    return { valid: errors.length === 0, errors };
  }

  validateForCreditSale(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (this.itemCount() === 0) errors.push('Le panier est vide');
    if (!this.customer())       errors.push('Un client est obligatoire pour une vente à crédit');
    if (this.total() <= 0)     errors.push('Le montant total doit être supérieur à 0');
    return { valid: errors.length === 0, errors };
  }

  validateForProforma(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (this.itemCount() === 0) errors.push('Le panier est vide');
    return { valid: errors.length === 0, errors };
  }

  // ── OrderRequest builder ──────────────────────────────────────────────────

  /**
   * Builds the payload for POST /orders or POST /orders/with-payment.
   *
   * orderType is taken from state so components don't need to override it
   * separately — they call setOrderType() on init and toOrderRequest() builds
   * the correct payload automatically.
   *
   * Components may still override orderType on the returned object for
   * explicit clarity, but it is no longer required.
   *
   * paymentMethod / amountPaid are optional:
   *   - POS sale:     first payment method + amount from PaymentCashComponent
   *   - Credit sale:  omitted on creation (payment added via /orders/{id}/payments)
   *   - Proforma:     omitted (no payment)
   */
  toOrderRequest(
    storeId:        string,
    paymentMethod?: PaymentMethod,
    amountPaid?:    number
  ): OrderRequest & { orderType: OrderType } {
    return {
      storeId,
      orderType:      this.orderType(),   // ← comes from state, not hardcoded
      customerId:     this.customer()?.customerId,
      items:          this.items().map((item) => ({
        productId: item.product.productId,
        quantity:  item.quantity,
      })),
      discountAmount: this.discountAmount(),
      taxRate:        this.taxRate(),      // decimal: 0.20 = 20%
      isTaxable:      true,
      notes:          this.notes() || undefined,
      paymentMethod,
      amountPaid,
    };
  }
}