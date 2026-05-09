export enum Season {
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  AUTUMN = 'AUTUMN',
  WINTER = 'WINTER'
}

export enum Weather {
  CLEAR = 'CLEAR',
  FOG = 'FOG',
  RAIN = 'RAIN',
  STAR_RAIN = 'STAR_RAIN',
  SNOW = 'SNOW',
  AURORA = 'AURORA'
}

export interface CropEffect {
  type: 'GROWTH_SPEED' | 'YIELD' | 'QUALITY' | 'WILT_PROBABILITY' | 'NONE';
  value: number;
}

export interface WeatherConfig {
  type: Weather;
  probability: number;
  effects: CropEffect[];
  beastBehaviorMod: { [key: string]: string };
  ambientColor: number;
  fogDensity: number;
  particleEffect: string | null;
}

export interface SeasonConfig {
  season: Season;
  duration: number;
  temperature: number;
  dayLength: number;
  nightLength: number;
  availableCrops: string[];
  resourceMultiplier: number;
  beastSpawnRates: { [beastType: string]: number };
}

type EventCallback = (data?: any) => void;

export class TimeSystem {
  private listeners: Map<string, EventCallback[]> = new Map();
  
  private gameTime: number = 0;
  private timeScale: number = 1;
  private dayPhase: 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT' = 'DAWN';
  
  private currentSeason: Season = Season.SPRING;
  private seasonDayCount: number = 0;
  private totalDays: number = 0;
  
  private currentWeather: Weather = Weather.CLEAR;
  private weatherDuration: number = 0;
  private weatherTimer: number = 0;

  private lightIntensity: number = 1;
  private ambientIntensity: number = 0.4;

  private weatherConfigs: Map<Weather, WeatherConfig>;
  private seasonConfigs: Map<Season, SeasonConfig>;

