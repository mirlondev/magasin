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
import { Select, SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { EmployeeRole, StockStatus } from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { InventoryService } from "../../../core/services/inventory.service";

@Component({
  selector: 'app-inventory-list',
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
    SelectModule
],
  templateUrl:"./inventory-list.component.html",
  styleUrl:"./inventory-list.component.css"
})
export class InventoryListComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals from service
  inventoryItems = this.inventoryService.inventoryItems;
  loading = this.inventoryService.loading;
  total = this.inventoryService.total;
  pageSize = this.inventoryService.pageSize;
  lowStockItems = this.inventoryService.lowStockItems;
  outOfStockItems = this.inventoryService.outOfStockItems;
  overStockItems = this.inventoryService.overStockItems;

  // Local signals
  searchTerm = '';
  selectedStockStatus: StockStatus | null = null;
  selectedAlertType: string | null = null;

  showLowStock = false;
  showOutOfStock = false;

  // Options
  statusOptions = [
    { label: 'En stock', value: StockStatus.IN_STOCK },
    { label: 'Stock faible', value: StockStatus.LOW_STOCK },
    { label: 'Rupture de stock', value: StockStatus.OUT_OF_STOCK },
    { label: 'Stock excédentaire', value: StockStatus.OVER_STOCK },
   // { label: 'Discontinué', value: StockStatus.DISCONTINUED }
  ];

  alertOptions = [
    { label: 'Stock faible', value: 'low' },
    { label: 'Rupture de stock', value: 'out' },
    { label: 'Stock excédentaire', value: 'over' }
  ];

  ngOnInit() {
    this.loadInventory();
  }

  // Computed
  totalValue = () => {
    const items = this.inventoryItems() || [];
    return items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  };

  // Permission checks
  canManageInventory(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER]);
  }

  // UI Helpers
  getStockPercentage(item: any): number {
    if (item.maxStock === 0) return 0;
    return Math.min((item.quantity / item.maxStock) * 100, 100);
  }

  getProgressBarClass(item: any): string {
    if (item.outOfStock) return 'p-progressbar-danger';
    if (item.lowStock) return 'p-progressbar-warning';
    if (item.overStock) return 'p-progressbar-help';
    return 'p-progressbar-success';
  }

  getStatusLabel(status: StockStatus): string {
    switch (status) {
      case StockStatus.IN_STOCK: return 'En stock';
      case StockStatus.LOW_STOCK: return 'Stock faible';
      case StockStatus.OUT_OF_STOCK: return 'Rupture';
      case StockStatus.OVER_STOCK: return 'Excédent';
      case StockStatus.DISCONTINUED: return 'Discontinué';
      default: return status;
    }
  }

  getStatusSeverity(status: StockStatus): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
    switch (status) {
      case StockStatus.IN_STOCK: return 'success';
      case StockStatus.LOW_STOCK: return 'warn';
      case StockStatus.OUT_OF_STOCK: return 'danger';
      case StockStatus.OVER_STOCK: return 'info';
      case StockStatus.DISCONTINUED: return 'secondary';
      default: return 'info';
    }
  }

  // Event Handlers
  loadInventory() {
    const filters: any = {};
    
    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.selectedStockStatus) filters.stockStatus = this.selectedStockStatus;
    if (this.selectedAlertType) {
      if (this.selectedAlertType === 'low') filters.lowStock = true;
      if (this.selectedAlertType === 'out') filters.outOfStock = true;
      if (this.selectedAlertType === 'over') filters.overStock = true;
    }

    this.inventoryService.loadInventory(1, this.pageSize(), filters);
  }

  onFilterChange() {
    this.loadInventory();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedStockStatus = null;
    this.selectedAlertType = null;
    this.loadInventory();
  }

  onLazyLoad(event: any) {
    const page = (event.first / event.rows) + 1;
    this.inventoryService.setPage(page);
    this.inventoryService.setPageSize(event.rows);
  }

  // Operations
  refresh() {
    this.loadInventory();
  }

  restockItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'restock']);
  }

  editItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'edit']);
  }

  transferItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'transfer']);
  }

  generateReport() {
    this.inventoryService.generateReport().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport-inventaire-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Rapport généré avec succès'
        });
      }
    });
  }
}