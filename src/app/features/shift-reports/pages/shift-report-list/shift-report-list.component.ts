// src/app/features/shift-reports/shift-report-list.component.ts

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
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { EmployeeRole, ShiftReport, ShiftStatus } from "../../../../core/models";
import { AuthService } from "../../../../core/services/auth.service";
import { ShiftReportsService } from "../../../../core/services/shift-reports.service";
import { XafPipe } from "../../../../core/pipes/xaf-currency-pipe";

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
    InputNumberModule,
    DatePickerModule,
    SelectModule,
    TagModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    CardModule,
    XafPipe
  ],
  templateUrl: './shift-report-list.component.html',
  styleUrls: ['./shift-report-list.component.css'],
  providers: [ConfirmationService, MessageService]
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
  totalSales = this.shiftReportsService.totalSales;
  statistics = this.shiftReportsService.statistics;

  // Local signals
  currentShift = signal<ShiftReport | null>(null);
  filters = signal({
    status: null as ShiftStatus | null,
    cashier: '',
    store: '',
    cashRegister: '',
    startDate: null as string | null,
    endDate: null as string | null
  });
  dateRange = signal<Date[] | null>(null);

  // Close dialog
  showCloseDialog = signal(false);
  closingBalance = signal<number | null>(null);
  closingNotes = signal('');
  selectedShiftForClose = signal<ShiftReport | null>(null);

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
  canOpenShift = computed(() => {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER])
      && !this.currentShift();
  });

  canManageShift = computed(() => {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.CASHIER]);
  });

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
    if (currentFilters.cashRegister) filters.cashRegisterNumber = currentFilters.cashRegister;
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
      cashRegister: '',
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
    this.selectedShiftForClose.set(shift);
    this.closingBalance.set(null);
    this.closingNotes.set('');
    this.showCloseDialog.set(true);
  }

  closeShift() {
    const shiftId = this.selectedShiftForClose()?.shiftReportId;
    if (shiftId) {
      const closingData = {
        actualBalance: this.closingBalance() || undefined,
        notes: this.closingNotes()
      };
      this.shiftReportsService.closeShift(shiftId, closingData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Caisse fermée avec succès'
          });
          this.showCloseDialog.set(false);
          this.loadCurrentShift();
          this.loadShiftReports();
        }
      });
    }
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
    this.shiftReportsService.exportShiftReport(shift.shiftReportId, 'pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          newWindow.onload = () => {
            setTimeout(() => {
              window.URL.revokeObjectURL(url);
            }, 60000);
          };
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Échec de l\'impression'
        });
      }
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