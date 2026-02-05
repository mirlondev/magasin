import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Output, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AvatarModule } from "primeng/avatar";
import { BadgeModule } from "primeng/badge";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { MenuModule } from "primeng/menu";
import { PanelModule } from 'primeng/panel';import { RippleModule } from "primeng/ripple";
import { TieredMenuModule } from "primeng/tieredmenu";
import { TooltipModule } from "primeng/tooltip";
import { EmployeeRole } from "../core/models";
import { AuthService } from "../core/services/auth.service";
import { ThemeService } from "../core/services/theme.service";
import { PopoverModule } from 'primeng/popover';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    ButtonModule,
    AvatarModule,
    BadgeModule,
    MenuModule,
    TieredMenuModule,
    InputTextModule,
    PanelModule,
    TooltipModule,
    RippleModule,
    PopoverModule
  ],
  template: `
    <header class="navbar">
      <div class="navbar-content">
        <!-- Left Section -->
        <div class="navbar-left">
          <button pButton 
                  type="button" 
                  icon="pi pi-bars" 
                  class="p-button-text p-button-rounded sidebar-toggle"
                  (click)="toggleSidebar.emit()"
                  pTooltip="Menu"
                  tooltipPosition="bottom">
          </button>
          
          <div class="navbar-search">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText 
                     type="text" 
                     placeholder="Rechercher..." 
                     [(ngModel)]="searchQuery"
                     (keyup.enter)="onSearch()" />
            </span>
          </div>
        </div>

        <!-- Right Section -->
        <div class="navbar-right">
          <!-- Theme Toggle -->
          <button pButton 
                  type="button" 
                  [icon]="isDarkTheme() ? 'pi pi-sun' : 'pi pi-moon'" 
                  class="p-button-text p-button-rounded"
                  (click)="themeService.toggleTheme()"
                  pTooltip="{{ isDarkTheme() ? 'Mode clair' : 'Mode sombre' }}"
                  tooltipPosition="bottom">
          </button>

          <!-- Notifications -->
          <button pButton 
                  type="button" 
                  icon="pi pi-bell" 
                  class="p-button-text p-button-rounded p-overlay-badge"
                  (click)="notificationsPanel.toggle($event)"
                  pTooltip="Notifications"
                  tooltipPosition="bottom">
            <p-badge severity="danger" value="3" />
          </button>

          <!-- User Menu -->
          <div class="user-menu-wrapper">
            <button pButton 
                    type="button" 
                    class="p-button-text user-menu-trigger"
                    (click)="userMenu.toggle($event)">
              <div class="user-info">
                <p-avatar [label]="userInitials()" 
                         shape="circle" 
                         size="normal"
                         class="mr-2"
                         [style]="{
                           'background-color': 'var(--primary-color)',
                           'color': 'var(--primary-color-text)'
                         }" />
                <div class="user-details">
                  <div class="user-name">{{ userName() }}</div>
                  <div class="user-role">{{ userRoleLabel() }}</div>
                </div>
                <i class="pi pi-chevron-down ml-2"></i>
              </div>
            </button>

            <p-tieredMenu #userMenu 
                         [model]="userMenuItems()" 
                         [popup]="true"
                         appendTo="body" />
          </div>
        </div>
      </div>

      <!-- Notifications Panel -->
      <p-popover #notificationsPanel>
        <div class="notifications-panel">
          <div class="notifications-header">
            <h3>Notifications</h3>
            <button pButton 
                    type="button" 
                    icon="pi pi-check" 
                    label="Tout marquer comme lu" 
                    class="p-button-text p-button-sm" 
                    ></button>
          </div>
          
          <div class="notifications-list">
            @for (notification of notifications(); track notification.id) {
              <div class="notification-item" [class.unread]="!notification.read">
                <div class="notification-icon">
                  <i [class]="'pi ' + notification.icon"></i>
                </div>
                <div class="notification-content">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-message">{{ notification.message }}</div>
                  <div class="notification-time">{{ notification.time }}</div>
                </div>
              </div>
            }
            
            @if (notifications().length === 0) {
              <div class="empty-notifications">
                <i class="pi pi-bell-slash text-3xl text-500"></i>
                <p class="text-500 mt-2">Aucune notification</p>
              </div>
            }
          </div>
          
          <div class="notifications-footer">
            <a routerLink="/notifications" class="text-primary font-medium">Voir toutes</a>
          </div>
        </div>
      </p-popover>
    </header>
  `,
  styles: [`
    .navbar {
      background: var(--surface-card);
      border-bottom: 1px solid var(--surface-border);
      height: 64px;
      position: sticky;
      top: 0;
      z-index: 999;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    
    .navbar-content {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
    }
    
    .navbar-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex: 1;
    }
    
    .navbar-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .navbar-search {
      flex: 1;
      max-width: 400px;
    }
    
    .sidebar-toggle {
      width: 40px;
      height: 40px;
    }
    
    .user-menu-wrapper {
      position: relative;
    }
    
    .user-menu-trigger {
      padding: 0.25rem;
    }
    
    .user-info {
      display: flex;
      align-items: center;
    }
    
    .user-details {
      text-align: left;
      margin-right: 0.5rem;
    }
    
    .user-name {
      font-weight: 600;
      font-size: 0.875rem;
      line-height: 1.25;
    }
    
    .user-role {
      font-size: 0.75rem;
      color: var(--text-color-secondary);
      line-height: 1;
    }
    
    /* Notifications Panel */
    .notifications-panel {
      width: 320px;
      max-height: 400px;
      display: flex;
      flex-direction: column;
    }
    
    .notifications-header {
      padding: 1rem;
      border-bottom: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .notifications-header h3 {
      margin: 0;
      font-size: 1rem;
    }
    
    .notifications-list {
      flex: 1;
      overflow-y: auto;
      max-height: 300px;
    }
    
    .notification-item {
      padding: 1rem;
      border-bottom: 1px solid var(--surface-border);
      display: flex;
      gap: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .notification-item:hover {
      background: var(--surface-hover);
    }
    
    .notification-item.unread {
      background: var(--primary-50);
    }
    
    .notification-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--surface-ground);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .notification-icon i {
      color: var(--primary-color);
    }
    
    .notification-content {
      flex: 1;
    }
    
    .notification-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .notification-message {
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      margin-bottom: 0.25rem;
    }
    
    .notification-time {
      font-size: 0.75rem;
      color: var(--text-color-secondary);
    }
    
    .empty-notifications {
      padding: 2rem;
      text-align: center;
      color: var(--text-color-secondary);
    }
    
    .notifications-footer {
      padding: 1rem;
      border-top: 1px solid var(--surface-border);
      text-align: center;
    }
    
    /* Responsive */
    @media screen and (max-width: 768px) {
      .navbar-content {
        padding: 0 1rem;
      }
      
      .navbar-search {
        display: none;
      }
      
      .user-details {
        display: none;
      }
    }
  `]
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  router = inject(Router);
  
  searchQuery = signal<string>('');
  notifications = signal<any[]>([
    {
      id: 1,
      title: 'Nouvelle commande',
      message: 'Commande #1234 reçue',
      icon: 'pi-shopping-cart',
      time: 'Il y a 5 min',
      read: false
    },
    // ... plus de notifications
  ]);

  // Computed values
  isDarkTheme = computed(() => this.themeService.isDarkTheme());
  userName = computed(() => this.authService.currentUser()?.username || 'Utilisateur');
  userRole = computed(() => this.authService.currentUser()?.userRole);
  
  userInitials = computed(() => {
    const name = this.userName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  });
  
  userRoleLabel = computed(() => {
    const role = this.userRole();
    switch (role) {
      case EmployeeRole.ADMIN: return 'Administrateur';
      case EmployeeRole.STORE_ADMIN: return 'Admin Magasin';
      case EmployeeRole.CASHIER: return 'Caissier';
      case EmployeeRole.DEPOT_MANAGER: return 'Gérant Dépot';
      case EmployeeRole.EMPLOYEE: return 'Employé';
      default: return 'Non connecté';
    }
  });

  userMenuItems = computed(() => [
    {
      label: 'Profil',
      icon: 'pi pi-user',
      command: () => this.goToProfile()
    },
    {
      label: 'Paramètres',
      icon: 'pi pi-cog',
      command: () => this.goToSettings()
    },
    {
      separator: true
    },
    {
      label: 'Déconnexion',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ]);

  onSearch() {
    if (this.searchQuery().trim()) {
      // Implémenter la recherche
      console.log('Search:', this.searchQuery());
    }
  }

  goToProfile() {
    this.router.navigate(['/settings/profile']);
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}