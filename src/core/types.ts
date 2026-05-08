// 《星野栖所》核心类型定义

// ==================== 枚举定义 ====================

export enum Season {
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  AUTUMN = 'AUTUMN',
  WINTER = 'WINTER'
}

export enum DayPhase {
  DAWN = 'DAWN',         // 清晨
  MORNING = 'MORNING',   // 上午
  NOON = 'NOON',         // 正午
  AFTERNOON = 'AFTERNOON', // 下午
  EVENING = 'EVENING',   // 傍晚
  DUSK = 'DUSK',         // 黄昏
  NIGHT = 'NIGHT'        // 深夜
}

export enum Weather {
  CLEAR = 'CLEAR',         // 晴天
  CLOUDY = 'CLOUDY',       // 多云
  OVERCAST = 'OVERCAST',   // 阴天
  RAIN = 'RAIN',           // 雨天
  STORM = 'STORM',         // 暴雨
  FOG = 'FOG',             // 雾天
  SNOW = 'SNOW',           // 雪天
  STAR_RAIN = 'STAR_RAIN', // 星雨(稀有)
  AURORA = 'AURORA'        // 极光(稀有)
}

export enum CropType {
  BASIC = 'BASIC',
  STAR_PLANT = 'STAR_PLANT'
}

export enum BeastType {
  STAR_BUNNY = 'STAR_BUNNY',
  CLOUD_BIRD = 'CLOUD_BIRD',
  FOG_DEER = 'FOG_DEER',
  CRYSTAL_DOLPHIN = 'CRYSTAL_DOLPHIN',
  STAR_FOX = 'STAR_FOX'
}

export enum BuildingType {
  BASIC = 'BASIC',
  DECORATION = 'DECORATION',
  SPECIAL = 'SPECIAL'
}

// ==================== 接口定义 ====================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface TimeConfig {
  gameHourToRealMinutes: number;
  dayNightCycle: number;
  seasonalCycleDays: number;
}

export interface DayPhaseConfig {
  start: number;
  end: number;
  lighting: {
    intensity: number;
    color: string;
  };
}

export interface WeatherConfig {
  type: Weather;
  probability: number;
  isRare: boolean;
  effects: {
    cropGrowthMultiplier: number;
    resourceSpawnBonus: number;
    beastBehaviorModifier: number;
  };
}

export interface CropData {
  id: string;
  name: string;
  type: CropType;
  growthTime: number; // 分钟
  seasons: Season[];
  weatherRequirement?: Weather[];
  harvestYield: ItemQuantity[];
  adjacentBonus: AdjacentBonus[];
  modelPath?: string;
  iconPath?: string;
}

export interface AdjacentBonus {
  neighborType: string;
  bonusType: 'YIELD' | 'GROWTH_TIME' | 'RARE_DROP';
  bonusValue: number;
}

export interface ItemQuantity {
  itemId: string;
  amount: number;
}

export interface BeastData {
  id: string;
  name: string;
  type: BeastType;
  description: string;
  unlockLevel: number;
  unlockMethod: string;
  intimacy: number; // 0-1000
  maxIntimacy: number;
  abilities: BeastAbility[];
  behaviorTree: string;
  modelPath?: string;
  iconPath?: string;
}

export interface BeastAbility {
  name: string;
  description: string;
  unlockIntimacy: number;
  effect: {
    type: string;
    value: number;
  };
}

export interface SceneConfig {
  id: string;
  name: string;
  unlockLevel: number;
  description: string;
  resources: ResourceSpawn[];
  beasts: BeastSpawn[];
  scenery: SceneryObject[];
  lighting: SceneLighting;
  ambientSounds: string[];
}

export interface ResourceSpawn {
  resourceId: string;
  spawnType: 'NORMAL' | 'RARE' | 'WEATHER_SPECIFIC';
  refreshTime: number; // 分钟
  weatherCondition?: Weather;
  position: Vector3;
  respawnRadius: number;
  maxCount: number;
}

export interface BeastSpawn {
  beastId: string;
  position: Vector3;
  spawnWeight: number;
}

export interface SceneryObject {
  objectId: string;
  modelPath: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  isEditable: boolean;
}

export interface SceneLighting {
  ambientIntensity: number;
  ambientColor: string;
  directionalIntensity: number;
  directionalColor: string;
  fogColor: string;
  fogDensity: number;
}

export interface GameSaveData {
  version: string;
  timestamp: number;
  playerLevel: number;
  playerExp: number;
  homeLevel: number;
  unlockedScenes: string[];
  crops: CropSaveData[];
  beasts: BeastSaveData[];
  buildings: BuildingSaveData[];
  terrain: TerrainSaveData;
  resources: ResourceInventory;
  storyProgress: StoryProgressData;
  settings: GameSettings;
}

export interface CropSaveData {
  cropId: string;
  instanceId: string;
  position: Vector3;
  plantedTime: number;
  growthProgress: number;
  currentStage: number;
}

export interface BeastSaveData {
  beastId: string;
  instanceId: string;
  position: Vector3;
  intimacy: number;
  isWorking: boolean;
  currentTask: string;
}

export interface BuildingSaveData {
  buildingId: string;
  instanceId: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  unlocked: boolean;
}

export interface TerrainSaveData {
  modifications: TerrainModification[];
}

export interface TerrainModification {
  position: Vector3;
  type: 'FILL' | 'DIG' | 'CREATE_WATER' | 'PAVE';
  height?: number;
}

export interface ResourceInventory {
  items: Map<string, number>;
}

export interface StoryProgressData {
  unlockedFragments: string[];
  completedChapters: string[];
  viewedDialogues: string[];
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  graphicsQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  showTutorial: boolean;
}

// ==================== 事件系统 ====================

export interface GameEvent {
  type: string;
  timestamp: number;
  data: any;
}

export type GameEventCallback = (event: GameEvent) => void;

// ==================== AI行为树 ====================

export enum NodeStatus {
  SUCCESS,
  FAILURE,
  RUNNING
}

export interface AIContext {
  beastId: string;
  position: Vector3;
  targetPosition?: Vector3;
  targetObject?: any;
  intimacy: number;
  currentTask?: string;
  environmentData: {
    weather: Weather;
    season: Season;
    dayPhase: DayPhase;
    nearbyResources: any[];
    nearbyCrops: any[];
  };
}
