// 《星野栖所》游戏时间系统 - 昼夜、四季、天气管理

import { Season, DayPhase, Weather, TimeConfig, DayPhaseConfig, WeatherConfig } from '../core/types';
import { EventEmitter } from '../core/EventEmitter';

// 季节天气概率配置（参考星露谷物语、动森等游戏设计）
interface SeasonWeatherProbabilities {
  [Weather.CLEAR]: number;
  [Weather.CLOUDY]: number;
  [Weather.OVERCAST]: number;
  [Weather.RAIN]: number;
  [Weather.STORM]: number;
  [Weather.FOG]: number;
  [Weather.SNOW]: number;
  [Weather.STAR_RAIN]: number;
  [Weather.AURORA]: number;
}

export class TimeSystem extends EventEmitter {
  private config: TimeConfig;
  private currentGameTime: number = 10;
  private currentDay: number = 1;
  private currentSeason: Season = Season.SPRING;
  private currentWeather: Weather = Weather.CLEAR;
  private currentDayPhase: DayPhase = DayPhase.NOON;
  
  private lastUpdateTime: number = 0;
  private isPaused: boolean = false;
  private consecutiveRainDays: number = 0;

  private dayPhaseConfigs: Map<DayPhase, DayPhaseConfig>;
  private weatherConfigs: Map<Weather, WeatherConfig>;
  
  // 各季节的天气概率表（总和=1.0）
  private seasonWeatherProbabilities: Record<Season, SeasonWeatherProbabilities> = {
    [Season.SPRING]: {
      [Weather.CLEAR]: 0.30,
      [Weather.CLOUDY]: 0.20,
      [Weather.OVERCAST]: 0.10,
      [Weather.RAIN]: 0.25,
      [Weather.STORM]: 0.05,
      [Weather.FOG]: 0.05,
      [Weather.SNOW]: 0.0,
      [Weather.STAR_RAIN]: 0.03,
      [Weather.AURORA]: 0.02
    },
    [Season.SUMMER]: {
      [Weather.CLEAR]: 0.45,
      [Weather.CLOUDY]: 0.15,
      [Weather.OVERCAST]: 0.05,
      [Weather.RAIN]: 0.15,
      [Weather.STORM]: 0.12,
      [Weather.FOG]: 0.02,
      [Weather.SNOW]: 0.0,
      [Weather.STAR_RAIN]: 0.04,
      [Weather.AURORA]: 0.02
    },
    [Season.AUTUMN]: {
      [Weather.CLEAR]: 0.25,
      [Weather.CLOUDY]: 0.20,
      [Weather.OVERCAST]: 0.15,
      [Weather.RAIN]: 0.20,
      [Weather.STORM]: 0.03,
      [Weather.FOG]: 0.12,
      [Weather.SNOW]: 0.0,
      [Weather.STAR_RAIN]: 0.03,
      [Weather.AURORA]: 0.02
    },
    [Season.WINTER]: {
      [Weather.CLEAR]: 0.15,
      [Weather.CLOUDY]: 0.15,
      [Weather.OVERCAST]: 0.20,
      [Weather.RAIN]: 0.05,
      [Weather.STORM]: 0.0,
      [Weather.FOG]: 0.10,
      [Weather.SNOW]: 0.25,
      [Weather.STAR_RAIN]: 0.05,
      [Weather.AURORA]: 0.05
    }
  };

  constructor(config?: Partial<TimeConfig>) {
    super();
    this.config = {
      gameHourToRealMinutes: 0.833, // 1游戏小时 = 50现实秒（1天 = 20现实分钟）
      dayNightCycle: 24,
      seasonalCycleDays: 14, // 一个季节14游戏天（约4.7现实小时）
      ...config
    };

    this.initializeDayPhaseConfigs();
    this.initializeWeatherConfigs();
    this.updateTimeAndWeather();
  }

  private initializeDayPhaseConfigs(): void {
    this.dayPhaseConfigs = new Map([
      [DayPhase.DAWN, {
        start: 4,
        end: 6, // 清晨 4:00-6:00 (2小时)
        lighting: { intensity: 0.3, color: '#8B7D6B' }
      }],
      [DayPhase.MORNING, {
        start: 6,
        end: 9, // 上午 6:00-9:00 (3小时)
        lighting: { intensity: 0.7, color: '#FFFACD' }
      }],
      [DayPhase.NOON, {
        start: 9,
        end: 14, // 正午 9:00-14:00 (5小时)
        lighting: { intensity: 1.0, color: '#FFFFFF' }
      }],
      [DayPhase.AFTERNOON, {
        start: 14,
        end: 17, // 下午 14:00-17:00 (3小时)
        lighting: { intensity: 0.9, color: '#FFFACD' }
      }],
      [DayPhase.EVENING, {
        start: 17,
        end: 19, // 傍晚 17:00-19:00 (2小时)
        lighting: { intensity: 0.6, color: '#FFA07A' }
      }],
      [DayPhase.DUSK, {
        start: 19,
        end: 21, // 黄昏 19:00-21:00 (2小时)
        lighting: { intensity: 0.3, color: '#FF6B6B' }
      }],
      [DayPhase.NIGHT, {
        start: 21,
        end: 4, // 深夜 21:00-次日4:00 (7小时)
        lighting: { intensity: 0.15, color: '#191970' }
      }]
    ]);
  }

