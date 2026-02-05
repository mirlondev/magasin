import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { Select } from "primeng/select";
import { Store, StoreStatus, StoreType } from "../../../core/models";

interface StoreFormData {
  name: string;
  storeType: StoreType;
  status: StoreStatus;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  openingHours: string;
  latitude: number | null;
  longitude: number | null;
}

@Component({
  selector: 'app-store-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    Select
],
  template: `
    <form #storeForm="ngForm" (ngSubmit)="onSubmit()" class="p-fluid">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Left Column -->
        <div class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium mb-2">Nom *</label>
            <input pInputText 
                   id="name" 
                   name="name" 
                   [(ngModel)]="formData().name"
                   required
                   class="w-full"
                   [class.p-invalid]="submitted && !formData().name" />
            @if (submitted && !formData().name) {
              <small class="p-error">Le nom est obligatoire</small>
            }
          </div>

          <div>
            <label for="storeType" class="block text-sm font-medium mb-2">Type *</label>
            <p-select [options]="storeTypeOptions" 
                       [(ngModel)]="formData().storeType"
                       name="storeType"
                       required
                       placeholder="Sélectionnez un type"
                       class="w-full"
                       [class.p-invalid]="submitted && !formData().storeType">
            </p-select>
            @if (submitted && !formData().storeType) {
              <small class="p-error">Le type est obligatoire</small>
            }
          </div>

          <div>
            <label for="status" class="block text-sm font-medium mb-2">Statut *</label>
            <p-select [options]="statusOptions" 
                       [(ngModel)]="formData().status"
                       name="status"
                       required
                       placeholder="Sélectionnez un statut"
                       class="w-full"
                       [class.p-invalid]="submitted && !formData().status">
            </p-select>
            @if (submitted && !formData().status) {
              <small class="p-error">Le statut est obligatoire</small>
            }
          </div>

          <div>
            <label for="phone" class="block text-sm font-medium mb-2">Téléphone *</label>
            <input pInputText 
                   id="phone" 
                   name="phone" 
                   [(ngModel)]="formData().phone"
                   required
                   class="w-full"
                   [class.p-invalid]="submitted && !formData().phone" />
            @if (submitted && !formData().phone) {
              <small class="p-error">Le téléphone est obligatoire</small>
            }
          </div>

          <div>
            <label for="email" class="block text-sm font-medium mb-2">Email *</label>
            <input pInputText 
                   id="email" 
                   name="email" 
                   type="email"
                   [(ngModel)]="formData().email"
                   required
                   class="w-full"
                   [class.p-invalid]="submitted && !formData().email" />
            @if (submitted && !formData().email) {
              <small class="p-error">L'email est obligatoire</small>
            }
          </div>
        </div>

        <!-- Right Column -->
        <div class="space-y-4">
          <div>
            <label for="address" class="block text-sm font-medium mb-2">Adresse *</label>
            <textarea  
                      id="address" 
                      name="address" 
                      [(ngModel)]="formData().address"
                      required
                      rows="2"
                      class="w-full"
                      [class.p-invalid]="submitted && !formData().address">
            </textarea>
            @if (submitted && !formData().address) {
              <small class="p-error">L'adresse est obligatoire</small>
            }
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label for="city" class="block text-sm font-medium mb-2">Ville *</label>
              <input pInputText 
                     id="city" 
                     name="city" 
                     [(ngModel)]="formData().city"
                     required
                     class="w-full"
                     [class.p-invalid]="submitted && !formData().city" />
              @if (submitted && !formData().city) {
                <small class="p-error">La ville est obligatoire</small>
              }
            </div>

            <div>
              <label for="postalCode" class="block text-sm font-medium mb-2">Code postal</label>
              <input pInputText 
                     id="postalCode" 
                     name="postalCode" 
                     [(ngModel)]="formData().postalCode"
                     class="w-full" />
            </div>

            <div>
              <label for="country" class="block text-sm font-medium mb-2">Pays *</label>
              <input pInputText 
                     id="country" 
                     name="country" 
                     [(ngModel)]="formData().country"
                     required
                     class="w-full"
                     [class.p-invalid]="submitted && !formData().country" />
              @if (submitted && !formData().country) {
                <small class="p-error">Le pays est obligatoire</small>
              }
            </div>
          </div>

          <div>
            <label for="openingHours" class="block text-sm font-medium mb-2">Heures d'ouverture</label>
            <input pInputText 
                   id="openingHours" 
                   name="openingHours" 
                   [(ngModel)]="formData().openingHours"
                   placeholder="ex: 9h-18h, Lun-Sam"
                   class="w-full" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="latitude" class="block text-sm font-medium mb-2">Latitude</label>
              <p-inputNumber 
                id="latitude" 
                name="latitude" 
                [(ngModel)]="formData().latitude"
                [min]="-90" 
                [max]="90"
                [step]="0.000001"
                mode="decimal"
                class="w-full" />
            </div>

            <div>
              <label for="longitude" class="block text-sm font-medium mb-2">Longitude</label>
              <p-inputNumber 
                id="longitude" 
                name="longitude" 
                [(ngModel)]="formData().longitude"
                [min]="-180" 
                [max]="180"
                [step]="0.000001"
                mode="decimal"
                class="w-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-2 mt-6 pt-4 border-t">
        <button pButton 
                type="button" 
                label="Annuler" 
                class="p-button-outlined"
                (click)="cancel.emit()"
                [disabled]="loading">
        </button>
        
        <button pButton 
                type="submit" 
                [label]="loading ? 'Enregistrement...' : 'Enregistrer'"
                [disabled]="loading"
                icon="pi pi-check"
                class="p-button-success">
        </button>
      </div>
    </form>
  `
})
export class StoreFormComponent {
  @Input() set store(value: Store | null) {
    if (value) {
      this.formData.set({
        name: value.name,
        storeType: value.storeType,
        status: value.status,
        phone: value.phone,
        email: value.email,
        address: value.address,
        city: value.city,
        postalCode: value.postalCode,
        country: value.country,
        openingHours: value.openingHours || '',
        latitude: value.latitude || null,
        longitude: value.longitude || null
      });
    } else {
      this.resetForm();
    }
  }

