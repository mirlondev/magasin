// inventory-history.component.ts - Inventory History & Audit Trail
import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { TimelineModule } from "primeng/timeline";
import { DatePickerModule } from "primeng/datepicker";
import { SelectModule } from "primeng/select";
import { InputTextModule } from "primeng/inputtext";
import { BadgeModule } from "primeng/badge";
import { TooltipModule } from "primeng/tooltip";
import { ChartModule } from "primeng/chart";
import { XafPipe } from "../../../../core/pipes/xaf-currency-pipe";
import { InventoryService } from "../../../../core/services/inventory.service";


interface HistoryEntry {
    id: string;
    date: Date;
    productName: string;
    sku: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'COUNT';
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    user: string;
    reference: string;
    notes: string;
    unitCost: number;
    totalValue: number;
}

@Component({
    selector: 'app-inventory-history',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        ButtonModule,
        CardModule,
        TableModule,
        TagModule,
        TimelineModule,
        DatePickerModule,
        SelectModule,
        InputTextModule,
        BadgeModule,
        TooltipModule,
        ChartModule,
        XafPipe
    ],
    template: `
    <div class="p-4 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Historique des Mouvements
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Audit trail complet des transactions de stock
          </p>
        </div>
        <button pButton 
                icon="pi pi-arrow-left" 
                label="Retour"
                class="p-button-outlined"
                [routerLink]="['/inventory']">
        </button>
      </div>

      <!-- Filters -->
      <p-card class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Du</label>
            <p-datePicker [(ngModel)]="startDate" class="w-full"></p-datePicker>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Au</label>
            <p-datePicker [(ngModel)]="endDate" class="w-full"></p-datePicker>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Type</label>
            <p-select [options]="typeOptions" 
                      [(ngModel)]="selectedType"
                      placeholder="Tous les types"
                      class="w-full">
            </p-select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Recherche</label>
            <input pInputText [(ngModel)]="searchTerm" placeholder="Produit, utilisateur..." class="w-full">
          </div>
        </div>
        
        <div class="flex justify-end mt-4 gap-2">
          <button pButton label="Réinitialiser" icon="pi pi-refresh" class="p-button-outlined" (click)="resetFilters()"></button>
          <button pButton label="Filtrer" icon="pi pi-search" (click)="applyFilters()"></button>
          <button pButton label="Exporter" icon="pi pi-download" class="p-button-secondary" (click)="exportHistory()"></button>
        </div>
      </p-card>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Total Entrées</div>
          <div class="text-900 text-2xl font-bold text-green-500">+{{ totalIn() }}</div>
        </div>
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Total Sorties</div>
          <div class="text-900 text-2xl font-bold text-red-500">-{{ totalOut() }}</div>
        </div>
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Ajustements</div>
          <div class="text-900 text-2xl font-bold text-orange-500">{{ totalAdjustments() }}</div>
        </div>
        <div class="surface-card p-4 shadow-2 rounded">
          <div class="text-500 font-medium">Valeur totale</div>
          <div class="text-900 text-2xl font-bold">{{ totalValue() | xaf }}</div>
        </div>
      </div>

      <!-- Chart -->
      <p-card header="Évolution des mouvements" class="mb-6">
        <p-chart type="bar" [data]="chartData" [options]="chartOptions" height="300px"></p-chart>
      </p-card>

      <!-- History Table -->
      <p-card>
        <p-table [value]="filteredHistory()" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10,25,50]" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Produit</th>
              <th>Variation</th>
              <th>Stock</th>
              <th>Utilisateur</th>
              <th>Référence</th>
              <th>Notes</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-entry>
            <tr>
              <td>{{ entry.date | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <p-tag [value]="getTypeLabel(entry.type)" 
                       [severity]="getTypeSeverity(entry.type)"
                       [icon]="getTypeIcon(entry.type)">
                </p-tag>
              </td>
              <td>
                <div class="font-medium">{{ entry.productName }}</div>
                <div class="text-sm text-gray-500">{{ entry.sku }}</div>
              </td>
              <td>
                <span class="font-bold" [class.text-green-600]="entry.quantity > 0" [class.text-red-600]="entry.quantity < 0">
                  {{ entry.quantity > 0 ? '+' : '' }}{{ entry.quantity }}
                </span>
              </td>
              <td>
                <span class="text-sm">{{ entry.previousQuantity }} → {{ entry.newQuantity }}</span>
              </td>
              <td>{{ entry.user }}</td>
              <td>
                <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ entry.reference }}</code>
              </td>
              <td>{{ entry.notes || '-' }}</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `
})
export class InventoryHistoryComponent implements OnInit {
    private inventoryService = inject(InventoryService);
    private route = inject(ActivatedRoute);

