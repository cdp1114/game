import { EventEmitter } from '../core/EventEmitter';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  condition: () => boolean;
  reward?: AchievementReward;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  target?: number;
}

export type AchievementCategory = 'building' | 'exploration' | 'combat' | 'collection' | 'social' | 'special';

export interface AchievementReward {
  experience?: number;
  gold?: number;
  items?: { id: string; name: string; amount: number }[];
  title?: string;
}

export interface AchievementNotification {
  achievement: Achievement;
  message: string;
}

export class AchievementSystem extends EventEmitter {
  private achievements: Map<string, Achievement> = new Map();
  private recentUnlocks: Achievement[] = [];
  private notificationQueue: AchievementNotification[] = [];
  private isShowingNotification: boolean = false;
  
  private notificationElement: HTMLDivElement | null = null;
  
  constructor() {
    super();
    this.initializeAchievements();
    this.createNotificationElement();
  }
  
  private initializeAchievements(): void {
    this.addAchievement({
      id: 'first_block',
      name: '第一块方块',
      description: '放置你的第一个方块',
      icon: '🧱',
      category: 'building',
      condition: () => this.getStat('blocksPlaced') >= 1,
      target: 1,
      reward: { experience: 10 }
    });
    
    this.addAchievement({
      id: 'builder_10',
      name: '小小建筑师',
      description: '放置10个方块',
      icon: '🏗️',
      category: 'building',
      condition: () => this.getStat('blocksPlaced') >= 10,
      target: 10,
      reward: { experience: 50, gold: 100 }
    });
    
    this.addAchievement({
      id: 'builder_100',
      name: '建筑师',
      description: '放置100个方块',
      icon: '🏘️',
      category: 'building',
      condition: () => this.getStat('blocksPlaced') >= 100,
      target: 100,
      reward: { experience: 200, gold: 500 }
    });
    
    this.addAchievement({
      id: 'builder_1000',
      name: '建筑大师',
      description: '放置1000个方块',
      icon: '🏛️',
      category: 'building',
      condition: () => this.getStat('blocksPlaced') >= 1000,
      target: 1000,
      reward: { experience: 1000, gold: 5000, title: '建筑大师' }
    });
    
    this.addAchievement({
      id: 'miner_first',
      name: '矿工新手',
      description: '挖掘你的第一个方块',
      icon: '⛏️',
      category: 'collection',
      condition: () => this.getStat('blocksMined') >= 1,
      target: 1,
      reward: { experience: 10 }
    });
    
    this.addAchievement({
      id: 'miner_50',
      name: '挖矿达人',
      description: '挖掘50个方块',
      icon: '⚒️',
      category: 'collection',
      condition: () => this.getStat('blocksMined') >= 50,
      target: 50,
      reward: { experience: 150 }
    });
    
    this.addAchievement({
      id: 'diamond_hunter',
      name: '钻石猎人',
      description: '挖掘一块钻石矿石',
      icon: '💎',
      category: 'collection',
      condition: () => this.getStat('diamondsMined') >= 1,
      target: 1,
      reward: { experience: 500, gold: 1000 }
    });
    
    this.addAchievement({
      id: 'gold_rush',
      name: '淘金热',
      description: '挖掘10块金矿',
      icon: '🥇',
      category: 'collection',
      condition: () => this.getStat('goldMined') >= 10,
      target: 10,
      reward: { experience: 300, gold: 500 }
    });
    
    this.addAchievement({
      id: 'explorer',
      name: '探索者',
      description: '探索500米的距离',
      icon: '🧭',
      category: 'exploration',
      condition: () => this.getStat('distanceTraveled') >= 500,
      target: 500,
      reward: { experience: 100 }
    });
    
    this.addAchievement({
      id: 'marathon',
      name: '马拉松选手',
      description: '累计行走1000米',
      icon: '🏃',
      category: 'exploration',
      condition: () => this.getStat('distanceTraveled') >= 1000,
      target: 1000,
      reward: { experience: 300 }
    });
    
    this.addAchievement({
      id: 'world_traveler',
      name: '世界旅行者',
      description: '探索整个地图',
      icon: '🌍',
      category: 'exploration',
      condition: () => this.getStat('chunksExplored') >= 16,
      target: 16,
      reward: { experience: 500, gold: 2000 }
    });
    
    this.addAchievement({
      id: 'sky_high',
      name: '一览众山小',
      description: '到达高度50的地方',
      icon: '🏔️',
      category: 'exploration',
      condition: () => this.getStat('maxHeight') >= 50,
      target: 50,
      reward: { experience: 200 }
    });
    
    this.addAchievement({
      id: 'deep_diver',
      name: '深渊探险',
      description: '到达深度10的地方',
      icon: '🌊',
      category: 'exploration',
      condition: () => this.getStat('minDepth') <= -10,
      target: -10,
      reward: { experience: 200 }
    });
    
    this.addAchievement({
      id: 'collector_10',
      name: '收藏家',
      description: '收集10种不同的物品',
      icon: '📦',
      category: 'collection',
      condition: () => this.getStat('uniqueItems') >= 10,
      target: 10,
      reward: { experience: 100, gold: 200 }
    });
    
    this.addAchievement({
      id: 'collector_25',
      name: '大收藏家',
      description: '收集25种不同的物品',
      icon: '🏆',
      category: 'collection',
      condition: () => this.getStat('uniqueItems') >= 25,
      target: 25,
      reward: { experience: 300, gold: 1000 }
    });
    
    this.addAchievement({
      id: 'variety_builder',
      name: '多元建造者',
      description: '使用过10种不同的方块',
      icon: '🎨',
      category: 'building',
      condition: () => this.getStat('uniqueBlocksUsed') >= 10,
      target: 10,
      reward: { experience: 150 }
    });
    
    this.addAchievement({
      id: 'survivor',
      name: '生存达人',
      description: '存活超过10分钟',
      icon: '⏰',
      category: 'special',
      condition: () => this.getStat('playTime') >= 600,
      target: 600,
      reward: { experience: 200 }
    });
    
    this.addAchievement({
      id: 'veteran',
      name: '资深玩家',
      description: '存活超过1小时',
      icon: '⌛',
      category: 'special',
      condition: () => this.getStat('playTime') >= 3600,
      target: 3600,
      reward: { experience: 1000, gold: 3000 }
    });
    
    this.addAchievement({
      id: 'night_owl',
      name: '夜猫子',
      description: '在夜晚进行建造',
      icon: '🦉',
      category: 'special',
      condition: () => this.getStat('nightBuild') >= 1,
      target: 1,
      reward: { experience: 50 }
    });
    
    this.addAchievement({
      id: 'speed_builder',
      name: '快手建造',
      description: '在5秒内放置5个方块',
      icon: '⚡',
      category: 'building',
      condition: () => this.hasSpeedBuildAchievement(),
      reward: { experience: 150 }
    });
  }
  
