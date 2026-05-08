import * as THREE from 'three';
import { VoxelTerrain, BlockType } from './VoxelTerrain';
import { FirstPersonController } from './FirstPersonController';
import { EventEmitter } from '../core/EventEmitter';

export interface VoxelGameConfig {
  container: HTMLElement;
  width: number;
  height: number;
}

export interface BlockDrop {
  type: BlockType;
  amount: number;
}

export class VoxelGameEngine extends EventEmitter {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  
  private voxelTerrain: VoxelTerrain;
  private player: FirstPersonController;
  
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  
  private crosshairElement: HTMLDivElement;
  
  constructor(config: VoxelGameConfig) {
    super();
    this.container = config.container;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 30, 80);
    
    this.camera = new THREE.PerspectiveCamera(75, config.width / config.height, 0.1, 1000);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(config.width, config.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    
    this.voxelTerrain = new VoxelTerrain(this.scene);
    
    this.player = new FirstPersonController(this.camera, this.renderer.domElement, this.voxelTerrain);
    
    this.crosshairElement = this.createCrosshairHTML();
    this.container.appendChild(this.crosshairElement);
    
    this.clock = new THREE.Clock();
    
    this.setupLighting();
    this.setupEventListeners();
    this.setupPlayerEvents();
    
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B5A2B, 0.3);
    this.scene.add(hemisphereLight);
  }
  
  private createCrosshairHTML(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 24px;
      height: 24px;
      pointer-events: none;
      z-index: 1000;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d')!;
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(12, 10);
    ctx.moveTo(12, 14);
    ctx.lineTo(12, 20);
    ctx.moveTo(4, 12);
    ctx.lineTo(10, 12);
    ctx.moveTo(14, 12);
    ctx.lineTo(20, 12);
    ctx.stroke();
    
    div.style.backgroundImage = `url(${canvas.toDataURL()})`;
    div.style.backgroundSize = 'contain';
    
    return div;
  }
  
  private setupEventListeners(): void {
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  private setupPlayerEvents(): void {
    this.player.on('blockMined', (data: { position: { x: number; y: number; z: number }; drops: BlockDrop[] }) => {
      const blockData = this.voxelTerrain.getBlockData(data.drops[0]?.type);
      if (blockData && data.drops[0].amount > 0) {
        this.emit('itemCollected', { 
          itemId: `block_${data.drops[0].type}`,
          name: blockData.name,
          amount: data.drops[0].amount 
        });
        this.showNotification(`+${data.drops[0].amount} ${blockData.name}`);
      }
    });
    
    this.player.on('blockPlaced', (data: { position: { x: number; y: number; z: number }; type: BlockType }) => {
      const blockData = this.voxelTerrain.getBlockData(data.type);
      if (blockData) {
        this.emit('blockPlacedEvent', { position: data.position, type: data.type });
      }
    });
    
    this.player.on('blockSelected', (data: { type: BlockType }) => {
      const blockData = this.voxelTerrain.getBlockData(data.type);
      if (blockData) {
        this.emit('blockSelectedEvent', { type: data.type, name: blockData.name });
      }
    });
    
    this.player.on('openInventory', () => {
      this.emit('openInventory');
    });
    
    this.player.on('togglePerspective', () => {
      this.emit('togglePerspective');
    });
  }
  
  private showNotification(message: string): void {
    this.emit('showNotification', { message });
  }
  
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.animate();
    
    console.log('🎮 体素游戏开始！');
    console.log('📌 控制说明:');
    console.log('   WASD - 移动');
    console.log('   空格 - 跳跃');
    console.log('   Shift - 奔跑');
    console.log('   鼠标左键 - 破坏方块');
    console.log('   鼠标右键 - 放置方块');
    console.log('   滚轮 - 切换方块');
    console.log('   E - 背包');
    console.log('   点击画面 - 锁定鼠标');
  }
  
  private animate = (): void => {
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.animate);
    
    const deltaTime = this.clock.getDelta() * 1000;
    
    if (!this.isPaused) {
      this.update(deltaTime);
    }
    
    this.render();
  };
  
  private update(deltaTime: number): void {
    this.player.update(deltaTime);
  }
  
  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
  
  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }
  
  public pause(): void {
    this.isPaused = true;
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
  
  public resume(): void {
    this.isPaused = false;
  }
  
  public getVoxelTerrain(): VoxelTerrain {
    return this.voxelTerrain;
  }
  
  public getPlayer(): FirstPersonController {
    return this.player;
  }
  
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  public getCamera(): THREE.Camera {
    return this.camera;
  }
  
  public saveGame(): { terrain: ReturnType<VoxelTerrain['save']>; player: { x: number; y: number; z: number } } {
    return {
      terrain: this.voxelTerrain.save(),
      player: this.player.getPosition()
    };
  }
  
  public loadGame(data: { terrain: ReturnType<VoxelTerrain['save']>; player: { x: number; y: number; z: number } }): void {
    this.voxelTerrain.load(data.terrain);
    this.player.setPosition(data.player.x, data.player.y, data.player.z);
  }
  
  public dispose(): void {
    this.isRunning = false;
    
    this.voxelTerrain.dispose();
    this.player.dispose();
    
    this.renderer.dispose();
    this.crosshairElement.remove();
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}
