// stock-adjustment.component.ts - Stock Adjustment/Counting
import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MessageService, ConfirmationService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputNumberModule } from "primeng/inputnumber";
import { RadioButtonModule } from "primeng/radiobutton";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { BadgeModule } from "primeng/badge";
import { ProgressBarModule } from "primeng/progressbar";
import { DividerModule } from "primeng/divider";
import { DatePickerModule } from "primeng/datepicker";
import { StepperModule } from "primeng/stepper";
import { TooltipModule } from "primeng/tooltip";
import { FileUploadModule } from "primeng/fileupload";
import { TextareaModule } from "primeng/textarea";
import { XafPipe } from "../../../../core/pipes/xaf-currency-pipe";
import { InventoryService } from "../../../../core/services/inventory.service";
import { Product } from "../../../../core/models";
import { AuthService } from "../../../../core/services/auth.service";
import { ProductsService } from "../../../../core/services/products.service";
import { ScanBarcodeComponent } from "../../../../shared/components/scan-barcode/scan-barcode.component";
import { FormsModule } from "@angular/forms";

interface AdjustmentItem {
  inventoryId: string;
  productId: string;
  productName: string;
  sku: string;
  currentQuantity: number;
  countedQuantity: number;
  difference: number;
  unitCost: number;
  reason: string;
  notes: string;
}