  private stats: Map<string, number> = new Map();
  private recentBlockPlacements: number[] = [];
  
  private getStat(name: string): number {
    return this.stats.get(name) || 0;
  }
  
  private hasSpeedBuildAchievement(): boolean {
    const now = Date.now();
    const recent = this.recentBlockPlacements.filter(t => now - t < 5000);
    return recent.length >= 5;
  }
  
  private createNotificationElement(): void {
    this.notificationElement = document.createElement('div');
    this.notificationElement.id = 'achievement-notification';
    this.notificationElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 4000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(this.notificationElement);
  }
  
  public addAchievement(achievement: Omit<Achievement, 'unlocked'>): void {
    const fullAchievement: Achievement = {
      ...achievement,
      unlocked: false
    };
    this.achievements.set(achievement.id, fullAchievement);
  }
  
  public updateStat(name: string, value: number): void {
    this.stats.set(name, value);
    this.checkAchievements();
  }
  
  public incrementStat(name: string, amount: number = 1): void {
    const current = this.getStat(name);
    this.stats.set(name, current + amount);
    
    if (name === 'blocksPlaced') {
      this.recentBlockPlacements.push(Date.now());
      this.recentBlockPlacements = this.recentBlockPlacements.filter(t => Date.now() - t < 10000);
    }
    
    this.checkAchievements();
  }
  
