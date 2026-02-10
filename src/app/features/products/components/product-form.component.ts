// product-form.component.ts - Create/Edit Product
import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { CheckboxModule } from "primeng/checkbox";
import { ToastModule } from "primeng/toast";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { FileUploadModule } from "primeng/fileupload";
import { ImageModule } from "primeng/image";
import { DividerModule } from "primeng/divider";
import { TooltipModule } from "primeng/tooltip";
import { SkeletonModule } from "primeng/skeleton";
import { Product, Category, EmployeeRole } from "../../../core/models";
import { AuthService } from "../../../core/services/auth.service";
import { CategoriesService } from "../../../core/services/categories.service";
import { ProductsService } from "../../../core/services/products.service";
import { Tag } from "primeng/tag";



@Component({
  selector: 'app-product-form',
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
    FileUploadModule,
    ImageModule,
    DividerModule,
    TooltipModule,
    SkeletonModule,
    Tag
],
  template: `
    <div class="p-4 max-w-7xl mx-auto">
      <p-toast />
      
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ isEditMode() ? 'Modifier le Produit' : 'Nouveau Produit' }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            {{ isEditMode() ? 'Mettez à jour les informations du produit' : 'Créez un nouveau produit pour votre inventaire' }}
          </p>
        </div>
        <button pButton 
                icon="pi pi-arrow-left" 
                label="Retour à la liste"
                class="p-button-outlined"
                [routerLink]="['/products']">
        </button>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            @for (i of [1,2,3]; track i) {
              <p-skeleton height="200px" />
            }
          </div>
          <div class="space-y-6">
            @for (i of [1,2]; track i) {
              <p-skeleton height="300px" />
            }
          </div>
        </div>
      } @else {
        <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Main Information -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Basic Info Card -->
              <p-card header="Informations de base">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium mb-2">Nom du produit <span class="text-red-500">*</span></label>
                    <input pInputText 
                           formControlName="name"
                           placeholder="Ex: iPhone 15 Pro"
                           class="w-full"
                           [ngClass]="{'ng-invalid ng-dirty': productForm.get('name')?.invalid && productForm.get('name')?.touched}">
                    @if (productForm.get('name')?.invalid && productForm.get('name')?.touched) {
                      <small class="text-red-500">Le nom est requis (min 2 caractères)</small>
                    }
                  </div>

                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium mb-2">Description</label>
                    <textarea pInputTextarea 
                              formControlName="description"
                              rows="4"
                              placeholder="Description détaillée du produit..."
                              class="w-full"></textarea>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">SKU <span class="text-red-500">*</span></label>
                    <input pInputText 
                           formControlName="sku"
                           placeholder="Ex: IPH-15-PRO-001"
                           class="w-full"
                           [ngClass]="{'ng-invalid ng-dirty': productForm.get('sku')?.invalid && productForm.get('sku')?.touched}">
                    @if (productForm.get('sku')?.invalid && productForm.get('sku')?.touched) {
                      <small class="text-red-500">SKU requis</small>
                    }
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">Code-barres</label>
                    <input pInputText 
                           formControlName="barcode"
                           placeholder="Ex: 1234567890123"
                           class="w-full">
                  </div>

                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium mb-2">Catégorie <span class="text-red-500">*</span></label>
                    <p-select [options]="categories()"
                              formControlName="categoryId"
                              placeholder="Sélectionner une catégorie"
                              optionLabel="name"
                              optionValue="categoryId"
                              [filter]="true"
                              filterBy="name"
                              [showClear]="true"
                              class="w-full"
                              [ngClass]="{'ng-invalid ng-dirty': productForm.get('categoryId')?.invalid && productForm.get('categoryId')?.touched}">
                    </p-select>
                    @if (productForm.get('categoryId')?.invalid && productForm.get('categoryId')?.touched) {
                      <small class="text-red-500">Catégorie requise</small>
                    }
                  </div>
                </div>
              </p-card>

              <!-- Pricing Card -->
              <p-card header="Prix et Coûts">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium mb-2">Prix de vente <span class="text-red-500">*</span></label>
                    <p-inputNumber formControlName="price"
                                   mode="currency"
                                   currency="EUR"
                                   locale="fr-FR"
                                   [minFractionDigits]="2"
                                   placeholder="0.00"
                                   class="w-full"
                                   [ngClass]="{'ng-invalid ng-dirty': productForm.get('price')?.invalid && productForm.get('price')?.touched}">
                    </p-inputNumber>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">Prix d'achat</label>
                    <p-inputNumber formControlName="costPrice"
                                   mode="currency"
                                   currency="EUR"
                                   locale="fr-FR"
                                   [minFractionDigits]="2"
                                   placeholder="0.00"
                                   class="w-full">
                    </p-inputNumber>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">TVA (%)</label>
                    <p-inputNumber formControlName="taxRate"
                                   [min]="0"
                                   [max]="100"
                                   [minFractionDigits]="2"
                                   suffix="%"
                                   placeholder="20"
                                   class="w-full">
                    </p-inputNumber>
                  </div>
                </div>
              </p-card>

              <!-- Stock Card -->
              <p-card header="Gestion du Stock">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium mb-2">Quantité actuelle <span class="text-red-500">*</span></label>
                    <p-inputNumber formControlName="quantity"
                                   [min]="0"
                                   [showButtons]="true"
                                   buttonLayout="horizontal"
                                   spinnerMode="horizontal"
                                   inputId="quantity"
                                   decrementButtonClass="p-button-danger"
                                   incrementButtonClass="p-button-success"
                                   incrementButtonIcon="pi pi-plus"
                                   decrementButtonIcon="pi pi-minus"
                                   class="w-full">
                    </p-inputNumber>
                  </div>

                  <div>
                    <label class="block text-sm font-medium mb-2">Stock minimum</label>
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
                      <p class="font-medium mb-1">Conseils de gestion de stock</p>
                      <ul class="list-disc pl-4 space-y-1">
                        <li>Le stock minimum déclenche une alerte de réapprovisionnement</li>
                        <li>Le stock maximum évite les excédents et optimise l'espace</li>
                      </ul>
                    </div>
                  </div>
                </div>
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
                        <div class="font-medium">Produit actif</div>
                        <div class="text-sm text-gray-500">Visible et vendable</div>
                      </div>
                    </div>
                    <p-checkbox formControlName="isActive" [binary]="true"></p-checkbox>
                  </div>

                  @if (isEditMode()) {
                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div class="flex items-center gap-3">
                        <i class="pi pi-box text-blue-500 text-xl"></i>
                        <div>
                          <div class="font-medium">En stock</div>
                          <div class="text-sm text-gray-500">{{ productForm.get('quantity')?.value || 0 }} unités</div>
                        </div>
                      </div>
                      <p-tag [value]="productForm.get('quantity')?.value > 0 ? 'Disponible' : 'Rupture'"
                             [severity]="productForm.get('quantity')?.value > 0 ? 'success' : 'danger'">
                      </p-tag>
                    </div>
                  }
                </div>
              </p-card>

              <!-- Image Card -->
              <p-card header="Image du produit">
                <div class="space-y-4">
                  @if (imagePreview()) {
                    <div class="relative">
                      <img [src]="imagePreview()" 
                           alt="Preview" 
                           class="w-full h-48 object-cover rounded-lg">
                      <button pButton 
                              icon="pi pi-times" 
                              class="p-button-rounded p-button-danger p-button-sm absolute top-2 right-2"
                              (click)="removeImage()">
                      </button>
                    </div>
                  } @else {
                    <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                      <i class="pi pi-image text-4xl text-gray-400 mb-3"></i>
                      <p class="text-gray-500 mb-4">Aucune image sélectionnée</p>
                    </div>
                  }

                  <p-fileUpload mode="basic" 
                                chooseLabel="Choisir une image"
                                accept="image/*"
                                [maxFileSize]="1000000"
                                [auto]="true"
                                [customUpload]="true"
                                (uploadHandler)="onImageSelect($event)"
                                styleClass="w-full">
                  </p-fileUpload>
                  
                  <p class="text-xs text-gray-500">
                    Formats acceptés: JPG, PNG, WEBP. Max 1MB.
                  </p>
                </div>
              </p-card>

              <!-- Actions Card -->
              <p-card>
                <div class="space-y-3">
                  <button pButton 
                          type="submit"
                          [label]="isEditMode() ? 'Mettre à jour' : 'Créer le produit'"
                          icon="pi pi-check"
                          class="p-button-success w-full"
                          [loading]="saving()"
                          [disabled]="productForm.invalid || saving()">
                  </button>
                  
                  <button pButton 
                          type="button"
                          label="Annuler"
                          icon="pi pi-times"
                          class="p-button-outlined w-full"
                          [routerLink]="['/products']">
                  </button>

                  @if (isEditMode() && canDelete()) {
                    <p-divider />
                    
                    <button pButton 
                            type="button"
                            label="Supprimer le produit"
                            icon="pi pi-trash"
                            class="p-button-danger w-full"
                            (click)="confirmDelete()">
                    </button>
                  }
                </div>
              </p-card>

              <!-- Meta Info (Edit Mode) -->
              @if (isEditMode() && product()) {
                <p-card header="Informations système">
                  <div class="space-y-2 text-sm text-gray-500">
                    <div class="flex justify-between">
                      <span>ID:</span>
                      <span class="font-mono">{{ product()?.productId }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Créé le:</span>
                      <span>{{ product()?.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    @if (product()?.updatedAt) {
                      <div class="flex justify-between">
                        <span>Modifié le:</span>
                        <span>{{ product()?.updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                      </div>
                    }
                  </div>
                </p-card>
              }
            </div>
          </div>
        </form>
      }
    </div>
  `
})
export class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);

  productForm!: FormGroup;
  
  // Signals
  isEditMode = signal(false);
  productId = signal<string | null>(null);
  product = signal<Product | null>(null);
  loading = signal(false);
  saving = signal(false);
  imagePreview = signal<string | null>(null);
  selectedImageFile = signal<File | null>(null);
  
  categories = signal<Category[]>([]);

  ngOnInit() {
    this.initForm();
    this.loadCategories();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.productId.set(id);
      this.loadProduct(id);
    }
  }

  initForm() {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      sku: ['', Validators.required],
      barcode: [''],
      categoryId: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      costPrice: [null],
      taxRate: [20],
      quantity: [0, [Validators.required, Validators.min(0)]],
      minStock: [10],
      maxStock: [1000],
      isActive: [true]
    });
  }

  loadCategories() {
    this.categoriesService.loadCategories(1, 100);
    // Subscribe to categories service signal or observable
   this.categories.set(this.categoriesService.categories());
  }

  loadProduct(id: string) {
    this.loading.set(true);
    this.productsService.getProductById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.productForm.patchValue({
          name: product.name,
          description: product.description,
          sku: product.sku,
          barcode: product.barcode,
          categoryId: product.categoryId,
          price: product.price,
          costPrice: product.costPrice,
          taxRate: product.taxRate || 20,
          quantity: product.quantity || 0,
          minStock: product.minStock || 10,
          maxStock: product.maxStock || 1000,
          isActive: product.isActive !== false
        });
        
        if (product.imageUrl) {
          this.imagePreview.set(product.imageUrl);
        }
        
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/products']);
      }
    });
  }

  onImageSelect(event: any) {
    const file = event.files[0];
    if (file) {
      this.selectedImageFile.set(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.imagePreview.set(null);
    this.selectedImageFile.set(null);
  }

  onSubmit() {
    if (this.productForm.invalid) {
      this.markFormGroupTouched(this.productForm);
      return;
    }

    this.saving.set(true);
    const formData = this.productForm.value;

    const operation = this.isEditMode() 
      ? this.productsService.updateProduct(this.productId()!, formData)
      : this.productsService.createProduct(formData);

    operation.subscribe({
      next: (product) => {
        // Upload image if selected
        if (this.selectedImageFile()) {
          this.productsService.updateProductImage(product.productId, this.selectedImageFile()!)
            .subscribe({
              next: () => this.onSaveSuccess(),
              error: () => this.onSaveSuccess() // Continue even if image fails
            });
        } else {
          this.onSaveSuccess();
        }
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

  onSaveSuccess() {
    this.saving.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Succès',
      detail: this.isEditMode() ? 'Produit mis à jour avec succès' : 'Produit créé avec succès'
    });
    this.router.navigate(['/products']);
  }

  confirmDelete() {
    // Implement delete confirmation dialog
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      this.productsService.deleteProduct(this.productId()!).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Produit supprimé avec succès'
          });
          this.router.navigate(['/products']);
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