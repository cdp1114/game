import * as THREE from 'three';
import { EventEmitter } from '../core/EventEmitter';

export interface BeastType {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: number;
  size: number;
  speed: number;
  health: number;
  drops: { itemId: string; amount: number; chance: number }[];
  tamingItems: string[];
  spawnBiome: string[];
}

export interface BeastInstance {
  id: string;
  type: string;
  position: THREE.Vector3;
  rotation: number;
  health: number;
  maxHealth: number;
  tameProgress: number;
  isTamed: boolean;
  owner?: string;
  name?: string;
  mesh: THREE.Group;
  animations: Map<string, AnimationClip>;
}

export interface AnimationClip {
  name: string;
  duration: number;
  keyframes: Keyframe[];
}

export interface Keyframe {
  time: number;
  property: string;
  value: number | THREE.Vector3 | THREE.Quaternion;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export class VoxelBeastSystem extends EventEmitter {
  private scene: THREE.Scene;
  private beastTypes: Map<string, BeastType> = new Map();
  private activeBeasts: Map<string, BeastInstance> = new Map();
  private tamedBeasts: Map<string, BeastInstance> = new Map();
  
  private clock: THREE.Clock;
  private spawnTimer: number = 0;
  private maxWildBeasts: number = 10;
  
  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
    this.clock = new THREE.Clock();
    this.initializeBeastTypes();
  }
  
  private initializeBeastTypes(): void {
    this.addBeastType({
      id: 'crystal_pig',
      name: '晶溪豚',
      description: '一只身上镶嵌着水晶的可爱小猪，会在溪边出没',
      rarity: 'common',
      color: 0xFFB6C1,
      size: 1.0,
      speed: 2,
      health: 10,
      drops: [
        { itemId: 'crystal_shard', amount: 1, chance: 0.3 },
        { itemId: 'pork', amount: 1, chance: 0.8 }
      ],
      tamingItems: ['carrot', 'beetroot'],
      spawnBiome: ['river', 'lake']
    });
    
    this.addBeastType({
      id: 'star_fox',
      name: '星巡狐',
      description: '拥有星空般毛皮的狐狸，在夜晚会发出微弱的光芒',
      rarity: 'rare',
      color: 0x6B5B95,
      size: 0.9,
      speed: 3.5,
      health: 8,
      drops: [
        { itemId: 'star_fur', amount: 1, chance: 0.4 },
        { itemId: 'fox_tail', amount: 1, chance: 0.2 }
      ],
      tamingItems: ['moon_fruit', 'star_flower'],
      spawnBiome: ['forest', 'meadow']
    });
    
    this.addBeastType({
      id: 'cloud_bird',
      name: '云羽雀',
      description: '洁白的飞鸟，翅膀如云朵般柔软',
      rarity: 'common',
      color: 0xFFFFFF,
      size: 0.6,
      speed: 5,
      health: 5,
      drops: [
        { itemId: 'cloud_feather', amount: 1, chance: 0.5 },
        { itemId: 'bird_egg', amount: 1, chance: 0.2 }
      ],
      tamingItems: ['wheat_seeds', 'bread'],
      spawnBiome: ['sky', 'mountain']
    });
    
    this.addBeastType({
      id: 'mist_deer',
      name: '雾灵鹿',
      description: '神秘的鹿形生物，角上缠绕着雾气',
      rarity: 'epic',
      color: 0xC0C0C0,
      size: 1.5,
      speed: 2.5,
      health: 15,
      drops: [
        { itemId: 'mist_antler', amount: 1, chance: 0.3 },
        { itemId: 'deer_hide', amount: 2, chance: 0.5 }
      ],
      tamingItems: ['golden_apple', 'emerald'],
      spawnBiome: ['mountain', 'forest']
    });
    
    this.addBeastType({
      id: 'moon_rabbit',
      name: '月宫兔',
      description: '来自月亮的兔子，耳朵会发出银光',
      rarity: 'legendary',
      color: 0xE8E8E8,
      size: 0.5,
      speed: 3,
      health: 6,
      drops: [
        { itemId: 'moon_dust', amount: 2, chance: 0.5 },
        { itemId: 'rabbit_foot', amount: 1, chance: 0.1 }
      ],
      tamingItems: ['carrot_golden', 'moon_cake'],
      spawnBiome: ['night_forest']
    });
    
    this.addBeastType({
      id: 'fire_salamander',
      name: '炎焰蜥',
      description: '通体燃烧着火焰的蜥蜴，温度极高',
      rarity: 'rare',
      color: 0xFF4500,
      size: 1.2,
      speed: 2,
      health: 12,
      drops: [
        { itemId: 'fire_scale', amount: 2, chance: 0.6 },
        { itemId: 'flint', amount: 3, chance: 0.8 }
      ],
      tamingItems: ['magma_cream', 'blaze_powder'],
      spawnBiome: ['nether', 'volcano']
    });
    
    this.addBeastType({
      id: 'forest_golem',
      name: '森林傀儡',
      description: '由树枝和树根组成的巨大生物',
      rarity: 'epic',
      color: 0x228B22,
      size: 2.5,
      speed: 1,
      health: 30,
      drops: [
        { itemId: 'ancient_wood', amount: 5, chance: 1 },
        { itemId: 'life_essence', amount: 1, chance: 0.3 }
      ],
      tamingItems: ['sapling_golden', 'nature_essence'],
      spawnBiome: ['deep_forest']
    });
    
    this.addBeastType({
      id: 'thunder_beetle',
      name: '雷霆甲虫',
      description: '外壳闪烁着电光的甲虫',
      rarity: 'rare',
      color: 0x4169E1,
      size: 0.4,
      speed: 4,
      health: 4,
      drops: [
        { itemId: 'thunder_shell', amount: 1, chance: 0.5 },
        { itemId: 'lightning_rod', amount: 1, chance: 0.2 }
      ],
      tamingItems: ['flash_powder', 'copper_ingot'],
      spawnBiome: ['storm_plains']
    });
  }
  
