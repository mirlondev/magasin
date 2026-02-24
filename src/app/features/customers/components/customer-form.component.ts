
import { Component, inject, input, model, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CustomersService } from '../../../core/services/customers.service';
import { Customer, CustomerRequest } from '../../../core/models';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputMaskModule,
    ToastModule
  ],
  template: `
    <p-toast />
    
    <p-dialog header="{{ isEditing() ? 'Modifier le client' : 'Nouveau client' }}" 
              [(visible)]="visible" 
              [modal]="true"
              [style]="{ width: '500px' }"
              (onHide)="onCancel()">
      <div class="space-y-4">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
          <input pInputText 
                 [(ngModel)]="customerForm.fullName"
                 required
                 class="w-full" />
        </div>

        <!-- Phone -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
          <p-inputMask 
            [(ngModel)]="customerForm.phone"
            mask="99 99 99 99 99"
            placeholder="00 00 00 00 00"
            class="w-full"></p-inputMask>
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input pInputText 
                 type="email"
                 [(ngModel)]="customerForm.email"
                 class="w-full" />
        </div>

        <!-- Address -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
          <input pInputText 
                 [(ngModel)]="customerForm.address"
                 class="w-full" />
        </div>

        <!-- Loyalty Points (only for editing) -->
        @if (isEditing()) {
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Points fidélité</label>
            <input pInputText 
                   type="number"
                   [(ngModel)]="customerForm.loyaltyPoints"
                   class="w-full" />
          </div>
        }
      </div>
      
      <ng-template pTemplate="footer">
        <button pButton 
                label="Annuler" 
                class="p-button-text"
                (click)="onCancel()">
        </button>
        <button pButton 
                label="{{ isEditing() ? 'Enregistrer' : 'Créer' }}" 
                icon="pi pi-check"
                [loading]="loading()"
                (click)="onSubmit()"
                class="p-button-primary">
        </button>
      </ng-template>
    </p-dialog>
  `
})
export class CustomerFormComponent implements OnInit {
  private customersService = inject(CustomersService);
  private messageService = inject(MessageService);

  // Input/Output
  visible = model(false);
  customer = input<Customer | null>(null);
  customerSaved = output<Customer>();
  cancel = output<void>();


  // State
  loading = signal(false);
  isEditing = signal(false);
  customerForm = {
    customerId: '',
    fullName: '',
    phone: '',
    email: '',
    address: '',
    loyaltyPoints: 0,
    totalPurchases: 0,
    lastPurchaseDate: undefined as string | undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    purchaseCount: 0,
    orderCount: 0,
    dateOfBirth: undefined as string | undefined,
    city: undefined as string | undefined,
    postalCode: undefined as string | undefined,
    country: undefined as string | undefined,
    loyaltyTier: undefined as any,
    firstName: '',
    lastName: ''
  };

  ngOnInit() {
    this.isEditing.set(!!this.customer());

    if (this.customer()) {
      const c = this.customer()!;
      this.customerForm = {
        ...this.customerForm,
        ...c,
        fullName: c.fullName || `${c.firstName} ${c.lastName}`.trim(),
        loyaltyPoints: c.loyaltyPoints || 0,
        totalPurchases: c.totalPurchases || 0,
        city: c.city || undefined,
        postalCode: c.postalCode || undefined,
        country: c.country || undefined,
        dateOfBirth: c.dateOfBirth || undefined
      };
    } else {
      this.resetForm();
    }
  }

  resetForm() {
    this.customerForm = {
      customerId: '',
      fullName: '',
      phone: '',
      email: '',
      address: '',
      loyaltyPoints: 0,
      totalPurchases: 0,
      lastPurchaseDate: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      purchaseCount: 0,
      orderCount: 0,
      dateOfBirth: undefined,
      city: undefined,
      postalCode: undefined,
      country: undefined,
      loyaltyTier: undefined,
      firstName: '',
      lastName: ''
    };
  }

  onSubmit() {
    if (!this.customerForm.fullName.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Le nom est requis'
      });
      return;
    }

    this.loading.set(true);

    const nameParts = this.customerForm.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || 'Client';

    const customerRequest: CustomerRequest = {
      firstName,
      lastName,
      email: this.customerForm.email,
      phone: this.customerForm.phone || undefined,
      address: this.customerForm.address || undefined,
      city: this.customerForm.city || undefined,
      postalCode: this.customerForm.postalCode || undefined,
      country: this.customerForm.country || undefined,
      dateOfBirth: this.customerForm.dateOfBirth || undefined
    };

    if (this.isEditing()) {
      this.customersService.updateCustomer(this.customerForm.customerId, customerRequest).subscribe({
        next: (updatedCustomer) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Client mis à jour'
          });
          this.visible.set(false);
          this.customerSaved.emit(updatedCustomer);
        },
        error: (err) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Erreur lors de la mise à jour'
          });
        }
      });
    } else {
      this.customersService.createCustomer(customerRequest).subscribe({
        next: (newCustomer) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Client créé'
          });
          this.visible.set(false);
          this.customerSaved.emit(newCustomer);
          this.resetForm();
        },
        error: (err) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Erreur lors de la création'
          });
        }
      });
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
