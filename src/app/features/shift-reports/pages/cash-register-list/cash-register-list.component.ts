import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { PaginatorModule } from "primeng/paginator";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToggleSwitchModule } from "primeng/toggleswitch";
import { ToolbarModule } from "primeng/toolbar";
import { CashRegister, CashRegisterRequest, EmployeeRole, Store } from "../../../../core/models";
import { AuthService } from "../../../../core/services/auth.service";
import { CashRegistersService } from "../../../../core/services/cash-registers.service";
import { StoresService } from "../../../../core/services/stores.service";

@Component({
  selector: 'app-cash-register-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToggleSwitchModule,
    TagModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    CardModule,
    PaginatorModule
  ],
  templateUrl: './cash-register-list.component.html',
  styleUrls: ['./cash-register-list.component.css'],
  providers: [ConfirmationService, MessageService]
})
export class CashRegisterListComponent implements OnInit {
  private cashRegistersService = inject(CashRegistersService);
  private storesService = inject(StoresService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Signals from service
  cashRegisters = this.cashRegistersService.cashRegisters;
  loading = this.cashRegistersService.loading;
  total = this.cashRegistersService.total;
  page = this.cashRegistersService.page;
  pageSize = this.cashRegistersService.pageSize;
  statistics = this.cashRegistersService.statistics;

  // Local state
  dialogVisible = signal(false);
  isEditMode = signal(false);
  submitted = signal(false);
  searchQuery = signal('');
  selectedStoreId = signal<string>('');
  filterIsActive = signal<boolean | null>(null);
  filterHasOpenShift = signal<boolean | null>(null);

  // Form
  cashRegisterForm: FormGroup = this.fb.group({
    registerNumber: ['', [Validators.required, Validators.minLength(3)]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    storeId: ['', Validators.required],
    location: [''],
    model: [''],
    serialNumber: [''],
    isActive: [true]
  });

  // Store options
  storeOptions = signal<{ label: string; value: string }[]>([]);

  // Computed
  filteredCashRegisters = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const isActive = this.filterIsActive();
    const hasOpenShift = this.filterHasOpenShift();

    return this.cashRegisters().filter(register => {
      const matchesSearch = !query ||
        register.registerNumber.toLowerCase().includes(query) ||
        register.name.toLowerCase().includes(query) ||
        (register.location?.toLowerCase().includes(query) ?? false);

      const matchesStatus = isActive === null || register.isActive === isActive;
      const matchesShift = hasOpenShift === null || register.hasOpenShift === hasOpenShift;

      return matchesSearch && matchesStatus && matchesShift;
    });
  });

  canManageCashRegisters = computed(() => {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]);
  });

  ngOnInit() {
    this.loadStores();
    this.cashRegistersService.initialize();
  }

  loadStores() {
    this.storesService.loadStores(1, 100).subscribe(() => {
      const stores = this.storesService.items();
      this.storeOptions.set(
        stores.map((store: Store) => ({
          label: `${store.name} - ${store.city || ''}`,
          value: store.storeId
        }))
      );
    });
  }

  onStoreChange(event: any) {
    const storeId = event.value;
    this.selectedStoreId.set(storeId);
    if (storeId) {
      this.cashRegistersService.getCashRegistersByStore(storeId);
    }
  }

  openNew() {
    this.isEditMode.set(false);
    this.cashRegisterForm.reset({
      registerNumber: '',
      name: '',
      storeId: this.selectedStoreId() || '',
      location: '',
      model: '',
      serialNumber: '',
      isActive: true
    });
    this.submitted.set(false);
    this.dialogVisible.set(true);
  }

  editCashRegister(register: CashRegister) {
    this.isEditMode.set(true);
    this.cashRegisterForm.patchValue({
      registerNumber: register.registerNumber,
      name: register.name,
      storeId: register.storeId,
      location: register.location || '',
      model: register.model || '',
      serialNumber: register.serialNumber || '',
      isActive: register.isActive
    });
    this.dialogVisible.set(true);
  }

  hideDialog() {
    this.dialogVisible.set(false);
    this.submitted.set(false);
    this.cashRegisterForm.reset();
  }

  saveCashRegister() {
    this.submitted.set(true);

    if (this.cashRegisterForm.invalid) {
      this.cashRegisterForm.markAllAsTouched();
      return;
    }

    const formValue = this.cashRegisterForm.value;
    const request: CashRegisterRequest = {
      registerNumber: formValue.registerNumber,
      name: formValue.name,
      storeId: formValue.storeId,
      location: formValue.location,
      model: formValue.model,
      serialNumber: formValue.serialNumber,
      isActive: formValue.isActive
    };

    if (this.isEditMode() && this.cashRegistersService.selectedCashRegister()) {
      this.cashRegistersService.updateCashRegister(
        this.cashRegistersService.selectedCashRegister()!.cashRegisterId,
        request
      ).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Caisse mise à jour avec succès'
          });
          this.hideDialog();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Échec de la mise à jour'
          });
        }
      });
    } else {
      this.cashRegistersService.createCashRegister(request).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Caisse créée avec succès'
          });
          this.hideDialog();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Échec de la création'
          });
        }
      });
    }
  }

  activateCashRegister(register: CashRegister) {
    this.confirmationService.confirm({
      message: `Activer la caisse ${register.registerNumber} ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.cashRegistersService.activateCashRegister(register.cashRegisterId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Caisse activée'
            });
          }
        });
      }
    });
  }

  deactivateCashRegister(register: CashRegister) {
    this.confirmationService.confirm({
      message: `Désactiver la caisse ${register.registerNumber} ? Cette action empêchera son utilisation.`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.cashRegistersService.deactivateCashRegister(register.cashRegisterId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Caisse désactivée'
            });
          }
        });
      }
    });
  }

  deleteCashRegister(register: CashRegister) {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer définitivement la caisse ${register.registerNumber} ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.cashRegistersService.deleteCashRegister(register.cashRegisterId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Caisse supprimée'
            });
          }
        });
      }
    });
  }

  resetFilters() {
    this.searchQuery.set('');
    this.filterIsActive.set(null);
    this.filterHasOpenShift.set(null);
    this.selectedStoreId.set('');
  }

  onPageChange(event: any) {
    this.cashRegistersService.setPage(event.page + 1);
    this.cashRegistersService.setPageSize(event.rows);
  }

  getAvailabilityStatus(register: CashRegister): { label: string; severity: "success" | "info" | "warn" | "danger" | "secondary" | "contrast" } {
    if (!register.isActive) {
      return { label: 'Inactive', severity: 'danger' };
    }
    if (register.hasOpenShift) {
      return { label: 'Occupée', severity: 'warn' };
    }
    return { label: 'Disponible', severity: 'success' };
  }
}