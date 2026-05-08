// 《星野栖所》异兽管理器 - 包含AI行为树系统

import * as THREE from 'three';
import { TimeSystem } from '../systems/TimeSystem';
import { BeastData, BeastSaveData, BeastAbility, BeastType, Vector3, Season, Weather, DayPhase } from '../core/types';
import { EventEmitter } from '../core/EventEmitter';
import { EasingFunctions, InterpolationUtils } from '../core/AnimationUtils';

// ==================== AI行为树节点 ====================

enum NodeStatus {
  SUCCESS,
  FAILURE,
  RUNNING
}

abstract class AINode {
  abstract execute(context: BeastContext): NodeStatus;
}

class SequenceNode extends AINode {
  constructor(private children: AINode[]) {
    super();
  }

  execute(context: BeastContext): NodeStatus {
    for (const child of this.children) {
      const result = child.execute(context);
      if (result === NodeStatus.FAILURE) {
        return NodeStatus.FAILURE;
      }
      if (result === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }
    }
    return NodeStatus.SUCCESS;
  }
}

class SelectorNode extends AINode {
  constructor(private children: AINode[]) {
    super();
  }

  execute(context: BeastContext): NodeStatus {
    for (const child of this.children) {
      const result = child.execute(context);
      if (result === NodeStatus.SUCCESS) {
        return NodeStatus.SUCCESS;
      }
      if (result === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }
    }
    return NodeStatus.FAILURE;
  }
}

class ConditionNode extends AINode {
  constructor(private condition: (context: BeastContext) => boolean) {
    super();
  }

  execute(context: BeastContext): NodeStatus {
    return this.condition(context) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  }
}

class ActionNode extends AINode {
  constructor(private action: (context: BeastContext) => NodeStatus) {
    super();
  }

  execute(context: BeastContext): NodeStatus {
    return this.action(context);
  }
}

// ==================== AI上下文 ====================

interface BeastContext {
  beastId: string;
  mesh: THREE.Group;
  position: Vector3;
  targetPosition?: Vector3;
  intimacy: number;
  isWorking: boolean;
  currentTask?: string;
  environment: {
    weather: Weather;
    season: Season;
    dayPhase: DayPhase;
  };
}

// ==================== 异兽实体 ====================

interface BeastEntity {
  id: string;
  instanceId: string;
  data: BeastData;
  mesh: THREE.Group;
  context: BeastContext;
  behaviorTree: AINode;
  position: Vector3;
  targetPosition?: Vector3;
  intimacy: number;
  isWorking: boolean;
  abilities: BeastAbility[];
}

// ==================== 异兽管理器 ====================

export class BeastManager extends EventEmitter {
  private scene: THREE.Scene;
  private timeSystem: TimeSystem;
  
  private beasts: Map<string, BeastEntity> = new Map();
  private beastConfigs: Map<string, BeastData> = new Map();
  private beastCounter: number = 0;

  constructor(scene: THREE.Scene, timeSystem: TimeSystem) {
    super();
    this.scene = scene;
    this.timeSystem = timeSystem;
    this.initializeBeastConfigs();
  }