  private addBeastType(beast: BeastType): void {
    this.beastTypes.set(beast.id, beast);
  }
  
  public spawnBeast(typeId: string, position: THREE.Vector3): BeastInstance | null {
    const type = this.beastTypes.get(typeId);
    if (!type) return null;
    
    const id = `beast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const mesh = this.createBeastMesh(type);
    mesh.position.copy(position);
    
    const beast: BeastInstance = {
      id,
      type: typeId,
      position: position.clone(),
      rotation: Math.random() * Math.PI * 2,
      health: type.health,
      maxHealth: type.health,
      tameProgress: 0,
      isTamed: false,
      mesh,
      animations: this.createBeastAnimations(type)
    };
    
    this.activeBeasts.set(id, beast);
    this.scene.add(mesh);
    
    this.emit('beastSpawned', { beast });
    
    return beast;
  }
  
  private createBeastMesh(type: BeastType): THREE.Group {
    const group = new THREE.Group();
    group.userData.beastType = type.id;
    
    const mainColor = new THREE.Color(type.color);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.6,
      metalness: 0.2
    });
    
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: mainColor.clone().multiplyScalar(0.7),
      roughness: 0.7
    });
    
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: mainColor.clone().multiplyScalar(1.3),
      roughness: 0.5,
      emissive: mainColor,
      emissiveIntensity: 0.2
    });
    
    switch (type.id) {
      case 'crystal_pig':
        this.createCrystalPig(group, bodyMaterial, darkMaterial, lightMaterial, type.size);
        break;
      case 'star_fox':
        this.createStarFox(group, bodyMaterial, darkMaterial, lightMaterial, type.size);
        break;
      case 'cloud_bird':
        this.createCloudBird(group, bodyMaterial, darkMaterial, lightMaterial, type.size);
        break;
      case 'mist_deer':
        this.createMistDeer(group, bodyMaterial, darkMaterial, lightMaterial, type.size);
        break;
      case 'moon_rabbit':
        this.createMoonRabbit(group, bodyMaterial, darkMaterial, lightMaterial, type.size);
        break;
      case 'fire_salamander':
        this.createFireSalamander(group, bodyMaterial, darkMaterial, lightMaterial, type.size);
        break;
      case 'forest_golem':
        this.createForestGolem(group, bodyMaterial, darkMaterial, lightMaterial, type.size);
        break;
      case 'thunder_beetle':
        this.createThunderBeetle(group, bodyMaterial, darkMaterial, lightMaterial, type.size);
        break;
      default:
        this.createGenericBeast(group, bodyMaterial, darkMaterial, type.size);
    }
    
    return group;
  }
  
  private createCrystalPig(group: THREE.Group, body: THREE.Material, dark: THREE.Material, _light: THREE.Material, size: number): void {
    const bodyGeom = new THREE.BoxGeometry(size * 0.8, size * 0.5, size * 0.6);
    const bodyMesh = new THREE.Mesh(bodyGeom, body);
    bodyMesh.position.y = size * 0.5;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);
    
    const headGeom = new THREE.BoxGeometry(size * 0.45, size * 0.4, size * 0.4);
    const headMesh = new THREE.Mesh(headGeom, body);
    headMesh.position.set(size * 0.5, size * 0.65, 0);
    headMesh.castShadow = true;
    group.add(headMesh);
    
    const snoutGeom = new THREE.BoxGeometry(size * 0.2, size * 0.15, size * 0.15);
    const snoutMesh = new THREE.Mesh(snoutGeom, dark);
    snoutMesh.position.set(size * 0.7, size * 0.55, 0);
    group.add(snoutMesh);
    
    const eyeGeom = new THREE.SphereGeometry(size * 0.06, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(size * 0.68, size * 0.75, size * 0.12);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(size * 0.68, size * 0.75, -size * 0.12);
    group.add(eyeR);
    
    const legGeom = new THREE.BoxGeometry(size * 0.18, size * 0.35, size * 0.18);
    const legPositions = [
      [size * 0.25, size * 0.18, size * 0.18],
      [size * 0.25, size * 0.18, -size * 0.18],
      [-size * 0.25, size * 0.18, size * 0.18],
      [-size * 0.25, size * 0.18, -size * 0.18]
    ];
    legPositions.forEach((pos, i) => {
      const leg = new THREE.Mesh(legGeom, dark);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.userData.isLeg = true;
      leg.userData.legIndex = i;
      group.add(leg);
    });
    
    const crystalColors = [0x00FFFF, 0xFF00FF, 0xFFFF00, 0x00FF00];
    for (let i = 0; i < 4; i++) {
      const crystalGeom = new THREE.OctahedronGeometry(size * 0.12);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: crystalColors[i],
        emissive: crystalColors[i],
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
      });
      const crystal = new THREE.Mesh(crystalGeom, crystalMat);
      const angle = (i / 4) * Math.PI * 2;
      crystal.position.set(
        Math.cos(angle) * size * 0.25,
        size * 0.55 + i * size * 0.05,
        Math.sin(angle) * size * 0.2
      );
      crystal.rotation.set(Math.random(), Math.random(), Math.random());
      crystal.userData.isCrystal = true;
      crystal.userData.crystalIndex = i;
      group.add(crystal);
    }
    
    const earGeom = new THREE.BoxGeometry(size * 0.12, size * 0.15, size * 0.05);
    const earL = new THREE.Mesh(earGeom, body);
    earL.position.set(size * 0.45, size * 0.9, size * 0.15);
    earL.rotation.z = 0.3;
    earL.userData.isEar = true;
    group.add(earL);
    const earR = new THREE.Mesh(earGeom, body);
    earR.position.set(size * 0.45, size * 0.9, -size * 0.15);
    earR.rotation.z = -0.3;
    earR.userData.isEar = true;
    group.add(earR);
  }
  
  private createStarFox(group: THREE.Group, body: THREE.Material, dark: THREE.Material, _light: THREE.Material, size: number): void {
    const bodyGeom = new THREE.BoxGeometry(size * 0.5, size * 0.35, size * 0.25);
    const bodyMesh = new THREE.Mesh(bodyGeom, body);
    bodyMesh.position.y = size * 0.4;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);
    
    const headGeom = new THREE.BoxGeometry(size * 0.35, size * 0.3, size * 0.28);
    const headMesh = new THREE.Mesh(headGeom, body);
    headMesh.position.set(size * 0.35, size * 0.5, 0);
    headMesh.castShadow = true;
    group.add(headMesh);
    
    const snoutGeom = new THREE.BoxGeometry(size * 0.2, size * 0.12, size * 0.15);
    const snoutMesh = new THREE.Mesh(snoutGeom, dark);
    snoutMesh.position.set(size * 0.5, size * 0.42, 0);
    group.add(snoutMesh);
    
    const eyeGeom = new THREE.SphereGeometry(size * 0.05, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF,
      emissive: 0xFFFF00,
      emissiveIntensity: 0.8
    });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(size * 0.48, size * 0.58, size * 0.1);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(size * 0.48, size * 0.58, -size * 0.1);
    group.add(eyeR);
    
    const earGeom = new THREE.ConeGeometry(size * 0.1, size * 0.25, 4);
    const earL = new THREE.Mesh(earGeom, body);
    earL.position.set(size * 0.3, size * 0.78, size * 0.1);
    earL.rotation.z = 0.3;
    earL.userData.isEar = true;
    group.add(earL);
    const earR = new THREE.Mesh(earGeom, body);
    earR.position.set(size * 0.3, size * 0.78, -size * 0.1);
    earR.rotation.z = -0.3;
    earR.userData.isEar = true;
    group.add(earR);
    
    const tailGeom = new THREE.ConeGeometry(size * 0.15, size * 0.5, 6);
    const tailMesh = new THREE.Mesh(tailGeom, body);
    tailMesh.position.set(-size * 0.4, size * 0.35, 0);
    tailMesh.rotation.z = Math.PI / 2;
    tailMesh.userData.isTail = true;
    group.add(tailMesh);
    
    const starGeom = new THREE.OctahedronGeometry(size * 0.05);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 1
    });
    for (let i = 0; i < 8; i++) {
      const star = new THREE.Mesh(starGeom, starMat);
      star.position.set(
        (Math.random() - 0.5) * size * 0.4,
        size * 0.25 + Math.random() * size * 0.35,
        (Math.random() - 0.5) * size * 0.2
      );
      star.userData.isStar = true;
      star.userData.phase = Math.random() * Math.PI * 2;
      group.add(star);
    }
    
    const legGeom = new THREE.BoxGeometry(size * 0.1, size * 0.25, size * 0.1);
    const legPositions = [
      [size * 0.15, size * 0.13, size * 0.1],
      [size * 0.15, size * 0.13, -size * 0.1],
      [-size * 0.15, size * 0.13, size * 0.1],
      [-size * 0.15, size * 0.13, -size * 0.1]
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeom, dark);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.userData.isLeg = true;
      group.add(leg);
    });
  }
  
  private createCloudBird(group: THREE.Group, body: THREE.Material, dark: THREE.Material, light: THREE.Material, size: number): void {
    const bodyGeom = new THREE.SphereGeometry(size * 0.3, 8, 8);
    bodyGeom.scale(1.5, 1, 1);
    const bodyMesh = new THREE.Mesh(bodyGeom, body);
    bodyMesh.position.y = size * 0.3;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);
    
    const headGeom = new THREE.SphereGeometry(size * 0.18, 8, 8);
    const headMesh = new THREE.Mesh(headGeom, body);
    headMesh.position.set(size * 0.35, size * 0.4, 0);
    headMesh.castShadow = true;
    group.add(headMesh);
    
    const beakGeom = new THREE.ConeGeometry(size * 0.05, size * 0.15, 6);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
    const beak = new THREE.Mesh(beakGeom, beakMat);
    beak.position.set(size * 0.5, size * 0.38, 0);
    beak.rotation.z = -Math.PI / 2;
    group.add(beak);
    
    const eyeGeom = new THREE.SphereGeometry(size * 0.03, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(size * 0.45, size * 0.45, size * 0.08);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(size * 0.45, size * 0.45, -size * 0.08);
    group.add(eyeR);
    
    const wingGeom = new THREE.BoxGeometry(size * 0.4, size * 0.05, size * 0.3);
    const wingL = new THREE.Mesh(wingGeom, light);
    wingL.position.set(0, size * 0.35, size * 0.3);
    wingL.rotation.x = 0.2;
    wingL.userData.isWing = true;
    wingL.userData.wingSide = 'left';
    group.add(wingL);
    const wingR = new THREE.Mesh(wingGeom, light);
    wingR.position.set(0, size * 0.35, -size * 0.3);
    wingR.rotation.x = -0.2;
    wingR.userData.isWing = true;
    wingR.userData.wingSide = 'right';
    group.add(wingR);
    
    const tailGeom = new THREE.BoxGeometry(size * 0.25, size * 0.03, size * 0.15);
    const tailMesh = new THREE.Mesh(tailGeom, body);
    tailMesh.position.set(-size * 0.35, size * 0.25, 0);
    tailMesh.userData.isTail = true;
    group.add(tailMesh);
    
    const cloudGeom = new THREE.SphereGeometry(size * 0.12, 6, 6);
    for (let i = 0; i < 3; i++) {
      const cloud = new THREE.Mesh(cloudGeom, light);
      cloud.position.set(
        (Math.random() - 0.5) * size * 0.2,
        size * 0.15,
        (Math.random() - 0.5) * size * 0.15
      );
      cloud.userData.isCloud = true;
      group.add(cloud);
    }
  }
  
  private createMistDeer(group: THREE.Group, body: THREE.Material, dark: THREE.Material, _light: THREE.Material, size: number): void {
    const bodyGeom = new THREE.BoxGeometry(size * 0.8, size * 0.6, size * 0.4);
    const bodyMesh = new THREE.Mesh(bodyGeom, body);
    bodyMesh.position.y = size * 0.9;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);
    
    const neckGeom = new THREE.CylinderGeometry(size * 0.12, size * 0.15, size * 0.4, 6);
    const neckMesh = new THREE.Mesh(neckGeom, body);
    neckMesh.position.set(size * 0.35, size * 1.35, 0);
    neckMesh.rotation.z = 0.3;
    group.add(neckMesh);
    
    const headGeom = new THREE.BoxGeometry(size * 0.35, size * 0.3, size * 0.25);
    const headMesh = new THREE.Mesh(headGeom, body);
    headMesh.position.set(size * 0.5, size * 1.55, 0);
    headMesh.castShadow = true;
    group.add(headMesh);
    
    const antlerGeom = new THREE.CylinderGeometry(size * 0.03, size * 0.05, size * 0.4, 5);
    const antlerMat = new THREE.MeshStandardMaterial({
      color: 0xE0E0E0,
      emissive: 0xC0C0C0,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8
    });
    
    const antlerL = new THREE.Mesh(antlerGeom, antlerMat);
    antlerL.position.set(size * 0.45, size * 1.85, size * 0.08);
    antlerL.rotation.z = 0.3;
    antlerL.userData.isAntler = true;
    group.add(antlerL);
    
    for (let i = 0; i < 3; i++) {
      const branchGeom = new THREE.CylinderGeometry(size * 0.015, size * 0.025, size * 0.15, 4);
      const branch = new THREE.Mesh(branchGeom, antlerMat);
      branch.position.set(size * 0.45 + i * size * 0.05, size * 1.8 + i * size * 0.08, size * 0.08 + i * size * 0.02);
      group.add(branch);
    }
    
    const antlerR = new THREE.Mesh(antlerGeom, antlerMat);
    antlerR.position.set(size * 0.45, size * 1.85, -size * 0.08);
    antlerR.rotation.z = 0.3;
    group.add(antlerR);
    
    const eyeGeom = new THREE.SphereGeometry(size * 0.04, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ 
      color: 0x90EE90,
      emissive: 0x90EE90,
      emissiveIntensity: 0.5
    });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(size * 0.62, size * 1.6, size * 0.1);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(size * 0.62, size * 1.6, -size * 0.1);
    group.add(eyeR);
    
    const legGeom = new THREE.CylinderGeometry(size * 0.06, size * 0.05, size * 0.7, 6);
    const legPositions = [
      [size * 0.3, size * 0.35, size * 0.12],
      [size * 0.3, size * 0.35, -size * 0.12],
      [-size * 0.3, size * 0.35, size * 0.12],
      [-size * 0.3, size * 0.35, -size * 0.12]
    ];
    legPositions.forEach((pos, i) => {
      const leg = new THREE.Mesh(legGeom, dark);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.userData.isLeg = true;
      leg.userData.legIndex = i;
      group.add(leg);
    });
    
    const mistGeom = new THREE.SphereGeometry(size * 0.15, 6, 6);
    const mistMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.3
    });
    for (let i = 0; i < 5; i++) {
      const mist = new THREE.Mesh(mistGeom, mistMat);
      mist.position.set(
        (Math.random() - 0.5) * size * 0.6,
        size * 0.5 + Math.random() * size * 0.3,
        (Math.random() - 0.5) * size * 0.4
      );
      mist.userData.isMist = true;
      mist.userData.phase = Math.random() * Math.PI * 2;
      group.add(mist);
    }
  }
  
  private createMoonRabbit(group: THREE.Group, body: THREE.Material, dark: THREE.Material, _light: THREE.Material, size: number): void {
    const bodyGeom = new THREE.SphereGeometry(size * 0.3, 8, 8);
    const bodyMesh = new THREE.Mesh(bodyGeom, body);
    bodyMesh.position.y = size * 0.35;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);
    
    const headGeom = new THREE.SphereGeometry(size * 0.2, 8, 8);
    const headMesh = new THREE.Mesh(headGeom, body);
    headMesh.position.set(size * 0.2, size * 0.55, 0);
    headMesh.castShadow = true;
    group.add(headMesh);
    
    const earGeom = new THREE.CapsuleGeometry(size * 0.06, size * 0.35, 4, 8);
    const earL = new THREE.Mesh(earGeom, light);
    earL.position.set(size * 0.15, size * 0.85, size * 0.08);
    earL.rotation.z = 0.2;
    earL.userData.isEar = true;
    earL.userData.isLongEar = true;
    group.add(earL);
    const earR = new THREE.Mesh(earGeom, light);
    earR.position.set(size * 0.15, size * 0.85, -size * 0.08);
    earR.rotation.z = -0.2;
    earR.userData.isEar = true;
    earR.userData.isLongEar = true;
    group.add(earR);
    
    const innerEarGeom = new THREE.CapsuleGeometry(size * 0.03, size * 0.25, 4, 8);
    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xFFB6C1,
      emissive: 0xFFB6C1,
      emissiveIntensity: 0.5
    });
    const innerL = new THREE.Mesh(innerEarGeom, innerEarMat);
    innerL.position.set(size * 0.15, size * 0.85, size * 0.08);
    innerL.rotation.z = 0.2;
    group.add(innerL);
    const innerR = new THREE.Mesh(innerEarGeom, innerEarMat);
    innerR.position.set(size * 0.15, size * 0.85, -size * 0.08);
    innerR.rotation.z = -0.2;
    group.add(innerR);
    
    const eyeGeom = new THREE.SphereGeometry(size * 0.04, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFC0CB,
      emissive: 0xFFC0CB,
      emissiveIntensity: 0.8
    });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(size * 0.32, size * 0.6, size * 0.07);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(size * 0.32, size * 0.6, -size * 0.07);
    group.add(eyeR);
    
    const noseGeom = new THREE.SphereGeometry(size * 0.03, 6, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xFFB6C1 });
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.position.set(size * 0.38, size * 0.52, 0);
    group.add(nose);
    
    const tailGeom = new THREE.SphereGeometry(size * 0.1, 6, 6);
    const tailMesh = new THREE.Mesh(tailGeom, light);
    tailMesh.position.set(-size * 0.25, size * 0.3, 0);
    tailMesh.userData.isTail = true;
    group.add(tailMesh);
    
    const legGeom = new THREE.CapsuleGeometry(size * 0.08, size * 0.15, 4, 8);
    const legPositions = [
      [size * 0.15, size * 0.1, size * 0.12],
      [size * 0.15, size * 0.1, -size * 0.12],
      [-size * 0.15, size * 0.1, size * 0.12],
      [-size * 0.15, size * 0.1, -size * 0.12]
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeom, body);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.userData.isLeg = true;
      group.add(leg);
    });
    
    const moonGlowGeom = new THREE.SphereGeometry(size * 0.05, 8, 8);
    const moonGlowMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFD0,
      emissive: 0xFFFFD0,
      emissiveIntensity: 1
    });
    const moonGlow = new THREE.Mesh(moonGlowGeom, moonGlowMat);
    moonGlow.position.set(0, size * 0.5, 0);
    moonGlow.userData.isMoonGlow = true;
    group.add(moonGlow);
  }
  
  private createFireSalamander(group: THREE.Group, body: THREE.Material, dark: THREE.Material, _light: THREE.Material, size: number): void {
    const bodyGeom = new THREE.CylinderGeometry(size * 0.2, size * 0.25, size * 0.8, 8);
    const bodyMesh = new THREE.Mesh(bodyGeom, body);
    bodyMesh.position.y = size * 0.4;
    bodyMesh.rotation.z = Math.PI / 2;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);
    
    const headGeom = new THREE.SphereGeometry(size * 0.22, 8, 8);
    const headMesh = new THREE.Mesh(headGeom, body);
    headMesh.position.set(size * 0.45, size * 0.4, 0);
    headMesh.castShadow = true;
    group.add(headMesh);
    
    const eyeGeom = new THREE.SphereGeometry(size * 0.05, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ 
      color: 0x000000,
      emissive: 0xFF4500,
      emissiveIntensity: 0.5
    });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(size * 0.58, size * 0.5, size * 0.1);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(size * 0.58, size * 0.5, -size * 0.1);
    group.add(eyeR);
    
    const tailGeom = new THREE.ConeGeometry(size * 0.15, size * 0.5, 6);
    const tailMesh = new THREE.Mesh(tailGeom, body);
    tailMesh.position.set(-size * 0.55, size * 0.35, 0);
    tailMesh.rotation.z = Math.PI / 2;
    tailMesh.userData.isTail = true;
    group.add(tailMesh);
    
    const legCount = 4;
    for (let i = 0; i < legCount; i++) {
      const side = i < 2 ? 1 : -1;
      const front = i % 2 === 0;
      const legGeom = new THREE.BoxGeometry(size * 0.15, size * 0.1, size * 0.12);
      const leg = new THREE.Mesh(legGeom, dark);
      leg.position.set(
        front ? size * 0.25 : -size * 0.15,
        size * 0.15,
        side * size * 0.22
      );
      leg.castShadow = true;
      leg.userData.isLeg = true;
      group.add(leg);
    }
    
    for (let i = 0; i < 8; i++) {
      const flameGeom = new THREE.ConeGeometry(size * 0.08, size * 0.2, 4);
      const flameMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xFF4500 : 0xFFD700,
        emissive: i % 2 === 0 ? 0xFF4500 : 0xFFD700,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.8
      });
      const flame = new THREE.Mesh(flameGeom, flameMat);
      const angle = (i / 8) * Math.PI * 2;
      flame.position.set(
        (Math.random() - 0.5) * size * 0.3,
        size * 0.3 + Math.random() * size * 0.3,
        (Math.random() - 0.5) * size * 0.3
      );
      flame.rotation.set(Math.random(), Math.random(), Math.random());
      flame.userData.isFlame = true;
      flame.userData.phase = Math.random() * Math.PI * 2;
      group.add(flame);
    }
  }
  
  private createForestGolem(group: THREE.Group, body: THREE.Material, dark: THREE.Material, _light: THREE.Material, size: number): void {
    const torsoGeom = new THREE.BoxGeometry(size * 0.8, size * 0.7, size * 0.6);
    const torsoMesh = new THREE.Mesh(torsoGeom, body);
    torsoMesh.position.y = size * 1.2;
    torsoMesh.castShadow = true;
    group.add(torsoMesh);
    
    const headGeom = new THREE.BoxGeometry(size * 0.5, size * 0.5, size * 0.45);
    const headMesh = new THREE.Mesh(headGeom, body);
    headMesh.position.y = size * 1.85;
    headMesh.castShadow = true;
    group.add(headMesh);
    
    const eyeGeom = new THREE.SphereGeometry(size * 0.08, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ 
      color: 0x90EE90,
      emissive: 0x90EE90,
      emissiveIntensity: 0.8
    });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(size * 0.2, size * 1.9, size * 0.2);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(size * 0.2, size * 1.9, -size * 0.2);
    group.add(eyeR);
    
    const armGeom = new THREE.CylinderGeometry(size * 0.12, size * 0.15, size * 0.8, 6);
    const armL = new THREE.Mesh(armGeom, dark);
    armL.position.set(size * 0.5, size * 1.1, size * 0.5);
    armL.rotation.z = 0.5;
    armL.castShadow = true;
    armL.userData.isArm = true;
    armL.userData.armSide = 'left';
    group.add(armL);
    const armR = new THREE.Mesh(armGeom, dark);
    armR.position.set(size * 0.5, size * 1.1, -size * 0.5);
    armR.rotation.z = 0.5;
    armR.castShadow = true;
    armR.userData.isArm = true;
    armR.userData.armSide = 'right';
    group.add(armR);
    
    const legGeom = new THREE.CylinderGeometry(size * 0.15, size * 0.2, size * 0.8, 6);
    const legL = new THREE.Mesh(legGeom, dark);
    legL.position.set(0, size * 0.4, size * 0.2);
    legL.castShadow = true;
    legL.userData.isLeg = true;
    group.add(legL);
    const legR = new THREE.Mesh(legGeom, dark);
    legR.position.set(0, size * 0.4, -size * 0.2);
    legR.castShadow = true;
    legR.userData.isLeg = true;
    group.add(legR);
    
    for (let i = 0; i < 5; i++) {
      const mossGeom = new THREE.SphereGeometry(size * 0.1, 6, 6);
      const mossMat = new THREE.MeshStandardMaterial({
        color: 0x228B22,
        roughness: 0.9
      });
      const moss = new THREE.Mesh(mossGeom, mossMat);
      moss.position.set(
        (Math.random() - 0.5) * size * 0.7,
        size * 0.8 + Math.random() * size * 0.8,
        (Math.random() - 0.5) * size * 0.5
      );
      moss.userData.isMoss = true;
      group.add(moss);
    }
    
    const leafGeom = new THREE.SphereGeometry(size * 0.15, 6, 6);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x228B22,
      transparent: true,
      opacity: 0.8
    });
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.position.set(
        (Math.random() - 0.5) * size * 0.3,
        size * 2.0 + i * size * 0.15,
        (Math.random() - 0.5) * size * 0.3
      );
      leaf.userData.isLeaf = true;
      leaf.userData.phase = Math.random() * Math.PI * 2;
      group.add(leaf);
    }
  }
  
  private createThunderBeetle(group: THREE.Group, body: THREE.Material, dark: THREE.Material, _light: THREE.Material, size: number): void {
    const bodyGeom = new THREE.SphereGeometry(size * 0.25, 8, 8);
    bodyGeom.scale(1.3, 0.7, 1);
    const bodyMesh = new THREE.Mesh(bodyGeom, body);
    bodyMesh.position.y = size * 0.15;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);
    
    const shellGeom = new THREE.SphereGeometry(size * 0.2, 8, 8);
    shellGeom.scale(1.2, 0.8, 1.5);
    const shellMesh = new THREE.Mesh(shellGeom, dark);
    shellMesh.position.set(0, size * 0.2, 0);
    shellMesh.castShadow = true;
    group.add(shellMesh);
    
    const headGeom = new THREE.SphereGeometry(size * 0.1, 6, 6);
    const headMesh = new THREE.Mesh(headGeom, dark);
    headMesh.position.set(size * 0.28, size * 0.15, 0);
    group.add(headMesh);
    
    const legGeom = new THREE.CylinderGeometry(size * 0.02, size * 0.03, size * 0.15, 4);
    for (let i = 0; i < 3; i++) {
      const side = i < 2 ? 1 : -1;
      const front = i % 2 === 0;
      const leg = new THREE.Mesh(legGeom, dark);
      leg.position.set(
        front ? size * 0.1 : -size * 0.1,
        size * 0.05,
        side * size * 0.25
      );
      leg.castShadow = true;
      leg.userData.isLeg = true;
      group.add(leg);
    }
    
    for (let i = 0; i < 4; i++) {
      const lightningGeom = new THREE.BoxGeometry(size * 0.02, size * 0.15, size * 0.02);
      const lightningMat = new THREE.MeshStandardMaterial({
        color: 0xFFFF00,
        emissive: 0xFFFF00,
        emissiveIntensity: 1
      });
      const lightning = new THREE.Mesh(lightningGeom, lightningMat);
      const angle = (i / 4) * Math.PI * 2;
      lightning.position.set(
        Math.cos(angle) * size * 0.15,
        size * 0.2,
        Math.sin(angle) * size * 0.2
      );
      lightning.rotation.z = Math.random() * 0.5;
      lightning.userData.isLightning = true;
      lightning.userData.phase = Math.random() * Math.PI * 2;
      group.add(lightning);
    }
    
    const eyeGeom = new THREE.SphereGeometry(size * 0.03, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ 
      color: 0x0000FF,
      emissive: 0x0000FF,
      emissiveIntensity: 0.8
    });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(size * 0.35, size * 0.18, size * 0.05);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(size * 0.35, size * 0.18, -size * 0.05);
    group.add(eyeR);
  }
  
  private createGenericBeast(group: THREE.Group, body: THREE.Material, dark: THREE.Material, size: number): void {
    const bodyGeom = new THREE.BoxGeometry(size * 0.6, size * 0.4, size * 0.4);
    const bodyMesh = new THREE.Mesh(bodyGeom, body);
    bodyMesh.position.y = size * 0.4;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);
    
    const headGeom = new THREE.BoxGeometry(size * 0.3, size * 0.3, size * 0.3);
    const headMesh = new THREE.Mesh(headGeom, body);
    headMesh.position.set(size * 0.4, size * 0.5, 0);
    headMesh.castShadow = true;
    group.add(headMesh);
    
    const legGeom = new THREE.BoxGeometry(size * 0.12, size * 0.3, size * 0.12);
    const legPositions = [
      [size * 0.2, size * 0.15, size * 0.12],
      [size * 0.2, size * 0.15, -size * 0.12],
      [-size * 0.2, size * 0.15, size * 0.12],
      [-size * 0.2, size * 0.15, -size * 0.12]
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeom, dark);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.userData.isLeg = true;
      group.add(leg);
    });
  }
  
  private createBeastAnimations(_type: BeastType): Map<string, AnimationClip> {
    const animations = new Map<string, AnimationClip>();
    
    animations.set('idle', {
      name: 'idle',
      duration: 2,
      keyframes: [
        { time: 0, property: 'position.y', value: 0 },
        { time: 1, property: 'position.y', value: 0.05 },
        { time: 2, property: 'position.y', value: 0 }
      ]
    });
    
    animations.set('walk', {
      name: 'walk',
      duration: 0.5,
      keyframes: [
        { time: 0, property: 'rotation.y', value: 0 },
        { time: 0.25, property: 'rotation.y', value: Math.PI * 2 },
        { time: 0.5, property: 'rotation.y', value: Math.PI * 4 }
      ]
    });
    
    animations.set('run', {
      name: 'run',
      duration: 0.3,
      keyframes: [
        { time: 0, property: 'rotation.y', value: 0 },
        { time: 0.15, property: 'rotation.y', value: Math.PI * 2 },
        { time: 0.3, property: 'rotation.y', value: Math.PI * 4 }
      ]
    });
    
    return animations;
  }
  
  public update(deltaTime: number): void {
    const time = this.clock.getElapsedTime();
    
    this.activeBeasts.forEach((beast) => {
      this.updateBeastAnimation(beast, time);
      this.updateBeastAI(beast, deltaTime);
    });
  }
  
  private updateBeastAnimation(beast: BeastInstance, time: number): void {
    beast.mesh.traverse((object) => {
      if (object.userData.isLeg) {
        const legSwing = Math.sin(time * 8) * 0.3;
        object.rotation.x = legSwing;
      }
      
      if (object.userData.isEar) {
        const earWiggle = Math.sin(time * 3) * 0.1;
        object.rotation.z += earWiggle;
      }
      
      if (object.userData.isTail) {
        object.rotation.y = Math.sin(time * 4) * 0.3;
      }
      
      if (object.userData.isCrystal) {
        object.rotation.y = time + object.userData.crystalIndex;
        object.rotation.x = time * 0.5;
      }
      
      if (object.userData.isStar) {
        const mat = (object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.5 + Math.sin(time * 3 + object.userData.phase) * 0.5;
      }
      
      if (object.userData.isFlame) {
        object.rotation.x = Math.sin(time * 10 + object.userData.phase) * 0.3;
        object.rotation.z = Math.cos(time * 8 + object.userData.phase) * 0.3;
        const mat = (object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.6 + Math.sin(time * 15) * 0.4;
      }
      
      if (object.userData.isLightning) {
        const mat = (object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = Math.random() > 0.9 ? 1 : 0.3;
      }
      
      if (object.userData.isMist) {
        object.position.y += Math.sin(time + object.userData.phase) * 0.001;
        object.position.x += Math.cos(time * 0.5 + object.userData.phase) * 0.001;
        const mat = (object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.opacity = 0.2 + Math.sin(time + object.userData.phase) * 0.1;
      }
      
      if (object.userData.isLeaf) {
        object.rotation.z = Math.sin(time + object.userData.phase) * 0.2;
      }
      
      if (object.userData.isCloud) {
        object.position.y += Math.sin(time * 2 + object.userData.phase || 0) * 0.002;
      }
      
      if (object.userData.isWing) {
        const wingAngle = object.userData.wingSide === 'left' ? 1 : -1;
        object.rotation.x = wingAngle * Math.sin(time * 15) * 0.4;
      }
    });
  }
  
  private updateBeastAI(beast: BeastInstance, deltaTime: number): void {
    if (beast.isTamed) return;
    
    this.spawnTimer += deltaTime;
    if (this.spawnTimer > 10 && this.activeBeasts.size < this.maxWildBeasts) {
      this.spawnWildBeast();
      this.spawnTimer = 0;
    }
  }
  
  private spawnWildBeast(): void {
    const types = Array.from(this.beastTypes.keys());
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const x = (Math.random() - 0.5) * 60 + 32;
    const z = (Math.random() - 0.5) * 60 + 32;
    const y = 20;
    
    this.spawnBeast(randomType, new THREE.Vector3(x, y, z));
  }
  
  public tameBeast(beastId: string): boolean {
    const beast = this.activeBeasts.get(beastId);
    if (!beast || beast.isTamed) return false;
    
    beast.isTamed = true;
    beast.tameProgress = 100;
    this.tamedBeasts.set(beastId, beast);
    
    this.emit('beastTamed', { beast });
    return true;
  }
  
  public feedBeast(beastId: string, itemId: string): number {
    const beast = this.tamedBeasts.get(beastId);
    if (!beast) return 0;
    
    const type = this.beastTypes.get(beast.type);
    if (!type) return 0;
    
    const tamingItem = type.tamingItems.find(i => i === itemId);
    if (!tamingItem) return 0;
    
    beast.tameProgress = Math.min(100, beast.tameProgress + 20);
    
    if (beast.tameProgress >= 100 && !beast.isTamed) {
      beast.isTamed = true;
      this.emit('beastFullyTamed', { beast });
    }
    
    return 20;
  }
  
  public getBeastTypes(): BeastType[] {
    return Array.from(this.beastTypes.values());
  }
  
  public getActiveBeasts(): BeastInstance[] {
    return Array.from(this.activeBeasts.values());
  }
  
  public getTamedBeasts(): BeastInstance[] {
    return Array.from(this.tamedBeasts.values());
  }
  
  public removeBeast(beastId: string): boolean {
    const beast = this.activeBeasts.get(beastId);
    if (!beast) return false;
    
    this.scene.remove(beast.mesh);
    this.activeBeasts.delete(beastId);
    this.tamedBeasts.delete(beastId);
    
    return true;
  }
  
  public dispose(): void {
    this.activeBeasts.forEach((beast) => {
      this.scene.remove(beast.mesh);
    });
    this.activeBeasts.clear();
    this.tamedBeasts.clear();
  }
}
