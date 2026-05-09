import * as THREE from 'three';
import { VoxelTerrain } from './VoxelTerrain';
import { FirstPersonController } from './FirstPersonController';
import { EventEmitter } from '../core/EventEmitter';

export class VoxelGameEngine extends EventEmitter {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private voxelTerrain: VoxelTerrain;
  private playerController: FirstPersonController;
  
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  
  private selectedBlockType: number = 1;
  private crosshair: HTMLElement | null = null;
  private hotbar: HTMLElement | null = null;
  private controlsHint: HTMLElement | null = null;
  
  private onBlockPlace: ((position: THREE.Vector3, blockType: number) => void) | null = null;
  private onBlockBreak: ((position: THREE.Vector3) => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    super();
    
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.clock = new THREE.Clock();
    
    this.voxelTerrain = new VoxelTerrain(scene);
    this.voxelTerrain.generateWorld();
    
    this.playerController = new FirstPersonController(camera, renderer.domElement);
    this.playerController.setTerrain({
      getGroundHeight: (x: number, z: number) => this.getGroundHeight(x, z)
    });
    
    this.setupUI();
    this.setupEventListeners();
  }

  private getGroundHeight(x: number, z: number): number {
    for (let y = 32; y >= 0; y--) {
      const block = this.voxelTerrain.getBlock(Math.floor(x), y, Math.floor(z));
      if (block !== 0) {
        return y + 1;
      }
    }
    return 0;
  }

  private setupUI(): void {
    this.createCrosshair();
    this.createHotbar();
    this.createControlsHint();
  }

  private createCrosshair(): void {
    this.crosshair = document.createElement('div');
    this.crosshair.id = 'voxel-crosshair';
    this.crosshair.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      pointer-events: none;
      z-index: 1000;
    `;
    
    const lineH = document.createElement('div');
    lineH.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: 2px;
      background: white;
      transform: translateY(-50%);
      box-shadow: 0 0 2px rgba(0,0,0,0.5);
    `;
    
    const lineV = document.createElement('div');
    lineV.style.cssText = `
      position: absolute;
      left: 50%;
      top: 0;
      width: 2px;
      height: 100%;
      background: white;
      transform: translateX(-50%);
      box-shadow: 0 0 2px rgba(0,0,0,0.5);
    `;
    
    this.crosshair.appendChild(lineH);
    this.crosshair.appendChild(lineV);
    document.body.appendChild(this.crosshair);
  }

