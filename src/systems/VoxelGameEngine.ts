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

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  amount: number;
  icon?: string;
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
  
  private inventory: InventoryItem[] = [];
  private hotbarSize: number = 9;
  private selectedHotbarSlot: number = 0;
  
  private crosshairElement: HTMLDivElement;
  private hotbarElement: HTMLDivElement;
  private controlsHintElement: HTMLDivElement;
  private blockIndicatorElement: HTMLDivElement;
  private inventoryUIElement: HTMLDivElement | null = null;
  
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
    
    const playerBody = this.player.getPlayerBody();
    this.scene.add(playerBody);
    
    this.crosshairElement = this.createCrosshairHTML();
    this.hotbarElement = this.createHotbarHTML();
    this.controlsHintElement = this.createControlsHintHTML();
    this.blockIndicatorElement = this.createBlockIndicatorHTML();
    
    this.container.appendChild(this.crosshairElement);
    this.container.appendChild(this.hotbarElement);
    this.container.appendChild(this.controlsHintElement);
    this.container.appendChild(this.blockIndicatorElement);
    
    this.clock = new THREE.Clock();
    
    this.setupLighting();
    this.setupEventListeners();
    this.setupPlayerEvents();
    
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('keydown', this.onGlobalKeyDown.bind(this));
    
    setTimeout(() => {
      this.controlsHintElement.classList.add('fade-out');
    }, 8000);
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
  
  private createHotbarHTML(): HTMLDivElement {
    const div = document.createElement('div');
    div.id = 'voxel-hotbar';
    div.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      z-index: 1000;
      pointer-events: none;
    `;
    
    for (let i = 0; i < this.hotbarSize; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width: 48px;
        height: 48px;
        background: rgba(50, 50, 50, 0.8);
        border: 2px solid ${i === this.selectedHotbarSlot ? '#fff' : 'rgba(100, 100, 100, 0.5)'};
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.7);
        transition: all 0.15s ease;
      `;
      slot.id = `hotbar-slot-${i}`;
      slot.innerHTML = `<span style="position:absolute;bottom:2px;left:4px;font-size:9px;">${i + 1}</span>`;
      div.appendChild(slot);
    }
    
    return div;
  }
  
  private createControlsHintHTML(): HTMLDivElement {
    const div = document.createElement('div');
    div.id = 'voxel-controls';
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 20px;
      transform: translateY(-50%);
      padding: 16px 20px;
      background: rgba(0, 0, 0, 0.75);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: white;
      font-size: 13px;
      line-height: 1.8;
      z-index: 1000;
      pointer-events: none;
      backdrop-filter: blur(10px);
      transition: opacity 1s ease;
    `;
    
    div.innerHTML = `
      <div style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#4ade80;">🎮 控制说明</div>
      <div><span style="color:#fbbf24;">WASD</span> - 移动</div>
      <div><span style="color:#fbbf24;">空格</span> - 跳跃</div>
      <div><span style="color:#fbbf24;">Shift</span> - 奔跑</div>
      <div><span style="color:#60a5fa;">鼠标左键</span> - 破坏方块</div>
      <div><span style="color:#60a5fa;">鼠标右键</span> - 放置方块</div>
      <div><span style="color:#a78bfa;">滚轮</span> - 切换方块</div>
      <div><span style="color:#f472b6;">E</span> - 物品栏</div>
      <div><span style="color:#f472b6;">F</span> - 切换视角</div>
      <div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,0.5);">点击画面锁定鼠标</div>
    `;
    
    return div;
  }
  
  private createBlockIndicatorHTML(): HTMLDivElement {
    const div = document.createElement('div');
    div.id = 'voxel-block-indicator';
    div.style.cssText = `
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      color: white;
      font-size: 14px;
      z-index: 1000;
      pointer-events: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    div.textContent = '草方块';
    
    return div;
  }
  
  private setupEventListeners(): void {
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  private setupPlayerEvents(): void {
    this.player.on('blockMined', (data: { position: { x: number; y: number; z: number }; drops: BlockDrop[] }) => {
      const blockData = this.voxelTerrain.getBlockData(data.drops[0]?.type);
      if (blockData && data.drops[0].amount > 0) {
        this.addToInventory(`block_${data.drops[0].type}`, blockData.name, data.drops[0].amount);
        this.showNotification(`+${data.drops[0].amount} ${blockData.name}`, 'success');
      }
    });
    
    this.player.on('blockPlaced', (data: { position: { x: number; y: number; z: number }; type: BlockType }) => {
      const blockData = this.voxelTerrain.getBlockData(data.type);
      if (blockData) {
        this.showNotification(`放置了 ${blockData.name}`, 'info');
      }
    });
    
    this.player.on('blockSelected', (data: { type: BlockType }) => {
      const blockData = this.voxelTerrain.getBlockData(data.type);
      if (blockData) {
        this.blockIndicatorElement.textContent = blockData.name;
        this.blockIndicatorElement.style.borderColor = `#${blockData.color.toString(16).padStart(6, '0')}`;
      }
    });
    
    this.player.on('perspectiveChanged', (data: { isFirstPerson: boolean }) => {
      if (data.isFirstPerson) {
        this.crosshairElement.style.display = 'block';
        this.blockIndicatorElement.style.display = 'block';
        this.showNotification('第一人称视角', 'info');
      } else {
        this.crosshairElement.style.display = 'none';
        this.blockIndicatorElement.style.display = 'none';
        this.showNotification('第三人称视角 - 按F切换', 'info');
      }
    });
    
    this.player.on('openInventory', () => {
      this.toggleInventoryUI();
    });
  }
  
  private onGlobalKeyDown(event: KeyboardEvent): void {
    if (event.key >= '1' && event.key <= '9') {
      const slot = parseInt(event.key) - 1;
      this.selectHotbarSlot(slot);
    }
  }
  
  private selectHotbarSlot(slot: number): void {
    this.selectedHotbarSlot = slot;
    
    const slots = this.hotbarElement.querySelectorAll('div');
    slots.forEach((s, i) => {
      (s as HTMLElement).style.borderColor = i === slot ? '#fff' : 'rgba(100, 100, 100, 0.5)';
      (s as HTMLElement).style.background = i === slot ? 'rgba(100, 100, 100, 0.8)' : 'rgba(50, 50, 50, 0.8)';
    });
  }
  
  private addToInventory(id: string, name: string, amount: number): void {
    const existing = this.inventory.find(item => item.id === id);
    if (existing) {
      existing.amount += amount;
    } else {
      this.inventory.push({ id, name, type: 'block', amount });
    }
    this.updateHotbarDisplay();
  }
  
  private updateHotbarDisplay(): void {
    const blocks = this.voxelTerrain.getAllBlockTypes().slice(0, this.hotbarSize);
    
    blocks.forEach((blockType, i) => {
      const slot = document.getElementById(`hotbar-slot-${i}`);
      if (slot) {
        const blockData = this.voxelTerrain.getBlockData(blockType);
        if (blockData) {
          const color = `#${blockData.color.toString(16).padStart(6, '0')}`;
          slot.style.background = `linear-gradient(135deg, ${color}40, ${color}80)`;
          slot.style.borderColor = i === this.selectedHotbarSlot ? '#fff' : 'rgba(100, 100, 100, 0.5)';
        }
      }
    });
  }
  
  private toggleInventoryUI(): void {
    if (this.inventoryUIElement) {
      this.inventoryUIElement.remove();
      this.inventoryUIElement = null;
      return;
    }
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: rgba(30, 30, 30, 0.95);
      border-radius: 12px;
      padding: 24px;
      min-width: 500px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      color: white;
    `;
    
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;font-size:20px;">📦 物品栏</h2>
        <button id="close-inventory" style="
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
        ">关闭 (E)</button>
      </div>
      <div style="margin-bottom:20px;">
        <h3 style="margin:0 0 10px 0;font-size:14px;color:rgba(255,255,255,0.7);">快捷栏</h3>
        <div style="display:flex;gap:8px;">
          ${this.voxelTerrain.getAllBlockTypes().slice(0, 9).map((type, i) => {
            const data = this.voxelTerrain.getBlockData(type);
            return `<div style="
              width: 48px;
              height: 48px;
              background: linear-gradient(135deg, #${data?.color.toString(16).padStart(6, '0')}40, #${data?.color.toString(16).padStart(6, '0')}80);
              border: 2px solid ${i === 0 ? '#fff' : 'rgba(100,100,100,0.5)'};
              border-radius: 4px;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:10px;
            ">${data?.name}</div>`;
          }).join('')}
        </div>
      </div>
      <div>
        <h3 style="margin:0 0 10px 0;font-size:14px;color:rgba(255,255,255,0.7);">背包 (${this.inventory.length} 个物品)</h3>
        <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:4px;max-height:200px;overflow-y:auto;">
          ${this.inventory.length === 0 ? '<div style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,0.5);padding:20px;">背包是空的，挖掘方块获得物品</div>' : 
          this.inventory.map(item => `
            <div style="
              background: rgba(60,60,60,0.8);
              border: 1px solid rgba(100,100,100,0.3);
              border-radius: 4px;
              padding: 8px;
              text-align: center;
              font-size: 11px;
            ">
              <div style="font-size:10px;color:rgba(255,255,255,0.7);">${item.name}</div>
              <div style="color:#4ade80;font-weight:bold;">x${item.amount}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    overlay.appendChild(panel);
    this.container.appendChild(overlay);
    this.inventoryUIElement = overlay;
    
    document.getElementById('close-inventory')?.addEventListener('click', () => {
      this.toggleInventoryUI();
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.toggleInventoryUI();
      }
    });
  }
  
  private showNotification(message: string, type: string = 'info'): void {
    const existing = document.querySelector('.voxel-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'voxel-notification';
    
    const colors: Record<string, string> = {
      success: '#4ade80',
      info: '#60a5fa',
      warning: '#fbbf24',
      error: '#f87171'
    };
    
    notification.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid ${colors[type] || colors.info};
      border-radius: 10px;
      color: white;
      font-size: 15px;
      font-weight: bold;
      z-index: 1001;
      animation: fadeInOut 2.5s ease-in-out forwards;
      pointer-events: none;
    `;
    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) scale(0.8); }
        15% { opacity: 1; transform: translateX(-50%) scale(1); }
        85% { opacity: 1; transform: translateX(-50%) scale(1); }
        100% { opacity: 0; transform: translateX(-50%) scale(0.8); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 2500);
  }
  
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.animate();
    this.updateHotbarDisplay();
    
    console.log('🎮 体素游戏开始！');
    this.showNotification('🎮 体素世界已加载！点击画面开始游戏', 'success');
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
  
  public saveGame(): { terrain: ReturnType<VoxelTerrain['save']>; player: { x: number; y: number; z: number }; inventory: InventoryItem[] } {
    return {
      terrain: this.voxelTerrain.save(),
      player: this.player.getPosition(),
      inventory: this.inventory
    };
  }
  
  public loadGame(data: { terrain: ReturnType<VoxelTerrain['save']>; player: { x: number; y: number; z: number }; inventory: InventoryItem[] }): void {
    this.voxelTerrain.load(data.terrain);
    this.player.setPosition(data.player.x, data.player.y, data.player.z);
    this.inventory = data.inventory || [];
    this.updateHotbarDisplay();
  }
  
  public dispose(): void {
    this.isRunning = false;
    
    this.voxelTerrain.dispose();
    this.player.dispose();
    
    this.renderer.dispose();
    this.crosshairElement.remove();
    this.hotbarElement.remove();
    this.controlsHintElement.remove();
    this.blockIndicatorElement.remove();
    this.inventoryUIElement?.remove();
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('keydown', this.onGlobalKeyDown.bind(this));
  }
}
