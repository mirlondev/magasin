// inventory-form.component.ts - Create/Edit Inventory Item
import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { SelectModule } from "primeng/select";
import { CheckboxModule } from "primeng/checkbox";
import { ToastModule } from "primeng/toast";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { DividerModule } from "primeng/divider";
import { TooltipModule } from "primeng/tooltip";
import { SkeletonModule } from "primeng/skeleton";
import { BadgeModule } from "primeng/badge";
import { AutoCompleteModule } from "primeng/autocomplete";

import { InventoryService } from "../../../core/services/inventory.service";
import { ProductsService } from "../../../core/services/products.service";
import { StoresService } from "../../../core/services/stores.service";
import { AuthService } from "../../../core/services/auth.service";
import { Inventory, Product, Store, EmployeeRole, StockStatus } from "../../../core/models";
import { XafPipe } from "../../../core/pipes/xaf-currency-pipe";
import { TextareaModule } from "primeng/textarea";
import { TagModule } from "primeng/tag";

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    CheckboxModule,
    ToastModule,
    ProgressSpinnerModule,
    DividerModule,
    TooltipModule,
    SkeletonModule,
    BadgeModule,
    AutoCompleteModule,
    XafPipe,
    TagModule
],
  template: `
    <div class="p-4 max-w-7xl mx-auto">
      <p-toast />
      
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ isEditMode() ? 'Modifier l\'Article d\'Inventaire' : 'Nouvel Article d\'Inventaire' }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            {{ isEditMode() ? 'Mettez à jour les paramètres de stock' : 'Créez un nouvel article d\'inventaire' }}
          </p>
        </div>
        <button pButton 
                icon="pi pi-arrow-left" 
                label="Retour à la liste"
                class="p-button-outlined"
                [routerLink]="['/inventory']">
        </button>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            @for (i of [1,2]; track i) {
              <p-skeleton height="250px" />
            }
          </div>
          <div class="space-y-6">
            @for (i of [1,2]; track i) {
              <p-skeleton height="200px" />
            }
          </div>
        </div>
      } @else {
        <form [formGroup]="inventoryForm" (ngSubmit)="onSubmit()">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Main Information -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Product Selection Card -->
              @if (!isEditMode()) {
                <p-card header="Sélection du Produit">
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium mb-2">Produit <span class="text-red-500">*</span></label>
                      <p-autoComplete formControlName="productId"
                                      [suggestions]="filteredProducts()"
                                      (completeMethod)="searchProducts($event)"
                                      field="name"
                                      placeholder="Rechercher un produit..."
                                      [dropdown]="true"
                                      [forceSelection]="true"
                                      class="w-full"
                                      [ngClass]="{'ng-invalid ng-dirty': inventoryForm.get('productId')?.invalid && inventoryForm.get('productId')?.touched}">
                        <ng-template let-product pTemplate="item">
                          <div class="flex items-center">
                            @if (product.imageUrl) {
                              <img [src]="product.imageUrl" class="w-8 h-8 rounded object-cover mr-2" />
                            }
                            <div>
                              <div class="font-medium">{{ product.name }}</div>
                              <div class="text-sm text-gray-500">SKU: {{ product.sku }}</div>
                            </div>
                          </div>
                        </ng-template>
                      </p-autoComplete>
                      @if (inventoryForm.get('productId')?.invalid && inventoryForm.get('productId')?.touched) {
                        <small class="text-red-500">Produit requis</small>
                      }
                    </div>

                    <div>
                      <label class="block text-sm font-medium mb-2">Magasin <span class="text-red-500">*</span></label>
                      <p-select [options]="stores()"
                                formControlName="storeId"
                                placeholder="Sélectionner un magasin"
                                optionLabel="name"
                                optionValue="storeId"
                                class="w-full"
                                [ngClass]="{'ng-invalid ng-dirty': inventoryForm.get('storeId')?.invalid && inventoryForm.get('storeId')?.touched}">
                      </p-select>
                      @if (inventoryForm.get('storeId')?.invalid && inventoryForm.get('storeId')?.touched) {
                        <small class="text-red-500">Magasin requis</small>
                      }
                    </div>
                  </div>
                </p-card>
              } @else {
                <p-card header="Informations Produit">
                  <div class="flex items-center gap-4">
                    @if (selectedProduct()?.imageUrl) {
                      <img [src]="selectedProduct()?.imageUrl" 
                           [alt]="selectedProduct()?.name"
                           class="w-20 h-20 rounded-lg object-cover" />
                    } @else {
                      <div class="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <i class="pi pi-image text-3xl text-gray-400"></i>
                      </div>
                    }
                    <div>
                      <h3 class="text-xl font-bold">{{ selectedProduct()?.name }}</h3>
                      <p class="text-gray-500">SKU: {{ selectedProduct()?.sku }}</p>
                      <p-tag [value]="selectedStore()?.name" severity="info" class="mt-2" />
                    </div>
                  </div>
                </p-card>
              }

              <!-- Stock Settings Card -->
              <p-card header="Paramètres de Stock">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium mb-2">Quantité initiale <span class="text-red-500">*</span></label>
                    <p-inputNumber formControlName="quantity"
                                   [min]="0"
                                   [showButtons]="true"
                                   buttonLayout="horizontal"
                                   spinnerMode="horizontal"
                                   decrementButtonClass="p-button-danger"
                                   incrementButtonClass="p-button-success"
                                   incrementButtonIcon="pi pi-plus"
                                   decrementButtonIcon="pi pi-minus"
                                   class="w-full">
                    </p-inputNumber>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">Coût unitaire (€)</label>
                    <p-inputNumber formControlName="unitCost"
                                   mode="currency"
                                   currency="EUR"
                                   locale="fr-FR"
                                   [minFractionDigits]="2"
                                   placeholder="0.00"
                                   class="w-full">
                    </p-inputNumber>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">Prix de vente (€)</label>
                    <p-inputNumber formControlName="sellingPrice"
                                   mode="currency"
                                   currency="EUR"
                                   locale="fr-FR"
                                   [minFractionDigits]="2"
                                   placeholder="0.00"
                                   class="w-full">
                    </p-inputNumber>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">Point de réapprovisionnement</label>
                    <p-inputNumber formControlName="reorderPoint"
                                   [min]="0"
                                   [showButtons]="true"
                                   buttonLayout="horizontal"
                                   spinnerMode="horizontal"
                                   class="w-full">
                    </p-inputNumber>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">Stock minimum <span class="text-red-500">*</span></label>
                    <p-inputNumber formControlName="minStock"
                                   [min]="0"
                                   [showButtons]="true"
                                   buttonLayout="horizontal"
                                   spinnerMode="horizontal"
                                   class="w-full">
                    </p-inputNumber>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">Stock maximum</label>
                    <p-inputNumber formControlName="maxStock"
                                   [min]="0"
                                   [showButtons]="true"
                                   buttonLayout="horizontal"
                                   spinnerMode="horizontal"
                                   class="w-full">
                    </p-inputNumber>
                  </div>
                </div>

                <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div class="flex items-start gap-3">
                    <i class="pi pi-info-circle text-blue-500 mt-0.5"></i>
                    <div class="text-sm text-blue-700 dark:text-blue-300">
                      <p class="font-medium mb-1">Configuration des alertes</p>
                      <ul class="list-disc pl-4 space-y-1">
                        <li>Stock minimum: alerte de stock faible</li>
                        <li>Point de réapprovisionnement: suggestion d'achat</li>
                        <li>Stock maximum: alerte d'excédent</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </p-card>

              <!-- Notes Card -->
              <p-card header="Notes">
                <textarea pInputTextarea 
                          formControlName="notes"
                          rows="4"
                          placeholder="Notes internes sur cet article d'inventaire..."
                          class="w-full"></textarea>
              </p-card>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
              <!-- Status Card -->
              <p-card header="Statut">
                <div class="space-y-4">
                  <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div class="flex items-center gap-3">
                      <i class="pi pi-check-circle text-green-500 text-xl"></i>
                      <div>
                        <div class="font-medium">Actif</div>
                        <div class="text-sm text-gray-500">Disponible pour la vente</div>
                      </div>
                    </div>
                    <p-checkbox formControlName="isActive" [binary]="true"></p-checkbox>
                  </div>

                  @if (isEditMode() && inventoryItem()) {
                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div class="flex items-center gap-3">
                        <i class="pi pi-box text-blue-500 text-xl"></i>
                        <div>
                          <div class="font-medium">Statut actuel</div>
                          <div class="text-sm text-gray-500">{{ getStockStatusLabel(inventoryItem()?.stockStatus) }}</div>
                        </div>
                      </div>
                      <p-tag [value]="getStockStatusLabel(inventoryItem()?.stockStatus)"
                             [severity]="getStockStatusSeverity(inventoryItem()?.stockStatus)">
                      </p-tag>
                    </div>

                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div class="flex items-center gap-3">
                        <i class="pi pi-euro text-green-500 text-xl"></i>
                        <div>
                          <div class="font-medium">Valeur totale</div>
                          <div class="text-sm text-gray-500">{{ inventoryItem()?.totalValue | xaf }}</div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </p-card>

              <!-- Summary Card (Edit Mode) -->
              @if (isEditMode() && inventoryItem()) {
                <p-card header="Résumé">
                  <div class="space-y-3 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-500">Dernière mise à jour</span>
                      <span>{{ inventoryItem()?.updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">Créé le</span>
                      <span>{{ inventoryItem()?.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">Dernier réapprovisionnement</span>
                      <span>{{ inventoryItem()?.lastRestocked | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </div>
                </p-card>
              }

              <!-- Actions Card -->
              <p-card>
                <div class="space-y-3">
                  <button pButton 
                          type="submit"
                          [label]="isEditMode() ? 'Mettre à jour' : 'Créer article'"
                          icon="pi pi-check"
                          class="p-button-success w-full"
                          [loading]="saving()"
                          [disabled]="inventoryForm.invalid || saving()">
                  </button>
                  
                  <button pButton 
                          type="button"
                          label="Annuler"
                          icon="pi pi-times"
                          class="p-button-outlined w-full"
                          [routerLink]="['/inventory']">
                  </button>

                  @if (isEditMode() && canDelete()) {
                    <p-divider />
                    
                    <button pButton 
                            type="button"
                            label="Supprimer l'article"
                            icon="pi pi-trash"
                            class="p-button-danger w-full"
                            (click)="confirmDelete()">
                    </button>
                  }
                </div>
              </p-card>
            </div>
          </div>
        </form>
      }
    </div>
  `
})
export class InventoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private productsService = inject(ProductsService);
  private storesService = inject(StoresService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);

  inventoryForm!: FormGroup;
  
  // Signals
  isEditMode = signal(false);
  inventoryId = signal<string | null>(null);
  inventoryItem = signal<Inventory | null>(null);
  loading = signal(false);
  saving = signal(false);
  
  filteredProducts = signal<Product[]>([]);
  selectedProduct = signal<Product | null>(null);
  selectedStore = signal<Store | null>(null);
  
  stores = signal<Store[]>([]);

  ngOnInit() {
    this.initForm();
    this.loadStores();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.inventoryId.set(id);
      this.loadInventoryItem(id);
    }
  }

  initForm() {
    this.inventoryForm = this.fb.group({
      productId: ['', Validators.required],
      storeId: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      unitCost: [null],
      sellingPrice: [null],
      minStock: [10, [Validators.required, Validators.min(0)]],
      maxStock: [1000],
      reorderPoint: [20],
      notes: [''],
      isActive: [true]
    });

    // Disable product and store in edit mode
    if (this.isEditMode()) {
      this.inventoryForm.get('productId')?.disable();
      this.inventoryForm.get('storeId')?.disable();
    }
  }

  loadStores() {
    this.storesService.loadStores(1, 100).subscribe({
      next: (response) => {
        this.stores.set(response.items || []);
      }
    });
  }

  loadInventoryItem(id: string) {
    this.loading.set(true);
    this.inventoryService.getInventoryItemById(id).subscribe({
      next: (item) => {
        this.inventoryItem.set(item);
        this.inventoryForm.patchValue({
          quantity: item.quantity,
          unitCost: item.unitCost,
          sellingPrice: item.sellingPrice,
          minStock: item.minStock,
          maxStock: item.maxStock,
          reorderPoint: item.reorderPoint,
          notes: item.notes,
          isActive: item.isActive
        });
        
        // Load product and store details
        this.selectedProduct.set({
          productId: item.productId,
          name: item.productName,
          sku: item.productSku,
          imageUrl: item.productImageUrl
        } as Product);
        
        this.selectedStore.set({
          storeId: item.storeId,
          name: item.storeName
        } as Store);
        
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/inventory']);
      }
    });
  }

  searchProducts(event: any) {
    const query = event.query;
    this.productsService.searchProducts(query).subscribe({
      next: (products) => {
        this.filteredProducts.set(products);
      }
    });
  }

  onSubmit() {
    if (this.inventoryForm.invalid) {
      this.markFormGroupTouched(this.inventoryForm);
      return;
    }

    this.saving.set(true);
    const formData = this.inventoryForm.getRawValue();

    const operation = this.isEditMode() 
      ? this.inventoryService.updateInventoryItem(this.inventoryId()!, formData)
      : this.inventoryService.createInventoryItem(formData);

    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: this.isEditMode() ? 'Article mis à jour avec succès' : 'Article créé avec succès'
        });
        this.router.navigate(['/inventory']);
      },
      error: (error) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: this.isEditMode() ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'
        });
      }
    });
  }

  confirmDelete() {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article d\'inventaire ?')) {
      this.inventoryService.deleteInventoryItem(this.inventoryId()!).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Article supprimé avec succès'
          });
          this.router.navigate(['/inventory']);
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
  }

  getStockStatusLabel(status?: StockStatus): string {
    switch (status) {
      case StockStatus.IN_STOCK: return 'En stock';
      case StockStatus.LOW_STOCK: return 'Stock faible';
      case StockStatus.OUT_OF_STOCK: return 'Rupture';
      case StockStatus.OVER_STOCK: return 'Excédent';
      default: return 'Inconnu';
    }
  }

  getStockStatusSeverity(status?: StockStatus): any {
    switch (status) {
      case StockStatus.IN_STOCK: return 'success';
      case StockStatus.LOW_STOCK: return 'warn';
      case StockStatus.OUT_OF_STOCK: return 'danger';
      case StockStatus.OVER_STOCK: return 'info';
      default: return 'info';
    }
  }

  canDelete(): boolean {
    return this.authService.hasRole([EmployeeRole.ADMIN, EmployeeRole.STORE_ADMIN]);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}