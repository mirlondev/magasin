// features/orders/state/order-state.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import {
  CartItem,
  Customer,
  OrderRequest,
  OrderType,
  PaymentMethod,
  Product,
  DocumentType,
  OrderItemRequest,
  UnitType
} from '../../../core/models';
import { ProductsService } from '../../../core/services/products.service';

// ── Internal state shape ──────────────────────────────────────────────────────
export interface OrderState {
  items: CartItem[];
  customer: Customer | null;
  notes: string;
  discountAmount: number;
  orderType: OrderType;
  taxRate: number;
  // ── Document-specific fields ───────────────────────────────────────────────
  documentType: DocumentType | null;      // For document-based sales (Invoice, Proforma, etc.)
  validityDays: number;                    // For proformas/quotes validity
  dueDate: Date | null;                    // Payment due date for invoices
  customerReference: string;               // Client's PO number or reference
  deliveryAddress: string;                 // Alternative delivery address
  paymentTerms: string;                    // NET_15, NET_30, IMMEDIATE, etc.
  globalDiscountPercentage: number;        // Order-level discount %
  isTaxable: boolean;                      // Whether this order includes tax
}

// ── Default / reset values ─────────────────────────────────────────────────
const DEFAULT_STATE: OrderState = {
  items: [],
  customer: null,
  notes: '',
  discountAmount: 0,
  orderType: OrderType.POS_SALE,
  taxRate: 0.20,        // 20% — matches backend Order.taxRate decimal convention
  // Document fields
  documentType: null,
  validityDays: 30,
  dueDate: null,
  customerReference: '',
  deliveryAddress: '',
  paymentTerms: 'IMMEDIATE',
  globalDiscountPercentage: 0,
  isTaxable: true,
};

