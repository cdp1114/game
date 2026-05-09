// 《星野栖所》天气交互系统 - 天气对游戏玩法的影响

import { Weather, Season } from '../core/types';
import { EventEmitter } from '../core/EventEmitter';

export interface WeatherEffect {
  type: Weather;
  cropGrowthModifier: number;
  beastActivityModifier: number;
  playerSpeedModifier: number;
  visibilityModifier: number;
  energyConsumption: number;
  specialBonus?: {
    itemId: string;
    chance: number;
    message: string;
  };
}

export class WeatherInteractionSystem extends EventEmitter {
  private weatherEffects!: Map<Weather, WeatherEffect>;
  private currentWeather: Weather = Weather.CLEAR;
  private currentSeason: Season = Season.SPRING;
  
  private visibilityOverlay: HTMLElement | null = null;
  private playerSpeedModifier: number = 1.0;
  private cropGrowthModifier: number = 1.0;

  constructor() {
    super();
    this.initializeWeatherEffects();
    this.createVisibilityOverlay();
  }

  private initializeWeatherEffects(): void {
    this.weatherEffects = new Map([
      [Weather.CLEAR, {
        type: Weather.CLEAR,
        cropGrowthModifier: 1.2,
        beastActivityModifier: 1.0,
        playerSpeedModifier: 1.0,
        visibilityModifier: 1.0,
        energyConsumption: 1.0,
        specialBonus: {
          itemId: 'sunshine_shard',
          chance: 0.1,
          message: '晴天的阳光碎片！'
        }
      }],
      [Weather.CLOUDY, {
        type: Weather.CLOUDY,
        cropGrowthModifier: 0.9,
        beastActivityModifier: 0.8,
        playerSpeedModifier: 1.0,
        visibilityModifier: 0.9,
        energyConsumption: 1.1
      }],
      [Weather.OVERCAST, {
        type: Weather.OVERCAST,
        cropGrowthModifier: 0.7,
        beastActivityModifier: 0.6,
        playerSpeedModifier: 1.0,
        visibilityModifier: 0.75,
        energyConsumption: 1.2
      }],
      [Weather.RAIN, {
        type: Weather.RAIN,
        cropGrowthModifier: 1.5,
        beastActivityModifier: 0.3,
        playerSpeedModifier: 0.85,
        visibilityModifier: 0.6,
        energyConsumption: 1.5,
        specialBonus: {
          itemId: 'rain_drop',
          chance: 0.3,
          message: '收集到了雨滴！'
        }
      }],
      [Weather.STORM, {
        type: Weather.STORM,
        cropGrowthModifier: 1.8,
        beastActivityModifier: 0.1,
        playerSpeedModifier: 0.7,
        visibilityModifier: 0.3,
        energyConsumption: 2.0,
        specialBonus: {
          itemId: 'lightning_crystal',
          chance: 0.5,
          message: '闪电晶体！非常稀有！'
        }
      }],
      [Weather.FOG, {
        type: Weather.FOG,
        cropGrowthModifier: 0.8,
        beastActivityModifier: 0.5,
        playerSpeedModifier: 0.9,
        visibilityModifier: 0.4,
        energyConsumption: 1.3
      }],
      [Weather.SNOW, {
        type: Weather.SNOW,
        cropGrowthModifier: 0.0,
        beastActivityModifier: 0.2,
        playerSpeedModifier: 0.6,
        visibilityModifier: 0.5,
        energyConsumption: 2.5,
        specialBonus: {
          itemId: 'snowflake',
          chance: 0.4,
          message: '美丽的雪花！'
        }
      }],
      [Weather.STAR_RAIN, {
        type: Weather.STAR_RAIN,
        cropGrowthModifier: 2.0,
        beastActivityModifier: 1.5,
        playerSpeedModifier: 1.1,
        visibilityModifier: 0.7,
        energyConsumption: 0.5,
        specialBonus: {
          itemId: 'stardust',
          chance: 0.8,
          message: '星尘！传说中能实现愿望的神秘物质！'
        }
      }],
      [Weather.AURORA, {
        type: Weather.AURORA,
        cropGrowthModifier: 2.5,
        beastActivityModifier: 2.0,
        playerSpeedModifier: 1.2,
        visibilityModifier: 0.8,
        energyConsumption: 0.3,
        specialBonus: {
          itemId: 'aurora_fragment',
          chance: 1.0,
          message: '极光碎片！极光之力的凝聚！'
        }
      }]
    ]);
  }

