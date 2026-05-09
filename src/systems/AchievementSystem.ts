import { EventEmitter } from '../core/EventEmitter';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'crop' | 'building' | 'beast' | 'collection' | 'exploration' | 'special';
  condition: (stats: GameStats) => boolean;
  reward?: { type: string; amount: number };
  unlocked: boolean;
  unlockedAt?: number;
  progress?: { current: number; required: number };
}

export interface GameStats {
  totalHarvests: number;
  totalBuildings: number;
  totalBeastFriends: number;
  cropsHarvested: { [cropId: string]: number };
  buildingsPlaced: { [buildingId: string]: number };
  playTime: number;
  distanceTraveled: number;
  itemsCollected: number;
}

export class AchievementSystem extends EventEmitter {
  private achievements: Map<string, Achievement> = new Map();
  private unlockedAchievements: Set<string> = new Set();
  private stats: GameStats;
  private statsListeners: Map<string, (value: number) => void> = new Map();

  constructor() {
    super();
    this.stats = this.initializeStats();
    this.initializeAchievements();
    this.setupStatsListeners();
  }

  private initializeStats(): GameStats {
    return {
      totalHarvests: 0,
      totalBuildings: 0,
      totalBeastFriends: 0,
      cropsHarvested: {},
      buildingsPlaced: {},
      playTime: 0,
      distanceTraveled: 0,
      itemsCollected: 0
    };
  }

  private setupStatsListeners(): void {
    this.statsListeners.set('totalHarvests', () => {
      this.checkAchievements();
    });
    this.statsListeners.set('totalBuildings', () => {
      this.checkAchievements();
    });
    this.statsListeners.set('totalBeastFriends', () => {
      this.checkAchievements();
    });
    this.statsListeners.set('playTime', () => {
      this.checkTimeBasedAchievements();
    });
  }

