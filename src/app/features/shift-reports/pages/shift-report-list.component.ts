import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { EmployeeRole, ShiftReport, ShiftStatus } from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { ShiftReportsService } from "../../../core/services/shift-reports.service";
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { XafPipe } from "../../../core/pipes/xaf-currency-pipe";

@Component({
  selector: 'app-shift-report-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    DatePickerModule,
    SelectModule,
    TagModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    CardModule,
    XafPipe
],
  template: `
    <div class="p-4">
      <p-toast />
      <p-confirmDialog />

      <!-- Current Shift Banner -->
      @if (currentShift()) {
        <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <i class="pi pi-clock text-2xl text-blue-500 mr-4"></i>
              <div>
                <h3 class="font-bold text-lg">Caisse ouverte</h3>
                <p class="text-gray-600 dark:text-gray-400">
                  Session #{{ currentShift()?.shiftNumber }} • 
                  Caisse {{ currentShift()?.cashRegisterNumber || 'N/A' }} •
                  Ouverte à {{ currentShift()?.openingTime| date:'HH:mm' }} • 
                  Solde: {{ currentShift()?.actualBalance | xaf }}
                </p>
              </div>
            </div>
            <div class="flex gap-2">
              <button pButton 
                      icon="pi pi-eye" 
                      label="Voir détails" 
                      class="p-button-outlined p-button-sm"
                      [routerLink]="['/shift-reports', currentShift()?.shiftReportId]">
              </button>
              <button pButton 
                      icon="pi pi-lock" 
                      label="Fermer la caisse" 
                      class="p-button-danger p-button-sm"
                      (click)="closeCurrentShift()">
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Toolbar -->
      <p-toolbar>
        <div class="p-toolbar-group-start">
          <h2 class="text-2xl font-bold">Sessions de Caisse</h2>
        </div>
        
        <div class="p-toolbar-group-end">
          @if (canOpenShift() && !currentShift()) {
            <button pButton 
                    icon="pi pi-lock-open" 
                    label="Ouvrir une caisse" 
                    class="p-button-success"
                    [routerLink]="['/shift-reports/new']">
            </button>
          }
          
          <button pButton 
                  icon="pi pi-file-export" 
                  label="Exporter" 
                  class="p-button-help ml-2"
                  (click)="exportShiftReports()">
          </button>
        </div>
      </p-toolbar>

      <!-- Filters -->
      <div class="p-4 surface-ground rounded mb-4">
        <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Statut</label>
            <p-select [options]="statusOptions" 
                       [(ngModel)]="filters().status"
                       (onChange)="onFilterChange()"
                       placeholder="Tous les statuts"
                       [showClear]="true"
                       class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Caissier</label>
            <input pInputText 
                   [(ngModel)]="filters().cashier"
                   (ngModelChange)="onFilterChange()"
                   placeholder="Nom du caissier..." 
                   class="w-full" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Magasin</label>
            <input pInputText 
                   [(ngModel)]="filters().store"
                   (ngModelChange)="onFilterChange()"
                   placeholder="Nom du magasin..." 
                   class="w-full" />
          </div>
          
          <!-- NOUVEAU : Filtre par caisse -->
          <div>
            <label class="block text-sm font-medium mb-2">Caisse</label>
            <input pInputText 
                   [(ngModel)]="filters().cashRegister"
                   (ngModelChange)="onFilterChange()"
                   placeholder="Numéro de caisse..." 
                   class="w-full" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Période</label>
            <p-datepicker [(ngModel)]="dateRange"
                       (onSelect)="onDateRangeChange()"
                       selectionMode="range" 
                       [showIcon]="true"
                       dateFormat="dd/mm/yy"
                       placeholder="Sélectionner une période"
                       class="w-full">
            </p-datepicker>
          </div>
          
          <div class="flex items-end">
            <button pButton 
                    icon="pi pi-filter-slash" 
                    label="Réinitialiser" 
                    class="p-button-outlined w-full"
                    (click)="resetFilters()">
            </button>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Sessions ouvertes</div>
          <div class="text-900 text-3xl font-bold text-green-500">{{ openShifts().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Sessions fermées</div>
          <div class="text-900 text-3xl font-bold text-blue-500">{{ closedShifts().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Sessions suspendues</div>
          <div class="text-900 text-3xl font-bold text-orange-500">{{ suspendedShifts().length }}</div>
        </div>
        
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Total ventes</div>
          <div class="text-900 text-3xl font-bold">
            {{ totalSales() | xaf }}
          </div>
        </div>
      </div>

      <!-- Shift Reports Table -->
      <p-table [value]="shiftReports()" 
               [lazy]="true" 
               [paginator]="true" 
               [rows]="pageSize()"
               [totalRecords]="total()"
               [loading]="loading()"
               (onLazyLoad)="onLazyLoad($event)"
               [rowsPerPageOptions]="[10, 25, 50]"
               [tableStyle]="{'min-width': '75rem'}">
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="shiftNumber">N° Session <p-sortIcon field="shiftNumber" /></th>
            <th pSortableColumn="cashier.username">Caissier <p-sortIcon field="cashier.username" /></th>
            <th pSortableColumn="store.name">Magasin <p-sortIcon field="store.name" /></th>
            <th>Caisse</th> <!-- NOUVEAU -->
            <th pSortableColumn="status">Statut <p-sortIcon field="status" /></th>
            <th pSortableColumn="totalSales">Ventes <p-sortIcon field="totalSales" /></th>
            <th pSortableColumn="startTime">Ouverture <p-sortIcon field="startTime" /></th>
            <th pSortableColumn="endTime">Fermeture <p-sortIcon field="endTime" /></th>
            <th>Actions</th>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="body" let-shift>
          <tr>
            <td class="font-semibold">
              <a [routerLink]="['/shift-reports', shift.shiftReportId]" 
                 class="text-primary-600 hover:text-primary-500">
                {{ shift.shiftNumber }}
              </a>
            </td>
            <td>{{ shift.cashier?.username || 'N/A' }}</td>
            <td>{{ shift.store?.name || 'N/A' }}</td>
            <!-- NOUVEAU : Affichage caisse -->
            <td>
              @if (shift.cashRegisterNumber) {
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ shift.cashRegisterNumber }}
                </span>
              } @else {
                <span class="text-gray-400">-</span>
              }
            </td>
            <td>
              <p-tag [value]="getStatusLabel(shift.status)" 
                     [severity]="getStatusSeverity(shift.status)" />
            </td>
            <td class="font-semibold">{{ shift.totalSales | xaf }}</td>
            <td>{{ shift.startTime | date:'dd/MM/yyyy HH:mm' }}</td>
            <td>
              @if (shift.endTime) {
                {{ shift.endTime | date:'dd/MM/yyyy HH:mm' }}
              } @else {
                <span class="text-gray-400">-</span>
              }
            </td>
            <td>
              <div class="flex gap-2">
                <button pButton 
                        icon="pi pi-eye" 
                        class="p-button-rounded p-button-info p-button-text"
                        [routerLink]="['/shift-reports', shift.shiftReportId]">
                </button>
                
                @if (canManageShift(shift)) {
                  @if (shift.status === 'OPEN') {
                    <button pButton 
                            icon="pi pi-pause" 
                            class="p-button-rounded p-button-warning p-button-text"
                            (click)="suspendShift(shift)"
                            [disabled]="loading()">
                    </button>
                    
                    <button pButton 
                            icon="pi pi-lock" 
                            class="p-button-rounded p-button-danger p-button-text"
                            (click)="confirmCloseShift(shift)"
                            [disabled]="loading()">
                    </button>
                  }
                  
                  @if (shift.status === 'SUSPENDED') {
                    <button pButton 
                            icon="pi pi-play" 
                            class="p-button-rounded p-button-success p-button-text"
                            (click)="resumeShift(shift)"
                            [disabled]="loading()">
                    </button>
                  }
                  
                  <button pButton 
                          icon="pi pi-print" 
                          class="p-button-rounded p-button-help p-button-text"
                          (click)="printShiftReport(shift)"
                          [disabled]="loading()">
                  </button>
                }
              </div>
            </td>
          </tr>
        </ng-template>
        
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="9" class="text-center p-6">
              <div class="text-500">
                @if (loading()) {
                  <p class="text-lg">Chargement en cours...</p>
                } @else {
                  <p class="text-lg">Aucune session de caisse trouvée</p>
                }
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class ShiftReportListComponent implements OnInit {
  private shiftReportsService = inject(ShiftReportsService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals from service
  shiftReports = this.shiftReportsService.shiftReports;
  loading = this.shiftReportsService.loading;
  total = this.shiftReportsService.total;
  pageSize = this.shiftReportsService.pageSize;
  openShifts = this.shiftReportsService.openShifts;
  closedShifts = this.shiftReportsService.closedShifts;
  suspendedShifts = this.shiftReportsService.suspendedShifts;

  // Local signals
  currentShift = signal<ShiftReport | null>(null);
  filters = signal({
    status: null as ShiftStatus | null,
    cashier: '',
    store: '',
    cashRegister: '',  // NOUVEAU
    startDate: null as string | null,
    endDate: null as string | null
  });

  dateRange = signal<Date[] | null>(null);

  // Options
  statusOptions = [
    { label: 'Ouverte', value: ShiftStatus.OPEN },
    { label: 'Fermée', value: ShiftStatus.CLOSED },
    { label: 'Suspendue', value: ShiftStatus.SUSPENDED },
    { label: 'En révision', value: ShiftStatus.UNDER_REVIEW }
  ];

  ngOnInit() {
    this.loadShiftReports();
    this.loadCurrentShift();
  }

  // Computed
  totalSales = computed(() => {
    return this.shiftReports().reduce((sum, shift) => sum + (shift.totalSales || 0), 0);
  });

  // Permission checks
  canOpenShift(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]);
  }

  canManageShift(shift: ShiftReport): boolean {
    if (!this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])) {
      return false;
    }
    
    const currentUser = this.authService.currentUser();
    const isOwner = shift.cashier?.userId === currentUser?.userId;
    const isAdmin = this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]);
    
    return isOwner || isAdmin;
  }

  // UI Helpers
  getStatusLabel(status: ShiftStatus): string {
    switch (status) {
      case ShiftStatus.OPEN: return 'Ouverte';
      case ShiftStatus.CLOSED: return 'Fermée';
      case ShiftStatus.SUSPENDED: return 'Suspendue';
      case ShiftStatus.UNDER_REVIEW: return 'En révision';
      default: return status;
    }
  }

  getStatusSeverity(status: ShiftStatus): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case ShiftStatus.OPEN: return 'success';
      case ShiftStatus.CLOSED: return 'info';
      case ShiftStatus.SUSPENDED: return 'warn';
      case ShiftStatus.UNDER_REVIEW: return 'danger';
      default: return 'info';
    }
  }

  // Event Handlers
  loadShiftReports() {
    const filters: any = {};
    const currentFilters = this.filters();
    
    if (currentFilters.status) filters.status = currentFilters.status;
    if (currentFilters.cashier) filters.cashierName = currentFilters.cashier;
    if (currentFilters.store) filters.storeName = currentFilters.store;
    if (currentFilters.cashRegister) filters.cashRegisterNumber = currentFilters.cashRegister;  // NOUVEAU
    if (currentFilters.startDate) filters.startDate = currentFilters.startDate;
    if (currentFilters.endDate) filters.endDate = currentFilters.endDate;

    this.shiftReportsService.loadShiftReports(1, this.pageSize(), filters).subscribe();
  }

  loadCurrentShift() {
    this.shiftReportsService.getCurrentShift().subscribe(shift => {
      this.currentShift.set(shift);
    });
  }

  onFilterChange() {
    this.loadShiftReports();
  }

  onDateRangeChange() {
    const range = this.dateRange();
    if (range && range[0] && range[1]) {
      this.filters.update(f => ({
        ...f,
        startDate: range[0].toISOString().split('T')[0],
        endDate: range[1].toISOString().split('T')[0]
      }));
      this.loadShiftReports();
    }
  }

  resetFilters() {
    this.filters.set({
      status: null,
      cashier: '',
      store: '',
      cashRegister: '',  // NOUVEAU
      startDate: null,
      endDate: null
    });
    this.dateRange.set(null);
    this.loadShiftReports();
  }

  onLazyLoad(event: any) {
    const page = (event.first / event.rows) + 1;
    this.shiftReportsService.setPage(page);
    this.shiftReportsService.setPageSize(event.rows);
  }

  // Operations
  closeCurrentShift() {
    if (this.currentShift()) {
      this.confirmCloseShift(this.currentShift()!);
    }
  }

  confirmCloseShift(shift: ShiftReport) {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir fermer la session ${shift.shiftNumber} (Caisse ${shift.cashRegisterNumber || 'N/A'}) ?`,
      header: 'Confirmation de fermeture',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Oui, fermer',
      rejectLabel: 'Non',
      accept: () => this.closeShift(shift.shiftReportId)
    });
  }

  closeShift(shiftId: string) {
    // NOUVEAU : Utilisation du CloseShiftRequest avec actualBalance optionnel
    const closingData = {
      notes: 'Fermeture manuelle'
    };

    this.shiftReportsService.closeShift(shiftId, closingData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Caisse fermée avec succès'
        });
        this.loadCurrentShift();
        this.loadShiftReports();
      }
    });
  }

  suspendShift(shift: ShiftReport) {
    this.confirmationService.confirm({
      message: `Souhaitez-vous suspendre la session ${shift.shiftNumber} ?`,
      header: 'Suspension de caisse',
      icon: 'pi pi-pause',
      acceptLabel: 'Oui, suspendre',
      rejectLabel: 'Non',
      accept: () => {
        this.shiftReportsService.suspendShift(shift.shiftReportId, 'Suspendue par l\'utilisateur').subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Caisse suspendue avec succès'
            });
            this.loadCurrentShift();
            this.loadShiftReports();
          }
        });
      }
    });
  }

  resumeShift(shift: ShiftReport) {
    this.shiftReportsService.resumeShift(shift.shiftReportId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Caisse reprise avec succès'
        });
        this.loadCurrentShift();
        this.loadShiftReports();
      }
    });
  }

  printShiftReport(shift: ShiftReport) {
    this.messageService.add({
      severity: 'info',
      summary: 'Impression',
      detail: 'Fonctionnalité d\'impression bientôt disponible'
    });
  }

  exportShiftReports() {
    this.messageService.add({
      severity: 'info',
      summary: 'Export',
      detail: 'Fonctionnalité d\'export bientôt disponible'
    });
  }
}