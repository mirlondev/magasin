import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter } from "rxjs";
import { ThemeService } from "../core/services/theme.service";
import { NavbarComponent } from "./navbar.component";
import { SidebarComponent } from "./sidebar.component";

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    NavbarComponent
  ],
  template: `
    <div class="layout-wrapper" [class.dark-theme]="isDarkTheme()">
      <!-- Sidebar -->
      <app-sidebar [visible]="sidebarVisible()" 
                  (visibleChange)="sidebarVisible.set($event)" />
      
      <!-- Main Content -->
      <div class="layout-main-container" (click)="onMainContainerClick()">
        <!-- Navbar -->
        <app-navbar (toggleSidebar)="toggleSidebar()" />
        
        <!-- Page Content -->
        <div class="layout-main">
          @if (showLoading()) {
            <div class="loading-overlay">
              <div class="spinner"></div>
            </div>
          }
          
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      min-height: 100vh;
      display: flex;
      background: var(--surface-ground);
      transition: background-color 0.3s ease;
    }
    
    .layout-main-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 100vh;
      margin-left: 280px; /* Largeur de la sidebar */
      transition: margin-left 0.3s ease;
    }
    
    .layout-main {
      flex: 1;
      padding: 2rem;
      position: relative;
      overflow-y: auto;
      max-height: calc(100vh - 64px); /* Hauteur navbar */
    }
    
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.7);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    
    .dark-theme .loading-overlay {
      background: rgba(0, 0, 0, 0.7);
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--primary-color);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Responsive */
    @media screen and (max-width: 992px) {
      .layout-main-container {
        margin-left: 0;
      }
      
      .layout-main {
        padding: 1rem;
      }
    }
    
    /* Print styles */
    @media print {
      .layout-main-container {
        margin-left: 0;
      }
      
      app-navbar,
      app-sidebar {
        display: none;
      }
    }
  `]
})
export class AppLayoutComponent {
  private themeService = inject(ThemeService);
  private router = inject(Router);
  
  sidebarVisible = signal<boolean>(true);
  showLoading = signal<boolean>(false);
  currentRoute = signal<string>('');
  
  isDarkTheme = computed(() => this.themeService.isDarkTheme());

  constructor() {
    // Écouter les changements de route pour le loading
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.urlAfterRedirects);
      this.hideLoading();
    });
  }

  toggleSidebar() {
    this.sidebarVisible.update(visible => !visible);
  }

  onMainContainerClick() {
    // Sur mobile, fermer le sidebar si ouvert
    if (window.innerWidth <= 992 && this.sidebarVisible()) {
      this.sidebarVisible.set(false);
    }
  }

  showLoadingIndicator() {
    this.showLoading.set(true);
  }

  hideLoading() {
    this.showLoading.set(false);
  }
}