  private createHotbar(): void {
    this.hotbar = document.createElement('div');
    this.hotbar.id = 'voxel-hotbar';
    this.hotbar.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      padding: 8px;
      background: rgba(0,0,0,0.7);
      border-radius: 8px;
      z-index: 1000;
    `;

    const blocks = [
      { id: 1, name: '草方块', color: '#4CAF50' },
      { id: 2, name: '泥土', color: '#8B4513' },
      { id: 3, name: '石头', color: '#808080' },
      { id: 4, name: '木头', color: '#8B4513' },
      { id: 5, name: '树叶', color: '#228B22' },
      { id: 6, name: '沙子', color: '#F4D03F' },
      { id: 8, name: '圆石', color: '#696969' },
      { id: 9, name: '砖块', color: '#B22222' },
      { id: 17, name: '木板', color: '#DEB887' }
    ];

    blocks.forEach((block, index) => {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.blockId = block.id.toString();
      slot.style.cssText = `
        width: 48px;
        height: 48px;
        background: ${block.color};
        border: 2px solid ${index === 0 ? '#fff' : '#555'};
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        text-shadow: 1px 1px 2px black;
        transition: all 0.1s;
      `;
      slot.title = block.name;
      slot.textContent = (index + 1).toString();
      
      slot.addEventListener('click', () => {
        this.selectBlock(block.id);
        document.querySelectorAll('.hotbar-slot').forEach(s => {
          (s as HTMLElement).style.border = '2px solid #555';
        });
        slot.style.border = '2px solid #fff';
      });
      
      this.hotbar!.appendChild(slot);
    });

    document.body.appendChild(this.hotbar);
  }

  private createControlsHint(): void {
    this.controlsHint = document.createElement('div');
    this.controlsHint.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 15px;
      background: rgba(0,0,0,0.8);
      color: white;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.6;
      z-index: 1000;
      max-width: 200px;
    `;
    this.controlsHint.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">体素模式操作</div>
      <div>WASD - 移动</div>
      <div>空格 - 跳跃</div>
      <div>Shift - 奔跑</div>
      <div>鼠标 - 视角</div>
      <div>左键 - 破坏方块</div>
      <div>右键 - 放置方块</div>
      <div>1-9 - 选择方块</div>
      <div>ESC - 退出指针锁定</div>
    `;
    document.body.appendChild(this.controlsHint);
  }

  private setupEventListeners(): void {
    this.playerController.on('lockChange', (data: any) => {
      if (!data.locked) {
        this.showUI();
      }
    });

    this.playerController.on('move', (data: any) => {
      this.emit('playerMove', data);
    });

    this.playerController.on('jump', () => {
      this.emit('playerJump');
    });

    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.playerController.isPointerLocked()) return;

    if (event.code >= 'Digit1' && event.code <= 'Digit9') {
      const index = parseInt(event.code.replace('Digit', '')) - 1;
      const slots = this.hotbar?.querySelectorAll('.hotbar-slot');
      if (slots && slots[index]) {
        const blockId = parseInt(slots[index].getAttribute('data-block-id') || '1');
        this.selectBlock(blockId);
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.playerController.isPointerLocked()) return;

    const hit = this.voxelTerrain.raycast(
      this.camera.position,
      new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
    );

    if (hit.hit && hit.position) {
      if (event.button === 0) {
        this.breakBlock(hit.position);
      } else if (event.button === 2) {
        this.placeBlock(hit.position, hit.normal!);
      }
    }
  }

  private breakBlock(position: THREE.Vector3): void {
    if (this.voxelTerrain.breakBlock(position)) {
      this.onBlockBreak?.(position);
      this.emit('blockBreak', { position, blockType: this.voxelTerrain.getBlock(Math.floor(position.x), Math.floor(position.y), Math.floor(position.z)) });
    }
  }

  private placeBlock(position: THREE.Vector3, normal: THREE.Vector3): void {
    this.voxelTerrain.placeBlock(position, this.selectedBlockType, normal);
    this.onBlockPlace?.(position, this.selectedBlockType);
    this.emit('blockPlace', { position, blockType: this.selectedBlockType });
  }

  private selectBlock(blockId: number): void {
    this.selectedBlockType = blockId;
    this.emit('blockSelect', { blockId, blockType: this.voxelTerrain.getBlockType(blockId) });
  }

  public start(): void {
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
  }

  private animate(): void {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    
    this.playerController.update(deltaTime);
    
    this.renderer.render(this.scene, this.camera);
  }

  public showUI(): void {
    this.crosshair?.style.setProperty('display', 'block');
    this.hotbar?.style.setProperty('display', 'flex');
    this.controlsHint?.style.setProperty('display', 'block');
  }

  public hideUI(): void {
    this.crosshair?.style.setProperty('display', 'none');
    this.hotbar?.style.setProperty('display', 'none');
    this.controlsHint?.style.setProperty('display', 'none');
  }

  public setOnBlockPlace(callback: (position: THREE.Vector3, blockType: number) => void): void {
    this.onBlockPlace = callback;
  }

  public setOnBlockBreak(callback: (position: THREE.Vector3) => void): void {
    this.onBlockBreak = callback;
  }

  public getTerrain(): VoxelTerrain {
    return this.voxelTerrain;
  }

  public getPlayerController(): FirstPersonController {
    return this.playerController;
  }

  public dispose(): void {
    this.stop();
    
    this.crosshair?.remove();
    this.hotbar?.remove();
    this.controlsHint?.remove();
    
    this.voxelTerrain.dispose();
    this.playerController.dispose();
  }
}
