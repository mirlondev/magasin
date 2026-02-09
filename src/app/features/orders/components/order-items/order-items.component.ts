import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CartItem, Customer } from '../../../../core/models';
import { XafPipe } from '../../../../core/pipes/xaf-currency-pipe';

@Component({
  selector: 'app-order-items',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    TableModule,
    TagModule,
    XafPipe
  ],
  template: `
    <!-- Cart Summary Header -->
    <div class="flex justify-between items-center mb-4">
      <div class="font-semibold text-lg">Articles ({{ totalItems() }})</div>
      <button pButton 
              icon="pi pi-trash" 
              label="Vider" 
              class="p-button-text p-button-danger"
              (click)="onClearAll()"
              [disabled]="items().length === 0">
      </button>
    </div>

    <!-- Items Table -->
    @if (items().length === 0) {
      <div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
        <i class="pi pi-shopping-cart text-4xl text-gray-300 mb-3"></i>
        <p class="text-gray-500">Votre panier est vide</p>
        <p class="text-sm text-gray-400">Ajoutez des produits en cliquant dessus</p>
      </div>
    } @else {
      <div class="border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr class="text-left text-sm text-gray-500">
              <th class="p-3 font-medium">Produit</th>
              <th class="p-3 font-medium text-center">Quantité</th>
              <th class="p-3 font-medium text-right">Total</th>
              <th class="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.product.productId; let i = $index) {
              <tr class="border-b last:border-0 hover:bg-gray-50">
                <!-- Product Info -->
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
                      <div class="font-medium truncate">{{ item.product.name }}</div>
                      <div class="text-sm text-gray-500">{{ item.product.sku }}</div>
                      <div class="text-sm font-semibold text-primary">
                        {{ item.product.price | xaf }}
                      </div>
                      @if (item.product.quantity <= 0) {
                        <p-tag value="Rupture" severity="danger" size="small" />
                      } @else if (item.quantity > item.product.quantity) {
                        <p-tag [value]="'Stock: ' + item.product.quantity" 
                               severity="warn" 
                               size="small" />
                      }
                    </div>
                  </div>
                </td>

                <!-- Quantity Controls -->
                <td class="p-3">
                  <div class="flex items-center justify-center gap-2">
                    <button pButton 
                            icon="pi pi-minus" 
                            class="p-button-rounded p-button-text p-button-sm"
                            (click)="onUpdateQuantity(item.product.productId, -1)"
                            [disabled]="item.quantity <= 1">
                    </button>
                    <span class="font-bold w-6 text-center">{{ item.quantity }}</span>
                    <button pButton 
                            icon="pi pi-plus" 
                            class="p-button-rounded p-button-text p-button-sm"
                            (click)="onUpdateQuantity(item.product.productId, 1)"
                            [disabled]="item.quantity >= item.product.quantity">
                    </button>
                  </div>
                </td>

                <!-- Total -->
                <td class="p-3 text-right">
                  <div class="font-bold">{{ (item.product.price * item.quantity) | xaf }}</div>
                  @if (item.quantity > 1) {
                    <div class="text-xs text-gray-500">
                      {{ item.quantity }} × {{ item.product.price | xaf }}
                    </div>
                  }
                </td>

                <!-- Actions -->
                <td class="p-3">
                  <button pButton 
                          icon="pi pi-times" 
                          class="p-button-rounded p-button-text p-button-danger p-button-sm"
                          (click)="onRemoveItem(item.product.productId)">
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Customer Section -->
    <div class="mt-6">
      <div class="flex items-center justify-between mb-3">
        <div class="font-medium">Client</div>
        @if (!customer()) {
          <button pButton 
                  icon="pi pi-user-plus" 
                  label="Sélectionner" 
                  class="p-button-outlined p-button-sm"
                  (click)="onSelectCustomer()">
          </button>
        }
      </div>
      
      @if (customer()) {
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="flex justify-between items-center">
            <div>
              <div class="font-semibold">{{ customer()?.fullName }}</div>
              <div class="text-sm text-gray-600">
                {{ customer()?.phone || customer()?.email || 'Pas de contact' }}
              </div>
              @if (customer()?.loyaltyPoints) {
                <p-tag [value]="customer()!.loyaltyPoints + ' pts'" 
                       severity="info" 
                       size="small" 
                       class="mt-1" />
              }
            </div>
            <button pButton 
                    icon="pi pi-times" 
                    class="p-button-rounded p-button-text p-button-sm"
                    (click)="onClearCustomer()">
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    tr:hover {
      background-color: #f9fafb;
    }
  `]
})
export class OrderItemsComponent {
  // Inputs
  items = input<CartItem[]>([]);
  customer = input<Customer | null>(null);

  // Outputs
  updateQuantity = output<{ productId: string; delta: number }>();
  removeItem = output<string>();
  clearAll = output<void>();
  selectCustomer = output<void>();
  clearCustomer = output<void>();

  // Computed
  totalItems = computed(() => 
    this.items().reduce((total, item) => total + item.quantity, 0)
  );

  totalAmount = computed(() => 
    this.items().reduce((total, item) => 
      total + (item.product.price * item.quantity), 0
    )
  );

  // Methods
  onUpdateQuantity(productId: string, delta: number) {
    this.updateQuantity.emit({ productId, delta });
  }

  onRemoveItem(productId: string) {
    this.removeItem.emit(productId);
  }

  onClearAll() {
    this.clearAll.emit();
  }

  onSelectCustomer() {
    this.selectCustomer.emit();
  }

  onClearCustomer() {
    this.clearCustomer.emit();
  }

  // Helper
  getProductImage(product: any): string {
    return product?.imageUrl || '';
  }
}