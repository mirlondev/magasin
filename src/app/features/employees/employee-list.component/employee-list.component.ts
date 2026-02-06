import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { ProgressBarModule } from "primeng/progressbar";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { BadgeModule } from "primeng/badge";
import { AvatarModule } from "primeng/avatar";
import { EmployeeRole, UserStatus } from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { EmployeesService } from "../../../core/services/employees.service";

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    TagModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    ProgressBarModule,
    SelectModule,
    BadgeModule,
    AvatarModule
  ],
  templateUrl: "./employee-list.component.html",
  styleUrl: "./employee-list.component.css"
})
export class EmployeeListComponent implements OnInit {
  private employeesService = inject(EmployeesService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals from service
  employees = this.employeesService.employees;
  loading = this.employeesService.loading;
  total = this.employeesService.total;
  pageSize = this.employeesService.pageSize;
  activeEmployees = this.employeesService.activeEmployees;
  admins = this.employeesService.admins;
  cashiers = this.employeesService.cashiers;

  // Local signals
  searchTerm = '';
  selectedRole: EmployeeRole | null = null;
  selectedStatus: string | null = null;

  showInactiveDialog = false;
  showRoleDialog = false;
  selectedEmployee: any = null;

  // Options
  roleOptions = [
    { label: 'Administrateur', value: EmployeeRole.ADMIN },
    { label: 'Gérant de magasin', value: EmployeeRole.STORE_ADMIN },
    { label: 'Gérant de dépôt', value: EmployeeRole.DEPOT_MANAGER },
    { label: 'Caissier', value: EmployeeRole.CASHIER },
  ];

  statusOptions = [
    { label: 'Actif', value: 'active' },
    { label: 'Inactif', value: 'inactive' },
    { label: 'En congé', value: 'on_leave' }
  ];

  ngOnInit() {
    this.loadEmployees();
  }

  // Permission checks
  canManageEmployees(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]);
  }

  canEditEmployee(employee: any): boolean {
    const currentUser = this.authService.currentUser();
    // Admins can edit anyone, others can only edit non-admins and not themselves
    if (this.authService.hasRole([EmployeeRole.ADMIN])) return true;
    if (employee.userId === currentUser?.userId) return false;
    return employee.userRole !== EmployeeRole.ADMIN;
  }
   isAdmin():boolean{
    return this.authService.isAdmin();
  }

  // UI Helpers
  getRoleLabel(role: EmployeeRole): string {
    switch (role) {
      case EmployeeRole.ADMIN: return 'Administrateur';
      case EmployeeRole.STORE_ADMIN: return 'Gérant magasin';
      case EmployeeRole.DEPOT_MANAGER: return 'Gérant dépôt';
      case EmployeeRole.CASHIER: return 'Caissier';
      default: return role;
    }
  }

  getRoleSeverity(role: EmployeeRole): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
    switch (role) {
      case EmployeeRole.ADMIN: return 'danger';
      case EmployeeRole.STORE_ADMIN: return 'warn';
      case EmployeeRole.DEPOT_MANAGER: return 'info';
      case EmployeeRole.CASHIER: return 'success';
      default: return 'info';
    }
  }

  getStatusSeverity(status: UserStatus): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
    switch (status) {
      case UserStatus.ACTIVE: return 'success';
      case UserStatus.INACTIVE: return 'danger';
      case UserStatus.ON_LEAVE: return 'warn';
      default: return 'secondary';
    }
  }

  getStatusLabel(status: UserStatus): string {
    switch (status) {
      case UserStatus.ACTIVE: return 'Actif';
      case UserStatus.INACTIVE: return 'Inactif';
      case UserStatus.ON_LEAVE: return 'En congé';
      default: return status;
    }
  }
  getFilter(){
    this.employees().filter(e => !e.active);

  }
  // Event Handlers
  loadEmployees() {
    const filters: any = {};
    
    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.selectedRole) filters.userRole = this.selectedRole;
    if (this.selectedStatus) {
      if (this.selectedStatus === 'active') filters.active = true;
      if (this.selectedStatus === 'inactive') filters.active = false;
      if (this.selectedStatus === 'on_leave') filters.status = UserStatus.ON_LEAVE;
    }

    this.employeesService.loadEmployees(
      this.employeesService.page(),
      this.pageSize(),
      filters
    );
  }

  onFilterChange() {
    this.employeesService.setPage(1);
    this.loadEmployees();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedRole = null;
    this.selectedStatus = null;
    this.employeesService.setPage(1);
    this.loadEmployees();
  }

  onLazyLoad(event: any) {
    const page = (event.first / event.rows) + 1;
    const rows = event.rows;

    if (this.pageSize() !== rows) {
      this.employeesService.setPageSize(rows);
    } else if (this.employeesService.page() !== page) {
      this.employeesService.setPage(page);
    }
    
    this.loadEmployees();
  }

  // Operations
  refresh() {
    this.employeesService.loadEmployees(
      this.employeesService.page(),
      this.pageSize()
    );
  }

  viewEmployee(employee: any) {
    this.router.navigate(['/employees', employee.userId]);
  }

  editEmployee(employee: any) {
    this.router.navigate(['/employees', employee.userId, 'edit']);
  }

  // Role management
  openRoleDialog(employee: any) {
    this.selectedEmployee = employee;
    this.showRoleDialog = true;
  }

  updateRole(newRole: EmployeeRole) {
    if (!this.selectedEmployee) return;

    this.employeesService.updateEmployeeRole(
      this.selectedEmployee.userId,
      newRole
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Rôle mis à jour avec succès'
        });
        this.showRoleDialog = false;
        this.selectedEmployee = null;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la mise à jour du rôle'
        });
      }
    });
  }

  // Status management
  toggleEmployeeStatus(employee: any) {
    const newStatus = !employee.active;
    const action = newStatus ? 'activer' : 'désactiver';
    
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir ${action} cet employé ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.employeesService.updateEmployeeStatus(
          employee.userId,
          newStatus
        ).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `Employé ${action} avec succès`
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: `Erreur lors de la ${action} de l'employé`
            });
          }
        });
      }
    });
  }

  // Delete employee
  deleteEmployee(employee: any) {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer cet employé ? Cette action est irréversible.',
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.employeesService.deleteEmployee(employee.userId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Employé supprimé avec succès'
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de la suppression de l\'employé'
            });
          }
        });
      }
    });
  }

  // Generate report
  generateReport() {
    this.employeesService.getEmployeeStatistics().subscribe({
      next: (data) => {
        // Logic to generate report
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Rapport généré avec succès'
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la génération du rapport'
        });
      }
    });
  }
}