  private initializeWeatherConfigs(): void {
    this.weatherConfigs = new Map([
      [Weather.CLEAR, {
        type: Weather.CLEAR,
        probability: 0.30,
        isRare: false,
        effects: { cropGrowthMultiplier: 1.0, resourceSpawnBonus: 1.0, beastBehaviorModifier: 1.0 }
      }],
      [Weather.CLOUDY, {
        type: Weather.CLOUDY,
        probability: 0.15,
        isRare: false,
        effects: { cropGrowthMultiplier: 0.95, resourceSpawnBonus: 1.0, beastBehaviorModifier: 0.9 }
      }],
      [Weather.OVERCAST, {
        type: Weather.OVERCAST,
        probability: 0.10,
        isRare: false,
        effects: { cropGrowthMultiplier: 0.9, resourceSpawnBonus: 1.05, beastBehaviorModifier: 0.85 }
      }],
      [Weather.RAIN, {
        type: Weather.RAIN,
        probability: 0.20,
        isRare: false,
        effects: { cropGrowthMultiplier: 1.3, resourceSpawnBonus: 1.2, beastBehaviorModifier: 0.7 }
      }],
      [Weather.STORM, {
        type: Weather.STORM,
        probability: 0.05,
        isRare: false,
        effects: { cropGrowthMultiplier: 1.5, resourceSpawnBonus: 1.5, beastBehaviorModifier: 0.5 }
      }],
      [Weather.FOG, {
        type: Weather.FOG,
        probability: 0.10,
        isRare: false,
        effects: { cropGrowthMultiplier: 0.9, resourceSpawnBonus: 1.1, beastBehaviorModifier: 0.8 }
      }],
      [Weather.SNOW, {
        type: Weather.SNOW,
        probability: 0.15,
        isRare: false,
        effects: { cropGrowthMultiplier: 0.7, resourceSpawnBonus: 1.3, beastBehaviorModifier: 1.1 }
      }],
      [Weather.STAR_RAIN, {
        type: Weather.STAR_RAIN,
        probability: 0.05,
        isRare: true,
        effects: { cropGrowthMultiplier: 1.5, resourceSpawnBonus: 1.5, beastBehaviorModifier: 1.2 }
      }],
      [Weather.AURORA, {
        type: Weather.AURORA,
        probability: 0.05,
        isRare: true,
        effects: { cropGrowthMultiplier: 1.8, resourceSpawnBonus: 2.0, beastBehaviorModifier: 1.5 }
      }]
    ]);
  }

  public update(deltaTime: number): void {
    if (this.isPaused) return;

    // deltaTime是毫秒，转换为游戏小时
    // 如果gameHourToRealMinutes=30，意味着现实30分钟=游戏1小时
    // 所以：现实秒数 / (gameHourToRealMinutes * 60) = 游戏小时增量
    const gameTimeIncrement = (deltaTime / 1000) / (this.config.gameHourToRealMinutes * 60);
    this.currentGameTime += gameTimeIncrement;

    if (this.currentGameTime >= this.config.dayNightCycle) {
      this.currentGameTime -= this.config.dayNightCycle;
      this.currentDay++;
      this.checkSeasonChange();
      this.randomizeWeather();
    }

    this.updateTimeAndWeather();
    this.emit('timeUpdate', this.getTimeData());
  }

  private updateTimeAndWeather(): void {
    const previousPhase = this.currentDayPhase;
    this.currentDayPhase = this.calculateDayPhase(this.currentGameTime);
    
    if (previousPhase !== this.currentDayPhase) {
      this.emit('dayPhaseChange', this.currentDayPhase);
    }
  }

