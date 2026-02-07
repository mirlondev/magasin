import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ConfirmationService, MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { BadgeModule } from "primeng/badge";
import { TreeTableModule } from "primeng/treetable";
import { TooltipModule } from "primeng/tooltip";
import { AuthService } from "../../../core/services/auth.service";
import { CategoriesService } from "../../../core/services/categories.service";
import { EmployeeRole } from "../../../core/models";
import { Select } from "primeng/select";

@Component({
  selector: 'app-categories-list',
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
    BadgeModule,
    TreeTableModule,
    Select,
    TooltipModule
],
  templateUrl: "./categories-list.html",
  styleUrl: "./categories-list.css"
})
export class CategoriesListComponent implements OnInit {
  private categoriesService = inject(CategoriesService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals from service
  categories = this.categoriesService.categories;
  loading = this.categoriesService.loading;
  total = this.categoriesService.total;
  pageSize = this.categoriesService.pageSize;
  activeCategories = this.categoriesService.activeCategories;
  mainCategories = this.categoriesService.mainCategories;

  // Local signals
  searchTerm = '';
  statusFilter: string | null = null;
  viewMode: 'table' | 'tree' = 'table';
  expandedRows = signal<any>({});

  // Options
  statusOptions = [
    { label: 'Actif', value: 'active' },
    { label: 'Inactif', value: 'inactive' },
    { label: 'Tous', value: 'all' }
  ];

  ngOnInit() {
    this.loadCategories();
  }

  // Permission checks
  canManageCategories(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]);
  }

  // UI Helpers
  getParentCategoryName(parentId: string): string {
    if (!parentId) return '-';
    const parent = this.categories().find(c => c.categoryId === parentId);
    return parent ? parent.name : 'Inconnue';
  }

  getStatusSeverity(isActive: boolean): 'success' | 'danger' | 'secondary' {
    return isActive ? 'success' : 'danger';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Actif' : 'Inactif';
  }

  getProductCount(category: any): number {
    return category.productCount || 0;
  }

  // Event Handlers
  loadCategories() {
    const filters: any = {};
    
    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.statusFilter === 'active') filters.isActive = true;
    if (this.statusFilter === 'inactive') filters.isActive = false;

    this.categoriesService.loadCategories(
      this.categoriesService.page(),
      this.pageSize(),
      filters
    );
  }

  onFilterChange() {
    this.categoriesService.setPage(1);
    this.loadCategories();
  }

  resetFilters() {
    this.searchTerm = '';
    this.statusFilter = null;
    this.categoriesService.setPage(1);
    this.loadCategories();
  }

  onLazyLoad(event: any) {
    const page = (event.first / event.rows) + 1;
    const rows = event.rows;

    if (this.pageSize() !== rows) {
      this.categoriesService.setPageSize(rows);
    } else if (this.categoriesService.page() !== page) {
      this.categoriesService.setPage(page);
    }
    
    this.loadCategories();
  }

  // Operations
  refresh() {
    this.categoriesService.loadCategories(
      this.categoriesService.page(),
      this.pageSize()
    );
  }

  viewCategory(category: any) {
    this.router.navigate(['/categories', category.categoryId]);
  }

  editCategory(category: any) {
    this.router.navigate(['/categories', category.categoryId, 'edit']);
  }

  // Toggle category status
  toggleCategoryStatus(category: any) {
    const newStatus = !category.isActive;
    const action = newStatus ? 'activer' : 'désactiver';
    
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir ${action} cette catégorie ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.categoriesService.updateCategoryStatus(category.categoryId, newStatus).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `Catégorie ${action} avec succès`
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: `Erreur lors de la ${action} de la catégorie`
            });
          }
        });
      }
    });
  }

  // Delete category
  deleteCategory(category: any) {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer cette catégorie ? Les sous-catégories et produits associés seront affectés.',
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.categoriesService.deleteCategory(category.categoryId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Catégorie supprimée avec succès'
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Erreur lors de la suppression de la catégorie'
            });
          }
        });
      }
    });
  }

  // Tree view helpers
  getTreeTableData(): any[] {
    const mainCats = this.mainCategories();
    return mainCats.map(category => this.buildTreeNode(category));
  }

  buildTreeNode(category: any): any {
    return {
      data: {
        name: category.name,
        description: category.description,
        isActive: category.isActive,
        productCount: category.productCount,
        categoryId: category.categoryId
      },
      children: category.children ? category.children.map((child: any) => this.buildTreeNode(child)) : []
    };
  }
}