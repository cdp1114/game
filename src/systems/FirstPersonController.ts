import * as THREE from 'three';
import { EventEmitter } from '../core/EventEmitter';
import { VoxelTerrain, BlockType } from './VoxelTerrain';

export class FirstPersonController extends EventEmitter {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private voxelTerrain: VoxelTerrain;
  
  private moveForward: boolean = false;
  private moveBackward: boolean = false;
  private moveLeft: boolean = false;
  private moveRight: boolean = false;
  private jump: boolean = false;
  private sprint: boolean = false;
  
  private yaw: number = 0;
  private pitch: number = 0;
  
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private direction: THREE.Vector3 = new THREE.Vector3();
  
  private position: THREE.Vector3;
  
  private isLocked: boolean = false;
  
  private moveSpeed: number = 5;
  private sprintMultiplier: number = 1.6;
  private jumpForce: number = 8;
  private gravity: number = 20;
  
  private onGround: boolean = false;
  private selectedBlockType: BlockType = BlockType.GRASS;
  
  private raycaster: THREE.Raycaster;
  private highlightMesh: THREE.Mesh;
  
  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, voxelTerrain: VoxelTerrain) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.voxelTerrain = voxelTerrain;
    
    this.position = new THREE.Vector3(32, 20, 32);
    this.camera.position.copy(this.position);
    
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 6;
    
    const highlightGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    this.highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    this.highlightMesh.visible = false;
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('wheel', this.onWheel.bind(this));
    
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    if (!this.isLocked) return;
    
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
      case 'Space':
        this.jump = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprint = true;
        break;
      case 'KeyE':
        this.emit('openInventory');
        break;
      case 'KeyF':
        this.emit('togglePerspective');
        break;
      case 'KeyT':
        this.emit('openChat');
        break;
    }
  }
  
  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
      case 'Space':
        this.jump = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprint = false;
        break;
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    if (!this.isLocked) return;
    
    const sensitivity = 0.002;
    
    this.yaw -= event.movementX * sensitivity;
    this.pitch -= event.movementY * sensitivity;
    
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }
  
  private onMouseDown(event: MouseEvent): void {
    if (!this.isLocked) return;
    
    if (event.button === 0) {
      this.breakBlock();
    } else if (event.button === 2) {
      this.placeBlock();
    }
  }
  
  private onWheel(event: WheelEvent): void {
    if (!this.isLocked) return;
    
    const allBlocks = this.voxelTerrain.getAllBlockTypes();
    const currentIndex = allBlocks.indexOf(this.selectedBlockType);
    
    if (event.deltaY > 0) {
      this.selectedBlockType = allBlocks[(currentIndex + 1) % allBlocks.length];
    } else {
      this.selectedBlockType = allBlocks[(currentIndex - 1 + allBlocks.length) % allBlocks.length];
    }
    
    this.emit('blockSelected', { type: this.selectedBlockType });
  }
  
  private breakBlock(): void {
    const result = this.voxelTerrain.raycast(
      this.camera.position,
      new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion),
      6
    );
    
    if (result.hit && result.position) {
      const drops = this.voxelTerrain.breakBlock(result.position.x, result.position.y, result.position.z);
      if (drops) {
        this.emit('blockMined', { position: result.position, drops });
      }
    }
  }
  
  private placeBlock(): void {
    const result = this.voxelTerrain.raycast(
      this.camera.position,
      new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion),
      6
    );
    
    if (result.block) {
      const placed = this.voxelTerrain.placeBlock(result.block.x, result.block.y, result.block.z, this.selectedBlockType);
      if (placed) {
        this.emit('blockPlaced', { position: result.block, type: this.selectedBlockType });
      }
    }
  }
  
  public update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();
    
    const speed = this.moveSpeed * (this.sprint ? this.sprintMultiplier : 1);
    
    if (this.onGround) {
      if (this.direction.z !== 0) {
        this.velocity.z = this.direction.z * speed;
      } else {
        this.velocity.z = 0;
      }
      
      if (this.direction.x !== 0) {
        this.velocity.x = this.direction.x * speed;
      } else {
        this.velocity.x = 0;
      }
      
      if (this.jump) {
        this.velocity.y = this.jumpForce;
        this.onGround = false;
      }
    }
    
    this.velocity.y -= this.gravity * dt;
    
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    
    const moveX = (forward.x * this.velocity.z + right.x * this.velocity.x) * dt;
    const moveZ = (forward.z * this.velocity.z + right.z * this.velocity.x) * dt;
    const moveY = this.velocity.y * dt;
    
    const newX = this.checkCollision(this.position.x + moveX, this.position.y, this.position.z, 0.3, 1.8).x;
    const newZ = this.checkCollision(newX, this.position.y, this.position.z + moveZ, 0.3, 1.8).z;
    let newY = this.position.y + moveY;
    
    if (moveY < 0) {
      const feetY = this.checkCollision(newX, newY, newZ, 0.3, 1.8).y;
      if (feetY !== newY) {
        newY = feetY;
        this.velocity.y = 0;
        this.onGround = true;
      }
    } else {
      const headY = this.checkCollision(newX, newY + 1.8, newZ, 0.3, 0.1).y;
      if (headY !== newY + 1.8) {
        newY = headY - 1.8;
        this.velocity.y = 0;
      }
    }
    
    this.position.set(newX, newY, newZ);
    this.camera.position.copy(this.position);
    this.camera.position.y += 1.6;
    
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    
    this.updateBlockHighlight();
    
    this.emit('positionChanged', { position: this.position.clone() });
  }
  
  private checkCollision(x: number, y: number, z: number, radius: number, height: number): THREE.Vector3 {
    const result = new THREE.Vector3(x, y, z);
    
    const checkPoints = [
      [x - radius, y, z - radius],
      [x + radius, y, z - radius],
      [x - radius, y, z + radius],
      [x + radius, y, z + radius],
      [x - radius, y + height, z - radius],
      [x + radius, y + height, z - radius],
      [x - radius, y + height, z + radius],
      [x + radius, y + height, z + radius],
    ];
    
    for (const point of checkPoints) {
      const bx = Math.floor(point[0]);
      const by = Math.floor(point[1]);
      const bz = Math.floor(point[2]);
      
      const block = this.voxelTerrain.getBlock(bx, by, bz);
      const data = this.voxelTerrain.getBlockData(block);
      
      if (block !== BlockType.AIR && data?.solid) {
        return result;
      }
    }
    
    return result;
  }
  
  private updateBlockHighlight(): void {
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const result = this.voxelTerrain.raycast(this.camera.position, direction, 6);
    
    if (result.hit && result.position) {
      this.highlightMesh.position.set(
        result.position.x + 0.5,
        result.position.y + 0.5,
        result.position.z + 0.5
      );
      this.highlightMesh.visible = true;
    } else {
      this.highlightMesh.visible = false;
    }
  }
  
  public setSelectedBlock(type: BlockType): void {
    this.selectedBlockType = type;
  }
  
  public getSelectedBlock(): BlockType {
    return this.selectedBlockType;
  }
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.camera.position.copy(this.position);
    this.camera.position.y += 1.6;
  }
  
  public dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mousedown', this.onMouseDown.bind(this));
    document.removeEventListener('wheel', this.onWheel.bind(this));
    
    this.highlightMesh.geometry.dispose();
    (this.highlightMesh.material as THREE.Material).dispose();
  }
}
