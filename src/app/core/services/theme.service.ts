import { Injectable, computed, effect, signal } from "@angular/core";

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  private readonly AUTO_THEME_KEY = 'app-auto-theme';
  
  // Signal pour le thème actuel
  currentTheme = signal<Theme>(this.getInitialTheme());
  autoTheme = signal<boolean>(this.getAutoTheme());
  
  // Computed pour savoir si on est en dark mode
  isDarkTheme = computed(() => this.currentTheme() === 'dark');

  constructor() {
    // Appliquer le thème initial
    this.applyTheme(this.currentTheme());

    // Écouter les changements de préférence système
    this.setupSystemThemeListener();

    // Effet pour persister les changements
    effect(() => {
      const theme = this.currentTheme();
      const auto = this.autoTheme();
      
      localStorage.setItem(this.THEME_KEY, theme);
      localStorage.setItem(this.AUTO_THEME_KEY, auto.toString());
      
      this.applyTheme(theme);
    });
  }

  private getInitialTheme(): Theme {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    
    // Détection automatique si activée
    if (this.getAutoTheme()) {
      return this.getSystemTheme();
    }
    
    return 'light'; // Par défaut
  }

  private getAutoTheme(): boolean {
    const saved = localStorage.getItem(this.AUTO_THEME_KEY);
    return saved === 'true' || saved === null; // Par défaut true
  }

  private getSystemTheme(): Theme {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private setupSystemThemeListener() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (this.autoTheme()) {
          this.currentTheme.set(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
    themeOptions = [
    { label: 'Clair', value: 'light', icon: 'pi pi-sun' },
    { label: 'Sombre', value: 'dark', icon: 'pi pi-moon' },
    { label: 'Auto', value: 'auto', icon: 'pi pi-desktop' }
  ];

  colorSchemeOptions = [
    { label: 'Bleu', value: 'blue', color: '#3B82F6' },
    { label: 'Vert', value: 'green', color: '#10B981' },
    { label: 'Violet', value: 'purple', color: '#8B5CF6' },
    { label: 'Orange', value: 'orange', color: '#F59E0B' },
    { label: 'Indigo', value: 'indigo', color: '#6366F1' }
  ];

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
  }

  toggleTheme() {
    this.currentTheme.update(theme => theme === 'light' ? 'dark' : 'light');
    this.autoTheme.set(false); // Désactiver auto quand l'utilisateur change manuellement
  }

  setAutoTheme(enabled: boolean) {
    this.autoTheme.set(enabled);
    if (enabled) {
      this.currentTheme.set(this.getSystemTheme());
    }
  }

  private applyTheme(theme: Theme) {
    // Changer l'attribut data-theme pour PrimeNG
    document.documentElement.setAttribute('data-theme', theme);
    
    // Appliquer les classes CSS
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${theme}-theme`);
    
    // Mettre à jour la balise meta theme-color
    this.updateThemeColor(theme);
  }

  private updateThemeColor(theme: Theme) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = theme === 'dark' ? '#1e293b' : '#ffffff';
      metaThemeColor.setAttribute('content', color);
    }
  }
}