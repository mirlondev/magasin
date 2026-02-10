// physical-count-schedule.component.ts - Schedule Physical Inventory Counts
import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { SelectModule } from "primeng/select";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { BadgeModule } from "primeng/badge";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { CheckboxModule } from "primeng/checkbox";
import { AuthService } from "../../../../core/services/auth.service";
import { StoresService } from "../../../../core/services/stores.service";
import { DatePickerModule } from "primeng/datepicker";
import { StockStatus } from "../../../../core/models";




interface CountSchedule {
  id: string;
  storeId: string;
  storeName: string;
  type: 'ANNUAL' | 'MONTHLY' | 'QUARTERLY' | 'WEEKLY';
  scheduledDate: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo: string[];
  notes: string;
  completedDate?: Date;
  variance?: number;
}

@Component({
  selector: 'app-physical-count-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    DatePickerModule,
    SelectModule,
    TableModule,
    TagModule,
    BadgeModule,
    DialogModule,
    InputTextModule,
    CheckboxModule
  ],
  template: `
    <div class="p-4 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Planification des Inventaires Physiques
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Gérez les inventaires physiques annuels, mensuels et hebdomadaires
          </p>
        </div>
        <button pButton 
                icon="pi pi-plus" 
                label="Nouvel inventaire"
                class="p-button-success"
                (click)="showScheduleDialog = true">
        </button>
      </div>

      <!-- Upcoming Counts -->
      <p-card header="Inventaires à venir" class="mb-6">
        <p-table [value]="upcomingCounts()" [paginator]="true" [rows]="5">
          <ng-template pTemplate="header">
            <tr>
              <th>Date prévue</th>
              <th>Magasin</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Assigné à</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-count>
            <tr>
              <td>{{ count.scheduledDate | date:'dd/MM/yyyy' }}</td>
              <td>{{ count.storeName }}</td>
              <td>
                <p-tag [value]="count.type" 
                       [severity]="count.type === 'ANNUAL' ? 'danger' : count.type === 'MONTHLY' ? 'warn' : 'info'">
                </p-tag>
              </td>
              <td>
                <p-tag [value]="count.status" 
                       [severity]="getStatusSeverity(count.status)">
                </p-tag>
              </td>
              <td>
                @for (user of count.assignedTo; track user) {
                  <p-badge [value]="user" class="mr-1"></p-badge>
                }
              </td>
              <td>
                <button pButton 
                        icon="pi pi-play" 
                        class="p-button-rounded p-button-success p-button-text"
                        (click)="startCount(count)"
                        pTooltip="Démarrer"
                        [disabled]="count.status !== 'SCHEDULED'">
                </button>
                <button pButton 
                        icon="pi pi-pencil" 
                        class="p-button-rounded p-button-warning p-button-text"
                        (click)="editCount(count)"
                        pTooltip="Modifier">
                </button>
                <button pButton 
                        icon="pi pi-times" 
                        class="p-button-rounded p-button-danger p-button-text"
                        (click)="cancelCount(count)"
                        pTooltip="Annuler"
                        [disabled]="count.status === 'COMPLETED'">
                </button>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Calendar View -->
      <p-card header="Calendrier annuel">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          @for (month of months(); track month.value) {
            <div class="p-4 border rounded-lg" [class.bg-primary-50]="hasCountInMonth(month.value)">
              <div class="font-semibold mb-2">{{ month.label }}</div>
              <div class="space-y-2">
                @for (count of getCountsForMonth(month.value); track count.id) {
                  <div class="flex items-center gap-2 text-sm">
                    <div class="w-2 h-2 rounded-full" 
                         [class.bg-red-500]="count.type === 'ANNUAL'"
                         [class.bg-orange-500]="count.type === 'MONTHLY'"
                         [class.bg-blue-500]="count.type === 'WEEKLY'">
                    </div>
                    <span>{{ count.storeName }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </p-card>

      <!-- Schedule Dialog -->
      <p-dialog header="Planifier un inventaire" 
                [(visible)]="showScheduleDialog" 
                [modal]="true" 
                [style]="{ width: '500px' }">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Magasin</label>
            <p-select [options]="stores()" 
                      [(ngModel)]="newCount.storeId"
                      optionLabel="name"
                      optionValue="storeId"
                      class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Type</label>
            <p-select [options]="countTypes" 
                      [(ngModel)]="newCount.type"
                      class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Date prévue</label>
            <p-datepicker [(ngModel)]="newCount.scheduledDate" 
                        class="w-full"
                        [showIcon]="true"
                        />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Notes</label>
            <textarea pInputTextarea [(ngModel)]="newCount.notes" rows="3" class="w-full"></textarea>
          </div>
        </div>
        
        <ng-template pTemplate="footer">
          <button pButton label="Annuler" class="p-button-outlined" (click)="showScheduleDialog = false"></button>
          <button pButton label="Planifier" class="p-button-primary" (click)="scheduleCount()"></button>
        </ng-template>
      </p-dialog>
    </div>
  `
})
export class PhysicalCountScheduleComponent {
  private storesService = inject(StoresService);
  private authService = inject(AuthService);