  private createVisibilityOverlay(): void {
    this.visibilityOverlay = document.createElement('div');
    this.visibilityOverlay.id = 'weather-visibility-overlay';
    this.visibilityOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      opacity: 0;
      transition: opacity 2s ease;
    `;
    document.body.appendChild(this.visibilityOverlay);
  }

  public updateWeather(weather: Weather, season?: Season): void {
    const previousWeather = this.currentWeather;
    this.currentWeather = weather;
    if (season !== undefined) {
      this.currentSeason = season;
    }

    const effect = this.weatherEffects.get(weather);
    if (!effect) return;

    this.playerSpeedModifier = effect.playerSpeedModifier;
    this.cropGrowthModifier = effect.cropGrowthModifier;

    this.applyVisibilityEffect(weather);
    this.updateSeasonalModifier();
    this.emitWeatherChange(previousWeather, weather, effect);
  }

  private applyVisibilityEffect(weather: Weather): void {
    if (!this.visibilityOverlay) return;

    let overlayColor = 'transparent';
    let overlayOpacity = 0;

    switch (weather) {
      case Weather.FOG:
        overlayColor = 'rgba(200, 200, 200, 1)';
        overlayOpacity = 0.3;
        break;
      case Weather.STORM:
        overlayColor = 'rgba(50, 50, 80, 1)';
        overlayOpacity = 0.2;
        break;
      case Weather.SNOW:
        overlayColor = 'rgba(255, 255, 255, 1)';
        overlayOpacity = 0.15;
        break;
      case Weather.RAIN:
        overlayColor = 'rgba(100, 100, 150, 1)';
        overlayOpacity = 0.1;
        break;
      case Weather.OVERCAST:
        overlayColor = 'rgba(120, 120, 140, 1)';
        overlayOpacity = 0.1;
        break;
    }

    this.visibilityOverlay.style.background = overlayColor;
    this.visibilityOverlay.style.opacity = String(overlayOpacity);
  }

  private updateSeasonalModifier(): void {
    switch (this.currentSeason) {
      case Season.SPRING:
        this.cropGrowthModifier *= 1.1;
        break;
      case Season.SUMMER:
        if (this.currentWeather === Weather.CLEAR) {
          this.cropGrowthModifier *= 1.3;
        } else if (this.currentWeather === Weather.RAIN) {
          this.cropGrowthModifier *= 1.5;
        }
        break;
      case Season.AUTUMN:
        this.cropGrowthModifier *= 0.9;
        if (this.currentWeather === Weather.STAR_RAIN) {
          this.cropGrowthModifier *= 1.5;
        }
        break;
      case Season.WINTER:
        if (this.currentWeather === Weather.SNOW) {
          this.cropGrowthModifier = 0;
        } else if (this.currentWeather === Weather.STORM) {
          this.cropGrowthModifier = 0;
        } else {
          this.cropGrowthModifier *= 0.5;
        }
        break;
    }
  }

  private emitWeatherChange(previous: Weather, current: Weather, effect: WeatherEffect): void {
    this.emit('weatherEffectChange', {
      previous,
      current,
      effect,
      playerSpeedModifier: this.playerSpeedModifier,
      cropGrowthModifier: this.cropGrowthModifier
    });

    if (previous !== current && effect.specialBonus) {
      this.checkSpecialBonus(effect.specialBonus);
    }

    this.showWeatherNotification(current, effect);
  }

  private checkSpecialBonus(bonus: { itemId: string; chance: number; message: string }): void {
    if (Math.random() < bonus.chance) {
      this.emit('specialItemDrop', {
        itemId: bonus.itemId,
        message: bonus.message
      });
    }
  }

  private showWeatherNotification(weather: Weather, effect: WeatherEffect): void {
    const messages: Record<Weather, string> = {
      [Weather.CLEAR]: '☀️ 天气晴朗！作物生长加速！',
      [Weather.CLOUDY]: '⛅ 多云天气，适合外出活动。',
      [Weather.OVERCAST]: '☁️ 天空阴沉，视野略有下降。',
      [Weather.RAIN]: '🌧️ 下雨了！作物飞速生长，但行动变慢了。',
      [Weather.STORM]: '⛈️ 暴风雨来了！尽量待在室内！',
      [Weather.FOG]: '🌫️ 大雾弥漫，能见度很低。',
      [Weather.SNOW]: '❄️ 下雪了！大部分作物停止生长。',
      [Weather.STAR_RAIN]: '⭐ 星雨降临！这是一个神奇的时刻！',
      [Weather.AURORA]: '🌌 极光出现！所有作物疯狂生长！'
    };

    const message = messages[weather];
    if (message) {
      this.emit('weatherNotification', { message, weather, effect });
    }
  }

  public getCropGrowthModifier(): number {
    return this.cropGrowthModifier;
  }

  public getPlayerSpeedModifier(): number {
    return this.playerSpeedModifier;
  }

  public getBeastActivityModifier(): number {
    const effect = this.weatherEffects.get(this.currentWeather);
    return effect?.beastActivityModifier || 1.0;
  }

  public getVisibilityModifier(): number {
    const effect = this.weatherEffects.get(this.currentWeather);
    return effect?.visibilityModifier || 1.0;
  }

  public getEnergyConsumption(): number {
    const effect = this.weatherEffects.get(this.currentWeather);
    return effect?.energyConsumption || 1.0;
  }

  public isCropGrowing(): boolean {
    return this.cropGrowthModifier > 0;
  }

  public isPlayerSlowed(): boolean {
    return this.playerSpeedModifier < 1.0;
  }

  public isInDangerousWeather(): boolean {
    return this.currentWeather === Weather.STORM;
  }

  public canSpawnRareItems(): boolean {
    const effect = this.weatherEffects.get(this.currentWeather);
    return effect?.specialBonus?.chance !== undefined && effect.specialBonus.chance > 0;
  }

  public getCurrentWeather(): Weather {
    return this.currentWeather;
  }

  public getWeatherEffect(weather: Weather): WeatherEffect | undefined {
    return this.weatherEffects.get(weather);
  }

  public getAllWeatherEffects(): Map<Weather, WeatherEffect> {
    return new Map(this.weatherEffects);
  }

  public setCustomWeatherEffect(weather: Weather, effect: WeatherEffect): void {
    this.weatherEffects.set(weather, effect);
  }

  public dispose(): void {
    if (this.visibilityOverlay) {
      this.visibilityOverlay.remove();
    }
    console.log('🧹 天气交互系统已销毁');
  }
}

export class SeasonEventSystem extends EventEmitter {
  private currentSeason: Season = Season.SPRING;
  private seasonDay: number = 1;
  
  private readonly SPRING_EVENTS = [
    { id: 'blossom_festival', day: 5, message: '🌸 樱花节开始了！' },
    { id: 'spring_rain', day: 10, message: '🌧️ 春雨滋润万物' },
    { id: 'new_life', day: 15, message: '🐣 新生命在春天诞生' }
  ];
  
  private readonly SUMMER_EVENTS = [
    { id: 'firefly_night', day: 5, message: '✨ 萤火虫之夜！' },
    { id: 'summer_storm', day: 10, message: '⛈️ 夏季风暴来袭' },
    { id: 'sunny_beach', day: 15, message: '🏖️ 阳光海滩活动！' }
  ];
  
  private readonly AUTUMN_EVENTS = [
    { id: 'harvest_festival', day: 5, message: '🎃 丰收节庆典！' },
    { id: 'autumn_leaves', day: 10, message: '🍂 落叶纷飞' },
    { id: 'harvest_moon', day: 15, message: '🌕 中秋满月' }
  ];
  
  private readonly WINTER_EVENTS = [
    { id: 'snow_festival', day: 5, message: '🎄 冰雪节开幕！' },
    { id: 'winter_aurora', day: 10, message: '🌌 极光在冬季最为绚烂' },
    { id: 'christmas', day: 15, message: '🎅 圣诞奇迹降临' }
  ];

  constructor() {
    super();
  }

  public updateSeason(season: Season, day: number): void {
    const previousSeason = this.currentSeason;
    this.currentSeason = season;
    this.seasonDay = day;

    if (previousSeason !== season) {
      this.onSeasonChange(season);
    }

    this.checkSeasonEvents();
  }

  private onSeasonChange(newSeason: Season): void {
    const messages: Record<Season, string> = {
      [Season.SPRING]: '🌱 春天来了！万物复苏，作物生长加速。',
      [Season.SUMMER]: '☀️ 夏天到了！阳光明媚，是收获的好时节。',
      [Season.AUTUMN]: '🍂 秋风送爽，丰收的季节来临。',
      [Season.WINTER]: '❄️ 冬天降临，银装素裹的世界。'
    };

    this.emit('seasonChange', {
      season: newSeason,
      message: messages[newSeason]
    });
  }

  private checkSeasonEvents(): void {
    const events = this.getEventsForSeason(this.currentSeason);
    
    events.forEach(event => {
      if (event.day === this.seasonDay) {
        this.emit('seasonEvent', {
          eventId: event.id,
          message: event.message,
          season: this.currentSeason
        });
      }
    });
  }

  private getEventsForSeason(season: Season): Array<{ id: string; day: number; message: string }> {
    switch (season) {
      case Season.SPRING:
        return this.SPRING_EVENTS;
      case Season.SUMMER:
        return this.SUMMER_EVENTS;
      case Season.AUTUMN:
        return this.AUTUMN_EVENTS;
      case Season.WINTER:
        return this.WINTER_EVENTS;
      default:
        return [];
    }
  }

  public getCurrentSeason(): Season {
    return this.currentSeason;
  }

  public getSeasonDay(): number {
    return this.seasonDay;
  }

  public dispose(): void {
    console.log('🧹 季节事件系统已销毁');
  }
}
