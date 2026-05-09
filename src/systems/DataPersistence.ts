import { EventEmitter } from '../core/EventEmitter';

export interface GameSaveData {
  version: string;
  timestamp: number;
  player: PlayerData;
  crops: CropSaveData[];
  beasts: BeastSaveData[];
  buildings: BuildingSaveData[];
  inventory: InventorySaveData;
  story: StorySaveData;
  achievements: AchievementSaveData;
  settings: SettingsData;
}

export interface PlayerData {
  position: { x: number; y: number; z: number };
  level: number;
  experience: number;
  coins: number;
  playTime: number;
}

export interface CropSaveData {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  plantedAt: number;
  growthStage: number;
  watered: boolean;
}

export interface BeastSaveData {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number; z: number };
  intimacy: number;
  health: number;
  state: string;
  equipped: boolean;
}

export interface BuildingSaveData {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  level: number;
  upgrades: string[];
}

export interface InventorySaveData {
  items: ItemData[];
  hotbar: string[];
  capacity: number;
}

export interface ItemData {
  id: string;
  type: string;
  name: string;
  quantity: number;
  quality?: number;
  metadata?: { [key: string]: any };
}

export interface StorySaveData {
  completedDialogues: string[];
  activeQuests: string[];
  completedQuests: string[];
  storyProgress: number;
}

export interface AchievementSaveData {
  unlocked: string[];
  stats: {
    totalHarvests: number;
    totalBuildings: number;
    totalBeastFriends: number;
    playTime: number;
    distanceTraveled: number;
  };
}

export interface SettingsData {
  soundVolume: number;
  musicVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  showFPS: boolean;
  showTutorialHints: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const SAVE_VERSION = '1.0.0';
const MAX_SAVE_SIZE = 10 * 1024 * 1024;

export class LocalDataManager extends EventEmitter {
  private saveKey: string = 'xingye_qisu_save';
  private autoSaveInterval: number = 60000;
  private autoSaveTimer: number | null = null;
  private encryptionEnabled: boolean = false;
  private encryptionKey: string = '';

  constructor() {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('beforeunload', () => {
      this.emit('beforeUnload');
    });
  }

  public enableEncryption(key: string): void {
    this.encryptionKey = key;
    this.encryptionEnabled = true;
  }

  public disableEncryption(): void {
    this.encryptionEnabled = false;
    this.encryptionKey = '';
  }

  private encrypt(data: string): string {
    if (!this.encryptionEnabled || !this.encryptionKey) {
      return data;
    }

    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }
    return btoa(result);
  }

