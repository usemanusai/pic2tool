import { globalShortcut, Notification, nativeImage } from 'electron';
import * as log from 'electron-log';
import * as path from 'path';

export interface ShortcutConfig {
  recordingToggle: string;
  enabled: boolean;
}

export interface ShortcutCallbacks {
  onRecordingToggle: () => Promise<void>;
  onShortcutConflict: (shortcut: string, error: string) => void;
}

export class GlobalShortcutManager {
  private config: ShortcutConfig;
  private callbacks: ShortcutCallbacks;
  private registeredShortcuts: Set<string> = new Set();

  constructor(callbacks: ShortcutCallbacks) {
    this.callbacks = callbacks;
    this.config = {
      recordingToggle: 'CommandOrControl+Shift+R',
      enabled: true
    };
    
    log.info('🎹 GlobalShortcutManager initialized');
  }

  public async initialize(): Promise<void> {
    try {
      if (this.config.enabled) {
        await this.registerShortcuts();
        log.info('✅ Global shortcuts initialized successfully');
      } else {
        log.info('⏸️ Global shortcuts disabled in configuration');
      }
    } catch (error) {
      log.error('❌ Failed to initialize global shortcuts:', error);
      throw error;
    }
  }

  public async registerShortcuts(): Promise<void> {
    try {
      // Register recording toggle shortcut
      await this.registerShortcut(
        this.config.recordingToggle,
        'Recording Toggle',
        this.callbacks.onRecordingToggle
      );

      log.info('✅ All global shortcuts registered successfully');
    } catch (error) {
      log.error('❌ Failed to register shortcuts:', error);
      throw error;
    }
  }

  private async registerShortcut(
    accelerator: string,
    description: string,
    callback: () => Promise<void>
  ): Promise<void> {
    try {
      // Check if shortcut is already registered
      if (globalShortcut.isRegistered(accelerator)) {
        const error = `Shortcut ${accelerator} is already registered by another application`;
        log.warn('⚠️ Shortcut conflict:', error);
        this.callbacks.onShortcutConflict(accelerator, error);
        
        // Try alternative shortcuts
        const alternatives = this.getAlternativeShortcuts(accelerator);
        for (const alt of alternatives) {
          if (!globalShortcut.isRegistered(alt)) {
            log.info(`🔄 Trying alternative shortcut: ${alt}`);
            accelerator = alt;
            break;
          }
        }
      }

      // Register the shortcut
      const success = globalShortcut.register(accelerator, async () => {
        try {
          log.info(`🎹 Global shortcut triggered: ${accelerator} (${description})`);
          await this.showShortcutNotification(description);
          await callback();
        } catch (error) {
          log.error('❌ Error executing shortcut callback:', error);
        }
      });

      if (success) {
        this.registeredShortcuts.add(accelerator);
        log.info(`✅ Registered global shortcut: ${accelerator} (${description})`);
      } else {
        const error = `Failed to register shortcut: ${accelerator}`;
        log.error('❌', error);
        this.callbacks.onShortcutConflict(accelerator, error);
      }
    } catch (error) {
      log.error(`❌ Error registering shortcut ${accelerator}:`, error);
      throw error;
    }
  }

  private getAlternativeShortcuts(original: string): string[] {
    const alternatives: string[] = [];
    
    // Generate alternative shortcuts based on the original
    if (original.includes('CommandOrControl+Shift+R')) {
      alternatives.push(
        'CommandOrControl+Alt+R',
        'CommandOrControl+Shift+F9',
        'CommandOrControl+Alt+F9',
        'F9',
        'F10',
        'CommandOrControl+F12'
      );
    }
    
    return alternatives;
  }

  private async showShortcutNotification(action: string): Promise<void> {
    try {
      // Create notification for shortcut activation
      const notification = new Notification({
        title: 'Automated Development Recorder',
        body: `${action} activated via keyboard shortcut`,
        icon: this.getNotificationIcon(),
        silent: false,
        timeoutType: 'default'
      });

      notification.show();
      
      // Auto-close notification after 3 seconds
      setTimeout(() => {
        notification.close();
      }, 3000);

      log.info(`📢 Shortcut notification shown: ${action}`);
    } catch (error) {
      log.error('❌ Error showing shortcut notification:', error);
    }
  }

  private getNotificationIcon(): string {
    try {
      // Try to use the app icon
      const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
      return iconPath;
    } catch (error) {
      log.warn('⚠️ Could not load notification icon:', error);
      return '';
    }
  }

  public updateShortcut(shortcutType: keyof ShortcutConfig, newShortcut: string): boolean {
    try {
      if (shortcutType === 'enabled') {
        this.config.enabled = newShortcut === 'true';
        if (this.config.enabled) {
          this.registerShortcuts();
        } else {
          this.unregisterAll();
        }
        return true;
      }

      // Unregister old shortcut
      const oldShortcut = this.config[shortcutType];
      if (typeof oldShortcut === 'string' && this.registeredShortcuts.has(oldShortcut)) {
        globalShortcut.unregister(oldShortcut);
        this.registeredShortcuts.delete(oldShortcut);
      }

      // Update config
      if (typeof newShortcut === 'string') {
        this.config[shortcutType] = newShortcut;
      }

      // Re-register shortcuts
      this.registerShortcuts();
      
      log.info(`✅ Updated shortcut ${shortcutType}: ${newShortcut}`);
      return true;
    } catch (error) {
      log.error(`❌ Failed to update shortcut ${shortcutType}:`, error);
      return false;
    }
  }

  public getShortcutConfig(): ShortcutConfig {
    return { ...this.config };
  }

  public isShortcutRegistered(accelerator: string): boolean {
    return globalShortcut.isRegistered(accelerator);
  }

  public getRegisteredShortcuts(): string[] {
    return Array.from(this.registeredShortcuts);
  }

  public unregisterAll(): void {
    try {
      globalShortcut.unregisterAll();
      this.registeredShortcuts.clear();
      log.info('✅ All global shortcuts unregistered');
    } catch (error) {
      log.error('❌ Error unregistering shortcuts:', error);
    }
  }

  public async testShortcut(accelerator: string): Promise<boolean> {
    try {
      // Test if a shortcut can be registered
      const testSuccess = globalShortcut.register(accelerator, () => {
        log.info(`🧪 Test shortcut triggered: ${accelerator}`);
      });

      if (testSuccess) {
        globalShortcut.unregister(accelerator);
        log.info(`✅ Shortcut test successful: ${accelerator}`);
        return true;
      } else {
        log.warn(`⚠️ Shortcut test failed: ${accelerator}`);
        return false;
      }
    } catch (error) {
      log.error(`❌ Error testing shortcut ${accelerator}:`, error);
      return false;
    }
  }

  public destroy(): void {
    try {
      this.unregisterAll();
      log.info('✅ GlobalShortcutManager destroyed');
    } catch (error) {
      log.error('❌ Error destroying GlobalShortcutManager:', error);
    }
  }
}
