// 《星野栖所》输入管理器 - 键盘鼠标拖动控制

import { EventEmitter } from './EventEmitter';
import * as THREE from 'three';

interface CameraMovement {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

interface CameraRotation {
  enabled: boolean;
  deltaX: number;
  deltaY: number;
}

export class InputManager extends EventEmitter {
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  
  private cameraMovement: CameraMovement = {
    forward: false,
    backward: false,
    left: false,
    right: false
  };
  
  private cameraRotation: CameraRotation = {
    enabled: false,
    deltaX: 0,
    deltaY: 0
  };
  
  private dragState = {
    isDragging: false,
    lastX: 0,
    lastY: 0
  };
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private rotationSpeed: number = 0.003;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // 右键拖动旋转
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    
    // 鼠标滚轮缩放
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    
    // 左键点击选择
    this.domElement.addEventListener('click', this.onClick.bind(this));
    
    // 阻止右键菜单
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // 窗口大小变化
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.isClickingOnUI(event.target as HTMLElement)) {
      return;
    }

    if (event.button === 2) { // 右键旋转视角
      this.dragState.isDragging = true;
      this.dragState.lastX = event.clientX;
      this.dragState.lastY = event.clientY;
      this.cameraRotation.enabled = true;
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (event.button === 2) {
      this.dragState.isDragging = false;
      this.cameraRotation.enabled = false;
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.dragState.isDragging || !this.cameraRotation.enabled) {
      return;
    }

    const deltaX = event.clientX - this.dragState.lastX;
    const deltaY = event.clientY - this.dragState.lastY;

    // 应用旋转
    this.applyCameraRotation(deltaX, deltaY);
    
    this.dragState.lastX = event.clientX;
    this.dragState.lastY = event.clientY;
  }

  private onClick(event: MouseEvent): void {
    if (this.isClickingOnUI(event.target as HTMLElement)) {
      return;
    }

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.emit('objectSelect', {
      mouse: this.mouse.clone(),
      screenX: event.clientX,
      screenY: event.clientY
    });
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.handleZoom(event.deltaY);
  }

  private handleZoom(deltaY: number): void {
    const zoomSpeed = 0.5;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    
    this.camera.position.addScaledVector(direction, -deltaY * zoomSpeed * 0.01);
  }

  private applyCameraRotation(deltaX: number, deltaY: number): void {
    const horizontalRotation = deltaX * this.rotationSpeed;
    
    const cameraPosition = this.camera.position.clone();
    
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    
    const distance = cameraPosition.length();
    
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(cameraPosition);
    
    spherical.theta -= horizontalRotation;
    spherical.phi -= deltaY * this.rotationSpeed;
    
    // 限制垂直旋转角度
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
    
    // 更新相机位置
    cameraPosition.setFromSpherical(spherical);
    this.camera.position.copy(cameraPosition);
    this.camera.lookAt(0, 0, 0);
  }

  private isClickingOnUI(target: HTMLElement): boolean {
    if (!target) return false;
    
    const uiSelectors = [
      '.action-button', '.action-bar', '.hud-panel', '.notification',
      '.notification-close', '.controls-hint', 'button', '.fps-panel', '.phase-panel'
    ];
    
    let current: HTMLElement | null = target;
    while (current) {
      for (const selector of uiSelectors) {
        if (current.matches && current.matches(selector)) {
          return true;
        }
      }
      if (current.className && typeof current.className === 'string') {
        for (const selector of uiSelectors) {
          const className = selector.replace('.', '');
          if (current.className.includes(className)) {
            return true;
          }
        }
      }
      current = current.parentElement;
    }
    
    return false;
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.cameraMovement.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.cameraMovement.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.cameraMovement.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.cameraMovement.right = true;
        break;
      case 'Escape':
        this.emit('pause', {});
        break;
      case 'KeyP':
        this.emit('saveGame', {});
        break;
      case 'KeyL':
        this.emit('loadGame', {});
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.cameraMovement.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.cameraMovement.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.cameraMovement.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.cameraMovement.right = false;
        break;
    }
  }

  private onResize(): void {
    // 窗口大小变化时的处理
  }

  public update(deltaTime: number): void {
    // 移动相机位置
    if (this.cameraMovement.forward || this.cameraMovement.backward || 
        this.cameraMovement.left || this.cameraMovement.right) {
      this.moveCamera(deltaTime);
    }
    
    // 重置旋转增量
    this.cameraRotation.deltaX = 0;
    this.cameraRotation.deltaY = 0;
  }

  private moveCamera(deltaTime: number): void {
    const moveSpeed = 15 * deltaTime; // 每秒15单位
    const direction = new THREE.Vector3();
    
    // 获取相机的前后左右方向
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    if (this.cameraMovement.forward) direction.add(forward);
    if (this.cameraMovement.backward) direction.sub(forward);
    if (this.cameraMovement.left) direction.sub(right);
    if (this.cameraMovement.right) direction.add(right);
    
    if (direction.length() > 0) {
      direction.normalize().multiplyScalar(moveSpeed);
      this.camera.position.add(direction);
    }
  }

  public getCameraMovement(): CameraMovement {
    return { ...this.cameraMovement };
  }

  public getCameraRotation(): CameraRotation {
    return { ...this.cameraRotation };
  }

  public getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }

  public getMouse(): THREE.Vector2 {
    return this.mouse.clone();
  }

  public setMousePosition(x: number, y: number): void {
    this.mouse.x = (x / window.innerWidth) * 2 - 1;
    this.mouse.y = -(y / window.innerHeight) * 2 + 1;
  }

  public checkIntersection(objects: THREE.Object3D[]): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    
    this.domElement.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    window.removeEventListener('pointerup', this.onPointerUp.bind(this));
    window.removeEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
    this.domElement.removeEventListener('click', this.onClick.bind(this));
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('resize', this.onResize.bind(this));
    
    this.removeAllListeners();
  }

  private onContextMenu = (e: Event) => e.preventDefault();
}