  private initializeAchievements(): void {
    const achievementData: Omit<Achievement, 'unlocked'>[] = [
      {
        id: 'first_harvest',
        name: '初次收获',
        description: '收获你的第一株作物',
        icon: '🌾',
        category: 'crop',
        condition: (stats) => stats.totalHarvests >= 1,
        reward: { type: 'coin', amount: 50 }
      },
      {
        id: 'harvest_10',
        name: '小有成就',
        description: '累计收获10株作物',
        icon: '🌻',
        category: 'crop',
        condition: (stats) => stats.totalHarvests >= 10,
        reward: { type: 'coin', amount: 100 }
      },
      {
        id: 'harvest_100',
        name: '农场主人',
        description: '累计收获100株作物',
        icon: '🏡',
        category: 'crop',
        condition: (stats) => stats.totalHarvests >= 100,
        reward: { type: 'coin', amount: 500 }
      },
      {
        id: 'harvest_1000',
        name: '农业大师',
        description: '累计收获1000株作物',
        icon: '👑',
        category: 'crop',
        condition: (stats) => stats.totalHarvests >= 1000,
        reward: { type: 'premium_seed', amount: 10 }
      },
      {
        id: 'wheat_king',
        name: '麦田守望者',
        description: '收获100株小麦',
        icon: '🌾',
        category: 'crop',
        condition: (stats) => (stats.cropsHarvested['wheat'] || 0) >= 100,
        reward: { type: 'coin', amount: 300 }
      },
      {
        id: 'tomato_lover',
        name: '番茄爱好者',
        description: '收获50个番茄',
        icon: '🍅',
        category: 'crop',
        condition: (stats) => (stats.cropsHarvested['tomato'] || 0) >= 50,
        reward: { type: 'coin', amount: 300 }
      },
      {
        id: 'carrot_collector',
        name: '胡萝卜收藏家',
        description: '收获50个胡萝卜',
        icon: '🥕',
        category: 'crop',
        condition: (stats) => (stats.cropsHarvested['carrot'] || 0) >= 50,
        reward: { type: 'coin', amount: 300 }
      },
      {
        id: 'first_build',
        name: '初建家园',
        description: '建造你的第一栋建筑',
        icon: '🏠',
        category: 'building',
        condition: (stats) => stats.totalBuildings >= 1,
        reward: { type: 'coin', amount: 50 }
      },
      {
        id: 'builder_10',
        name: '建筑新手',
        description: '建造10栋建筑',
        icon: '🏗️',
        category: 'building',
        condition: (stats) => stats.totalBuildings >= 10,
        reward: { type: 'coin', amount: 200 }
      },
      {
        id: 'architect',
        name: '建筑师',
        description: '建造50栋建筑',
        icon: '🏢',
        category: 'building',
        condition: (stats) => stats.totalBuildings >= 50,
        reward: { type: 'coin', amount: 500 }
      },
      {
        id: 'master_architect',
        name: '建筑大师',
        description: '建造100栋建筑',
        icon: '🎓',
        category: 'building',
        condition: (stats) => stats.totalBuildings >= 100,
        reward: { type: 'premium_building', amount: 1 }
      },
      {
        id: 'first_friend',
        name: '初次结交',
        description: '与一只异兽成为朋友',
        icon: '🐾',
        category: 'beast',
        condition: (stats) => stats.totalBeastFriends >= 1,
        reward: { type: 'beast_food', amount: 5 }
      },
      {
        id: 'beast_friend_5',
        name: '异兽之友',
        description: '与5只异兽成为朋友',
        icon: '🦊',
        category: 'beast',
        condition: (stats) => stats.totalBeastFriends >= 5,
        reward: { type: 'beast_food', amount: 10 }
      },
      {
        id: 'beast_whisperer',
        name: '异兽语者',
        description: '与10只异兽成为朋友',
        icon: '🐉',
        category: 'beast',
        condition: (stats) => stats.totalBeastFriends >= 10,
        reward: { type: 'rare_beast', amount: 1 }
      },
      {
        id: 'early_bird',
        name: '早起鸟儿',
        description: '游戏时长超过1小时',
        icon: '🐦',
        category: 'exploration',
        condition: () => this.stats.playTime >= 3600,
        reward: { type: 'coin', amount: 100 }
      },
      {
        id: 'dedicated_player',
        name: '忠实玩家',
        description: '游戏时长超过10小时',
        icon: '⏰',
        category: 'exploration',
        condition: () => this.stats.playTime >= 36000,
        reward: { type: 'coin', amount: 500 }
      },
      {
        id: 'world_explorer',
        name: '世界探索者',
        description: '探索地图超过10000单位距离',
        icon: '🗺️',
        category: 'exploration',
        condition: (stats) => stats.distanceTraveled >= 10000,
        reward: { type: 'exploration_token', amount: 3 }
      },
      {
        id: 'collector',
        name: '收藏家',
        description: '收集100件物品',
        icon: '📦',
        category: 'collection',
        condition: (stats) => stats.itemsCollected >= 100,
        reward: { type: 'coin', amount: 200 }
      },
      {
        id: 'mega_collector',
        name: '大收藏家',
        description: '收集1000件物品',
        icon: '💎',
        category: 'collection',
        condition: (stats) => stats.itemsCollected >= 1000,
        reward: { type: 'rare_item', amount: 1 }
      },
      {
        id: 'completionist',
        name: '完美主义',
        description: '解锁所有其他成就',
        icon: '🌟',
        category: 'special',
        condition: () => this.unlockedAchievements.size >= this.achievements.size - 1,
        reward: { type: 'legendary_item', amount: 1 }
      }
    ];

    achievementData.forEach(a => {
      this.achievements.set(a.id, { ...a, unlocked: false });
    });
  }

  public recordHarvest(cropType: string): void {
    this.stats.totalHarvests++;
    this.stats.cropsHarvested[cropType] = (this.stats.cropsHarvested[cropType] || 0) + 1;
    this.checkAchievements();
    this.emit('statsUpdated', { type: 'harvest', cropType });
  }

