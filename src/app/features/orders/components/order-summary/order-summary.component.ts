import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividerModule } from 'primeng/divider';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

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

      <!-- Discount -->
      @if (discountAmount() > 0) {
        <div class="flex justify-between">
          <span class="text-gray-600">Remise</span>
          <span class="text-red-500 font-medium">-{{ discountAmount() | xaf }}</span>
        </div>
      }

      <!-- Tax -->
      @if (taxRate() > 0) {
        <div class="flex justify-between">
          <span class="text-gray-600">TVA ({{ taxRate() * 100 }}%)</span>
          <span class="font-medium">{{ taxAmount() | xaf }}</span>
        </div>
      }

      <p-divider />

      <!-- Total -->
      <div class="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span class="text-primary">{{ total() | xaf }}</span>
      </div>

      <!-- Summary Details -->
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
  // Inputs
  subtotal = input(0);
  discountAmount = input(0);
  taxRate = input(0.20);
  taxAmount = input(0);
  total = input(0);
  itemCount = input(0);
  uniqueItems = input(0);

  // Computed for display
  formattedTaxRate = computed(() => {
    return Math.round(this.taxRate() * 100);
  });
}