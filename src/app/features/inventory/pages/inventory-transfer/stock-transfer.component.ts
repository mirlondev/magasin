// stock-transfer.component.ts - Stock Transfer Between Stores
import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputNumberModule } from "primeng/inputnumber";
import { TextareaModule } from "primeng/textarea";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { BadgeModule } from "primeng/badge";
import { ProgressBarModule } from "primeng/progressbar";
import { StepperModule } from "primeng/stepper";
import { TooltipModule } from "primeng/tooltip";
import { Store } from "../../../../core/models";
import { XafPipe } from "../../../../core/pipes/xaf-currency-pipe";
import { AuthService } from "../../../../core/services/auth.service";
import { InventoryService } from "../../../../core/services/inventory.service";
import { StoresService } from "../../../../core/services/stores.service";
import { ScanBarcodeComponent } from "../../../../shared/components/scan-barcode/scan-barcode.component";


interface TransferItem {
  inventoryId: string;
  productId: string;
  productName: string;
  sku: string;
  availableQuantity: number;
  transferQuantity: number;
  unitCost: number;
  sourceStoreId: string;
  sourceStoreName?: string;
}

@Component({
  selector: 'app-stock-transfer',
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
    SelectModule,
    TableModule,
    ToastModule,
    BadgeModule,
    ProgressBarModule,
    StepperModule,
    TooltipModule,
    ScanBarcodeComponent,
    XafPipe
  ],
  template: `
    <div class="p-4 max-w-7xl mx-auto">
      <p-toast />
      
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Transfert de Stock
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Transférer des articles entre magasins
          </p>
        </div>
        <button pButton 
                icon="pi pi-arrow-left" 
                label="Retour"
                class="p-button-outlined"
                [routerLink]="['/inventory']">
        </button>
      </div>

      <p-stepper [value]="currentStep() + 1">
        <!-- Step 1: Select Stores -->
       <p-step-panel header="Magasins">
          <ng-template pTemplate="content" let-nextCallback="nextCallback">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <p-card header="Magasin source">
                <p-select [options]="sourceStores()"
                          [(ngModel)]="selectedSourceStore"
                          placeholder="Sélectionner le magasin source"
                          optionLabel="name"
                          optionValue="storeId"
                          [filter]="true"
                          class="w-full"
                          (onChange)="onSourceStoreChange()">
                </p-select>
                
                @if (selectedSourceStore()) {
                  <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div class="text-sm text-gray-500">Articles disponibles</div>
                    <div class="text-2xl font-bold">{{ sourceInventoryCount() }}</div>
                  </div>
                }
              </p-card>

              <p-card header="Magasin destination">
                <p-select [options]="targetStores()"
                          [(ngModel)]="selectedTargetStore"
                          placeholder="Sélectionner le magasin destination"
                          optionLabel="name"
                          optionValue="storeId"
                          [filter]="true"
                          class="w-full"
                          [disabled]="!selectedSourceStore()">
                </p-select>
                
                @if (selectedTargetStore()) {
                  <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div class="text-sm text-gray-500">Capacité de réception</div>
                    <div class="text-2xl font-bold text-green-600">OK</div>
                  </div>
                }
              </p-card>
            </div>

            <div class="flex justify-end mt-6">
              <button pButton 
                      label="Continuer" 
                      icon="pi pi-arrow-right"
                      iconPos="right"
                      class="p-button-primary"
                      (click)="nextCallback.emit()"
                      [disabled]="!selectedSourceStore() || !selectedTargetStore()">
              </button>
            </div>
          </ng-template>
        </p-step-panel>

        <!-- Step 2: Select Products -->
        <p-step-panel header="Produits">
          <ng-template pTemplate="content" let-prevCallback="prevCallback" let-nextCallback="nextCallback">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Product Selection -->
              <div class="lg:col-span-1">
                <p-card header="Ajouter des produits">
                  <app-scan-barcode (scanned)="onBarcodeScanned($event)"></app-scan-barcode>
                  
                  <div class="mt-4">
                    <input pInputText 
                           [(ngModel)]="searchTerm"
                           placeholder="Rechercher un produit..."
                           class="w-full mb-2">
                    <button pButton 
                            label="Rechercher" 
                            icon="pi pi-search"
                            class="p-button-outlined w-full"
                            (click)="searchProduct()">
                    </button>
                  </div>
                </p-card>
              </div>

              <!-- Transfer List -->
              <div class="lg:col-span-2">
                <p-card header="Articles à transférer">
                  @if (transferItems().length === 0) {
                    <div class="text-center py-8 text-gray-500">
                      <i class="pi pi-truck text-5xl mb-4"></i>
                      <p>Aucun article sélectionné</p>
                    </div>
                  } @else {
                    <p-table [value]="transferItems()" styleClass="p-datatable-sm">
                      <ng-template pTemplate="header">
                        <tr>
                          <th>Produit</th>
                          <th>Disponible</th>
                          <th>Quantité</th>
                          <th>Actions</th>
                        </tr>
                      </ng-template>
                      
                      <ng-template pTemplate="body" let-item let-i="rowIndex">
                        <tr>
                          <td>
                            <div class="font-semibold">{{ item.productName }}</div>
                            <div class="text-sm text-gray-500">{{ item.sku }}</div>
                          </td>
                          <td>
                            <p-badge [value]="item.availableQuantity.toString()" severity="info"></p-badge>
                          </td>
                          <td>
                            <p-inputNumber [(ngModel)]="item.transferQuantity"
                                           [min]="1"
                                           [max]="item.availableQuantity"
                                           [showButtons]="true"
                                           buttonLayout="horizontal"
                                           styleClass="w-32">
                            </p-inputNumber>
                          </td>
                          <td>
                            <button pButton 
                                    icon="pi pi-trash" 
                                    class="p-button-rounded p-button-danger p-button-text"
                                    (click)="removeItem(i)">
                            </button>
                          </td>
                        </tr>
                      </ng-template>
                      
                      <ng-template pTemplate="footer">
                        <tr class="font-bold">
                          <td>Total</td>
                          <td></td>
                          <td>{{ totalTransferQuantity() }}</td>
                          <td></td>
                        </tr>
                      </ng-template>
                    </p-table>
                  }
                </p-card>
              </div>
            </div>

            <div class="flex justify-between mt-6">
              <button pButton 
                      label="Retour" 
                      icon="pi pi-arrow-left"
                      class="p-button-secondary"
                      (click)="prevCallback.emit()">
              </button>
              
              <button pButton 
                      label="Continuer" 
                      icon="pi pi-arrow-right"
                      iconPos="right"
                      class="p-button-primary"
                      (click)="nextCallback.emit()"
                      [disabled]="transferItems().length === 0">
              </button>
            </div>
          </ng-template>
        </p-step-panel>

        <!-- Step 3: Review & Confirm -->
        <p-step-panel header="Confirmation">
          <ng-template pTemplate="content" let-prevCallback="prevCallback">
            <p-card header="Résumé du transfert">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="p-4 border rounded-lg">
                  <div class="text-sm text-gray-500 mb-1">De</div>
                  <div class="font-semibold text-lg">{{ getStoreName(selectedSourceStore()) }}</div>
                </div>
                <div class="p-4 border rounded-lg">
                  <div class="text-sm text-gray-500 mb-1">Vers</div>
                  <div class="font-semibold text-lg">{{ getStoreName(selectedTargetStore()) }}</div>
                </div>
              </div>

              <p-table [value]="transferItems()" styleClass="p-datatable-sm mb-6">
                <ng-template pTemplate="header">
                  <tr>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Valeur</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-item>
                  <tr>
                    <td>
                      <div class="font-semibold">{{ item.productName }}</div>
                      <div class="text-sm text-gray-500">{{ item.sku }}</div>
                    </td>
                    <td>{{ item.transferQuantity }}</td>
                    <td>{{ item.transferQuantity * item.unitCost | xaf }}</td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="footer">
                  <tr class="font-bold">
                    <td>Total</td>
                    <td>{{ totalTransferQuantity() }}</td>
                    <td>{{ totalTransferValue() | xaf }}</td>
                  </tr>
                </ng-template>
              </p-table>

              <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Notes</label>
                <textarea pInputTextarea 
                          [(ngModel)]="transferNotes"
                          rows="3"
                          placeholder="Notes sur ce transfert..."
                          class="w-full">
                </textarea>
              </div>

              <div class="flex justify-between">
                <button pButton 
                        label="Retour" 
                        icon="pi pi-arrow-left"
                        class="p-button-secondary"
                        (click)="prevCallback.emit()">
                </button>
                
                <button pButton 
                        label="Confirmer le transfert" 
                        icon="pi pi-check"
                        class="p-button-success"
                        (click)="executeTransfer()"
                        [loading]="processing()">
                </button>
              </div>
            </p-card>
          </ng-template>
        </p-step-panel>
      </p-stepper>
    </div>
  `
})
export class StockTransferComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private storesService = inject(StoresService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);

  // State
  currentStep = signal(0);
  selectedSourceStore = signal<string>('');
  selectedTargetStore = signal<string>('');
  sourceStores = signal<Store[]>([]);
  targetStores = signal<Store[]>([]);
  sourceInventoryCount = signal(0);
  searchTerm = signal('');
  transferItems = signal<TransferItem[]>([]);
  transferNotes = signal('');
  processing = signal(false);

  ngOnInit() {
    this.loadStores();

    // Pre-fill from route if provided
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInventoryForTransfer(id);
    }
  }

  loadStores() {
    this.storesService.loadStores(1, 100).subscribe({
      next: (response) => {
        const stores = response.items || [];
        this.sourceStores.set(stores);
      }
    });
  }

  onSourceStoreChange() {
    // Update target stores (exclude source)
    const sourceId = this.selectedSourceStore();
    this.targetStores.set(this.sourceStores().filter(s => s.storeId !== sourceId));

    // Load inventory count for source
    this.inventoryService.getStatistics(sourceId).subscribe({
      next: (stats) => {
        this.sourceInventoryCount.set(stats?.totalItems || 0);
      }
    });
  }

  loadInventoryForTransfer(inventoryId: string) {
    this.inventoryService.getInventoryItemById(inventoryId).subscribe({
      next: (item) => {
        this.selectedSourceStore.set(item.storeId ?? '');
        this.onSourceStoreChange();

        this.addItem({
          inventoryId: item.inventoryId,
          productId: item.productId,
          productName: item.productName ?? '',
          sku: item.productSku ?? '',
          availableQuantity: item.quantity,
          transferQuantity: 1,
          unitCost: item.unitCost || 0,
          sourceStoreId: item.storeId ?? '',
          sourceStoreName: item.storeName
        });
      }
    });
  }

  onBarcodeScanned(barcode: string) {
    // Search in source store inventory
    this.inventoryService.searchInventory(barcode).subscribe({
      next: (items) => {
        const item = items.find(i => i.storeId === this.selectedSourceStore());
        if (item) {
          this.addItem({
            inventoryId: item.inventoryId,
            productId: item.productId,
            productName: item.productName ?? '',
            sku: item.productSku ?? '',
            availableQuantity: item.quantity,
            transferQuantity: 1,
            unitCost: item.unitCost || 0,
            sourceStoreId: item.storeId ?? '',
            sourceStoreName: item.storeName
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Non trouvé',
            detail: 'Produit non trouvé dans le magasin source'
          });
        }
      }
    });
  }

  searchProduct() {
    if (!this.searchTerm()) return;
    this.onBarcodeScanned(this.searchTerm());
  }

  addItem(item: TransferItem) {
    // Check if already added
    const existing = this.transferItems().find(i => i.inventoryId === item.inventoryId);
    if (existing) {
      this.messageService.add({
        severity: 'info',
        summary: 'Déjà ajouté',
        detail: 'Ce produit est déjà dans la liste'
      });
      return;
    }

    this.transferItems.update(items => [...items, item]);
  }

  removeItem(index: number) {
    this.transferItems.update(items => items.filter((_, i) => i !== index));
  }

  totalTransferQuantity(): number {
    return this.transferItems().reduce((sum, item) => sum + item.transferQuantity, 0);
  }

  totalTransferValue(): number {
    return this.transferItems().reduce((sum, item) => sum + (item.transferQuantity * item.unitCost), 0);
  }

  getStoreName(storeId: string): string {
    const store = this.sourceStores().find(s => s.storeId === storeId);
    return store?.name || 'Inconnu';
  }

  executeTransfer() {
    this.processing.set(true);

    const transferData = {
      sourceStoreId: this.selectedSourceStore(),
      targetStoreId: this.selectedTargetStore(),
      items: this.transferItems().map(item => ({
        inventoryId: item.inventoryId,
        quantity: item.transferQuantity
      })),
      notes: this.transferNotes()
    };

    // Process transfers one by one or use bulk endpoint
    let completed = 0;
    this.transferItems().forEach(item => {
      this.inventoryService.transfer(
        item.inventoryId,
        this.selectedTargetStore(),
        item.transferQuantity,
        this.transferNotes()
      ).subscribe({
        next: () => {
          completed++;
          if (completed === this.transferItems().length) {
            this.processing.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Transfert effectué avec succès'
            });
            this.router.navigate(['/inventory']);
          }
        },
        error: () => {
          this.processing.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Erreur lors du transfert'
          });
        }
      });
    });
  }
}