// ── Validation result type ─────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class OrderStateService {
  private productsService = inject(ProductsService);

  // ── Core signal ───────────────────────────────────────────────────────────
  private state = signal<OrderState>({ ...DEFAULT_STATE });

  // ── Public read signals ───────────────────────────────────────────────────
  items = computed(() => this.state().items);
  customer = computed(() => this.state().customer);
  notes = computed(() => this.state().notes);
  discountAmount = computed(() => this.state().discountAmount);
  orderType = computed(() => this.state().orderType);
  taxRate = computed(() => this.state().taxRate);

  // Document signals
  documentType = computed(() => this.state().documentType);
  validityDays = computed(() => this.state().validityDays);
  dueDate = computed(() => this.state().dueDate);
  customerReference = computed(() => this.state().customerReference);
  deliveryAddress = computed(() => this.state().deliveryAddress);
  paymentTerms = computed(() => this.state().paymentTerms);
  globalDiscountPercentage = computed(() => this.state().globalDiscountPercentage);
  isTaxable = computed(() => this.state().isTaxable);

  // ── Derived totals (mirror backend Order.calculateTotals()) ───────────────

  /** Sum of quantities for all items */
  itemCount = computed(() =>
    this.items().reduce((acc, item) => acc + item.quantity, 0)
  );

  /** Number of unique product lines */
  uniqueItemCount = computed(() => this.items().length);

  /** Raw line total before any discounts or tax */
  subtotal = computed(() =>
    this.items().reduce((acc, item) => acc + (item.product.price ?? 0) * item.quantity, 0)
  );

  /** Total discount from items + global discount */
  totalDiscountAmount = computed(() => {
    const itemDiscounts = this.items().reduce((acc, item) => {
      const itemDiscount = (item.discountPercentage || item.product.discountPercentage || 0) / 100 *
        (item.product.price ?? 0) * item.quantity;
      return acc + itemDiscount;
    }, 0);
    const globalDiscount = this.subtotal() * (this.globalDiscountPercentage() / 100);
    return itemDiscounts + globalDiscount + this.discountAmount();
  });

  /** subtotal − totalDiscountAmount */
  totalBeforeTax = computed(() => Math.max(0, this.subtotal() - this.totalDiscountAmount()));

  /** taxAmount = totalBeforeTax × taxRate (if taxable) */
  taxAmount = computed(() =>
    this.isTaxable() ? this.totalBeforeTax() * this.taxRate() : 0
  );

  /**
   * Final total = totalBeforeTax + taxAmount.
   * Maps to Order.totalAmount on backend.
   */
  total = computed(() => this.totalBeforeTax() + this.taxAmount());

  /** Amount remaining after payments (for credit tracking) */
  remainingAmount = computed(() => {
    // This would be updated based on payments added
    return this.total();
  });

  // ── Cart Item Management ─────────────────────────────────────────────────

  setItems(items: CartItem[]): void {
    this.state.update((s) => ({ ...s, items }));
  }

  addItem(product: Product, quantity = 1, unitType?: UnitType): void {
    const items = [...this.state().items];
    const idx = items.findIndex((i) => i.product.productId === product.productId);

    if (idx > -1) {
      // Update existing item
      const currentQty = items[idx].quantity;
      const newQty = currentQty + quantity;

      // Check stock availability
      const availableStock = product.quantity ?? Infinity;
      const finalQty = Math.min(newQty, availableStock);

      items[idx] = {
        ...items[idx],
        quantity: finalQty,
        unitType: unitType || items[idx].unitType
      };
    } else {
      // Add new item
      items.push({
        product,
        quantity,
        unitType,
        notes: ''
      });
    }

    this.state.update((s) => ({ ...s, items }));
  }

  updateItemQuantity(productId: string, delta: number): void {
    const items = [...this.state().items];
    const idx = items.findIndex((i) => i.product.productId === productId);

    if (idx === -1) return;

    const newQty = items[idx].quantity + delta;
    const availableStock = items[idx].product.quantity ?? Infinity;

    if (newQty > 0 && newQty <= availableStock) {
      items[idx] = { ...items[idx], quantity: newQty };
      this.state.update((s) => ({ ...s, items }));
    } else if (newQty <= 0) {
      this.removeItem(productId);
    }
  }

  setItemQuantity(productId: string, quantity: number): void {
    const items = [...this.state().items];
    const idx = items.findIndex((i) => i.product.productId === productId);

    if (idx === -1) return;

    const availableStock = items[idx].product.quantity ?? Infinity;
    const finalQty = Math.max(1, Math.min(quantity, availableStock));

    if (finalQty > 0) {
      items[idx] = { ...items[idx], quantity: finalQty };
      this.state.update((s) => ({ ...s, items }));
    }
  }

  updateItemDiscount(productId: string, discountPercentage: number): void {
    const items = [...this.state().items];
    const idx = items.findIndex((i) => i.product.productId === productId);

    if (idx > -1) {
      items[idx] = {
        ...items[idx],
        discountPercentage: Math.max(0, Math.min(100, discountPercentage))
      };
      this.state.update((s) => ({ ...s, items }));
    }
  }

  updateItemNotes(productId: string, notes: string): void {
    const items = [...this.state().items];
    const idx = items.findIndex((i) => i.product.productId === productId);

    if (idx > -1) {
      items[idx] = { ...items[idx], notes };
      this.state.update((s) => ({ ...s, items }));
    }
  }

  removeItem(productId: string): void {
    this.state.update((s) => ({
      ...s,
      items: s.items.filter((i) => i.product.productId !== productId),
    }));
  }

  clearItems(): void {
    this.state.update((s) => ({ ...s, items: [] }));
  }

  // ── Customer Management ───────────────────────────────────────────────────

  setCustomer(customer: Customer | null): void {
    this.state.update((s) => ({ ...s, customer }));

    // Auto-set delivery address to customer address if empty
    if (customer && !this.state().deliveryAddress) {
      const address = [customer.address, customer.city, customer.postalCode]
        .filter(Boolean)
        .join(', ');
      this.state.update((s) => ({ ...s, deliveryAddress: address }));
    }
  }

  // ── Document Configuration ────────────────────────────────────────────────

  setOrderType(orderType: OrderType): void {
    this.state.update((s) => ({ ...s, orderType }));

    // Auto-set document type based on order type
    const docTypeMap: Record<OrderType, DocumentType | null> = {
      [OrderType.POS_SALE]: DocumentType.TICKET,
      [OrderType.CREDIT_SALE]: DocumentType.INVOICE,
      [OrderType.PROFORMA]: DocumentType.PROFORMA,
      [OrderType.ONLINE]: DocumentType.INVOICE
    };

    this.state.update((s) => ({
      ...s,
      documentType: docTypeMap[orderType] || null
    }));
  }

  setDocumentType(documentType: DocumentType | null): void {
    this.state.update((s) => ({ ...s, documentType }));
  }

  setValidityDays(days: number): void {
    this.state.update((s) => ({
      ...s,
      validityDays: Math.max(1, Math.min(365, days))
    }));

    // Update due date based on validity
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + Math.max(1, Math.min(365, days)));
    this.state.update((s) => ({ ...s, dueDate: newDueDate }));
  }

  setDueDate(date: Date | null): void {
    this.state.update((s) => ({ ...s, dueDate: date }));
  }

  setCustomerReference(reference: string): void {
    this.state.update((s) => ({ ...s, customerReference: reference }));
  }

  setDeliveryAddress(address: string): void {
    this.state.update((s) => ({ ...s, deliveryAddress: address }));
  }

  setPaymentTerms(terms: string): void {
    this.state.update((s) => ({ ...s, paymentTerms: terms }));

    // Auto-calculate due date based on terms
    if (terms !== 'IMMEDIATE' && terms.startsWith('NET_')) {
      const days = parseInt(terms.split('_')[1]) || 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
      this.state.update((s) => ({ ...s, dueDate }));
    }
  }

  setGlobalDiscountPercentage(percentage: number): void {
    this.state.update((s) => ({
      ...s,
      globalDiscountPercentage: Math.max(0, Math.min(100, percentage))
    }));
  }

  setIsTaxable(taxable: boolean): void {
    this.state.update((s) => ({ ...s, isTaxable: taxable }));
  }

  // ── Notes & Pricing ───────────────────────────────────────────────────────

  setNotes(notes: string): void {
    this.state.update((s) => ({ ...s, notes }));
  }

  setDiscountAmount(amount: number): void {
    this.state.update((s) => ({ ...s, discountAmount: Math.max(0, amount) }));
  }

  setTaxRate(rate: number): void {
    this.state.update((s) => ({ ...s, taxRate: rate }));
  }

  // ── Validation Methods ────────────────────────────────────────────────────

  validateForPosSale(): ValidationResult {
    const errors: string[] = [];

    if (this.itemCount() === 0) {
      errors.push('Le panier est vide');
    }

    if (this.total() <= 0) {
      errors.push('Le montant total doit être supérieur à 0');
    }

    // Stock validation
    this.items().forEach(item => {
      const available = item.product.quantity ?? Infinity;
      if (item.quantity > available) {
        errors.push(`Stock insuffisant pour "${item.product.name}" (disponible: ${available})`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  validateForCreditSale(): ValidationResult {
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

    return { valid: errors.length === 0, errors };
  }

  validateForProforma(): ValidationResult {
    const errors: string[] = [];

    if (this.itemCount() === 0) {
      errors.push('Le panier est vide');
    }

    if (this.validityDays() <= 0) {
      errors.push('La durée de validité doit être supérieure à 0');
    }

    return { valid: errors.length === 0, errors };
  }

  validateForQuote(): ValidationResult {
    return this.validateForProforma(); // Same validation as proforma
  }

  validateForDeliveryNote(): ValidationResult {
    const errors: string[] = [];

    if (this.itemCount() === 0) {
      errors.push('Aucun article à livrer');
    }

    if (!this.customer()) {
      errors.push('Un client est requis pour un bon de livraison');
    }

    return { valid: errors.length === 0, errors };
  }

  validateForInvoice(): ValidationResult {
    const errors: string[] = [];

    if (this.itemCount() === 0) {
      errors.push('La facture doit contenir au moins un article');
    }

    if (!this.customer()) {
      errors.push('Un client est obligatoire pour créer une facture');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generic validation based on current order type
   */
  validate(): ValidationResult {
    switch (this.orderType()) {
      case OrderType.POS_SALE:
        return this.validateForPosSale();
      case OrderType.CREDIT_SALE:
        return this.validateForCreditSale();
      case OrderType.PROFORMA:
        return this.validateForProforma();
      default:
        return this.validateForPosSale();
    }
  }

  validateForDocumentSale(): ValidationResult {
    const errors: string[] = [];

    if (this.itemCount() === 0) {
      errors.push('Le document doit contenir au moins un article');
    }

    if (!this.customer()) {
      errors.push('Un client est obligatoire pour créer un document commercial');
    }

    return { valid: errors.length === 0, errors };
  }

  // ── OrderRequest Builders ─────────────────────────────────────────────────

  /**
   * Builds the payload for POST /orders
   * Enhanced to support all order types and document configurations
   */
  toOrderRequest(
    storeId: string,
    paymentMethod?: PaymentMethod,
    amountPaid?: number
  ): OrderRequest & { orderType: OrderType; documentType?: DocumentType } {

    const baseRequest: OrderRequest & { orderType: OrderType; documentType?: DocumentType } = {
      storeId,
      orderType: this.orderType(),
      customerId: this.customer()?.customerId,
      items: this.buildOrderItems(),
      discountAmount: this.discountAmount(),
      taxRate: this.taxRate(),
      isTaxable: this.isTaxable(),
      notes: this.buildNotes(),
      paymentMethod,
      amountPaid,
      documentType: this.documentType() || undefined
    };

    return baseRequest;
  }

  /**
   * Build order items with full details
   */
  private buildOrderItems(): OrderItemRequest[] {
    return this.items().map((item) => ({
      productId: item.product.productId,
      quantity: item.quantity,
      discountPercentage: item.discountPercentage || item.product.discountPercentage,
      notes: item.notes,
      unitType: item.unitType || item.product.unitType
    }));
  }

  /**
   * Build comprehensive notes including document metadata
   */
  private buildNotes(): string | undefined {
    const parts: string[] = [];

    if (this.notes()) {
      parts.push(this.notes());
    }

    if (this.customerReference()) {
      parts.push(`Référence client: ${this.customerReference()}`);
    }

    if (this.paymentTerms() !== 'IMMEDIATE') {
      parts.push(`Conditions: ${this.paymentTerms()}`);
    }

    if (this.documentType() === DocumentType.PROFORMA && this.validityDays()) {
      parts.push(`Validité: ${this.validityDays()} jours`);
    }

    if (this.deliveryAddress() && this.deliveryAddress() !== this.customer()?.address) {
      parts.push(`Adresse livraison: ${this.deliveryAddress()}`);
    }

    return parts.length > 0 ? parts.join('\n') : undefined;
  }

  /**
   * Build request specifically for document-based sales (Invoices, Proformas)
   */
  toDocumentOrderRequest(storeId: string): OrderRequest & {
    orderType: OrderType;
    documentType: DocumentType;
    validityDays?: number;
    dueDate?: string;
  } {
    const baseRequest = this.toOrderRequest(storeId);

    return {
      ...baseRequest,
      documentType: this.documentType()!,
      validityDays: this.validityDays(),
      dueDate: this.dueDate()?.toISOString()
    };
  }

  // ── State Persistence ─────────────────────────────────────────────────────

  /**
   * Serialize state for draft saving
   */
  serialize(): string {
    return JSON.stringify({
      ...this.state(),
      dueDate: this.dueDate()?.toISOString()
    });
  }

  /**
   * Restore state from serialized data
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.state.set({
        ...DEFAULT_STATE,
        ...parsed,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null
      });
    } catch (e) {
      console.error('Failed to deserialize order state:', e);
    }
  }

  /**
   * Reset state to defaults
   */
  clear(): void {
    this.state.set({ ...DEFAULT_STATE });
  }

  /**
   * Check if state is empty (no items, no customer)
   */
  isEmpty(): boolean {
    return this.items().length === 0 && !this.customer();
  }

  /**
   * Check if state has unsaved changes compared to initial state
   */
  hasChanges(): boolean {
    return this.items().length > 0 || !!this.customer() || !!this.notes();
  }
}