import * as THREE from 'three';
import { EventEmitter } from '../core/EventEmitter';

export interface PlayerControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
}

export class FirstPersonController extends EventEmitter {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private velocity: THREE.Vector3;
  private direction: THREE.Vector3;
  
  private moveSpeed: number = 8;
  private sprintMultiplier: number = 1.6;
  private jumpForce: number = 8;
  private gravity: number = 20;
  
  private isLocked: boolean = false;
  private playerHeight: number = 1.7;
  private playerRadius: number = 0.3;
  
  private controls: PlayerControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false
  };
  
  private euler: THREE.Euler;
  
  private terrain: any = null;
  private onGround: boolean = false;
  private verticalVelocity: number = 0;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    super();
    
    this.camera = camera;
    this.domElement = domElement;
    
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    
    this.camera.position.y = this.playerHeight;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('click', () => this.requestLock());
    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
  }

  public setTerrain(terrain: any): void {
    this.terrain = terrain;
  }

  private requestLock(): void {
    if (!this.isLocked) {
      this.domElement.requestPointerLock();
    }
  }

  private onPointerLockChange(): void {
    this.isLocked = document.pointerLockElement === this.domElement;
    this.emit('lockChange', { locked: this.isLocked });
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.controls.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.controls.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.controls.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.controls.right = true;
        break;
      case 'Space':
        this.controls.jump = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.controls.sprint = true;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.controls.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.controls.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.controls.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.controls.right = false;
        break;
      case 'Space':
        this.controls.jump = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.controls.sprint = false;
        break;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= movementX * 0.002;
    this.euler.x -= movementY * 0.002;
    
    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
    
    this.camera.quaternion.setFromEuler(this.euler);
  }

  public update(deltaTime: number): void {
    if (!this.isLocked) return;

    const speed = this.moveSpeed * (this.controls.sprint ? this.sprintMultiplier : 1);
    
    this.direction.z = Number(this.controls.forward) - Number(this.controls.backward);
    this.direction.x = Number(this.controls.right) - Number(this.controls.left);
    this.direction.normalize();

    if (this.controls.forward || this.controls.backward) {
      this.velocity.z = this.direction.z * speed;
    } else {
      this.velocity.z = 0;
    }

    if (this.controls.left || this.controls.right) {
      this.velocity.x = this.direction.x * speed;
    } else {
      this.velocity.x = 0;
    }

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveX = right.x * this.velocity.x + forward.x * this.velocity.z;
    const moveZ = right.z * this.velocity.x + forward.z * this.velocity.z;

    const newX = this.camera.position.x + moveX * deltaTime;
    const newZ = this.camera.position.z + moveZ * deltaTime;

    if (this.terrain) {
      const groundY = this.terrain.getGroundHeight(newX, newZ);
      const targetY = groundY + this.playerHeight;
      
      if (this.controls.jump && this.onGround) {
        this.verticalVelocity = this.jumpForce;
        this.onGround = false;
        this.emit('jump');
      }
      
      this.verticalVelocity -= this.gravity * deltaTime;
      
      let newY = this.camera.position.y + this.verticalVelocity * deltaTime;
      
      if (newY < targetY) {
        newY = targetY;
        this.verticalVelocity = 0;
        this.onGround = true;
      }

      if (this.checkCollision(newX, newY, newZ)) {
        if (!this.checkCollision(newX, this.camera.position.y, this.camera.position.z)) {
          this.camera.position.x = newX;
        }
        if (!this.checkCollision(this.camera.position.x, this.camera.position.y, newZ)) {
          this.camera.position.z = newZ;
        }
      } else {
        this.camera.position.x = newX;
        this.camera.position.y = newY;
        this.camera.position.z = newZ;
      }
    } else {
      this.camera.position.x = newX;
      this.camera.position.z = newZ;
    }

    if (this.controls.forward || this.backward || this.left || this.right) {
      this.emit('move', { 
        position: this.camera.position.clone(),
        speed: speed
      });
    }
  }

  private get backward(): boolean {
    return this.controls.backward;
  }

  private get left(): boolean {
    return this.controls.left;
  }

  private get right(): boolean {
    return this.controls.right;
  }

  private checkCollision(x: number, y: number, z: number): boolean {
    if (!this.terrain) return false;

    const checkPoints = [
      { x: x - this.playerRadius, z: z - this.playerRadius },
      { x: x + this.playerRadius, z: z - this.playerRadius },
      { x: x - this.playerRadius, z: z + this.playerRadius },
      { x: x + this.playerRadius, z: z + this.playerRadius }
    ];

    for (const point of checkPoints) {
      const groundY = this.terrain.getGroundHeight(point.x, point.z);
      if (y < groundY + this.playerHeight + 0.1) {
        return true;
      }
    }

    return false;
  }

  public getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  public setPosition(position: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.camera.position.y = this.playerHeight;
  }

  public isPointerLocked(): boolean {
    return this.isLocked;
  }

  public unlock(): void {
    document.exitPointerLock();
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown as any);
    document.removeEventListener('keyup', this.onKeyUp as any);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('click', this.requestLock);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