  constructor() {
    this.weatherConfigs = new Map();
    this.seasonConfigs = new Map();
    this.initializeWeatherConfigs();
    this.initializeSeasonConfigs();
    this.updateDayPhase();
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  private initializeWeatherConfigs(): void {
    this.weatherConfigs.set(Weather.CLEAR, {
      type: Weather.CLEAR,
      probability: 0.30,
      effects: [{ type: 'GROWTH_SPEED', value: 1.0 }],
      beastBehaviorMod: {},
      ambientColor: 0x87CEEB,
      fogDensity: 0,
      particleEffect: null
    });

    this.weatherConfigs.set(Weather.FOG, {
      type: Weather.FOG,
      probability: 0.20,
      effects: [
        { type: 'GROWTH_SPEED', value: 0.8 },
        { type: 'QUALITY', value: 1.1 }
      ],
      beastBehaviorMod: { grass_slime: 'hidden' },
      ambientColor: 0xCCCCCC,
      fogDensity: 0.02,
      particleEffect: 'fog'
    });

    this.weatherConfigs.set(Weather.RAIN, {
      type: Weather.RAIN,
      probability: 0.20,
      effects: [
        { type: 'GROWTH_SPEED', value: 1.3 },
        { type: 'WILT_PROBABILITY', value: 0.1 }
      ],
      beastBehaviorMod: { 
        cloud_bird: 'shelter',
        spirit_butterfly: 'hidden'
      },
      ambientColor: 0x708090,
      fogDensity: 0.005,
      particleEffect: 'rain'
    });

    this.weatherConfigs.set(Weather.STAR_RAIN, {
      type: Weather.STAR_RAIN,
      probability: 0.10,
      effects: [
        { type: 'GROWTH_SPEED', value: 1.5 },
        { type: 'QUALITY', value: 1.3 },
        { type: 'YIELD', value: 1.2 }
      ],
      beastBehaviorMod: { star_bunny: 'active', moon_rabbit: 'active' },
      ambientColor: 0x4B0082,
      fogDensity: 0.01,
      particleEffect: 'star_rain'
    });

    this.weatherConfigs.set(Weather.SNOW, {
      type: Weather.SNOW,
      probability: 0.15,
      effects: [
        { type: 'GROWTH_SPEED', value: 0.3 },
        { type: 'WILT_PROBABILITY', value: 0.3 }
      ],
      beastBehaviorMod: {
        grass_slime: 'hidden',
        forest_deer: 'shelter'
      },
      ambientColor: 0xE8E8E8,
      fogDensity: 0.01,
      particleEffect: 'snow'
    });

    this.weatherConfigs.set(Weather.AURORA, {
      type: Weather.AURORA,
      probability: 0.05,
      effects: [
        { type: 'GROWTH_SPEED', value: 1.8 },
        { type: 'QUALITY', value: 1.5 },
        { type: 'YIELD', value: 1.5 }
      ],
      beastBehaviorMod: {
        moon_rabbit: 'blessing',
        spirit_butterfly: 'blessing'
      },
      ambientColor: 0x00FF7F,
      fogDensity: 0.005,
      particleEffect: 'aurora'
    });
  }

  private initializeSeasonConfigs(): void {
    this.seasonConfigs.set(Season.SPRING, {
      season: Season.SPRING,
      duration: 10,
      temperature: 18,
      dayLength: 10,
      nightLength: 8,
      availableCrops: ['wheat', 'carrot', 'cabbage', 'star_flower'],
      resourceMultiplier: 1.0,
      beastSpawnRates: {
        star_bunny: 1.5,
        spirit_butterfly: 1.3,
        moon_rabbit: 1.0
      }
    });

    this.seasonConfigs.set(Season.SUMMER, {
      season: Season.SUMMER,
      duration: 10,
      temperature: 28,
      dayLength: 12,
      nightLength: 6,
      availableCrops: ['tomato', 'wheat', 'star_flower', 'moon_fruit'],
      resourceMultiplier: 1.2,
      beastSpawnRates: {
        cloud_bird: 1.5,
        grass_slime: 1.3,
        forest_deer: 1.0
      }
    });

    this.seasonConfigs.set(Season.AUTUMN, {
      season: Season.AUTUMN,
      duration: 10,
      temperature: 15,
      dayLength: 9,
      nightLength: 9,
      availableCrops: ['carrot', 'cabbage', 'pumpkin'],
      resourceMultiplier: 1.1,
      beastSpawnRates: {
        forest_deer: 1.5,
        mountain_wolf: 1.2,
        fire_spirit: 1.0
      }
    });

    this.seasonConfigs.set(Season.WINTER, {
      season: Season.WINTER,
      duration: 10,
      temperature: 2,
      dayLength: 7,
      nightLength: 11,
      availableCrops: ['frost_herb'],
      resourceMultiplier: 0.5,
      beastSpawnRates: {
        moon_rabbit: 1.5,
        mountain_wolf: 1.3,
        fire_spirit: 1.2
      }
    });
  }

  public update(deltaTime: number): void {
    const scaledDelta = deltaTime * this.timeScale;
    this.gameTime += scaledDelta;

    this.updateDayPhase();
    this.updateWeather(scaledDelta);
    this.updateSeason(scaledDelta);

    this.emit('timeUpdate', {
      gameTime: this.gameTime,
      dayPhase: this.dayPhase,
      weather: this.currentWeather,
      season: this.currentSeason
    });
  }

  private updateDayPhase(): void {
    const gameHour = (this.gameTime / 3600) % 24;
    
    let newPhase: 'DAWN' | 'NOON' | 'DUSK' | 'NIGHT';
    if (gameHour >= 5 && gameHour < 7) {
      newPhase = 'DAWN';
    } else if (gameHour >= 7 && gameHour < 17) {
      newPhase = 'NOON';
    } else if (gameHour >= 17 && gameHour < 20) {
      newPhase = 'DUSK';
    } else {
      newPhase = 'NIGHT';
    }

    if (newPhase !== this.dayPhase) {
      this.dayPhase = newPhase;
      this.updateLighting();
      this.emit('dayPhaseChange', { phase: newPhase });
    }
  }

  private updateLighting(): void {
    switch (this.dayPhase) {
      case 'DAWN':
        this.lightIntensity = 0.6;
        this.ambientIntensity = 0.3;
        break;
      case 'NOON':
        this.lightIntensity = 1.0;
        this.ambientIntensity = 0.5;
        break;
      case 'DUSK':
        this.lightIntensity = 0.4;
        this.ambientIntensity = 0.25;
        break;
      case 'NIGHT':
        this.lightIntensity = 0.15;
        this.ambientIntensity = 0.15;
        break;
    }

    this.emit('lightingUpdate', {
      lightIntensity: this.lightIntensity,
      ambientIntensity: this.ambientIntensity
    });
  }

  private updateWeather(_deltaTime: number): void {
    this.weatherTimer += 1;

    if (this.weatherTimer >= this.weatherDuration) {
      this.changeWeather();
    }
  }

  private changeWeather(): void {
    const random = Math.random();
    let cumulative = 0;
    
    for (const [weather, config] of this.weatherConfigs) {
      cumulative += config.probability;
      if (random <= cumulative) {
        if (this.currentWeather !== weather) {
          this.currentWeather = weather;
          this.weatherDuration = 180 + Math.random() * 300;
          this.weatherTimer = 0;
          this.emit('weatherChange', { weather, config });
        }
        break;
      }
    }
  }

  private updateSeason(_deltaTime: number): void {
    const seasonConfig = this.seasonConfigs.get(this.currentSeason);
    if (!seasonConfig) return;

    const seasonDuration = seasonConfig.duration * 3600;
    
    if (this.gameTime >= seasonDuration * (this.seasonDayCount + 1)) {
      this.seasonDayCount++;
      this.totalDays++;
      
      if (this.seasonDayCount >= seasonConfig.duration) {
        this.advanceSeason();
      }

      this.emit('dayChange', { 
        seasonDay: this.seasonDayCount,
        totalDays: this.totalDays 
      });
    }
  }

  private advanceSeason(): void {
    const seasons = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];
    const currentIndex = seasons.indexOf(this.currentSeason);
    const nextIndex = (currentIndex + 1) % seasons.length;
    
    this.currentSeason = seasons[nextIndex];
    this.seasonDayCount = 0;
    
    this.emit('seasonChange', { season: this.currentSeason });
  }

