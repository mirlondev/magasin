// products-list.component.ts - Updated
import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal, computed } from "@angular/core";
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
import { InputNumberModule } from "primeng/inputnumber";
import { TooltipModule } from "primeng/tooltip";
import { SkeletonModule } from "primeng/skeleton";
import { ToggleButtonModule } from "primeng/togglebutton";
import { CheckboxModule } from "primeng/checkbox";
import { FileUploadModule } from "primeng/fileupload";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { DrawerModule } from "primeng/drawer";

import { AuthService } from "../../core/services/auth.service";
import { ProductsService } from "../../core/services/products.service";
import { CategoriesService } from "../../core/services/categories.service";
import { ThemeService, Theme } from "../../core/services/theme.service";
import { Category, EmployeeRole, Product, ProductRequest } from "../../core/models";
import { XafPipe } from "../../core/pipes/xaf-currency-pipe";
import { TableSkeletonComponent, CardSkeletonComponent } from "../../shared/components/skeletons/skeleton-loader.component";
import { ColorScheme } from "@primeuix/themes/types";
import { FileSizePipe } from "../../core/pipes/file-size.pipe";

@Component({
  selector: 'app-products-list',
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
    BadgeModule,
    AvatarModule,
    InputNumberModule,
    TooltipModule,
    SkeletonModule,
    ToggleButtonModule,
    SelectModule,
    CheckboxModule,
    FileUploadModule,
    ProgressSpinnerModule,
    DrawerModule,
    XafPipe,
    TableSkeletonComponent,
    CardSkeletonComponent,
    FileSizePipe
  ],
  templateUrl: "./products-list.component.html",
  styleUrls: ["./products-list.component.css"]
})
export class ProductsListComponent implements OnInit {
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private router = inject(Router);

  // Signals from service
  products = computed(() => this.productsService.products());
  loading = computed(() => this.productsService.loading());
  bulkLoading = computed(() => this.productsService.bulkLoading());
  total = computed(() => this.productsService.total());
  pageSize = computed(() => this.productsService.pageSize());
  inStockProducts = computed(() => this.productsService.inStockProducts());
  outOfStockProducts = computed(() => this.productsService.outOfStockProducts());
  selectedProducts = computed(() => this.productsService.selectedProducts());

  // Theme signals
  currentTheme = this.themeService.currentTheme;
  currentColorScheme = this.themeService.currentTheme;
  isDarkMode = this.themeService.isDarkTheme;

  // Local signals
  searchTerm = signal('');
  selectedCategory = signal<string | null>(null);
  stockFilter = signal<string | null>(null);
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  showInactive = signal(false);

  showOutOfStockDialog = false;
  showBulkOperationsDialog = false;
  showImportDialog = false;
  showThemeSettings = false;
  showFiltersSidebar = false;
  importFile: File | null = null;
  importInProgress = false;

  // Bulk operation options
  bulkOperation = signal<'activate' | 'deactivate' | 'delete' | 'update-category'>('activate');
  newCategoryId = signal<string | null>(null);

  // Theme options
  themeOptions = [
    { label: 'Clair', value: 'light', icon: 'pi pi-sun' },
    { label: 'Sombre', value: 'dark', icon: 'pi pi-moon' },
    { label: 'Auto', value: 'auto', icon: 'pi pi-desktop' }
  ];

  colorSchemeOptions = [
    { label: 'Bleu', value: 'blue', color: '#3B82F6' },
    { label: 'Vert', value: 'green', color: '#10B981' },
    { label: 'Violet', value: 'purple', color: '#8B5CF6' },
    { label: 'Orange', value: 'orange', color: '#F59E0B' },
    { label: 'Indigo', value: 'indigo', color: '#6366F1' }
  ];

  categories = computed(() => {
    return this.categoriesService.categories().map(cat => ({
      label: cat.name,
      value: cat.categoryId,
      ...cat
    }));
  });

  // Options
  stockOptions = [
    { label: 'En stock', value: 'in_stock' },
    { label: 'Rupture de stock', value: 'out_of_stock' },
    { label: 'Tous', value: 'all' }
  ];

  bulkOptions = [
    { label: 'Activer', value: 'activate', icon: 'pi pi-check' },
    { label: 'Désactiver', value: 'deactivate', icon: 'pi pi-ban' },
    { label: 'Supprimer', value: 'delete', icon: 'pi pi-trash' },
    { label: 'Changer catégorie', value: 'update-category', icon: 'pi pi-tags' }
  ];