  public checkAchievements(): void {
    this.achievements.forEach((achievement, id) => {
      if (!achievement.unlocked && achievement.condition()) {
        this.unlockAchievement(id);
      }
      
      if (achievement.target !== undefined && !achievement.unlocked) {
        achievement.progress = this.getStat(id.replace(/_/g, ''));
      }
    });
  }
  
  private unlockAchievement(id: string): void {
    const achievement = this.achievements.get(id);
    if (!achievement || achievement.unlocked) return;
    
    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    
    this.recentUnlocks.unshift(achievement);
    if (this.recentUnlocks.length > 10) {
      this.recentUnlocks.pop();
    }
    
    this.showNotification(achievement);
    
    this.emit('achievementUnlocked', { achievement });
    
    if (achievement.reward) {
      this.emit('rewardGranted', { reward: achievement.reward });
    }
  }
  
  private showNotification(achievement: Achievement): void {
    this.notificationQueue.push({
      achievement,
      message: `🏆 成就解锁: ${achievement.name}`
    });
    
    this.processNotificationQueue();
  }
  
  private processNotificationQueue(): void {
    if (this.isShowingNotification || this.notificationQueue.length === 0) return;
    
    this.isShowingNotification = true;
    const { achievement } = this.notificationQueue.shift()!;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: linear-gradient(135deg, rgba(40, 40, 50, 0.98), rgba(20, 20, 30, 0.98));
      border: 2px solid #FFD700;
      border-radius: 12px;
      padding: 16px 20px;
      color: white;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
      animation: slideIn 0.5s ease, slideOut 0.5s ease 3s forwards;
      pointer-events: none;
    `;
    
    notification.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:40px;">${achievement.icon}</div>
        <div>
          <div style="color:#FFD700;font-weight:bold;font-size:16px;margin-bottom:4px;">🏆 成就解锁</div>
          <div style="font-size:14px;">${achievement.name}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;">${achievement.description}</div>
        </div>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    this.notificationElement?.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
      style.remove();
      this.isShowingNotification = false;
      this.processNotificationQueue();
    }, 3500);
  }
  
  public getAchievement(id: string): Achievement | undefined {
    return this.achievements.get(id);
  }
  
  public getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }
  
  public getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.category === category);
  }
  
  public getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.unlocked);
  }
  
  public getLockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => !a.unlocked);
  }
  
  public getProgress(): { unlocked: number; total: number; percentage: number } {
    const all = this.getAllAchievements();
    const unlocked = this.getUnlockedAchievements();
    return {
      unlocked: unlocked.length,
      total: all.length,
      percentage: Math.round((unlocked.length / all.length) * 100)
    };
  }
  
  public getRecentUnlocks(): Achievement[] {
    return this.recentUnlocks;
  }
  
  public save(): { 
    unlocked: string[]; 
    stats: [string, number][];
    unlockedAt: [string, number][]
  } {
    const unlocked: string[] = [];
    const unlockedAt: [string, number][] = [];
    
    this.achievements.forEach((a, id) => {
      if (a.unlocked) {
        unlocked.push(id);
        if (a.unlockedAt) {
          unlockedAt.push([id, a.unlockedAt]);
        }
      }
    });
    
    return {
      unlocked,
      stats: Array.from(this.stats.entries()),
      unlockedAt
    };
  }
  
  public load(data: { unlocked: string[]; stats: [string, number][]; unlockedAt: [string, number][] }): void {
    data.unlocked.forEach(id => {
      const achievement = this.achievements.get(id);
      if (achievement) {
        achievement.unlocked = true;
      }
    });
    
    const atMap = new Map(data.unlockedAt);
    this.achievements.forEach((a, id) => {
      if (a.unlocked && atMap.has(id)) {
        a.unlockedAt = atMap.get(id);
      }
    });
    
    this.stats = new Map(data.stats);
  }
  
  public dispose(): void {
    this.notificationElement?.remove();
  }
}
