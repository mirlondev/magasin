import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CustomersService } from '../../../../core/services/customers.service';
import { Customer } from '../../../../core/models';

@Component({
  selector: 'app-customer-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TagModule
  ],
  template: `
    <!-- Customer Display -->
    @if (customer()) {
      <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
        <div class="flex justify-between items-center">
          <div>
            <div class="font-semibold">{{ customer()?.fullName }}</div>
            <div class="text-sm text-gray-600">
              {{ customer()?.phone || customer()?.email || 'Pas de contact' }}
            </div>
            @if (customer()?.loyaltyPoints) {
              <div class="text-xs text-gray-500 mt-1">
                Points fidélité: {{ customer()?.loyaltyPoints }}
              </div>
            }
          </div>
          <div class="flex items-center gap-2">
            <button pButton 
                    icon="pi pi-pencil" 
                    class="p-button-rounded p-button-text p-button-sm"
                    (click)="openDialog()">
            </button>
            <button pButton 
                    icon="pi pi-times" 
                    class="p-button-rounded p-button-text p-button-danger p-button-sm"
                    (click)="clearCustomer()">
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="p-4 border-2 border-dashed border-gray-300 rounded-lg mb-4 text-center cursor-pointer hover:bg-gray-50"
           (click)="openDialog()">
        <i class="pi pi-user-plus text-3xl text-gray-400 mb-2"></i>
        <div class="font-medium text-gray-700">Ajouter un client</div>
        <div class="text-sm text-gray-500">Cliquez pour sélectionner un client</div>
      </div>
    }

    <!-- Customer Selection Dialog -->
    <p-dialog header="Sélectionner un client" 
              [(visible)]="showDialog" 
              [modal]="true"
              [style]="{ width: '500px' }"
              (onHide)="onDialogHide()">
      <div class="space-y-4">
        <div class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText 
                 type="text" 
                 [(ngModel)]="searchQuery"
                 (ngModelChange)="onSearch()"
                 placeholder="Rechercher un client..."
                 class="w-full" />
        </div>
        
        <div class="border rounded-lg max-h-60 overflow-auto">
          @if (loading()) {
            <div class="p-6 text-center">
              <i class="pi pi-spin pi-spinner text-2xl text-primary mb-2"></i>
              <p class="text-gray-500">Recherche en cours...</p>
            </div>
          } @else if (filteredCustomers().length === 0) {
            <div class="p-6 text-center">
              <i class="pi pi-users text-3xl text-gray-300 mb-3"></i>
              @if ((searchQuery())) {
                <p class="text-gray-500">Aucun client trouvé</p>
                <p class="text-sm text-gray-400">Essayez avec un autre nom ou numéro</p>
              } @else {
                <p class="text-gray-500">Aucun client disponible</p>
              }
            </div>
          } @else {
            @for (cust of filteredCustomers(); track cust.customerId) {
              <div class="p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                   (click)="selectCustomer(cust)">
                <div class="flex justify-between items-center">
                  <div>
                    <div class="font-semibold">{{ cust.fullName }}</div>
                    <div class="text-sm text-gray-500">
                      {{ cust.phone || cust.email || 'Pas de contact' }}
                    </div>
                    @if (cust.loyaltyPoints) {
                      <div class="text-xs text-blue-500 mt-1">
                        {{ cust.loyaltyPoints }} points fidélité
                      </div>
                    }
                  </div>
                  <div class="text-right">
                    <div class="text-xs text-gray-500">
                      {{ cust.totalPurchases || 0 }} achats
                    </div>
                    @if (cust.lastPurchaseDate) {
                      <div class="text-xs text-gray-400">
                        Dernier achat: {{ cust.lastPurchaseDate | date:'dd/MM/yy' }}
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          }
        </div>

        <!-- Create new customer option -->
        <div class="text-center">
          <button pButton 
                  label="Créer un nouveau client" 
                  icon="pi pi-plus" 
                  class="p-button-outlined w-full"
                  (click)="createNewCustomer()">
          </button>
        </div>
      </div>
      
      <ng-template pTemplate="footer">
        <button pButton 
                label="Annuler" 
                class="p-button-text"
                (click)="showDialog()">
        </button>
      </ng-template>
    </p-dialog>
  `
})
export class CustomerSelectorComponent implements OnInit {
  private customersService = inject(CustomersService);

  // Input/Output
  customer = input<Customer | null>(null);
  customerSelected = output<Customer>();
  customerCleared = output<void>();

  // State
  showDialog = signal(false);
  searchQuery = signal('');
  loading = signal(false);
  filteredCustomers = signal<Customer[]>([]);

  ngOnInit() {
    // Load initial customers
    this.loadCustomers();
  }

  loadCustomers() {
    this.loading.set(true);
    this.customersService.loadCustomers(1, 50);
    this.filteredCustomers.set(this.customersService.customers());
    this.loading.set(false);
  }

  onSearch() {
    const query = this.searchQuery().trim();
    
    if (!query) {
      this.filteredCustomers.set(this.customersService.customers());
      return;
    }

    this.loading.set(true);
    this.customersService.searchCustomers(query).subscribe({
      next: (customers) => {
        this.filteredCustomers.set(customers);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  openDialog() {
    this.showDialog.set(true);
    this.searchQuery.set('');
    this.onSearch(); // Load all customers
  }

  onDialogHide() {
    this.searchQuery.set('');
  }

  selectCustomer(customer: Customer) {
    this.customerSelected.emit(customer);
    this.showDialog.set(false);
  }

  clearCustomer() {
    this.customerCleared.emit();
  }

  createNewCustomer() {
    // TODO: Navigate to customer creation page or open modal
    console.log('Create new customer');
  }
}