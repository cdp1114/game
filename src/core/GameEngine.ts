// 《星野栖所》主游戏引擎

import * as THREE from 'three';
import { TimeSystem } from '../systems/TimeSystem';
import { SceneManager } from './SceneManager';
import { CropSystem } from '../systems/CropSystem';
import { BeastManager } from '../entities/BeastManager';
import { UIManager } from '../ui/UIManager';
import { InputManager } from './InputManager';
import { EventEmitter } from './EventEmitter';
import { GameSaveData } from './types';

export class GameEngine extends EventEmitter {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  
  private timeSystem!: TimeSystem;
  private sceneManager!: SceneManager;
  private cropSystem!: CropSystem;
  private beastManager!: BeastManager;
  private uiManager!: UIManager;
  private inputManager!: InputManager;
  
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;

  constructor() {
    super();
    this.clock = new THREE.Clock();
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.setupRenderer();
      this.setupScene();
      this.setupCamera();
      this.setupLighting();
      this.setupSystems();
      this.setupEventListeners();
      
      this.emit('engineReady');
      console.log('🎮 《星野栖所》游戏引擎初始化完成');
    } catch (error) {
      console.error('引擎初始化失败:', error);
      this.emit('engineError', error);
    }
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    
    // 基础雾效果 - 柔焦雾感
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.01);
    this.scene.background = new THREE.Color(0x87CEEB);
  }

  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLighting(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    ambientLight.name = 'ambientLight';
    this.scene.add(ambientLight);
    
    // 主方向光 (太阳/月亮)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.name = 'directionalLight';
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);
    
    // 半球光 (天空和地面颜色渐变)
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3CB371, 0.3);
    hemisphereLight.name = 'hemisphereLight';
    this.scene.add(hemisphereLight);
  }

  private setupSystems(): void {
    // 时间系统
    this.timeSystem = new TimeSystem();
    
    // 场景管理器
    this.sceneManager = new SceneManager(this.scene, this.camera);
    
    // 作物系统
    this.cropSystem = new CropSystem(this.scene, this.timeSystem);
    
    // 异兽管理器
    this.beastManager = new BeastManager(this.scene, this.timeSystem);
    
    // 输入管理器
    this.inputManager = new InputManager(this.camera, this.renderer.domElement);
    
    // UI管理器
    this.uiManager = new UIManager();
  }

  private setupEventListeners(): void {
    // 窗口大小变化
    window.addEventListener('resize', () => this.onWindowResize());
    
    // 时间系统事件
    this.timeSystem.on('timeUpdate', (data) => this.onTimeUpdate(data));
    this.timeSystem.on('weatherChange', (data) => this.onWeatherChange(data));
    this.timeSystem.on('seasonChange', (data) => this.onSeasonChange(data));
    this.timeSystem.on('dayPhaseChange', (data) => this.onDayPhaseChange(data));
    
    // 输入事件
    this.inputManager.on('cameraMove', (data) => this.onCameraMove(data));
    this.inputManager.on('objectSelect', (data) => this.onObjectSelect(data));
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.lastFpsUpdate = performance.now();
    
    this.hideLoadingScreen();
    this.showHUD();
    this.animate();
    
    console.log('🚀 游戏开始运行');
    this.emit('gameStart');
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.animate);
    
    const deltaTime = this.clock.getDelta() * 1000;
    
    if (!this.isPaused) {
      this.update(deltaTime);
      this.updateFPS(deltaTime);
    }
    
    this.render();
    
    this.frameCount++;
  };

  private update(deltaTime: number): void {
    // 更新时间系统
    this.timeSystem.update(deltaTime);
    
    // 更新场景
    this.sceneManager.update(deltaTime);
    
    // 更新作物
    this.cropSystem.update(deltaTime);
    
    // 更新异兽
    this.beastManager.update(deltaTime);
    
    // 更新输入
    this.inputManager.update(deltaTime);
    
    // 更新相机
    this.updateCamera(deltaTime);
  }

  private updateCamera(deltaTime: number): void {
    const cameraRotation = this.inputManager.getCameraRotation();
    
    // 相机旋转由InputManager处理
    if (cameraRotation.enabled) {
      const rotationSpeed = 0.002;
      this.camera.rotation.y -= cameraRotation.deltaX * rotationSpeed;
      this.camera.rotation.x -= cameraRotation.deltaY * rotationSpeed;
      this.camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.camera.rotation.x));
    }
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private updateFPS(deltaTime: number): void {
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.uiManager.updateFPS(this.currentFps);
    }
  }

  // 事件处理
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onTimeUpdate(data: any): void {
    this.uiManager.updateTimeDisplay(data);
    this.sceneManager.updateLighting(data);
  }

  private onWeatherChange(data: any): void {
    console.log(`天气变化: ${data.previous} -> ${data.current}`);
    this.sceneManager.updateWeather(data.current);
    this.uiManager.updateWeatherDisplay(data.current);
  }

  private onSeasonChange(data: any): void {
    console.log(`季节变化: ${data.previous} -> ${data.current} (第${data.day}天)`);
    this.sceneManager.updateSeason(data.current);
    this.uiManager.updateSeasonDisplay(data.current);
  }

  private onDayPhaseChange(phase: any): void {
    console.log(`昼夜阶段变化: ${phase}`);
    this.uiManager.updateDayPhaseDisplay(phase);
  }

  private onCameraMove(data: any): void {
    // 可以在这里添加相机移动的音效或特效
  }

  private onObjectSelect(data: any): void {
    if (data.object) {
      console.log('选中了对象:', data.object.name || data.object.type);
      this.emit('objectSelected', data);
    }
  }

  // UI控制
  private hideLoadingScreen(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }

  private showHUD(): void {
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.display = 'block';
    }
  }

  // 游戏控制
  public pause(): void {
    this.isPaused = true;
    this.timeSystem.pause();
    this.emit('gamePause');
  }

  public resume(): void {
    this.isPaused = false;
    this.timeSystem.resume();
    this.emit('gameResume');
  }

  public saveGame(): GameSaveData {
    const saveData: GameSaveData = {
      version: '1.0.0',
      timestamp: Date.now(),
      playerLevel: 1,
      playerExp: 0,
      homeLevel: 1,
      unlockedScenes: ['spring_plains'],
      crops: this.cropSystem.getSaveData(),
      beasts: this.beastManager.getSaveData(),
      buildings: [],
      terrain: { modifications: [] },
      resources: { items: new Map() },
      storyProgress: { unlockedFragments: [], completedChapters: [], viewedDialogues: [] },
      settings: { musicVolume: 0.8, sfxVolume: 0.8, graphicsQuality: 'MEDIUM', showTutorial: true }
    };
    
    localStorage.setItem('xingye_qisu_save', JSON.stringify(saveData));
    console.log('💾 游戏已保存');
    this.emit('gameSaved', saveData);
    
    return saveData;
  }

  public loadGame(): boolean {
    const saveString = localStorage.getItem('xingye_qisu_save');
    if (!saveString) {
      console.warn('⚠️ 没有找到存档');
      return false;
    }
    
    try {
      const saveData = JSON.parse(saveString) as GameSaveData;
      this.applySaveData(saveData);
      console.log('📂 游戏已加载');
      this.emit('gameLoaded', saveData);
      return true;
    } catch (error) {
      console.error('❌ 加载存档失败:', error);
      return false;
    }
  }

  private applySaveData(saveData: GameSaveData): void {
    // 恢复作物数据
    if (saveData.crops) {
      this.cropSystem.loadSaveData(saveData.crops);
    }
    
    // 恢复异兽数据
    if (saveData.beasts) {
      this.beastManager.loadSaveData(saveData.beasts);
    }
    
    // 恢复场景解锁状态
    if (saveData.unlockedScenes) {
      saveData.unlockedScenes.forEach(sceneId => {
        this.sceneManager.unlockScene(sceneId);
      });
    }
  }

  // 获取器
  public getTimeSystem(): TimeSystem {
    return this.timeSystem;
  }

  public getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  public getCropSystem(): CropSystem {
    return this.cropSystem;
  }

  public getBeastManager(): BeastManager {
    return this.beastManager;
  }

  public getUIManager(): UIManager {
    return this.uiManager;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.Camera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  // 销毁
  public dispose(): void {
    this.isRunning = false;
    
    this.timeSystem.removeAllListeners();
    this.inputManager.removeAllListeners();
    this.sceneManager.dispose();
    this.cropSystem.dispose();
    this.beastManager.dispose();
    this.uiManager.dispose();
    
    this.renderer.dispose();
    this.removeAllListeners();
    
    console.log('🧹 游戏引擎已销毁');
  }
}
