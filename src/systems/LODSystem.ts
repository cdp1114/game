// 《星野栖所》LOD多级细节系统 - 根据距离动态切换模型精度

import * as THREE from 'three';

export interface LODLevel {
  distance: number;
  object: THREE.Object3D | THREE.BufferGeometry | null;
  material?: THREE.Material | THREE.Material[];
}

export interface LODObject {
  name: string;
  levels: LODLevel[];
  currentLevel: number;
  object: THREE.Object3D | null;
}

export class LODSystem {
  private lodObjects: Map<string, LODObject> = new Map();
  private camera: THREE.Camera;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private matrix: THREE.Matrix4 = new THREE.Matrix4();
  
  private defaultDistances: number[] = [50, 100, 200, 400];
  private enabled: boolean = true;
  private updateInterval: number = 5;
  private frameCounter: number = 0;
  
  constructor(camera: THREE.Camera) {
    this.camera = camera;
    console.log('🏔️ LOD系统已初始化');
  }
  
  public addLODObject(
    name: string,
    highDetail: THREE.Object3D,
    mediumDetail?: THREE.Object3D | THREE.BufferGeometry,
    lowDetail?: THREE.Object3D | THREE.BufferGeometry,
    ultraLowDetail?: THREE.Object3D | THREE.BufferGeometry
  ): void {
    const levels: LODLevel[] = [];
    
    levels.push({
      distance: 0,
      object: highDetail
    });
    
    if (mediumDetail) {
      levels.push({
        distance: this.defaultDistances[0],
        object: mediumDetail instanceof THREE.BufferGeometry ? null : mediumDetail
      });
    }
    
    if (lowDetail) {
      levels.push({
        distance: this.defaultDistances[1],
        object: lowDetail instanceof THREE.BufferGeometry ? null : lowDetail
      });
    }
    
    if (ultraLowDetail) {
      levels.push({
        distance: this.defaultDistances[2],
        object: ultraLowDetail instanceof THREE.BufferGeometry ? null : ultraLowDetail
      });
    }
    
    if (levels.length === 1) {
      const simpleLow = this.createSimpleReplacement(highDetail, 3);
      levels.push({
        distance: this.defaultDistances[0],
        object: simpleLow
      });
    }
    
    if (levels.length === 2) {
      const simpleMid = this.createSimpleReplacement(highDetail, 2);
      const simpleLow = this.createSimpleReplacement(highDetail, 4);
      levels[1] = { distance: this.defaultDistances[0], object: simpleMid };
      levels.push({ distance: this.defaultDistances[1], object: simpleLow });
    }
    
    levels.sort((a, b) => b.distance - a.distance);
    
    const lodObject: LODObject = {
      name,
      levels,
      currentLevel: 0,
      object: highDetail
    };
    
    this.lodObjects.set(name, lodObject);
  }
  
  private createSimpleReplacement(source: THREE.Object3D, reduceFactor: number): THREE.Object3D {
    const group = new THREE.Group();
    group.name = source.name + '_lowLOD';
    
    source.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const simpleGeometry = this.simplifyGeometry(child.geometry, reduceFactor);
        const simpleMesh = new THREE.Mesh(simpleGeometry, child.material);
        simpleMesh.position.copy(child.position);
        simpleMesh.rotation.copy(child.rotation);
        simpleMesh.scale.copy(child.scale);
        simpleMesh.castShadow = false;
        simpleMesh.receiveShadow = false;
        group.add(simpleMesh);
      }
    });
    
    return group;
  }
  
  private simplifyGeometry(geometry: THREE.BufferGeometry, factor: number): THREE.BufferGeometry {
    if (geometry.index) {
      const indices = geometry.index.array;
      const newIndices: number[] = [];
      
      for (let i = 0; i < indices.length; i += 3 * factor) {
        newIndices.push(indices[i], indices[i + 1], indices[i + 2]);
      }
      
      const simplified = geometry.clone();
      simplified.setIndex(newIndices);
      simplified.computeVertexNormals();
      return simplified;
    }
    
    const positions = geometry.attributes.position;
    if (!positions) return geometry.clone();
    
    const vertexCount = Math.floor(positions.count / factor);
    const newPositions = new Float32Array(vertexCount * 3);
    
    for (let i = 0; i < vertexCount; i++) {
      const srcIndex = i * factor;
      newPositions[i * 3] = positions.getX(srcIndex);
      newPositions[i * 3 + 1] = positions.getY(srcIndex);
      newPositions[i * 3 + 2] = positions.getZ(srcIndex);
    }
    
    const simplified = new THREE.BufferGeometry();
    simplified.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    simplified.computeVertexNormals();
    return simplified;
  }
  
  public addFromConfig(name: string, config: LODLevel[]): void {
    const lodObject: LODObject = {
      name,
      levels: config.sort((a, b) => b.distance - a.distance),
      currentLevel: 0,
      object: config[0]?.object as THREE.Object3D || null
    };
    
    this.lodObjects.set(name, lodObject);
  }
  
  public removeLODObject(name: string): void {
    const lodObject = this.lodObjects.get(name);
    if (lodObject && lodObject.object) {
      lodObject.levels.forEach(level => {
        if (level.object instanceof THREE.Object3D) {
          level.object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
        }
      });
    }
    this.lodObjects.delete(name);
  }
  
  public update(cameraPosition: THREE.Vector3): void {
    if (!this.enabled) return;
    
    this.frameCounter++;
    if (this.frameCounter < this.updateInterval) return;
    this.frameCounter = 0;
    
    this.matrix.makeRotationFromQuaternion(this.camera.quaternion);
    this.matrix.multiply(this.camera.projectionMatrix);
    this.frustum.setFromProjectionMatrix(this.matrix);
    
    this.lodObjects.forEach((lodObject) => {
      this.updateLODObject(lodObject, cameraPosition);
    });
  }
  
  private updateLODObject(lodObject: LODObject, cameraPosition: THREE.Vector3): void {
    if (!lodObject.object) return;
    
    const distance = cameraPosition.distanceTo(lodObject.object.position);
    let targetLevel = 0;
    
    for (let i = 0; i < lodObject.levels.length; i++) {
      if (distance >= lodObject.levels[i].distance) {
        targetLevel = i;
        break;
      }
    }
    
    if (targetLevel !== lodObject.currentLevel) {
      this.switchLevel(lodObject, targetLevel);
    }
  }
  
  private switchLevel(lodObject: LODObject, newLevel: number): void {
    const currentObject = lodObject.object;
    const parent = currentObject?.parent;
    const position = currentObject?.position.clone() || new THREE.Vector3();
    const rotation = currentObject?.rotation.clone() || new THREE.Euler();
    const scale = currentObject?.scale.clone() || new THREE.Vector3(1, 1, 1);
    
    if (currentObject && parent) {
      parent.remove(currentObject);
    }
    
    const newObject = lodObject.levels[newLevel]?.object as THREE.Object3D | null;
    
    if (newObject) {
      newObject.position.copy(position);
      newObject.rotation.copy(rotation);
      newObject.scale.copy(scale);
      
      if (parent) {
        parent.add(newObject);
      }
    }
    
    lodObject.object = newObject;
    lodObject.currentLevel = newLevel;
  }
  
  public getLODObject(name: string): LODObject | undefined {
    return this.lodObjects.get(name);
  }
  
  public getAllLODObjects(): Map<string, LODObject> {
    return this.lodObjects;
  }
  
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  public setUpdateInterval(interval: number): void {
    this.updateInterval = Math.max(1, interval);
  }
  
  public setDefaultDistances(d0: number, d1: number, d2: number, d3: number): void {
    this.defaultDistances = [d0, d1, d2, d3];
  }
  
  public dispose(): void {
    this.lodObjects.forEach((_, name) => {
      this.removeLODObject(name);
    });
    this.lodObjects.clear();
    console.log('🧹 LOD系统已销毁');
  }
}