  private decrypt(data: string): string {
    if (!this.encryptionEnabled || !this.encryptionKey) {
      return data;
    }

    const decoded = atob(data);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }
    return result;
  }

  public save(data: GameSaveData): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        data.version = SAVE_VERSION;
        data.timestamp = Date.now();

        const jsonString = JSON.stringify(data);
        
        if (jsonString.length > MAX_SAVE_SIZE) {
          console.warn('Save data exceeds maximum size');
          this.emit('saveWarning', { message: '存档数据过大' });
        }

        const processedData = this.encryptionEnabled 
          ? this.encrypt(jsonString) 
          : jsonString;

        localStorage.setItem(this.saveKey, processedData);
        
        this.emit('saveComplete', { timestamp: data.timestamp });
        console.log('游戏已保存');
        resolve(true);
      } catch (error) {
        console.error('保存失败:', error);
        this.emit('saveError', { error });
        resolve(false);
      }
    });
  }

  public load(): Promise<GameSaveData | null> {
    return new Promise((resolve) => {
      try {
        const stored = localStorage.getItem(this.saveKey);
        
        if (!stored) {
          resolve(null);
          return;
        }

        const processedData = this.encryptionEnabled 
          ? this.decrypt(stored) 
          : stored;

        const data = JSON.parse(processedData) as GameSaveData;

        if (data.version !== SAVE_VERSION) {
          this.emit('versionMismatch', { 
            saved: data.version, 
            current: SAVE_VERSION 
          });
        }

        this.emit('loadComplete', { timestamp: data.timestamp });
        resolve(data);
      } catch (error) {
        console.error('加载失败:', error);
        this.emit('loadError', { error });
        resolve(null);
      }
    });
  }

  public delete(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        localStorage.removeItem(this.saveKey);
        this.emit('deleteComplete');
        resolve(true);
      } catch (error) {
        console.error('删除失败:', error);
        resolve(false);
      }
    });
  }

  public exists(): boolean {
    return localStorage.getItem(this.saveKey) !== null;
  }

  public getSaveInfo(): { exists: boolean; timestamp: number | null; version: string | null } {
    const stored = localStorage.getItem(this.saveKey);
    
    if (!stored) {
      return { exists: false, timestamp: null, version: null };
    }

    try {
      const processedData = this.encryptionEnabled 
        ? this.decrypt(stored) 
        : stored;

      const data = JSON.parse(processedData);
      return {
        exists: true,
        timestamp: data.timestamp || null,
        version: data.version || null
      };
    } catch {
      return { exists: true, timestamp: null, version: null };
    }
  }

  public startAutoSave(getSaveData: () => GameSaveData): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = window.setInterval(async () => {
      const data = getSaveData();
      await this.save(data);
      this.emit('autoSave');
    }, this.autoSaveInterval);

    this.emit('autoSaveStarted', { interval: this.autoSaveInterval });
  }

  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.emit('autoSaveStopped');
    }
  }

  public setAutoSaveInterval(interval: number): void {
    this.autoSaveInterval = interval;
  }

  public exportSave(): string {
    const stored = localStorage.getItem(this.saveKey);
    if (!stored) return '';
    return stored;
  }

  public importSave(data: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        JSON.parse(data);
        localStorage.setItem(this.saveKey, data);
        this.emit('importComplete');
        resolve(true);
      } catch {
        this.emit('importError');
        resolve(false);
      }
    });
  }
}

export class ServerValidator extends EventEmitter {
  private serverUrl: string = '';
  private enabled: boolean = false;

  constructor() {
    super();
  }

  public enableValidation(serverUrl: string): void {
    this.serverUrl = serverUrl;
    this.enabled = true;
  }

  public disableValidation(): void {
    this.enabled = false;
    this.serverUrl = '';
  }