  private calculateDayPhase(gameTime: number): DayPhase {
    const hour = gameTime;
    
    // 深夜: 21:00 - 次日4:00
    if (hour >= 21 || hour < 4) return DayPhase.NIGHT;
    // 清晨: 4:00 - 6:00
    if (hour >= 4 && hour < 6) return DayPhase.DAWN;
    // 上午: 6:00 - 9:00
    if (hour >= 6 && hour < 9) return DayPhase.MORNING;
    // 正午: 9:00 - 14:00
    if (hour >= 9 && hour < 14) return DayPhase.NOON;
    // 下午: 14:00 - 17:00
    if (hour >= 14 && hour < 17) return DayPhase.AFTERNOON;
    // 傍晚: 17:00 - 19:00
    if (hour >= 17 && hour < 19) return DayPhase.EVENING;
    // 黄昏: 19:00 - 21:00
    if (hour >= 19 && hour < 21) return DayPhase.DUSK;
    
    return DayPhase.NIGHT;
  }

  private checkSeasonChange(): void {
    const previousSeason = this.currentSeason;
    const seasonIndex = Math.floor((this.currentDay - 1) / this.config.seasonalCycleDays) % 4;
    this.currentSeason = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER][seasonIndex];

    if (previousSeason !== this.currentSeason) {
      this.emit('seasonChange', {
        previous: previousSeason,
        current: this.currentSeason,
        day: this.currentDay
      });
      this.randomizeWeather();
    }
  }

  public randomizeWeather(): void {
    const previousWeather = this.currentWeather;
    const probs = this.seasonWeatherProbabilities[this.currentSeason];
    
    // 防止连续下雨超过3天（参考星露谷物语设计）
    if (this.consecutiveRainDays >= 3) {
      // 强制晴天或多云
      const forcedWeather = Math.random() > 0.5 ? Weather.CLEAR : Weather.CLOUDY;
      this.currentWeather = forcedWeather;
      this.consecutiveRainDays = 0;
    } else {
      // 基于季节概率选择天气
      const random = Math.random();
      let cumulative = 0;
      
      const weatherOrder: Weather[] = [
        Weather.CLEAR, Weather.CLOUDY, Weather.OVERCAST, Weather.RAIN,
        Weather.STORM, Weather.FOG, Weather.SNOW, Weather.STAR_RAIN, Weather.AURORA
      ];
      
      for (const weather of weatherOrder) {
        cumulative += probs[weather] || 0;
        if (random < cumulative) {
          this.currentWeather = weather;
          break;
        }
      }
      
      // 统计连续下雨天数
      if (this.currentWeather === Weather.RAIN || this.currentWeather === Weather.STORM) {
        this.consecutiveRainDays++;
      } else {
        this.consecutiveRainDays = 0;
      }
    }
    
    // 星雨和极光只在夜间出现
    if ((this.currentWeather === Weather.STAR_RAIN || this.currentWeather === Weather.AURORA) &&
        (this.currentDayPhase === DayPhase.NOON || this.currentDayPhase === DayPhase.MORNING ||
         this.currentDayPhase === DayPhase.AFTERNOON)) {
      this.currentWeather = Weather.CLEAR;
    }

    if (previousWeather !== this.currentWeather) {
      this.emit('weatherChange', {
        previous: previousWeather,
        current: this.currentWeather,
        isRare: this.weatherConfigs.get(this.currentWeather)?.isRare
      });
    }
  }

  public getTimeData() {
    return {
      gameTime: this.currentGameTime,
      formattedTime: this.formatGameTime(this.currentGameTime),
      day: this.currentDay,
      season: this.currentSeason,
      weather: this.currentWeather,
      dayPhase: this.currentDayPhase
    };
  }

  private formatGameTime(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  public getDayPhaseConfig(): DayPhaseConfig | undefined {
    return this.dayPhaseConfigs.get(this.currentDayPhase);
  }

  public getWeatherConfig(): WeatherConfig | undefined {
    return this.weatherConfigs.get(this.currentWeather);
  }

  public getCurrentSeason(): Season {
    return this.currentSeason;
  }

  public getCurrentWeather(): Weather {
    return this.currentWeather;
  }

  public getCurrentDayPhase(): DayPhase {
    return this.currentDayPhase;
  }

  public getCurrentDay(): number {
    return this.currentDay;
  }

  public getGameTimeHours(): number {
    return this.currentGameTime;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public setGameTime(hours: number): void {
    this.currentGameTime = hours;
    this.updateTimeAndWeather();
  }

  public setWeather(weather: Weather): void {
    this.currentWeather = weather;
    this.emit('weatherChange', { previous: this.currentWeather, current: weather });
  }

  public setSeason(season: Season): void {
    this.currentSeason = season;
    this.emit('seasonChange', { previous: this.currentSeason, current: season });
  }
}