  private initializeBeastConfigs(): void {
    const configs: BeastData[] = [
      {
        id: 'star_bunny',
        name: '星绒兔',
        type: BeastType.STAR_BUNNY,
        description: '毛茸茸的小兔子，会自动巡逻农田，采集成熟的花草蔬果',
        unlockLevel: 1,
        unlockMethod: '初始解锁',
        intimacy: 0,
        maxIntimacy: 1000,
        abilities: [
          {
            name: '自动采集',
            description: '自动巡逻并采集成熟的作物',
            unlockIntimacy: 0,
            effect: { type: 'AUTO_HARVEST', value: 1 }
          },
          {
            name: '自动播种',
            description: '解锁后可以自动播种作物',
            unlockIntimacy: 500,
            effect: { type: 'AUTO_PLANT', value: 1 }
          }
        ],
        behaviorTree: 'star_bunny'
      },
      {
        id: 'cloud_bird',
        name: '云羽雀',
        type: BeastType.CLOUD_BIRD,
        description: '高空飞行的鸟类，会拾取浮空星材和隐藏资源',
        unlockLevel: 3,
        unlockMethod: '星雾森林解锁',
        intimacy: 0,
        maxIntimacy: 1000,
        abilities: [
          {
            name: '高空探索',
            description: '在高空飞行，探索浮空资源',
            unlockIntimacy: 0,
            effect: { type: 'SKY_EXPLORE', value: 1 }
          }
        ],
        behaviorTree: 'cloud_bird'
      },
      {
        id: 'fog_deer',
        name: '雾灵鹿',
        type: BeastType.FOG_DEER,
        description: '常驻家园的优雅生物，范围内所有作物产量永久增益',
        unlockLevel: 5,
        unlockMethod: '浅汐湖畔解锁',
        intimacy: 0,
        maxIntimacy: 1000,
        abilities: [
          {
            name: '产量增益',
            description: '范围内作物产量+20%',
            unlockIntimacy: 0,
            effect: { type: 'YIELD_BUFF', value: 0.2 }
          }
        ],
        behaviorTree: 'fog_deer'
      },
      {
        id: 'crystal_dolphin',
        name: '晶溪豚',
        type: BeastType.CRYSTAL_DOLPHIN,
        description: '水域常驻生物，净化水域并提升水产产出概率',
        unlockLevel: 5,
        unlockMethod: '浅汐湖畔解锁',
        intimacy: 0,
        maxIntimacy: 1000,
        abilities: [
          {
            name: '水域净化',
            description: '净化水域，提升资源品质',
            unlockIntimacy: 0,
            effect: { type: 'WATER_PURIFY', value: 1 }
          }
        ],
        behaviorTree: 'crystal_dolphin'
      },
      {
        id: 'star_fox',
        name: '星巡狐',
        type: BeastType.STAR_FOX,
        description: '夜间激活的神秘生物，自动探索地图解锁隐藏宝箱和星忆碎片',
        unlockLevel: 7,
        unlockMethod: '碎雪高台解锁',
        intimacy: 0,
        maxIntimacy: 1000,
        abilities: [
          {
            name: '夜间探索',
            description: '夜间自动探索，解锁隐藏内容',
            unlockIntimacy: 0,
            effect: { type: 'NIGHT_EXPLORE', value: 1 }
          }
        ],
        behaviorTree: 'star_fox'
      }
    ];

    configs.forEach(config => {
      this.beastConfigs.set(config.id, config);
    });
  }

  public spawnBeast(beastId: string, position: Vector3): BeastEntity | null {
    const beastData = this.beastConfigs.get(beastId);
    if (!beastData) {
      console.warn(`异兽配置不存在: ${beastId}`);
      return null;
    }

    const instanceId = `beast_${this.beastCounter++}`;
    const mesh = this.createBeastMesh(beastData);
    
    mesh.position.set(position.x, position.y, position.z);
    mesh.userData.selectable = true;
    mesh.userData.beastId = instanceId;
    
    this.scene.add(mesh);

    const context: BeastContext = {
      beastId: instanceId,
      mesh,
      position: { ...position },
      intimacy: beastData.intimacy,
      isWorking: true,
      environment: {
        weather: this.timeSystem.getCurrentWeather(),
        season: this.timeSystem.getCurrentSeason(),
        dayPhase: this.timeSystem.getCurrentDayPhase()
      }
    };

    const entity: BeastEntity = {
      id: beastId,
      instanceId,
      data: beastData,
      mesh,
      context,
      behaviorTree: this.createBehaviorTree(beastData.behaviorTree),
      position: { ...position },
      intimacy: beastData.intimacy,
      isWorking: true,
      abilities: beastData.abilities
    };

    this.beasts.set(instanceId, entity);
    this.emit('beastSpawned', entity);
    
    console.log(`召唤了 ${beastData.name} 在 (${position.x}, ${position.y}, ${position.z})`);
    return entity;
  }

  private createBeastMesh(beastData: BeastData): THREE.Group {
    const group = new THREE.Group();
    group.name = beastData.name;

    switch (beastData.type) {
      case BeastType.STAR_BUNNY:
        this.createStarBunnyMesh(group);
        break;
      case BeastType.CLOUD_BIRD:
        this.createCloudBirdMesh(group);
        break;
      case BeastType.FOG_DEER:
        this.createFogDeerMesh(group);
        break;
      case BeastType.CRYSTAL_DOLPHIN:
        this.createCrystalDolphinMesh(group);
        break;
      case BeastType.STAR_FOX:
        this.createStarFoxMesh(group);
        break;
    }

    return group;
  }