    inventoryId = signal<string | null>(null);
    historyEntries = signal<HistoryEntry[]>([]);

    // Filters
    startDate = signal<Date | null>(null);
    endDate = signal<Date | null>(null);
    selectedType = signal<string | null>(null);
    searchTerm = signal('');

    typeOptions = [
        { label: 'Entrée', value: 'IN' },
        { label: 'Sortie', value: 'OUT' },
        { label: 'Ajustement', value: 'ADJUSTMENT' },
        { label: 'Transfert entrée', value: 'TRANSFER_IN' },
        { label: 'Transfert sortie', value: 'TRANSFER_OUT' },
        { label: 'Inventaire', value: 'COUNT' }
    ];

    chartData: any;
    chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
    };

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.inventoryId.set(id);
            this.loadHistory(id);
        } else {
            this.loadAllHistory();
        }
    }

    loadHistory(inventoryId: string) {
        this.inventoryService.getHistory(inventoryId).subscribe({
            next: (history) => {
                this.historyEntries.set(history || []);
                this.updateChart();
            }
        });
    }

    loadAllHistory() {
        // Load all history for all inventory items
        // TODO: Implement global history endpoint
    }

    filteredHistory() {
        return this.historyEntries().filter(entry => {
            if (this.selectedType() && entry.type !== this.selectedType()) return false;
            if (this.searchTerm() && !entry.productName?.toLowerCase().includes(this.searchTerm().toLowerCase())) return false;
            if (this.startDate() && entry.date < this.startDate()!) return false;
            if (this.endDate() && entry.date > this.endDate()!) return false;
            return true;
        });
    }

    totalIn(): number {
        return this.filteredHistory()
            .filter(e => e.quantity > 0)
            .reduce((sum, e) => sum + e.quantity, 0);
    }

    totalOut(): number {
        return Math.abs(this.filteredHistory()
            .filter(e => e.quantity < 0)
            .reduce((sum, e) => sum + e.quantity, 0));
    }

    totalAdjustments(): number {
        return this.filteredHistory()
            .filter(e => e.type === 'ADJUSTMENT' || e.type === 'COUNT')
            .length;
    }

    totalValue(): number {
        return this.filteredHistory()
            .reduce((sum, e) => sum + (e.totalValue || 0), 0);
    }

    updateChart() {
        const grouped = this.groupByDate(this.filteredHistory());
        this.chartData = {
            labels: Object.keys(grouped),
            datasets: [
                {
                    label: 'Entrées',
                    data: Object.values(grouped).map((d: any) => d.in),
                    backgroundColor: '#10B981'
                },
                {
                    label: 'Sorties',
                    data: Object.values(grouped).map((d: any) => d.out),
                    backgroundColor: '#EF4444'
                }
            ]
        };
    }

    groupByDate(entries: HistoryEntry[]) {
        const grouped: any = {};
        entries.forEach(entry => {
            const date = entry.date.toISOString().split('T')[0];
            if (!grouped[date]) grouped[date] = { in: 0, out: 0 };
            if (entry.quantity > 0) grouped[date].in += entry.quantity;
            else grouped[date].out += Math.abs(entry.quantity);
        });
        return grouped;
    }

    getTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            'IN': 'Entrée',
            'OUT': 'Sortie',
            'ADJUSTMENT': 'Ajustement',
            'TRANSFER_IN': 'Transfert entrée',
            'TRANSFER_OUT': 'Transfert sortie',
            'COUNT': 'Inventaire'
        };
        return labels[type] || type;
    }

    getTypeSeverity(type: string): any {
        const severities: Record<string, string> = {
            'IN': 'success',
            'OUT': 'danger',
            'ADJUSTMENT': 'warning',
            'TRANSFER_IN': 'info',
            'TRANSFER_OUT': 'secondary',
            'COUNT': 'contrast'
        };
        return severities[type] || 'info';
    }

    getTypeIcon(type: string): string {
        const icons: Record<string, string> = {
            'IN': 'pi pi-arrow-down',
            'OUT': 'pi pi-arrow-up',
            'ADJUSTMENT': 'pi pi-refresh',
            'TRANSFER_IN': 'pi pi-arrow-right-arrow-left',
            'TRANSFER_OUT': 'pi pi-arrow-right-arrow-left',
            'COUNT': 'pi pi-check-square'
        };
        return icons[type] || 'pi pi-circle';
    }

    applyFilters() {
        this.updateChart();
    }

    resetFilters() {
        this.startDate.set(null);
        this.endDate.set(null);
        this.selectedType.set(null);
        this.searchTerm.set('');
        this.updateChart();
    }

    exportHistory() {
        // TODO: Implement CSV/PDF export
    }
}