  @Input() loading = false;
  @Output() save = new EventEmitter<Partial<Store>>();
  @Output() cancel = new EventEmitter<void>();

  submitted = false;
  
  formData = signal<StoreFormData>({
    name: '',
    storeType: StoreType.SHOP,
    status: StoreStatus.PENDING,
    phone: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    openingHours: '',
    latitude: null,
    longitude: null
  });

  storeTypeOptions = [
    { label: 'Boutique', value: StoreType.SHOP },
    { label: 'Entrepôt', value: StoreType.WAREHOUSE }
  ];

  statusOptions = [
    { label: 'Actif', value: StoreStatus.ACTIVE },
    { label: 'Fermé', value: StoreStatus.CLOSED },
    { label: 'En attente', value: StoreStatus.PENDING }
  ];

  private resetForm() {
    this.formData.set({
      name: '',
      storeType: StoreType.SHOP,
      status: StoreStatus.PENDING,
      phone: '',
      email: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      openingHours: '',
      latitude: null,
      longitude: null
    });
    this.submitted = false;
  }

  onSubmit() {
    this.submitted = true;

    // Validate required fields
    const requiredFields = ['name', 'storeType', 'status', 'phone', 'email', 'address', 'city', 'country'];
    const isValid = requiredFields.every(field => 
      this.formData()[field as keyof StoreFormData]
    );

    if (isValid) {
      const storeData: Partial<Store> = {
        ...this.formData(),
        latitude: this.formData().latitude || undefined,
        longitude: this.formData().longitude || undefined,
        isActive: this.formData().status === StoreStatus.ACTIVE
      };
      
      this.save.emit(storeData);
    }
  }
}