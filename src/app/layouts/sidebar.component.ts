import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, computed, inject, signal, effect } from "@angular/core";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { AvatarModule } from "primeng/avatar";
import { BadgeModule } from "primeng/badge";
import { ButtonModule } from "primeng/button";
import { RippleModule } from "primeng/ripple";
import { TooltipModule } from "primeng/tooltip";
import { filter } from "rxjs";
import { EmployeeRole } from "../core/models";
import { AuthService } from "../core/services/auth.service";
import { ThemeService } from "../core/services/theme.service";
import { SidebarContentComponent } from "./app-sidebar-content.component";



@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    AvatarModule,
    BadgeModule,
    RippleModule,
    TooltipModule,
    SidebarContentComponent
],
  template: `
    @if (isMobile()) {
      <!-- Mobile Sidebar Overlay -->
      <div class="mobile-sidebar-overlay" 
           [class.visible]="visibleSignal()"
           (click)="closeSidebar()">
      </div>
      
      <div class="mobile-sidebar" 
           [class.visible]="visibleSignal()">
        <div class="sidebar-header">
          <h2 class="text-xl font-bold">Retail POS</h2>
          <button pButton 
                  icon="pi pi-times" 
                  class="p-button-text p-button-rounded"
                  (click)="closeSidebar()">
          </button>
        </div>
        
        <div class="sidebar-content">
          <app-sidebar-content [collapsed]="false" />
        </div>
      </div>
    } @else {
      <!-- Desktop Sidebar -->
      <div class="sidebar-desktop" [class.collapsed]="collapsed()">
        <div class="sidebar-content">
          <div class="sidebar-header">
            <h2 class="text-xl font-bold" [class.hidden]="collapsed()">Retail POS</h2>
            <button pButton 
                    icon="pi pi-chevron-left" 
                    class="p-button-text p-button-rounded toggle-btn"
                    (click)="toggleCollapse()"
                    pTooltip="{{ collapsed() ? 'Développer' : 'Réduire' }}"
                    tooltipPosition="right">
            </button>
          </div>
          
          <app-sidebar-content [collapsed]="collapsed()" />
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
    
    /* Desktop Sidebar */
    .sidebar-desktop {
      width: 280px;
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 1000;
      background: var(--surface-card);
      border-right: 1px solid var(--surface-border);
      transition: width 0.3s ease;
      overflow: hidden;
    }
    
    .sidebar-desktop.collapsed {
      width: 64px;
    }
    
    .sidebar-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .sidebar-header h2 {
      margin: 0;
      transition: opacity 0.3s ease;
      white-space: nowrap;
    }
    
    .sidebar-header h2.hidden {
      opacity: 0;
      width: 0;
    }
    
    .toggle-btn {
      width: 32px;
      height: 32px;
    }
    
    .sidebar-desktop.collapsed .toggle-btn {
      transform: rotate(180deg);
    }
    
    /* Mobile Sidebar */
    .mobile-sidebar-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1100;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    
    .mobile-sidebar-overlay.visible {
      opacity: 1;
      visibility: visible;
    }
    
    .mobile-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: 280px;
      height: 100%;
      background: var(--surface-card);
      z-index: 1101;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    }
    
    .mobile-sidebar.visible {
      transform: translateX(0);
    }
    
    /* Responsive */
    @media screen and (max-width: 992px) {
      .sidebar-desktop {
        display: none;
      }
    }
    
    @media screen and (min-width: 993px) {
      .mobile-sidebar,
      .mobile-sidebar-overlay {
        display: none;
      }
    }
  `]
})
export class SidebarComponent {
  @Input() set visible(value: boolean) {
    this.visibleSignal.set(value);
  }
  @Output() visibleChange = new EventEmitter<boolean>();
  
  private router = inject(Router);
  private themeService = inject(ThemeService);
  
  // Use a signal for reactive visibility state
  visibleSignal = signal<boolean>(true);
  collapsed = signal<boolean>(false);
  isMobile = signal<boolean>(false);
  activeRoute = signal<string>('');

  constructor() {
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
    
    // Track active route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.activeRoute.set(event.urlAfterRedirects);
      // Auto-close mobile sidebar on navigation
      if (this.isMobile()) {
        this.closeSidebar();
      }
    });
  }

  private checkMobile() {
    const wasMobile = this.isMobile();
    this.isMobile.set(window.innerWidth <= 992);
    
    // Reset collapsed state when switching to mobile
    if (!wasMobile && this.isMobile()) {
      this.collapsed.set(false);
    }
  }

  toggleCollapse() {
    this.collapsed.update(c => !c);
  }
  
  closeSidebar() {
    this.visibleSignal.set(false);
    this.visibleChange.emit(false);
  }
}