  private createStarBunnyMesh(group: THREE.Group): void {
    // 身体
    const bodyGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 0.9;
    head.castShadow = true;
    group.add(head);

    // 耳朵
    const earGeometry = new THREE.ConeGeometry(0.08, 0.4, 6);
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0xFFB6C1 });
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.12, 1.2, 0);
    leftEar.rotation.z = -0.2;
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.12, 1.2, 0);
    rightEar.rotation.z = 0.2;
    group.add(rightEar);

    // 眼睛
    const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x000000
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.95, 0.25);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.95, 0.25);
    group.add(rightEye);

    // 鼻子
    const noseGeometry = new THREE.SphereGeometry(0.04, 6, 6);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xFFB6C1 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 0.85, 0.28);
    group.add(nose);

    // 添加星空特效
    this.addSparkleEffect(group, 0xFFD700, 5);
  }

  private createCloudBirdMesh(group: THREE.Group): void {
    // 身体
    const bodyGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    body.rotation.x = Math.PI;
    body.castShadow = true;
    group.add(body);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 0.7;
    head.castShadow = true;
    group.add(head);

    // 翅膀
    const wingGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.3);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0xADD8E6,
      transparent: true,
      opacity: 0.8
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.5, 0.5, 0);
    leftWing.rotation.z = 0.3;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.5, 0.5, 0);
    rightWing.rotation.z = -0.3;
    group.add(rightWing);

    // 眼睛
    const eyeGeometry = new THREE.SphereGeometry(0.03, 6, 6);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.08, 0.75, 0.15);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.08, 0.75, 0.15);
    group.add(rightEye);

    // 飞行特效
    this.addSparkleEffect(group, 0x00BFFF, 3);
  }

  private createFogDeerMesh(group: THREE.Group): void {
    // 身体
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xDCDCDC,
      roughness: 0.8,
      transparent: true,
      opacity: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 1.4, 0.4);
    head.castShadow = true;
    group.add(head);

    // 鹿角
    const antlerMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.6
    });
    
    // 左鹿角
    const leftAntler = new THREE.Group();
    const leftAntlerBase = new THREE.CylinderGeometry(0.03, 0.05, 0.4, 6);
    const leftAntlerBaseMesh = new THREE.Mesh(leftAntlerBase, antlerMaterial);
    leftAntlerBaseMesh.rotation.z = -0.3;
    leftAntler.add(leftAntlerBaseMesh);
    
    const leftAntlerTop = new THREE.CylinderGeometry(0.02, 0.03, 0.3, 6);
    const leftAntlerTopMesh = new THREE.Mesh(leftAntlerTop, antlerMaterial);
    leftAntlerTopMesh.position.set(-0.1, 0.3, 0);
    leftAntlerTopMesh.rotation.z = -0.5;
    leftAntler.add(leftAntlerTopMesh);
    
    leftAntler.position.set(-0.12, 1.6, 0.4);
    group.add(leftAntler);

    // 右鹿角
    const rightAntler = leftAntler.clone();
    rightAntler.position.set(0.12, 1.6, 0.4);
    rightAntler.scale.x = -1;
    group.add(rightAntler);

    // 腿
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.06, 0.6, 6);
    const legPositions = [
      { x: -0.2, z: 0.3 },
      { x: 0.2, z: 0.3 },
      { x: -0.2, z: -0.3 },
      { x: 0.2, z: -0.3 }
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, bodyMaterial);
      leg.position.set(pos.x, 0.3, pos.z);
      leg.castShadow = true;
      group.add(leg);
    });

    // 眼睛
    const eyeGeometry = new THREE.SphereGeometry(0.03, 6, 6);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4169E1,
      emissive: 0x4169E1,
      emissiveIntensity: 0.3
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 1.45, 0.6);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 1.45, 0.6);
    group.add(rightEye);

    // 雾效
    this.addFogEffect(group);
  }

  private createCrystalDolphinMesh(group: THREE.Group): void {
    // 身体
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xE0FFFF,
      roughness: 0.3,
      metalness: 0.5,
      transparent: true,
      opacity: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.6, 0.6, 0);
    head.castShadow = true;
    group.add(head);

    // 背鳍
    const finGeometry = new THREE.ConeGeometry(0.15, 0.4, 6);
    const fin = new THREE.Mesh(finGeometry, bodyMaterial);
    fin.position.set(0, 0.9, 0);
    fin.rotation.x = -0.2;
    group.add(fin);

    // 尾鳍
    const tailGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.3);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.set(-0.6, 0.6, 0);
    group.add(tail);

    // 水晶特效
    this.addCrystalEffect(group);
  }

  private createStarFoxMesh(group: THREE.Group): void {
    // 身体
    const bodyGeometry = new THREE.ConeGeometry(0.35, 1.0, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4B0082,
      roughness: 0.7,
      emissive: 0x4B0082,
      emissiveIntensity: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.28, 8, 8);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 0.8, 0.35);
    head.castShadow = true;
    group.add(head);

    // 尾巴
    const tailGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0x9400D3,
      emissive: 0x9400D3,
      emissiveIntensity: 0.3
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0.7, -0.6);
    tail.rotation.x = -0.8;
    group.add(tail);

    // 耳朵
    const earGeometry = new THREE.ConeGeometry(0.1, 0.3, 6);
    const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
    leftEar.position.set(-0.15, 1.05, 0.35);
    leftEar.rotation.z = -0.2;
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
    rightEar.position.set(0.15, 1.05, 0.35);
    rightEar.rotation.z = 0.2;
    group.add(rightEar);

    // 眼睛
    const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 0.5
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.85, 0.55);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.85, 0.55);
    group.add(rightEye);

    // 星空轨迹
    this.addStarTrailEffect(group);
  }

  private addSparkleEffect(group: THREE.Group, color: number, count: number): void {
    const sparkleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const sparkleMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < count; i++) {
      const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial.clone());
      sparkle.position.set(
        (Math.random() - 0.5) * 1,
        0.5 + Math.random() * 1,
        (Math.random() - 0.5) * 1
      );
      sparkle.userData.isSparkle = true;
      sparkle.userData.phase = Math.random() * Math.PI * 2;
      sparkle.userData.speed = 0.002 + Math.random() * 0.003;
      group.add(sparkle);
    }
  }

  private addFogEffect(group: THREE.Group): void {
    const fogGeometry = new THREE.PlaneGeometry(2, 2);
    const fogMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 3; i++) {
      const fog = new THREE.Mesh(fogGeometry, fogMaterial.clone());
      fog.position.set(
        (Math.random() - 0.5) * 0.5,
        0.3 + i * 0.3,
        (Math.random() - 0.5) * 0.5
      );
      fog.userData.isFog = true;
      fog.userData.phase = Math.random() * Math.PI * 2;
      group.add(fog);
    }
  }

  private addCrystalEffect(group: THREE.Group): void {
    const crystalGeometry = new THREE.OctahedronGeometry(0.1, 0);
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0x00FFFF,
      emissive: 0x00FFFF,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < 5; i++) {
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial.clone());
      crystal.position.set(
        (Math.random() - 0.5) * 0.8,
        0.4 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      crystal.userData.isCrystal = true;
      crystal.userData.phase = Math.random() * Math.PI * 2;
      crystal.userData.rotationSpeed = 0.01 + Math.random() * 0.02;
      group.add(crystal);
    }
  }

  private addStarTrailEffect(group: THREE.Group): void {
    const starGeometry = new THREE.SphereGeometry(0.03, 4, 4);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.9
    });

    for (let i = 0; i < 8; i++) {
      const star = new THREE.Mesh(starGeometry, starMaterial.clone());
      star.position.set(
        -0.6 - i * 0.15,
        0.7 - i * 0.05,
        (Math.random() - 0.5) * 0.2
      );
      star.userData.isStarTrail = true;
      star.userData.phase = Math.random() * Math.PI * 2;
      group.add(star);
    }
  }

  private createBehaviorTree(behaviorType: string): AINode {
    switch (behaviorType) {
      case 'star_bunny':
        return this.createStarBunnyTree();
      case 'cloud_bird':
        return this.createCloudBirdTree();
      case 'fog_deer':
        return this.createFogDeerTree();
      case 'crystal_dolphin':
        return this.createCrystalDolphinTree();
      case 'star_fox':
        return this.createStarFoxTree();
      default:
        return this.createIdleTree();
    }
  }

  private createStarBunnyTree(): AINode {
    return new SelectorNode([
      // 检查是否有成熟作物
      new SequenceNode([
        new ConditionNode(ctx => ctx.environment.dayPhase !== DayPhase.NIGHT),
        new ActionNode(ctx => {
          // 移动到作物位置并采集
          ctx.currentTask = 'harvesting';
          return NodeStatus.SUCCESS;
        })
      ]),
      // 巡逻行为
      new ActionNode(ctx => {
        ctx.currentTask = 'patrolling';
        return NodeStatus.SUCCESS;
      }),
      // 待机
      new ActionNode(ctx => {
        ctx.currentTask = 'idle';
        return NodeStatus.SUCCESS;
      })
    ]);
  }

  private createCloudBirdTree(): AINode {
    return new SelectorNode([
      new SequenceNode([
        new ConditionNode((_c) => true),
        new ActionNode((c) => {
          c.currentTask = 'sky_exploring';
          return NodeStatus.SUCCESS;
        })
      ]),
      new ActionNode(ctx => {
        ctx.currentTask = 'idle';
        return NodeStatus.SUCCESS;
      })
    ]);
  }

  private createFogDeerTree(): AINode {
    return new SelectorNode([
      new SequenceNode([
        new ConditionNode(ctx => ctx.intimacy >= 500),
        new ActionNode(ctx => {
          ctx.currentTask = 'buffing_yield';
          return NodeStatus.SUCCESS;
        })
      ]),
      new ActionNode(ctx => {
        ctx.currentTask = 'grazing';
        return NodeStatus.SUCCESS;
      })
    ]);
  }

  private createCrystalDolphinTree(): AINode {
    return new SelectorNode([
      new SequenceNode([
        new ConditionNode(ctx => ctx.environment.weather === Weather.RAIN),
        new ActionNode(ctx => {
          ctx.currentTask = 'water_purifying';
          return NodeStatus.SUCCESS;
        })
      ]),
      new ActionNode(ctx => {
        ctx.currentTask = 'swimming';
        return NodeStatus.SUCCESS;
      })
    ]);
  }

  private createStarFoxTree(): AINode {
    return new SelectorNode([
      new SequenceNode([
        new ConditionNode(ctx => ctx.environment.dayPhase === DayPhase.NIGHT),
        new ActionNode(ctx => {
          ctx.currentTask = 'night_exploring';
          return NodeStatus.SUCCESS;
        })
      ]),
      new ActionNode(ctx => {
        ctx.currentTask = 'resting';
        return NodeStatus.SUCCESS;
      })
    ]);
  }

  private createIdleTree(): AINode {
    return new ActionNode(ctx => {
      ctx.currentTask = 'idle';
      return NodeStatus.SUCCESS;
    });
  }

  public update(_deltaTime: number): void {
    const time = Date.now() * 0.001;

    // 更新环境信息
    const environment = {
      weather: this.timeSystem.getCurrentWeather(),
      season: this.timeSystem.getCurrentSeason(),
      dayPhase: this.timeSystem.getCurrentDayPhase()
    };

    this.beasts.forEach((beast) => {
      // 更新环境
      beast.context.environment = environment;

      // 执行AI行为树
      if (beast.isWorking) {
        beast.behaviorTree.execute(beast.context);
      }

      // 更新动画
      this.updateBeastAnimation(beast, time);

      // 广播位置更新
      beast.position = { ...beast.mesh.position };
    });
  }

  private updateBeastAnimation(beast: BeastEntity, time: number): void {
    const deltaTime = 1 / 60;
    const smoothTime = 0.3;
    
    beast.mesh.traverse((object) => {
      // 星光特效 - 使用easeInOutCubic实现平滑呼吸效果
      if (object.userData.isSparkle) {
        const phase = object.userData.phase;
        const rawScale = 0.7 + Math.sin(time * 1.5 + phase) * 0.3;
        const easedScale = EasingFunctions.easeInOutCubic(Math.max(0, Math.min(1, rawScale)));
        object.scale.setScalar(easedScale);
        
        const rawOpacity = 0.5 + Math.sin(time * 1.2 + phase) * 0.3;
        const mat = (object as THREE.Mesh).material as THREE.Material;
        mat.opacity = EasingFunctions.easeOutCubic(Math.max(0, Math.min(1, rawOpacity)));
      }

      // 雾效 - 平滑浮动
      if (object.userData.isFog) {
        const phase = object.userData.phase;
        const targetY = 0.3 + Math.sin(time * 0.8 + phase) * 0.1;
        object.position.y = InterpolationUtils.lerp(object.position.y, targetY, 0.1);
        
        const targetOpacity = 0.2 + Math.sin(time * 0.5 + phase) * 0.1;
        const mat = (object as THREE.Mesh).material as THREE.Material;
        mat.opacity = InterpolationUtils.lerp(
          mat.opacity, 
          targetOpacity, 
          0.05
        );
      }

      // 水晶旋转 - 使用缓动使旋转更自然
      if (object.userData.isCrystal) {
        const baseSpeed = object.userData.rotationSpeed || 0.01;
        const easedSpeed = EasingFunctions.easeInOutQuad(0.5 + Math.sin(time * 0.5) * 0.5) * baseSpeed;
        object.rotation.y += easedSpeed;
        object.rotation.x += easedSpeed * 0.5;
      }

      // 星尘轨迹 - 闪烁效果
      if (object.userData.isStarTrail) {
        const phase = object.userData.phase;
        const rawOpacity = 0.5 + Math.sin(time * 2 + phase) * 0.4;
        const mat = (object as THREE.Mesh).material as THREE.Material;
        mat.opacity = EasingFunctions.easeOutCubic(Math.max(0, Math.min(1, rawOpacity)));
      }
    });

    // 待机动作 - 使用平滑阻尼实现自然的上下浮动
    if (beast.data.type === BeastType.STAR_BUNNY) {
      const targetY = Math.sin(time * 1.5) * 0.05;
      const smoothResult = InterpolationUtils.smoothDamp(
        beast.mesh.position.y,
        targetY,
        beast.mesh.userData.velocityY || 0,
        smoothTime,
        deltaTime
      );
      beast.mesh.position.y = smoothResult.value;
      beast.mesh.userData.velocityY = smoothResult.velocity;
    }

    // 头部跟随 - 平滑旋转
    const targetRotationY = Math.sin(time * 0.5) * 0.2;
    beast.mesh.rotation.y = InterpolationUtils.lerp(
      beast.mesh.rotation.y,
      targetRotationY,
      0.08
    );
  }

  public interactWithBeast(instanceId: string): void {
    const beast = this.beasts.get(instanceId);
    if (!beast) return;

    // 增加亲密度
    beast.intimacy = Math.min(beast.intimacy + 10, beast.data.maxIntimacy);
    beast.context.intimacy = beast.intimacy;

    // 检查是否解锁新能力
    beast.abilities.forEach(ability => {
      if (beast.intimacy >= ability.unlockIntimacy) {
        console.log(`${beast.data.name} 解锁了能力: ${ability.name}`);
        this.emit('abilityUnlocked', {
          beast: beast,
          ability: ability
        });
      }
    });

    // 触发互动动画
    this.playInteractionAnimation(beast);

    this.emit('beastInteracted', {
      beast: beast,
      newIntimacy: beast.intimacy
    });

    console.log(`与 ${beast.data.name} 互动，亲密度: ${beast.intimacy}`);
  }

  private playInteractionAnimation(beast: BeastEntity): void {
    // 简单的跳跃动画
    const startY = beast.mesh.position.y;
    const jumpHeight = 0.5;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        beast.mesh.position.y = startY + Math.sin(progress * Math.PI) * jumpHeight;
        requestAnimationFrame(animate);
      } else {
        beast.mesh.position.y = startY;
      }
    };

    animate();
  }

  public getBeast(instanceId: string): BeastEntity | undefined {
    return this.beasts.get(instanceId);
  }

  public getAllBeasts(): BeastEntity[] {
    return Array.from(this.beasts.values());
  }

  public feedBeast(instanceId: string, foodItem: string): void {
    const beast = this.beasts.get(instanceId);
    if (!beast) return;

    beast.intimacy = Math.min(beast.intimacy + 20, beast.data.maxIntimacy);
    console.log(`喂养 ${beast.data.name}，亲密度: ${beast.intimacy}`);
    
    this.emit('beastFed', {
      beast: beast,
      food: foodItem,
      newIntimacy: beast.intimacy
    });
  }

  public getSaveData(): BeastSaveData[] {
    return Array.from(this.beasts.values()).map(beast => ({
      beastId: beast.id,
      instanceId: beast.instanceId,
      position: beast.position,
      intimacy: beast.intimacy,
      isWorking: beast.isWorking,
      currentTask: beast.context.currentTask || ''
    }));
  }

  public loadSaveData(data: BeastSaveData[]): void {
    // 清空现有异兽
    this.beasts.forEach(beast => {
      this.scene.remove(beast.mesh);
    });
    this.beasts.clear();

    // 重新加载异兽
    data.forEach(beastData => {
      const instance = this.spawnBeast(beastData.beastId, beastData.position);
      if (instance) {
        instance.intimacy = beastData.intimacy;
        instance.isWorking = beastData.isWorking;
        instance.context.intimacy = beastData.intimacy;
        instance.context.currentTask = beastData.currentTask;
      }
    });
  }

  public dispose(): void {
    this.beasts.forEach(beast => {
      this.scene.remove(beast.mesh);
    });
    this.beasts.clear();
    this.removeAllListeners();
  }
}
