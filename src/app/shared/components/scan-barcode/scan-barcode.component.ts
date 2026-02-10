// scan-barcode.component.ts
import { CommonModule } from "@angular/common";
import { Component, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { TooltipModule } from "primeng/tooltip";

@Component({
  selector: 'app-scan-barcode',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TooltipModule
  ],
  template: `
    <div class="w-full">
      <!-- Manual Input with Scan Button -->
      <div class="flex gap-2">
        <div class="flex-1 relative">
          <input 
            pInputText 
            [(ngModel)]="barcodeInput"
            placeholder="Scanner ou saisir le code-barres..."
            class="w-full pr-10"
            (keyup.enter)="onManualEnter()"
            #barcodeInputRef
          >
          <i class="pi pi-barcode absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        </div>
        <button 
          pButton 
          icon="pi pi-camera" 
          class="p-button-primary"
          (click)="openScanner()"
          pTooltip="Scanner avec la caméra"
        ></button>
      </div>

      <!-- Camera Scanner Dialog -->
      <p-dialog 
        [(visible)]="showScanner" 
        [modal]="true" 
        [style]="{ width: '500px' }"
        header="Scanner un code-barres"
        (onShow)="startCamera()"
        (onHide)="stopCamera()"
      >
        <div class="flex flex-col items-center gap-4">
          <!-- Video Preview -->
          <div class="relative w-full h-64 bg-black rounded-lg overflow-hidden">
            <video 
              #videoElement 
              class="w-full h-full object-cover"
              autoplay 
              playsinline
              muted
            ></video>
            
            <!-- Scanning Overlay -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="w-48 h-32 border-2 border-green-400 rounded-lg relative">
                <div class="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-400 -mt-1 -ml-1"></div>
                <div class="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-400 -mt-1 -mr-1"></div>
                <div class="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-400 -mb-1 -ml-1"></div>
                <div class="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-400 -mb-1 -mr-1"></div>
                
                <!-- Laser Line Animation -->
                <div class="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 opacity-70 animate-scan"></div>
              </div>
            </div>
            
            <!-- Loading State -->
            @if (cameraLoading()) {
              <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <i class="pi pi-spin pi-spinner text-white text-3xl"></i>
              </div>
            }
          </div>

          <!-- Manual Entry Fallback -->
          <div class="w-full">
            <p class="text-sm text-gray-500 mb-2">Ou saisir manuellement :</p>
            <div class="flex gap-2">
              <input 
                pInputText 
                [(ngModel)]="manualBarcode"
                placeholder="Code-barres..."
                class="flex-1"
                (keyup.enter)="onManualScan()"
              >
              <button 
                pButton 
                label="Valider" 
                (click)="onManualScan()"
              ></button>
            </div>
          </div>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm w-full">
              <i class="pi pi-exclamation-circle mr-2"></i>
              {{ errorMessage() }}
            </div>
          }
        </div>

        <ng-template pTemplate="footer">
          <button 
            pButton 
            label="Fermer" 
            icon="pi pi-times"
            class="p-button-outlined"
            (click)="showScanner.set(false)"
          ></button>
        </ng-template>
      </p-dialog>

      <!-- Success Toast -->
      @if (lastScanned()) {
        <div class="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-check-circle text-green-500"></i>
            <span class="text-sm text-green-700">Dernier scan: <strong>{{ lastScanned() }}</strong></span>
          </div>
          <button 
            pButton 
            icon="pi pi-times" 
            class="p-button-text p-button-sm p-0 w-6 h-6"
            (click)="lastScanned.set(null)"
          ></button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes scan {
      0%, 100% { transform: translateY(-20px); opacity: 0; }
      50% { transform: translateY(20px); opacity: 1; }
    }
    .animate-scan {
      animation: scan 2s linear infinite;
    }
  `]
})
export class ScanBarcodeComponent {
  // Output event when barcode is scanned
  scanned = output<string>();
  
  // State signals
  barcodeInput = signal('');
  manualBarcode = signal('');
  showScanner = signal(false);
  cameraLoading = signal(false);
  errorMessage = signal<string | null>(null);
  lastScanned = signal<string | null>(null);
  
  // Video element reference
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private barcodeDetector: any = null;

  openScanner() {
    this.showScanner.set(true);
    this.errorMessage.set(null);
  }

  async startCamera() {
    this.cameraLoading.set(true);
    this.errorMessage.set(null);

    try {
      // Check for BarcodeDetector API support
      if ('BarcodeDetector' in window) {
        this.barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
        });
      }

      // Get camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Set video source
      setTimeout(() => {
        const video = document.querySelector('video');
        if (video) {
          this.videoElement = video;
          video.srcObject = this.stream;
          video.play();
          this.cameraLoading.set(false);
          this.startDetection();
        }
      }, 100);

    } catch (err) {
      this.cameraLoading.set(false);
      this.errorMessage.set('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      console.error('Camera error:', err);
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.videoElement = null;
  }

  private async startDetection() {
    if (!this.barcodeDetector || !this.videoElement) return;

    const detectLoop = async () => {
      if (!this.showScanner() || !this.videoElement) return;

      try {
        const barcodes = await this.barcodeDetector.detect(this.videoElement);
        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue;
          this.onBarcodeDetected(barcode);
          return; // Stop detection after successful scan
        }
      } catch (err) {
        console.error('Detection error:', err);
      }

      // Continue detection loop
      requestAnimationFrame(detectLoop);
    };

    detectLoop();
  }

  onBarcodeDetected(barcode: string) {
    this.lastScanned.set(barcode);
    this.scanned.emit(barcode);
    this.showScanner.set(false);
    this.barcodeInput.set('');
  }

  onManualScan() {
    const code = this.manualBarcode().trim();
    if (code) {
      this.onBarcodeDetected(code);
      this.manualBarcode.set('');
    }
  }

  onManualEnter() {
    const code = this.barcodeInput().trim();
    if (code) {
      this.lastScanned.set(code);
      this.scanned.emit(code);
      this.barcodeInput.set('');
    }
  }
}