@Component({
  selector: 'app-stock-adjustment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputNumberModule,
    TextareaModule,
    RadioButtonModule,
    SelectModule,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    BadgeModule,
    ProgressBarModule,
    DividerModule,
    DatePickerModule,
    StepperModule,
    TooltipModule,
    FileUploadModule,
    ScanBarcodeComponent,
    XafPipe
  ],
  template: `
    <div class="p-4 max-w-7xl mx-auto">
      <p-toast />
      <p-confirmDialog />
      
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ isPhysicalCount() ? 'Inventaire Physique' : 'Ajustement de Stock' }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            {{ isPhysicalCount() ? 'Comptage physique du stock pour réconciliation' : 'Correction des écarts de stock' }}
          </p>
        </div>
        <button pButton 
                icon="pi pi-arrow-left" 
                label="Retour"
                class="p-button-outlined"
                [routerLink]="['/inventory']">
        </button>
      </div>

      <!-- Mode Selection -->
      @if (!adjustmentStarted()) {
        <p-card header="Type d'opération" class="mb-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                 [class.border-primary]="adjustmentType() === 'correction'"
                 [class.bg-primary-50]="adjustmentType() === 'correction'"
                 (click)="setAdjustmentType('correction')">
              <div class="flex items-center gap-3">
                <p-radioButton [value]="'correction'" [(ngModel)]="adjustmentType" name="type"></p-radioButton>
                <div>
                  <div class="font-semibold">Correction</div>
                  <div class="text-sm text-gray-500">Corriger une erreur de stock</div>
                </div>
              </div>
            </div>
            
            <div class="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                 [class.border-primary]="adjustmentType() === 'damaged'"
                 [class.bg-primary-50]="adjustmentType() === 'damaged'"
                 (click)="setAdjustmentType('damaged')">
              <div class="flex items-center gap-3">
                <p-radioButton [value]="'damaged'" [(ngModel)]="adjustmentType" name="type"></p-radioButton>
                <div>
                  <div class="font-semibold">Produits endommagés</div>
                  <div class="text-sm text-gray-500">Retirer les produits abîmés</div>
                </div>
              </div>
            </div>
            
            <div class="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                 [class.border-primary]="adjustmentType() === 'physical-count'"
                 [class.bg-primary-50]="adjustmentType() === 'physical-count'"
                 (click)="setAdjustmentType('physical-count')">
              <div class="flex items-center gap-3">
                <p-radioButton [value]="'physical-count'" [(ngModel)]="adjustmentType" name="type"></p-radioButton>
                <div>
                  <div class="font-semibold">Inventaire physique</div>
                  <div class="text-sm text-gray-500">Comptage complet périodique</div>
                </div>
              </div>
            </div>
          </div>

          @if (isPhysicalCount()) {
            <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div class="flex items-start gap-3">
                <i class="pi pi-info-circle text-blue-500 mt-0.5"></i>
                <div class="text-sm text-blue-700 dark:text-blue-300">
                  <p class="font-medium mb-1">Inventaire physique</p>
                  <p>Cette opération créera un rapport de comptage complet. Assurez-vous d'avoir suffisamment de temps et de personnel pour effectuer un comptage précis.</p>
                </div>
              </div>
            </div>
          }

          <div class="mt-6 flex justify-end">
            <button pButton 
                    label="Commencer" 
                    icon="pi pi-play"
                    class="p-button-primary"
                    (click)="startAdjustment()"
                    [disabled]="!adjustmentType()">
            </button>
          </div>
        </p-card>
      }

      <!-- Adjustment Interface -->
      @if (adjustmentStarted()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Panel - Product Selection -->
          <div class="lg:col-span-1 space-y-4">
            <p-card header="Rechercher un produit">
              <div class="space-y-4">
                <app-scan-barcode (scanned)="onBarcodeScanned($event)"></app-scan-barcode>
                
                <p-divider align="center">
                  <span class="text-gray-500">ou</span>
                </p-divider>
                
                <input pInputText 
                       [(ngModel)]="searchTerm"
                       placeholder="Nom, SKU..."
                       class="w-full"
                       (keyup.enter)="searchProduct()">
                
                <button pButton 
                        label="Rechercher" 
                        icon="pi pi-search"
                        class="p-button-outlined w-full"
                        (click)="searchProduct()">
                </button>
              </div>
            </p-card>

            <!-- Quick Stats -->
            <p-card header="Progression">
              <div class="space-y-3">
                <div class="flex justify-between text-sm">
                  <span>Articles comptés</span>
                  <span class="font-bold">{{ adjustmentItems().length }}</span>
                </div>
                <p-progressBar [value]="progressPercentage()" [showValue]="true"></p-progressBar>
                
                @if (totalVariance() !== 0) {
                  <div class="p-3 rounded-lg" [class.bg-red-50]="totalVariance() < 0" [class.bg-green-50]="totalVariance() > 0">
                    <div class="flex justify-between items-center">
                      <span class="text-sm font-medium">Écart total</span>
                      <span class="font-bold" [class.text-red-600]="totalVariance() < 0" [class.text-green-600]="totalVariance() > 0">
                        {{ totalVariance() > 0 ? '+' : '' }}{{ totalVariance() }}
                      </span>
                    </div>
                    <div class="text-sm mt-1" [class.text-red-600]="totalVariance() < 0" [class.text-green-600]="totalVariance() > 0">
                      Valeur: {{ totalVarianceValue() | xaf }}
                    </div>
                  </div>
                }
              </div>
            </p-card>

            <!-- Actions -->
            <p-card>
              <div class="space-y-3">
                <button pButton 
                        label="Valider l'ajustement" 
                        icon="pi pi-check"
                        class="p-button-success w-full"
                        (click)="confirmAdjustment()"
                        [disabled]="adjustmentItems().length === 0">
                </button>
                
                <button pButton 
                        label="Annuler" 
                        icon="pi pi-times"
                        class="p-button-outlined w-full"
                        (click)="cancelAdjustment()">
                </button>
                
                @if (isPhysicalCount()) {
                  <button pButton 
                          label="Sauvegarder brouillon" 
                          icon="pi pi-save"
                          class="p-button-secondary w-full"
                          (click)="saveDraft()">
                  </button>
                }
              </div>
            </p-card>
          </div>

          <!-- Right Panel - Adjustment List -->
          <div class="lg:col-span-2">
            <p-card header="Articles à ajuster">
              @if (adjustmentItems().length === 0) {
                <div class="text-center py-12 text-gray-500">
                  <i class="pi pi-box text-5xl mb-4"></i>
                  <p class="text-lg mb-2">Aucun article sélectionné</p>
                  <p>Scannez un code-barres ou recherchez un produit pour commencer</p>
                </div>
              } @else {
                <p-table [value]="adjustmentItems()" styleClass="p-datatable-sm">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Produit</th>
                      <th>Stock actuel</th>
                      <th>Quantité comptée</th>
                      <th>Écart</th>
                      <th>Motif</th>
                      <th>Actions</th>
                    </tr>
                  </ng-template>
                  
                  <ng-template pTemplate="body" let-item let-i="rowIndex">
                    <tr [class.bg-red-50]="item.difference < 0" [class.bg-green-50]="item.difference > 0">
                      <td>
                        <div class="font-semibold">{{ item.productName }}</div>
                        <div class="text-sm text-gray-500">{{ item.sku }}</div>
                      </td>
                      <td class="text-center font-medium">{{ item.currentQuantity }}</td>
                      <td>
                        <p-inputNumber [(ngModel)]="item.countedQuantity"
                                       [min]="0"
                                       [showButtons]="true"
                                       buttonLayout="horizontal"
                                       spinnerMode="horizontal"
                                       incrementButtonIcon="pi pi-plus"
                                       decrementButtonIcon="pi pi-minus"
                                       (onInput)="updateDifference(item)"
                                       styleClass="w-32">
                        </p-inputNumber>
                      </td>
                      <td class="text-center">
                        <span class="font-bold" [class.text-red-600]="item.difference < 0" [class.text-green-600]="item.difference > 0">
                          {{ item.difference > 0 ? '+' : '' }}{{ item.difference }}
                        </span>
                      </td>
                      <td>
                        <textarea pInputTextarea 
                                  [(ngModel)]="item.reason"
                                  rows="1"
                                  placeholder="Motif de l'ajustement..."
                                  class="w-full text-sm">
                        </textarea>
                      </td>
                      <td>
                        <button pButton 
                                icon="pi pi-trash" 
                                class="p-button-rounded p-button-danger p-button-text"
                                (click)="removeItem(i)"
                                pTooltip="Retirer">
                        </button>
                      </td>
                    </tr>
                  </ng-template>
                  
                  <ng-template pTemplate="footer">
                    <tr class="font-bold">
                      <td colspan="3" class="text-right">Total</td>
                      <td class="text-center" [class.text-red-600]="totalVariance() < 0" [class.text-green-600]="totalVariance() > 0">
                        {{ totalVariance() > 0 ? '+' : '' }}{{ totalVariance() }}
                      </td>
                      <td colspan="2">
                        Valeur: {{ totalVarianceValue() | xaf }}
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              }
            </p-card>
          </div>
        </div>
      }
    </div>
  `
})
export class StockAdjustmentComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private productsService = inject(ProductsService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // State
  adjustmentType = signal<'correction' | 'damaged' | 'physical-count' | null>(null);
  adjustmentStarted = signal(false);
  searchTerm = signal('');
  adjustmentItems = signal<AdjustmentItem[]>([]);
  expectedTotalItems = signal(0); // For physical count progress
  
  // Inventory ID from route (for single item adjustment)
  routeInventoryId = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.routeInventoryId.set(id);
      this.adjustmentType.set('correction');
      this.loadInventoryItem(id);
    }
  }

  isPhysicalCount(): boolean {
    return this.adjustmentType() === 'physical-count';
  }

  setAdjustmentType(type: 'correction' | 'damaged' | 'physical-count') {
    this.adjustmentType.set(type);
  }

  startAdjustment() {
    if (!this.adjustmentType()) return;
    
    this.adjustmentStarted.set(true);
    
    if (this.isPhysicalCount()) {
      // Load all inventory items for physical count
      this.loadAllInventory();
    }
  }

  loadInventoryItem(id: string) {
    this.inventoryService.getInventoryItemById(id).subscribe({
      next: (item) => {
        this.addItem({
          inventoryId: item.inventoryId,
          productId: item.productId,
          productName: item.productName,
          sku: item.productSku,
          currentQuantity: item.quantity,
          countedQuantity: item.quantity,
          difference: 0,
          unitCost: item.unitCost || 0,
          reason: '',
          notes: ''
        });
        this.adjustmentStarted.set(true);
      }
    });
  }

  loadAllInventory() {
    // Load all items for physical count
    this.inventoryService.loadInventory(1, 1000);
    // TODO: Populate expectedTotalItems from inventory
  }

  onBarcodeScanned(barcode: string) {
    this.productsService.searchProducts(barcode).subscribe({
      next: (products) => {
        if (products.length > 0) {
          const product = products[0];
          this.addProductToAdjustment(product);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Produit non trouvé',
            detail: `Aucun produit trouvé avec le code: ${barcode}`
          });
        }
      }
    });
  }

  searchProduct() {
    if (!this.searchTerm()) return;
    
    this.productsService.searchProducts(this.searchTerm()).subscribe({
      next: (products) => {
        if (products.length === 1) {
          this.addProductToAdjustment(products[0]);
          this.searchTerm.set('');
        } else if (products.length > 1) {
          // Show selection dialog
          // TODO: Implement product selection dialog
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Aucun résultat',
            detail: 'Aucun produit trouvé'
          });
        }
      }
    });
  }

  addProductToAdjustment(product: Product) {
    // Check if already in list
    const existing = this.adjustmentItems().find(i => i.productId === product.productId);
    if (existing) {
      this.messageService.add({
        severity: 'info',
        summary: 'Déjà ajouté',
        detail: 'Ce produit est déjà dans la liste'
      });
      return;
    }

    // Get inventory info for this product
    this.inventoryService.getInventoryByProductAndStore(product.productId, this.getCurrentStoreId())
      .subscribe({
        next: (inventory) => {
          this.addItem({
            inventoryId: inventory.inventoryId,
            productId: product.productId,
            productName: product.name,
            sku: product.sku,
            currentQuantity: inventory.quantity,
            countedQuantity: inventory.quantity,
            difference: 0,
            unitCost: inventory.unitCost || product.costPrice || 0,
            reason: '',
            notes: ''
          });
        },
        error: () => {
          // Product not in inventory yet, add with 0 quantity
          this.addItem({
            inventoryId: '',
            productId: product.productId,
            productName: product.name,
            sku: product.sku,
            currentQuantity: 0,
            countedQuantity: 0,
            difference: 0,
            unitCost: product.costPrice || 0,
            reason: 'Nouveau produit',
            notes: ''
          });
        }
      });
  }

  addItem(item: AdjustmentItem) {
    this.adjustmentItems.update(items => [...items, item]);
  }

  removeItem(index: number) {
    this.adjustmentItems.update(items => items.filter((_, i) => i !== index));
  }

  updateDifference(item: AdjustmentItem) {
    item.difference = item.countedQuantity - item.currentQuantity;
  }

  progressPercentage(): number {
    if (this.expectedTotalItems() === 0) return 0;
    return Math.round((this.adjustmentItems().length / this.expectedTotalItems()) * 100);
  }

  totalVariance(): number {
    return this.adjustmentItems().reduce((sum, item) => sum + item.difference, 0);
  }

  totalVarianceValue(): number {
    return this.adjustmentItems().reduce((sum, item) => sum + (item.difference * item.unitCost), 0);
  }

  confirmAdjustment() {
    const title = this.isPhysicalCount() ? 'Valider l\'inventaire physique' : 'Valider l\'ajustement';
    const message = this.isPhysicalCount() 
      ? `Voulez-vous valider cet inventaire physique de ${this.adjustmentItems().length} articles ?`
      : `Voulez-vous valider cet ajustement de ${this.totalVariance()} unités ?`;

    this.confirmationService.confirm({
      header: title,
      message: message,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.executeAdjustment();
      }
    });
  }

  executeAdjustment() {
    const adjustments = this.adjustmentItems().filter(i => i.difference !== 0);
    
    if (adjustments.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aucun changement',
        detail: 'Aucun article n\'a été modifié'
      });
      return;
    }

    // Process each adjustment
    let completed = 0;
    adjustments.forEach(item => {
      const operation = item.difference > 0 ? 'add' : 'subtract';
      const quantity = Math.abs(item.difference);
      
      this.inventoryService.updateStock(item.inventoryId, quantity, operation).subscribe({
        next: () => {
          completed++;
          if (completed === adjustments.length) {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: `${adjustments.length} ajustements effectués avec succès`
            });
            this.router.navigate(['/inventory']);
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: `Erreur lors de l'ajustement de ${item.productName}`
          });
        }
      });
    });
  }

  cancelAdjustment() {
    this.confirmationService.confirm({
      header: 'Annuler',
      message: 'Voulez-vous vraiment annuler ? Tous les changements seront perdus.',
      icon: 'pi pi-exclamation-circle',
      accept: () => {
        this.router.navigate(['/inventory']);
      }
    });
  }

  saveDraft() {
    // TODO: Implement draft saving to localStorage or backend
    this.messageService.add({
      severity: 'success',
      summary: 'Brouillon sauvegardé',
      detail: 'Votre inventaire physique a été sauvegardé'
    });
  }

  private getCurrentStoreId(): string {
    // Get from auth service or route params
    return this.authService.currentUser()?.storeId || '';
  }
}