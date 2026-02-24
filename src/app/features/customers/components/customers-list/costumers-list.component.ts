import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { ConfirmationService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { PaginatorModule } from "primeng/paginator";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { ToggleSwitchModule } from "primeng/toggleswitch";
import { ToolbarModule } from "primeng/toolbar";
import { Customer, CustomerRequest } from "../../../../core/models";
import { CustomersService } from "../../../../core/services/customers.service";

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, ToolbarModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, 
    ToggleSwitchModule, ToastModule, ConfirmDialogModule, PaginatorModule
  ],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.css'],
  providers: [MessageService, ConfirmationService]
})
export class CustomerListComponent implements OnInit {
  private customerService = inject(CustomersService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  // State
  loading = this.customerService.loading;
  customers = this.customerService.customers;
  total = this.customerService.total;
  
  // UI State
  dialogVisible = signal(false);
  isEditMode = signal(false);
  searchQuery = signal('');
  
  // Form
  customerForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    address: [''],
    city: [''],
    postalCode: [''],
    country: [''],
    isActive: [true]
  });

  // Computed
  filteredCustomers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.customers();
    return this.customers().filter(c => 
      c.firstName.toLowerCase().includes(query) || 
      c.lastName.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    this.customerService.loadCustomers();
  }

  openNew() {
    this.isEditMode.set(false);
    this.customerForm.reset({ isActive: true });
    this.dialogVisible.set(true);
  }

  editCustomer(customer: Customer) {
    this.isEditMode.set(true);
    this.customerForm.patchValue({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      postalCode: customer.postalCode,
      country: customer.country,
      isActive: customer.isActive
    });
    this.dialogVisible.set(true);
  }

  saveCustomer() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const formValue = this.customerForm.value;
    const request: CustomerRequest = {
      ...formValue,
      isActive: !!formValue.isActive
    };

    if (this.isEditMode() && this.customerService.selectedCustomer()) {
      this.customerService.updateCustomer(this.customerService.selectedCustomer()!.customerId, request)
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Client mis à jour' });
            this.dialogVisible.set(false);
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la mise à jour' })
        });
    } else {
      this.customerService.createCustomer(request)
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Client créé' });
            this.dialogVisible.set(false);
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la création' })
        });
    }
  }

  deleteCustomer(customer: Customer) {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer ${customer.firstName} ${customer.lastName} ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.customerService.deleteCustomer(customer.customerId).subscribe({
          next: () => this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Client supprimé' }),
          error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la suppression' })
        });
      }
    });
  }

  toggleStatus(customer: Customer) {
    this.customerService.updateCustomerStatus(customer.customerId, !customer.isActive)
      .subscribe({
        next: () => this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Statut mis à jour' }),
        error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec du changement de statut' })
      });
  }

  getTierColor(tier: string): string {
    switch (tier) {
      case 'GOLD': return 'text-yellow-600 bg-yellow-100';
      case 'SILVER': return 'text-gray-600 bg-gray-100';
      case 'PLATINUM': return 'text-blue-600 bg-blue-100';
      default: return 'text-orange-600 bg-orange-100'; // BRONZE
    }
  }
}