  // Skeleton configuration
  tableSkeletonColumns = [
    { width: '60px' },
    { width: '30%' },
    { width: '15%' },
    { width: '12%' },
    { width: '12%' },
    { width: '10%' },
    { width: '15%' },
    { width: '12%' },
    { width: '120px' }
  ];

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  // Permission checks
  canManageProducts(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN, EmployeeRole.DEPOT_MANAGER]);
  }

  // Load categories
  loadCategories() {
    this.categoriesService.loadCategories(1, 100);
  }

  totalValue(): number {
    return this.products().reduce((sum: number, p: any) => sum + (p.price * (p.quantity || 0)), 0);
  }

  // UI Helpers
  getCategoryName(category: Category): string {
    return category ? category.name : 'Non catégorisé';
  }

  getStockStatus(product: any): string {
    if (!product.quantity || product.quantity <= 0) return 'Rupture';
    if (product.minStock && product.quantity <= product.minStock) return 'Stock faible';
    if (product.maxStock && product.quantity > product.maxStock) return 'Excédent';
    return 'En stock';
  }

  getStockSeverity(product: any): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
    if (!product.quantity || product.quantity <= 0) return 'danger';
    if (product.minStock && product.quantity <= product.minStock) return 'warn';
    if (product.maxStock && product.quantity > product.maxStock) return 'info';
    return 'success';
  }

  getStockPercentage(product: any): number {
    if (!product.maxStock || product.maxStock === 0) return 0;
    return Math.min(((product.quantity || 0) / product.maxStock) * 100, 100);
  }

  getProgressBarClass(product: any): string {
    if (!product.quantity || product.quantity <= 0) return 'p-progressbar-danger';
    if (product.minStock && product.quantity <= product.minStock) return 'p-progressbar-warning';
    if (product.maxStock && product.quantity > product.maxStock) return 'p-progressbar-help';
    return 'p-progressbar-success';
  }

  // Theme methods
  setTheme(theme: string) {
    if (theme === 'auto') {
      this.themeService.setAutoTheme(true);
    } else {
      this.themeService.setAutoTheme(false);
      this.themeService.setTheme(theme as Theme);
    }
  }

  setColorScheme(scheme: any) {
    this.themeService.currentTheme.set(scheme);
  }

  // Event Handlers
  loadProducts() {
    const filters: any = {};

    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedCategory()) filters.categoryId = this.selectedCategory();
    if (this.stockFilter() === 'in_stock') filters.inStock = true;
    if (this.stockFilter() === 'out_of_stock') filters.inStock = false;
    if (this.minPrice() !== null && this.minPrice()! > 0) filters.minPrice = this.minPrice();
    if (this.maxPrice() !== null && this.maxPrice()! > 0) filters.maxPrice = this.maxPrice();
    if (this.showInactive()) filters.isActive = false;

    this.productsService.loadProducts(
      this.productsService.page(),
      this.pageSize(),
      filters
    );
  }

  onFilterChange() {
    this.productsService.setPage(1);
    this.loadProducts();
  }

  resetFilters() {
    this.searchTerm.set('');
    this.selectedCategory.set(null);
    this.stockFilter.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.showInactive.set(false);
    this.productsService.setPage(1);
    this.loadProducts();
  }

  onLazyLoad(event: any) {
    const page = (event.first / event.rows) + 1;
    const rows = event.rows;

    if (this.pageSize() !== rows) {
      this.productsService.setPageSize(rows);
    } else if (this.productsService.page() !== page) {
      this.productsService.setPage(page);
    }

    this.loadProducts();
  }

  // Selection handling
  onRowSelect(product: any) {
    this.productsService.toggleProductSelection(product);
  }

  onSelectAll(event: any) {
    if (event.checked) {
      this.productsService.selectAllProducts();
    } else {
      this.productsService.clearSelection();
    }
  }

  // Operations
  refresh() {
    this.productsService.loadProducts(
      this.productsService.page(),
      this.pageSize()
    );
  }

  viewProduct(product: any) {
    this.router.navigate(['/products/', product.productId]);
  }

  editProduct(product: any) {
    this.router.navigate(['/products/', product.productId, 'edit']);
  }

  cloneProduct(product: any) {
    this.productsService.cloneProduct(product.productId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Produit cloné avec succès'
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors du clonage du produit'
        });
      }
    });
  }

  manageStock(product: any) {
    this.router.navigate(['/products/', product.productId, 'stock']);
  }

  // Delete product
  deleteProduct(product: any) {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.',
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.productsService.deleteProduct(product.productId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Produit supprimé avec succès'
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de la suppression du produit'
            });
          }
        });
      }
    });
  }

  // Toggle product status
  toggleProductStatus(product: ProductRequest) {
    const newStatus = !product.isActive;
    const action = newStatus ? 'activer' : 'désactiver';

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir ${action} ce produit ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.productsService.updateProduct(product.productId, { ...product, isActive: newStatus }).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `Produit ${action} avec succès`
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: `Erreur lors de la ${action} du produit`
            });
          }
        });
      }
    });
  }

  // Bulk operations
  executeBulkOperation() {
    if (this.selectedProducts.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Avertissement',
        detail: 'Veuillez sélectionner au moins un produit'
      });
      return;
    }

    const operation: any = {
      productIds: this.selectedProducts().map(p => p.productId),
      operation: this.bulkOperation()
    };

    if (this.bulkOperation() === 'update-category' && this.newCategoryId()) {
      operation.data = { categoryId: this.newCategoryId() };
    }

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir effectuer cette opération sur ${this.selectedProducts.length} produit(s) ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.productsService.bulkOperation(operation).subscribe({
          next: (response) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `Opération effectuée: ${response.successCount} succès, ${response.failedCount} échecs`
            });
            this.showBulkOperationsDialog = false;
            this.productsService.clearSelection();
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

  // Import products
  onImportFileSelect(event: any) {
    this.importFile = event.files[0];
  }

  importProducts() {
    if (!this.importFile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Avertissement',
        detail: 'Veuillez sélectionner un fichier'
      });
      return;
    }

    this.importInProgress = true;
    this.productsService.importProducts(this.importFile).subscribe({
      next: (response) => {
        this.importInProgress = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `Import réussi: ${response.successCount} produits importés, ${response.failedCount} échecs`
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
          detail: 'Erreur lors de l\'import des produits'
        });
      }
    });
  }

  // Generate report
  generateReport(format: 'csv' | 'excel' | 'pdf' = 'csv') {
    const filters: any = {};
    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedCategory()) filters.categoryId = this.selectedCategory();

    this.productsService.exportProducts(format, filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `produits-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : format === 'excel' ? 'xlsx' : 'pdf'}`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Export terminé avec succès'
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de l\'export des produits'
        });
      }
    });
  }

  // Quick actions
  quickRestock(product: any) {
    this.router.navigate(['/products', product.productId, 'restock']);
  }

  viewHistory(product: any) {
    this.router.navigate(['/products', product.productId, 'history']);
  }
}