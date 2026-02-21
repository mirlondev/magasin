import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividerModule } from 'primeng/divider';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

/**
 * OrderSummaryComponent
 *
 * Displays order totals aligned with the backend Order entity:
 * - subtotal     : sum of items before discount/tax
 * - discountAmount : order-level discount (BigDecimal in backend)
 * - taxRate      : stored as decimal (0.20 = 20%) — matches Order.taxRate
 * - taxAmount    : pre-calculated by backend Order.calculateTotals()
 * - totalAmount  : final amount (= subtotal - discount + tax)
 * - totalPaid    : sum of non-credit payments (optional, shown on paid orders)
 * - changeAmount : cash change returned to customer (optional)
 * - remainingAmount : still owed (optional, for partial/credit orders)
 */
@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, DividerModule, XafPipe],
  template: `
    <div class="space-y-3">

      <!-- Subtotal -->
      <div class="flex justify-between">
        <span class="text-gray-600">Sous-total</span>
        <span class="font-medium">{{ subtotal() | xaf }}</span>
      </div>

      <!-- Discount — only shown when > 0 -->
      @if (discountAmount() > 0) {
        <div class="flex justify-between">
          <span class="text-gray-600">Remise</span>
          <span class="text-red-500 font-medium">-{{ discountAmount() | xaf }}</span>
        </div>
      }

      <!-- Tax — only shown when taxRate > 0 (isTaxable orders) -->
      @if (taxRate() > 0) {
        <div class="flex justify-between">
          <span class="text-gray-600">TVA ({{ formattedTaxRate() }}%)</span>
          <span class="font-medium">{{ taxAmount() | xaf }}</span>
        </div>
      }

      <p-divider />

      <!-- Total — maps to Order.totalAmount -->
      <div class="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span class="text-primary">{{ totalAmount() | xaf }}</span>
      </div>

      <!-- Payment info — only shown when provided (after payment is added) -->
      @if (totalPaid() > 0) {
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Montant payé</span>
          <span class="text-green-600 font-medium">{{ totalPaid() | xaf }}</span>
        </div>
      }

      @if (changeAmount() > 0) {
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Monnaie rendue</span>
          <span class="text-blue-600 font-medium">{{ changeAmount() | xaf }}</span>
        </div>
      }

      @if (remainingAmount() > 0) {
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Reste à payer</span>
          <span class="text-orange-600 font-medium">{{ remainingAmount() | xaf }}</span>
        </div>
      }

      <!-- Cart meta info -->
      <div class="text-sm text-gray-500 mt-2 pt-2 border-t">
        <div class="flex justify-between">
          <span>Nombre d'articles:</span>
          <span>{{ itemCount() }}</span>
        </div>
        <div class="flex justify-between">
          <span>Articles différents:</span>
          <span>{{ uniqueItems() }}</span>
        </div>
      </div>

    </div>
  `
})
export class OrderSummaryComponent {

  // ── Inputs matching Order entity fields ──────────────────────────────────

  /** Maps to Order.subtotal (sum of OrderItem.finalPrice) */
  subtotal = input(0);

  /** Maps to Order.discountAmount */
  discountAmount = input(0);

  /**
   * Maps to Order.taxRate — stored as decimal on backend (e.g. 0.20 for 20%).
   * Display converts to percentage: formattedTaxRate().
   */
  taxRate = input(0.20);

  /** Maps to Order.taxAmount — pre-calculated by Order.calculateTotals() */
  taxAmount = input(0);

  /** Maps to Order.totalAmount — the authoritative total from the backend */
  totalAmount = input(0);

  // ── Optional payment inputs (populated after payment is added) ───────────

  /** Maps to Order.totalPaid / OrderResponse.totalPaid */
  totalPaid = input(0);

  /** Maps to Order.changeAmount */
  changeAmount = input(0);

  /** Maps to OrderResponse.remainingAmount (totalAmount - totalPaid) */
  remainingAmount = input(0);

  // ── Cart metadata ─────────────────────────────────────────────────────────

  /** Total quantity across all cart items */
  itemCount = input(0);

  /** Number of distinct products in the cart */
  uniqueItems = input(0);

  // ── Computed ──────────────────────────────────────────────────────────────

  /** Converts decimal taxRate to whole-number percentage for display */
  formattedTaxRate = computed(() => Math.round(this.taxRate() * 100));
}