  public getDayPhase(): string {
    return this.dayPhase;
  }

  public getCurrentWeather(): Weather {
    return this.currentWeather;
  }

  public getCurrentSeason(): Season {
    return this.currentSeason;
  }

  public getWeatherConfig(weather: Weather): WeatherConfig | undefined {
    return this.weatherConfigs.get(weather);
  }

  public getSeasonConfig(season: Season): SeasonConfig | undefined {
    return this.seasonConfigs.get(season);
  }

  public getLightIntensity(): number {
    return this.lightIntensity;
  }

  public getAmbientIntensity(): number {
    return this.ambientIntensity;
  }

  public getSeasonDayCount(): number {
    return this.seasonDayCount;
  }

  public getTotalDays(): number {
    return this.totalDays;
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  public getGameTime(): number {
    return this.gameTime;
  }
}

export class EcosystemLinker {
  private listeners: Map<string, EventCallback[]> = new Map();
  
  private timeSystem: TimeSystem;
  private cropEffects: Map<string, CropEffect[]> = new Map();
  private beastWeatherResponses: Map<string, (weather: Weather) => void> = new Map();

  constructor(timeSystem: TimeSystem) {
    this.timeSystem = timeSystem;
    this.setupCropEffects();
    this.setupBeastResponses();
    this.setupEventListeners();
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  private setupCropEffects(): void {
    this.cropEffects.set('wheat', [
      { type: 'GROWTH_SPEED', value: 1.0 },
      { type: 'YIELD', value: 1.0 },
      { type: 'QUALITY', value: 1.0 }
    ]);

    this.cropEffects.set('tomato', [
      { type: 'GROWTH_SPEED', value: 1.2 },
      { type: 'YIELD', value: 1.1 }
    ]);

    this.cropEffects.set('star_flower', [
      { type: 'QUALITY', value: 1.5 },
      { type: 'YIELD', value: 1.3 }
    ]);

    this.cropEffects.set('moon_fruit', [
      { type: 'QUALITY', value: 1.8 },
      { type: 'YIELD', value: 0.8 }
    ]);
  }

  private setupBeastResponses(): void {
    this.beastWeatherResponses.set('star_bunny', () => {
      this.emit('beastBlessed', { beastType: 'star_bunny', multiplier: 2.0 });
    });

    this.beastWeatherResponses.set('cloud_bird', () => {
      this.emit('beastShelter', { beastType: 'cloud_bird' });
    });

    this.beastWeatherResponses.set('grass_slime', () => {
      this.emit('beastHidden', { beastType: 'grass_slime' });
    });

    this.beastWeatherResponses.set('moon_rabbit', () => {
      this.emit('beastBlessed', { beastType: 'moon_rabbit', multiplier: 1.5 });
    });
  }

  private setupEventListeners(): void {
    this.timeSystem.on('weatherChange', (data: { weather: Weather; config: WeatherConfig }) => {
      this.applyWeatherEffects(data.weather, data.config.effects);
      this.emit('ecosystemWeatherChange', data);
    });

    this.timeSystem.on('seasonChange', (data: { season: Season }) => {
      this.applySeasonEffects(data.season);
      this.emit('ecosystemSeasonChange', data);
    });
  }

  public getCropEffects(cropType: string): CropEffect[] {
    const baseEffects = this.cropEffects.get(cropType) || [];
    const weatherEffects = this.getWeatherEffects();
    
    const combinedEffects: CropEffect[] = [];
    const effectTypes = new Set([...baseEffects.map(e => e.type), ...weatherEffects.map(e => e.type)]);

    effectTypes.forEach(type => {
      const baseEffect = baseEffects.find(e => e.type === type);
      const weatherEffect = weatherEffects.find(e => e.type === type);
      
      let value = baseEffect?.value || 1.0;
      if (weatherEffect) {
        value *= weatherEffect.value;
      }

      combinedEffects.push({ type, value });
    });

    return combinedEffects;
  }

  public getWeatherEffects(): CropEffect[] {
    const weatherConfig = this.timeSystem.getWeatherConfig(this.timeSystem.getCurrentWeather());
    return weatherConfig?.effects || [];
  }

  public applyWeatherEffects(weather: Weather, effects: CropEffect[]): void {
    effects.forEach(effect => {
      this.emit('cropEffect', { weather, effect });
    });

    const response = this.beastWeatherResponses.get(weather);
    if (response) {
      response(weather);
    }
  }

  public applySeasonEffects(season: Season): void {
    const seasonConfig = this.timeSystem.getSeasonConfig(season);
    if (seasonConfig) {
      this.emit('seasonEffect', {
        season,
        temperature: seasonConfig.temperature,
        resourceMultiplier: seasonConfig.resourceMultiplier,
        availableCrops: seasonConfig.availableCrops
      });
    }
  }

  public getAvailableCrops(): string[] {
    const seasonConfig = this.timeSystem.getSeasonConfig(this.timeSystem.getCurrentSeason());
    return seasonConfig?.availableCrops || [];
  }

  public getResourceMultiplier(): number {
    const seasonConfig = this.timeSystem.getSeasonConfig(this.timeSystem.getCurrentSeason());
    return seasonConfig?.resourceMultiplier || 1.0;
  }

  public calculateFinalYield(baseYield: number, cropType: string): number {
    const effects = this.getCropEffects(cropType);
    let multiplier = 1.0;

    effects.forEach(effect => {
      if (effect.type === 'YIELD') {
        multiplier *= effect.value;
      }
    });

    return Math.floor(baseYield * multiplier);
  }

  public calculateGrowthTime(baseTime: number, cropType: string): number {
    const effects = this.getCropEffects(cropType);
    let multiplier = 1.0;

    effects.forEach(effect => {
      if (effect.type === 'GROWTH_SPEED') {
        multiplier /= effect.value;
      }
    });

    return baseTime * multiplier;
  }

  public getBeastSpawnMultiplier(beastType: string): number {
    const seasonConfig = this.timeSystem.getSeasonConfig(this.timeSystem.getCurrentSeason());
    return seasonConfig?.beastSpawnRates[beastType] || 1.0;
  }
}