export class LODManager {
  private static instance: LODManager | null = null;
  private system: LODSystem | null = null;
  
  public static getInstance(): LODManager {
    if (!LODManager.instance) {
      LODManager.instance = new LODManager();
    }
    return LODManager.instance;
  }
  
  public init(camera: THREE.Camera): void {
    if (!this.system) {
      this.system = new LODSystem(camera);
    }
  }
  
  public getSystem(): LODSystem | null {
    return this.system;
  }
  
  public createLODTree(
    position: THREE.Vector3,
    parent: THREE.Group,
    seed: number = 0
  ): THREE.Group {
    const treeGroup = new THREE.Group();
    
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 3, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    treeGroup.add(trunk);
    
    const foliageColors = [0x228B22, 0x32CD32, 0x2E8B57];
    const foliagePositions = [
      { x: 0, y: 4.5, z: 0, r: 1.5 },
      { x: 0.8, y: 4, z: 0.3, r: 1.1 },
      { x: -0.5, y: 4.2, z: -0.3, r: 1.0 },
      { x: 0.3, y: 5.2, z: -0.2, r: 0.8 }
    ];
    
    foliagePositions.forEach((pos, i) => {
      const geometry = new THREE.IcosahedronGeometry(pos.r, 0);
      const material = new THREE.MeshStandardMaterial({
        color: foliageColors[i % foliageColors.length]
      });
      const foliage = new THREE.Mesh(geometry, material);
      foliage.position.set(pos.x, pos.y, pos.z);
      treeGroup.add(foliage);
    });
    
    treeGroup.position.copy(position);
    parent.add(treeGroup);
    
    if (this.system) {
      this.system.addLODObject(`tree_${seed}`, treeGroup);
    }
    
    return treeGroup;
  }
  
  public createLODCharacter(
    position: THREE.Vector3,
    parent: THREE.Group,
    name: string
  ): THREE.Group {
    const characterGroup = new THREE.Group();
    
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4A90D9 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.9;
    characterGroup.add(body);
    
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBB4 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.6;
    characterGroup.add(head);
    
    characterGroup.position.copy(position);
    parent.add(characterGroup);
    
    if (this.system) {
      this.system.addLODObject(name, characterGroup);
    }
    
    return characterGroup;
  }
  
  public createLODBuilding(
    position: THREE.Vector3,
    parent: THREE.Group,
    name: string
  ): THREE.Group {
    const buildingGroup = new THREE.Group();
    
    const baseGeometry = new THREE.BoxGeometry(3, 2.5, 3);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1.25;
    buildingGroup.add(base);
    
    const roofGeometry = new THREE.ConeGeometry(2.2, 1.5, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 3.25;
    roof.rotation.y = Math.PI / 4;
    buildingGroup.add(roof);
    
    buildingGroup.position.copy(position);
    parent.add(buildingGroup);
    
    if (this.system) {
      this.system.addLODObject(name, buildingGroup);
    }
    
    return buildingGroup;
  }
}
