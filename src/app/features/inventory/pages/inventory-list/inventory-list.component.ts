// inventory-list.component.ts - Updated with DrawerModule and complete features
import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { DrawerModule } from "primeng/drawer";
import { InputTextModule } from "primeng/inputtext";
import { ProgressBarModule } from "primeng/progressbar";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { BadgeModule } from "primeng/badge";
import { AvatarModule } from "primeng/avatar";
import { InputNumberModule } from "primeng/inputnumber";
import { TooltipModule } from "primeng/tooltip";
import { SkeletonModule } from "primeng/skeleton";
import { ToggleButtonModule } from "primeng/togglebutton";
import { CheckboxModule } from "primeng/checkbox";
import { FileUploadModule } from "primeng/fileupload";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { ChartModule } from "primeng/chart";
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from "primeng/datepicker";
import { AuthService } from "../../../../core/services/auth.service";
import { InventoryService } from "../../../../core/services/inventory.service";
import { StoresService } from "../../../../core/services/stores.service";
import { ThemeService, Theme } from "../../../../core/services/theme.service";
import { EmployeeRole, StockStatus, Store } from "../../../../core/models";
import { TableSkeletonComponent, CardSkeletonComponent, ChartSkeletonComponent } from "../../../../shared/components/skeletons/skeleton-loader.component";
import { ColorScheme } from "@primeuix/themes/types";
import { XafPipe } from "../../../../core/pipes/xaf-currency-pipe";
import { FileSizePipe } from "../../../../core/pipes/file-size.pipe";

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
    DrawerModule,
    InputTextModule,
    TagModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    ProgressBarModule,
    SelectModule,
    BadgeModule,
    AvatarModule,
    InputNumberModule,
    TooltipModule,
    SkeletonModule,
    ToggleButtonModule,
    CheckboxModule,
    FileUploadModule,
    ProgressSpinnerModule,
    ChartModule,
    DatePickerModule,
    TextareaModule,
    XafPipe,
    TableSkeletonComponent,
    CardSkeletonComponent,
    ChartSkeletonComponent,
    FileSizePipe
  ],
  templateUrl: "./inventory-list.component.html",
  styleUrls: ["./inventory-list.component.css"]
})
export class InventoryListComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private storesService = inject(StoresService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);

  // Signals from service
  inventoryItems = computed(() => this.inventoryService.inventoryItems());
  loading = computed(() => this.inventoryService.loading());
  bulkLoading = computed(() => this.inventoryService.bulkLoading());
  total = computed(() => this.inventoryService.total());
  pageSize = computed(() => this.inventoryService.pageSize());
  lowStockItems = computed(() => this.inventoryService.lowStockItems());
  outOfStockItems = computed(() => this.inventoryService.outOfStockItems());
  overStockItems = computed(() => this.inventoryService.overStockItems());
  selectedItems = computed(() => this.inventoryService.selectedItems());
  totalValue = computed(() => this.inventoryService.totalValue());

  // Theme signals
  currentTheme = computed(() => this.themeService.currentTheme());
  currentColorScheme = computed(() => this.themeService.currentTheme());
  isDarkMode = computed(() => this.themeService.isDarkTheme());

  // Local signals
  searchTerm = signal('');
  selectedStockStatus = signal<StockStatus | null>(null);
  selectedAlertType = signal<string | null>(null);
  selectedStore = signal<Store | null>(null);
  minQuantity = signal<number | null>(null);
  maxQuantity = signal<number | null>(null);
  minValue = signal<number | null>(null);
  maxValue = signal<number | null>(null);

  // UI state
  showLowStock = false;
  showOutOfStock = false;
  showOverStock = false;
  showBulkOperationsDrawer = false;
  showImportDialog = false;
  showThemeDrawer = false;
  showFiltersDrawer = false;
  showStatisticsDrawer = false;
  showPredictionsDialog = false;

  // Bulk operation data
  bulkOperation = signal<'restock' | 'transfer' | 'update-settings' | 'delete'>('restock');
  bulkRestockQuantity = signal<number>(10);
  bulkRestockUnitCost = signal<number>(0);
  bulkRestockNotes = signal<string>('');
  bulkTransferStore = signal<string>('');
  bulkTransferNotes = signal<string>('');

  // Import data
  importFile: File | null = null;
  importInProgress = false;

  // Statistics data
  statistics: any = null;
  statisticsLoading = false;
  chartData: any;
  chartOptions: any;

  // Predictions data
  predictionDays = signal<number>(30);
  predictions: any[] = [];
  predictionsLoading = false;

  // Options
  statusOptions = [
    { label: 'En stock', value: StockStatus.IN_STOCK },
    { label: 'Stock faible', value: StockStatus.LOW_STOCK },
    { label: 'Rupture de stock', value: StockStatus.OUT_OF_STOCK },
    { label: 'Stock excédentaire', value: StockStatus.OVER_STOCK }
  ];

  alertOptions = [
    { label: 'Stock faible', value: 'low' },
    { label: 'Rupture de stock', value: 'out' },
    { label: 'Stock excédentaire', value: 'over' }
  ];

  bulkOptions = [
    { label: 'Réapprovisionner', value: 'restock', icon: 'pi pi-plus' },
    { label: 'Transférer', value: 'transfer', icon: 'pi pi-truck' },
    { label: 'Modifier paramètres', value: 'update-settings', icon: 'pi pi-cog' },
    { label: 'Supprimer', value: 'delete', icon: 'pi pi-trash' }
  ];



  stores = computed(() => {
    return this.storesService.items().map(store => ({
      label: store.name,
      value: store.storeId,
      ...store
    }));
  });

  // Skeleton configuration
  tableSkeletonColumns = [
    { width: '25%' },
    { width: '12%' },
    { width: '15%' },
    { width: '15%' },
    { width: '12%' },
    { width: '12%' },
    { width: '12%' },
    { width: '100px' }
  ];

  ngOnInit() {
    this.loadInventory();
    this.loadStores();
    this.initChart();
  }

  // Permission checks
  canManageInventory(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER]);
  }

  // Load stores
  loadStores() {
    this.storesService.loadStores(1, 100);
  }

  // UI Helpers
  getStockPercentage(item: any): number {
    if (!item.maxStock || item.maxStock === 0) return 0;
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
      default: return status;
    }
  }

  getStatusSeverity(status: StockStatus): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
    switch (status) {
      case StockStatus.IN_STOCK: return 'success';
      case StockStatus.LOW_STOCK: return 'warn';
      case StockStatus.OUT_OF_STOCK: return 'danger';
      case StockStatus.OVER_STOCK: return 'info';
      default: return 'info';
    }
  }

  // Theme methods
  setTheme(theme: Theme) {
    this.themeService.setTheme(theme);
  }

  setColorScheme(scheme: any) {
    this.themeService.setTheme(scheme);
  }

  // Event Handlers
  loadInventory() {
    const filters: any = {};

    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedStockStatus()) filters.stockStatus = this.selectedStockStatus();
    if (this.selectedStore()) filters.storeId = this.selectedStore()?.storeId;
    if (this.selectedAlertType()) {
      if (this.selectedAlertType() === 'low') filters.lowStock = true;
      if (this.selectedAlertType() === 'out') filters.outOfStock = true;
      if (this.selectedAlertType() === 'over') filters.overStock = true;
    }
    if (this.minQuantity() !== null && this.minQuantity()! > 0) filters.minQuantity = this.minQuantity();
    if (this.maxQuantity() !== null && this.maxQuantity()! > 0) filters.maxQuantity = this.maxQuantity();
    if (this.minValue() !== null && this.minValue()! > 0) filters.minValue = this.minValue();
    if (this.maxValue() !== null && this.maxValue()! > 0) filters.maxValue = this.maxValue();

    this.inventoryService.setFilters(filters);
  }

  onFilterChange() {
    this.inventoryService.setPage(1);
    this.loadInventory();
  }

  resetFilters() {
    this.searchTerm.set('');
    this.selectedStockStatus.set(null);
    this.selectedAlertType.set(null);
    this.selectedStore.set(null);
    this.minQuantity.set(null);
    this.maxQuantity.set(null);
    this.minValue.set(null);
    this.maxValue.set(null);
    this.inventoryService.setPage(1);
    this.loadInventory();
  }

  onLazyLoad(event: any) {
    const page = (event.first / event.rows) + 1;
    const rows = event.rows;

    if (this.pageSize() !== rows) {
      this.inventoryService.setPageSize(rows);
    } else if (this.inventoryService.page() !== page) {
      this.inventoryService.setPage(page);
    }

    this.loadInventory();
  }

  // Selection handling
  onRowSelect(item: any) {
    this.inventoryService.toggleItemSelection(item);
  }

  onSelectAll(event: any) {
    if (event.checked) {
      this.inventoryService.selectAllItems();
    } else {
      this.inventoryService.clearSelection();
    }
  }

  // Operations
  refresh() {
    this.inventoryService.loadInventory(
      this.inventoryService.page(),
      this.pageSize()
    );
  }

  viewItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId]);
  }

  editItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'edit']);
  }

  cloneItem(item: any) {
    // Implementation for cloning an inventory item
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Fonctionnalité de clonage à implémenter'
    });
  }

  restockItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'restock']);
  }

  quickRestock(item: any) {
    const quantity = prompt('Quantité à ajouter:', '10');
    if (quantity && !isNaN(Number(quantity))) {
      this.inventoryService.restock(item.inventoryId, Number(quantity), item.unitCost || 0).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Réapprovisionnement effectué'
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Erreur lors du réapprovisionnement'
          });
        }
      });
    }
  }

  transferItem(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'transfer']);
  }

  viewHistory(item: any) {
    this.router.navigate(['/inventory', item.inventoryId, 'history']);
  }

  // Delete item
  deleteItem(item: any) {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer cet article d\'inventaire ?',
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.inventoryService.deleteInventoryItem(item.inventoryId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Article supprimé avec succès'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de la suppression'
            });
          }
        });
      }
    });
  }

  // Bulk operations
  executeBulkOperation() {
    if (this.selectedItems().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Avertissement',
        detail: 'Veuillez sélectionner au moins un article'
      });
      return;
    }

    const operation: any = {
      inventoryIds: this.selectedItems().map(item => item.inventoryId),
      operation: this.bulkOperation()
    };

    if (this.bulkOperation() === 'restock') {
      operation.data = {
        quantity: this.bulkRestockQuantity(),
        unitCost: this.bulkRestockUnitCost(),
        notes: this.bulkRestockNotes()
      };
    } else if (this.bulkOperation() === 'transfer' && this.bulkTransferStore()) {
      operation.data = {
        targetStoreId: this.bulkTransferStore(),
        notes: this.bulkTransferNotes()
      };
    }

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir effectuer cette opération sur ${this.selectedItems().length} article(s) ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.inventoryService.bulkOperation(operation).subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `Opération effectuée: ${response.successCount} succès, ${response.failedCount} échecs`
            });
            this.showBulkOperationsDrawer = false;
            this.inventoryService.clearSelection();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de l\'opération en masse'
            });
          }
        });
      }
    });
  }

  // Import inventory
  onImportFileSelect(event: any) {
    this.importFile = event.files[0];
  }

  importInventory() {
    if (!this.importFile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Avertissement',
        detail: 'Veuillez sélectionner un fichier'
      });
      return;
    }

    this.importInProgress = true;
    this.inventoryService.importInventory(this.importFile).subscribe({
      next: (response) => {
        this.importInProgress = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `Import réussi: ${response.successCount} articles importés, ${response.failedCount} échecs`
        });
        this.showImportDialog = false;
        this.importFile = null;
        this.refresh();
      },
      error: () => {
        this.importInProgress = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de l\'import des articles'
        });
      }
    });
  }

  // Generate report
  generateReport(format: 'pdf' | 'csv' | 'excel' = 'pdf') {
    const filters: any = {};
    if (this.selectedStore()) filters.search = this.searchTerm();
    if (this.selectedStore()) filters.storeId = this.selectedStore()?.storeId;

    this.inventoryService.generateReport(this.selectedStore()?.storeId, format, filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport-inventaire-${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Rapport généré avec succès'
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la génération du rapport'
        });
      }
    });
  }

  // Export inventory
  exportInventory(format: 'csv' | 'excel' = 'csv') {
    const filters: any = {};
    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedStore()) filters.storeId = this.selectedStore()?.storeId;

    this.inventoryService.exportInventory(format, filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventaire-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Export terminé avec succès'
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de l\'export'
        });
      }
    });
  }

  // Load statistics
  loadStatistics() {
    this.statisticsLoading = true;
    const storeId = this.selectedStore()?.storeId;
    this.inventoryService.getStatistics(storeId).subscribe({
      next: (data) => {
        this.statistics = data;
        this.updateChartData();
        this.statisticsLoading = false;
        this.showStatisticsDrawer = true;
      },
      error: () => {
        this.statisticsLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du chargement des statistiques'
        });
      }
    });
  }

  // Load predictions
  loadPredictions() {
    this.predictionsLoading = true;
    this.inventoryService.getLowStockPredictions(this.predictionDays()).subscribe({
      next: (data) => {
        this.predictions = data;
        this.predictionsLoading = false;
        this.showPredictionsDialog = true;
      },
      error: () => {
        this.predictionsLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du chargement des prédictions'
        });
      }
    });
  }

  // Chart initialization
  initChart() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.chartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        },
        y: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        }
      }
    };
  }

  updateChartData() {
    if (!this.statistics) return;

    const documentStyle = getComputedStyle(document.documentElement);

    this.chartData = {
      labels: ['En stock', 'Stock faible', 'Rupture', 'Excédent'],
      datasets: [
        {
          label: 'Statut des stocks',
          backgroundColor: [
            documentStyle.getPropertyValue('--green-500'),
            documentStyle.getPropertyValue('--orange-500'),
            documentStyle.getPropertyValue('--red-500'),
            documentStyle.getPropertyValue('--blue-500')
          ],
          data: [
            this.statistics.inStockCount || 0,
            this.statistics.lowStockCount || 0,
            this.statistics.outOfStockCount || 0,
            this.statistics.overStockCount || 0
          ]
        }
      ]
    };
  }
}