  public recordBuilding(buildingType: string): void {
    this.stats.totalBuildings++;
    this.stats.buildingsPlaced[buildingType] = (this.stats.buildingsPlaced[buildingType] || 0) + 1;
    this.checkAchievements();
    this.emit('statsUpdated', { type: 'building', buildingType });
  }

  public recordBeastFriend(): void {
    this.stats.totalBeastFriends++;
    this.checkAchievements();
    this.emit('statsUpdated', { type: 'beast' });
  }

  public recordItemCollect(amount: number = 1): void {
    this.stats.itemsCollected += amount;
    this.checkAchievements();
    this.emit('statsUpdated', { type: 'collection', amount });
  }

  public recordDistance(distance: number): void {
    this.stats.distanceTraveled += distance;
    this.checkAchievements();
    this.emit('statsUpdated', { type: 'exploration', distance });
  }

  public addPlayTime(seconds: number): void {
    this.stats.playTime += seconds;
    this.checkTimeBasedAchievements();
  }

  private checkAchievements(): void {
    this.achievements.forEach((achievement, id) => {
      if (!achievement.unlocked && achievement.condition(this.stats)) {
        this.unlockAchievement(id);
      }
    });
  }

  private checkTimeBasedAchievements(): void {
    this.achievements.forEach((achievement, id) => {
      if (!achievement.unlocked && achievement.id.includes('early_bird') || achievement.id.includes('dedicated')) {
        if (achievement.condition(this.stats)) {
          this.unlockAchievement(id);
        }
      }
    });
  }

  public unlockAchievement(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || achievement.unlocked) return false;

    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    this.unlockedAchievements.add(achievementId);
    
    this.emit('achievementUnlocked', { 
      achievement,
      reward: achievement.reward 
    });

    return true;
  }

  public getAchievement(achievementId: string): Achievement | undefined {
    return this.achievements.get(achievementId);
  }

  public getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.unlocked);
  }

  public getLockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => !a.unlocked);
  }

  public getAchievementsByCategory(category: Achievement['category']): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.category === category);
  }

  public getStats(): GameStats {
    return { ...this.stats };
  }

  public getAchievementProgress(achievementId: string): { current: number; required: number } | null {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || achievement.unlocked) return null;

    const id = achievement.id;
    
    if (id.includes('harvest')) {
      const required = id === 'first_harvest' ? 1 : 
                      id === 'harvest_10' ? 10 : 
                      id === 'harvest_100' ? 100 : 1000;
      return { current: this.stats.totalHarvests, required };
    }
    
    if (id.includes('build')) {
      const required = id === 'first_build' ? 1 : 
                      id === 'builder_10' ? 10 : 
                      id === 'architect' ? 50 : 100;
      return { current: this.stats.totalBuildings, required };
    }

    if (id.includes('friend')) {
      const required = id === 'first_friend' ? 1 : 
                      id === 'beast_friend_5' ? 5 : 10;
      return { current: this.stats.totalBeastFriends, required };
    }

    if (id.includes('collector')) {
      return { current: this.stats.itemsCollected, required: id === 'mega_collector' ? 1000 : 100 };
    }

    return null;
  }

  public saveProgress(): {
    unlockedAchievements: string[];
    stats: GameStats;
  } {
    return {
      unlockedAchievements: Array.from(this.unlockedAchievements),
      stats: this.stats
    };
  }

  public loadProgress(data: { unlockedAchievements: string[]; stats: GameStats }): void {
    data.unlockedAchievements.forEach(id => {
      const achievement = this.achievements.get(id);
      if (achievement) {
        achievement.unlocked = true;
        this.unlockedAchievements.add(id);
      }
    });
    this.stats = data.stats;
  }

  public resetProgress(): void {
    this.unlockedAchievements.clear();
    this.stats = this.initializeStats();
    
    this.achievements.forEach(achievement => {
      achievement.unlocked = false;
      achievement.unlockedAt = undefined;
    });

    this.emit('progressReset');
  }
}
