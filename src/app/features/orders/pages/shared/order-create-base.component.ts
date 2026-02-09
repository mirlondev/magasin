import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { PaginatorModule } from 'primeng/paginator';

import { 
  Product, 
  Customer, 
  PaymentMethod,
  ShiftStatus,
  EmployeeRole 
} from '../../../../core/models';

import { OrderStateService } from '../../services/order-state.service';
import { getStockLabel as getStockLabelUtil, getStockSeverity as getStockSeverityUtil } from '../../../../core/utils/status-ui.utils';
import { AuthService } from '../../../../core/services/auth.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { CustomersService } from '../../../../core/services/customers.service';
import { ProductsService } from '../../../../core/services/products.service';
import { ShiftReportsService } from '../../../../core/services/shift-reports.service';

@Component({
  selector: 'app-order-create-base',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
    ToolbarModule,
    PaginatorModule

],
  template: `
    <!-- Template minimal à étendre -->
    <div class="p-4">
      <!-- Toolbar avec boutons navigation -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
          <button pButton 
                  icon="pi pi-arrow-left" 
                  class="p-button-text"
                  (click)="goBack()">
          </button>
          <h1 class="text-2xl font-bold">{{ pageTitle() }}</h1>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Informations session caisse -->
          <!-- Informations utilisateur -->
        </div>
      </div>

      <!-- Contenu spécifique à implémenter dans les sous-classes -->
      <ng-content></ng-content>
    </div>
  `
})
export class OrderCreateBaseComponent implements OnInit {
  // Services
  protected productsService = inject(ProductsService);
  protected categoriesService = inject(CategoriesService);
  protected customersService = inject(CustomersService);
  protected authService = inject(AuthService);
  protected shiftReportsService = inject(ShiftReportsService);
  protected orderState = inject(OrderStateService);
  protected messageService = inject(MessageService);
  protected router = inject(Router);

  // État
  loading = signal(false);
  showCustomerDialog = signal(false);
  currentShift = this.shiftReportsService.selectedShiftReport;
  
  // Filtres produits
  searchTerm = signal('');
  selectedCategoryId = signal<string>('all');
  
  // Signaux computed
  categoryOptions = computed(() => {
    const categories = this.categoriesService.activeCategories();
    return [
      { label: 'Toutes les catégories', value: 'all' },
      ...categories.map(cat => ({
        label: cat.name,
        value: cat.categoryId
      }))
    ];
  });

  // Méthodes à implémenter dans les sous-classes
  pageTitle(): string { return ''; }
  canProcess(): boolean { return false; }
  processOrder(): void { }

  ngOnInit() {
    this.loadInitialData();
  }

  protected loadInitialData() {
    this.loadProducts();
    this.loadCategories();
    this.loadCurrentShift();
  }

  protected loadProducts() {
    const filters: any = {};
    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedCategoryId() !== 'all') {
      filters.categoryId = this.selectedCategoryId();
    }

    this.productsService.loadProducts(
      this.productsService.page(),
      this.productsService.pageSize(),
      filters
    );
  }

  protected loadCategories() {
    this.categoriesService.loadCategories(1, 100);
  }

  protected loadCurrentShift() {
    this.shiftReportsService.getCurrentShift().subscribe();
  }

  protected refreshData() {
    this.loadProducts();
    this.loadCategories();
    this.loadCurrentShift();
    
    this.messageService.add({
      severity: 'info',
      summary: 'Actualisation',
      detail: 'Données actualisées',
      life: 2000
    });
  }

  // Gestion du panier
  addToCart(product: Product) {
    if (!this.canAddToCart()) {
      this.showCannotAddToCartMessage();
      return;
    }

    this.orderState.addItem(product, 1);
    this.showAddToCartSuccessMessage(product);
  }

  protected canAddToCart(): boolean {
    return true; // À surcharger si besoin
  }

  protected showCannotAddToCartMessage() {
    this.messageService.add({ 
      severity: 'warn', 
      summary: 'Action impossible', 
      detail: 'Impossible d\'ajouter au panier' 
    });
  }

  protected showAddToCartSuccessMessage(product: Product) {
    this.messageService.add({ 
      severity: 'success', 
      summary: 'Produit ajouté', 
      detail: `${product.name} ajouté au panier`,
      life: 1000 
    });
  }

  // Navigation
  goBack() {
    this.orderState.clear();
    this.router.navigate(['/orders']);
  }

  // Gestion client
  selectCustomer(customer: Customer) {
    this.orderState.setCustomer(customer);
    this.showCustomerDialog.set(false);
    
    this.messageService.add({ 
      severity: 'info', 
      summary: 'Client sélectionné', 
      detail: customer.fullName 
    });
  }

  removeCustomer() {
    this.orderState.setCustomer(null);
  }

  // Utilitaires UI
  getProductImage(product: Product): string {
    return product?.imageUrl || '';
  }

  getStockSeverity(product: Product) {
    return getStockSeverityUtil(product);
  }

  getStockLabel(product: Product): string {
    return getStockLabelUtil(product);
  }
}