  public validateCropGrowth(data: CropSaveData[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const now = Date.now();

    data.forEach(crop => {
      const timeSincePlanted = now - crop.plantedAt;
      const expectedGrowth = timeSincePlanted / 60000;

      if (crop.growthStage > expectedGrowth * 1.1) {
        errors.push(`作物 ${crop.id} 生长阶段异常`);
      }

      if (timeSincePlanted < 0) {
        errors.push(`作物 ${crop.id} 种植时间异常`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  public validateResourceCollection(
    action: { type: string; amount: number; timestamp: number },
    _currentInventory: ItemData[]
  ): boolean {
    if (!this.enabled) return true;

    if (action.amount > 10000) {
      return false;
    }

    const tenMinutesAgo = Date.now() - 600000;
    if (action.timestamp < tenMinutesAgo) {
      return false;
    }

    return true;
  }

  public validateBeastAction(action: { type: string; beastId: string }): boolean {
    if (!this.enabled) return true;

    const validActions = ['feed', 'pet', 'play', 'release'];
    if (!validActions.includes(action.type)) {
      return false;
    }

    return true;
  }

  public async calculateOfflineEarnings(data: GameSaveData): Promise<{
    cropsHarvested: number;
    resourcesGained: ItemData[];
    timeBonus: number;
  }> {
    if (!this.enabled && !this.serverUrl) {
      return {
        cropsHarvested: 0,
        resourcesGained: [],
        timeBonus: 0
      };
    }

    const now = Date.now();
    const lastSave = data.timestamp;
    const offlineTime = Math.min(now - lastSave, 8 * 60 * 60 * 1000);

    const cropCount = data.crops.filter(c => c.growthStage >= 4).length;
    const baseHarvest = Math.floor(cropCount * (offlineTime / 3600000) * 0.5);
    const timeBonus = Math.floor(offlineTime / 3600000) * 10;

    return {
      cropsHarvested: baseHarvest,
      resourcesGained: [
        { id: 'coin', type: 'currency', name: '金币', quantity: timeBonus }
      ],
      timeBonus
    };
  }

  public validateAction(action: GameAction): boolean {
    switch (action.type) {
      case 'harvest':
        return this.validateHarvest(action);
      case 'build':
        return this.validateBuild(action);
      case 'trade':
        return this.validateTrade(action);
      default:
        return true;
    }
  }

  private validateHarvest(action: GameAction): boolean {
    if (action.data && typeof action.data.amount === 'number') {
      return action.data.amount <= 100;
    }
    return true;
  }

  private validateBuild(action: GameAction): boolean {
    if (action.data && typeof action.data.cost === 'number') {
      return action.data.cost >= 0;
    }
    return true;
  }

  private validateTrade(action: GameAction): boolean {
    if (action.data && typeof action.data.price === 'number') {
      return action.data.price > 0;
    }
    return true;
  }
}

export interface GameAction {
  type: 'harvest' | 'build' | 'trade' | 'craft' | 'feed' | 'custom';
  data?: { [key: string]: any };
  timestamp: number;
  playerId?: string;
}

export class DataVersionManager extends EventEmitter {
  private currentVersion: string = SAVE_VERSION;
  private migrationHandlers: Map<string, (data: any) => any> = new Map();

  constructor() {
    super();
    this.registerDefaultMigrations();
  }

  private registerDefaultMigrations(): void {
    this.migrationHandlers.set('0.9.0', (data) => {
      data.achievements = {
        unlocked: [],
        stats: {
          totalHarvests: 0,
          totalBuildings: 0,
          totalBeastFriends: 0,
          playTime: 0,
          distanceTraveled: 0
        }
      };
      return data;
    });

    this.migrationHandlers.set('0.9.5', (data) => {
      data.settings = {
        soundVolume: 0.7,
        musicVolume: 0.5,
        graphicsQuality: 'medium',
        showFPS: false,
        showTutorialHints: true
      };
      return data;
    });
  }

  public migrate(data: GameSaveData): GameSaveData {
    const savedVersion = data.version || '0.0.0';
    
    if (this.compareVersions(savedVersion, this.currentVersion) >= 0) {
      return data;
    }

    let migratedData = { ...data };

    const versions = Array.from(this.migrationHandlers.keys())
      .filter(v => this.compareVersions(v, savedVersion) > 0)
      .sort((a, b) => this.compareVersions(a, b));

    versions.forEach(version => {
      const handler = this.migrationHandlers.get(version);
      if (handler) {
        migratedData = handler(migratedData);
        this.emit('migration', { from: savedVersion, to: version });
      }
    });

    migratedData.version = this.currentVersion;
    return migratedData;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }

  public registerMigration(version: string, handler: (data: any) => any): void {
    this.migrationHandlers.set(version, handler);
  }
}

export class CloudSyncManager extends EventEmitter {
  private serverUrl: string = '';
  private syncInterval: number = 300000;
  private syncTimer: number | null = null;
  private isSyncing: boolean = false;
  private lastSyncTime: number = 0;

  constructor() {
    super();
  }

  public configure(serverUrl: string, syncInterval?: number): void {
    this.serverUrl = serverUrl;
    if (syncInterval) {
      this.syncInterval = syncInterval;
    }
  }

  public async sync(localData: GameSaveData): Promise<boolean> {
    if (!this.serverUrl || this.isSyncing) {
      return false;
    }

    this.isSyncing = true;
    this.emit('syncStart');

    try {
      const response = await fetch(`${this.serverUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localData)
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const serverData = await response.json();
      this.lastSyncTime = Date.now();
      this.emit('syncComplete', { serverData });
      return true;
    } catch (error) {
      this.emit('syncError', { error });
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  public startAutoSync(getLocalData: () => GameSaveData): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = window.setInterval(async () => {
      const data = getLocalData();
      await this.sync(data);
    }, this.syncInterval);
  }

  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  public isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}
