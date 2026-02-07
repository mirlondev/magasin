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
import { AuthService } from "../../core/services/auth.service";
import { ProductsService } from "../../core/services/products.service";
import { CategoriesService } from "../../core/services/categories.service";
import { Category, EmployeeRole } from "../../core/models";

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
    SelectModule,
    BadgeModule,
    AvatarModule,
    InputNumberModule,
    TooltipModule
  ],
  templateUrl: "./products-list.component.html",
  styleUrl: "./products-list.component.css"
})
export class ProductsListComponent implements OnInit {
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals from service
  products = this.productsService.products;
  loading = this.productsService.loading;
  total = this.productsService.total;
  pageSize = this.productsService.pageSize;
  inStockProducts = this.productsService.inStockProducts;
  outOfStockProducts = this.productsService.outOfStockProducts;

  // Local signals
  searchTerm = '';
  selectedCategory: string | null = null;
  stockFilter: string | null = null;
  minPrice: number | null = null;
  maxPrice: number | null = null;

  showOutOfStockDialog = false;
  selectedProduct: any = null;
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
    return this.products().reduce((sum, p) => sum + (p.price * p.quantity), 0);
  }
  // UI Helpers
  getCategoryName(category: Category): string {
    return category ? category.name : 'Non catégorisé';
  }

  getStockStatus(product: any): string {
    if (product.quantity <= 0) return 'Rupture';
    if (product.quantity <= product.minStock) return 'Stock faible';
    if (product.quantity > product.maxStock) return 'Excédent';
    return 'En stock';
  }

  getStockSeverity(product: any): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
    if (product.quantity <= 0) return 'danger';
    if (product.quantity <= product.minStock) return 'warn';
    if (product.quantity > product.maxStock) return 'info';
    return 'success';
  }

  getStockPercentage(product: any): number {
    if (product.maxStock === 0) return 0;
    return Math.min((product.quantity / product.maxStock) * 100, 100);
  }

  getProgressBarClass(product: any): string {
    if (product.quantity <= 0) return 'p-progressbar-danger';
    if (product.quantity <= product.minStock) return 'p-progressbar-warning';
    if (product.quantity > product.maxStock) return 'p-progressbar-help';
    return 'p-progressbar-success';
  }

  // Event Handlers
  loadProducts() {
    const filters: any = {};
    
    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.selectedCategory) filters.categoryId = this.selectedCategory;
    if (this.stockFilter === 'in_stock') filters.inStock = true;
    if (this.stockFilter === 'out_of_stock') filters.inStock = false;
    if (this.minPrice !== null && this.minPrice > 0) filters.minPrice = this.minPrice;
    if (this.maxPrice !== null && this.maxPrice > 0) filters.maxPrice = this.maxPrice;

    this.productsService.loadProducts(
      this.productsService.page(),
      this.pageSize(),
      filters
    );
  }
  getLadedProducts(){
    return this.loadProducts();
  }

  onFilterChange() {
    this.productsService.setPage(1);
    this.loadProducts();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedCategory = null;
    this.stockFilter = null;
    this.minPrice = null;
    this.maxPrice = null;
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

  // Operations
  refresh() {
    this.productsService.loadProducts(
      this.productsService.page(),
      this.pageSize()
    );
  }

  viewProduct(product: any) {
    this.router.navigate(['/products', product.productId]);
  }

  editProduct(product: any) {
    this.router.navigate(['/products', product.productId, 'edit']);
  }

  // Manage stock
  manageStock(product: any) {
    this.router.navigate(['/products', product.productId, 'stock']);
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
  toggleProductStatus(product: any) {
    const newStatus = !product.isActive;
    const action = newStatus ? 'activer' : 'désactiver';
    
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir ${action} ce produit ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.productsService.updateProduct(product.productId, { isActive: newStatus }).subscribe({
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

  // Generate report
  generateReport(format: 'csv' | 'excel' = 'csv') {
    this.productsService.exportProducts(format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `produits-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
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
}