  showScheduleDialog = false;
  upcomingCounts = signal<CountSchedule[]>([]);
  stores = signal<any[]>([]);
  
  newCount: Partial<CountSchedule> = {
    type: 'MONTHLY',
    scheduledDate: new Date()
  };

  countTypes = [
    { label: 'Inventaire annuel', value: 'ANNUAL' },
    { label: 'Inventaire mensuel', value: 'MONTHLY' },
    { label: 'Inventaire trimestriel', value: 'QUARTERLY' },
    { label: 'Inventaire hebdomadaire', value: 'WEEKLY' }
  ];

  months = signal([
    { label: 'Janvier', value: 0 },
    { label: 'Février', value: 1 },
    { label: 'Mars', value: 2 },
    { label: 'Avril', value: 3 },
    { label: 'Mai', value: 4 },
    { label: 'Juin', value: 5 },
    { label: 'Juillet', value: 6 },
    { label: 'Août', value: 7 },
    { label: 'Septembre', value: 8 },
    { label: 'Octobre', value: 9 },
    { label: 'Novembre', value: 10 },
    { label: 'Décembre', value: 11 }
  ]);

  ngOnInit() {
    this.loadStores();
    this.loadSchedules();
  }

  loadStores() {
    this.storesService.loadStores(1, 100).subscribe({
      next: (response) => {
        this.stores.set(response.items || []);
      }
    });
  }

  loadSchedules() {
    // TODO: Load from API
    // Mock data
    this.upcomingCounts.set([
      {
        id: '1',
        storeId: '1',
        storeName: 'Magasin Principal',
        type: 'MONTHLY',
        scheduledDate: new Date(2026, 1, 15),
        status: 'SCHEDULED',
        assignedTo: ['John Doe', 'Jane Smith'],
        notes: 'Inventaire mensuel régulier'
      },
      {
        id: '2',
        storeId: '2',
        storeName: 'Entrepôt',
        type: 'ANNUAL',
        scheduledDate: new Date(2026, 11, 31),
        status: 'SCHEDULED',
        assignedTo: ['Admin'],
        notes: 'Inventaire annuel complet'
      }
    ]);
  }

  hasCountInMonth(month: number): boolean {
    return this.upcomingCounts().some(c => c.scheduledDate.getMonth() === month);
  }

  getCountsForMonth(month: number): CountSchedule[] {
    return this.upcomingCounts().filter(c => c.scheduledDate.getMonth() === month);
  }

//   getStatusSeverity(status: any): 'info' | 'warn' | 'success' | 'danger' {
//     const severities: Record<string, string> = {
//       'SCHEDULED': 'info',
//       'IN_PROGRESS': 'warn',
//       'COMPLETED': 'success',
//       'CANCELLED': 'danger'
//     };
//     return severities[status] || 'info';
//   }

  getStatusSeverity(status: any): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'warn';
      case 'SCHEDULED': return 'danger';
      case 'CANCELLED': return 'info';
      default: return 'info';
    }
  }


  scheduleCount() {
    // TODO: API call to schedule
    this.showScheduleDialog = false;
  }

  startCount(count: CountSchedule) {
    // Navigate to stock adjustment with pre-filled data
  }

  editCount(count: CountSchedule) {
    // Open edit dialog
  }

  cancelCount(count: CountSchedule) {
    // Confirm and cancel
  }
}