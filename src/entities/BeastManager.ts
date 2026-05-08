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
    group.userData.type = 'star_bunny';
    group.userData.animationPhase = Math.random() * Math.PI * 2;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.95,
      metalness: 0.0
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFB6C1,
      roughness: 0.8
    });

    const earInnerMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFCCCC,
      roughness: 0.9
    });

    const bodyGeometry = new THREE.SphereGeometry(0.45, 16, 16);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.35;
    body.scale.set(1, 0.9, 1.1);
    body.castShadow = true;
    body.userData.isBunnyBody = true;
    group.add(body);

    const headGeometry = new THREE.SphereGeometry(0.32, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 0.85, 0.2);
    head.scale.set(1, 0.95, 1);
    head.castShadow = true;
    group.add(head);

    const leftEar = new THREE.Group();
    const leftEarOuter = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.08, 0.35, 8, 16),
      bodyMaterial
    );
    const leftEarInner = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.04, 0.25, 8, 16),
      earInnerMaterial
    );
    leftEarInner.position.z = 0.03;
    leftEar.add(leftEarOuter);
    leftEar.add(leftEarInner);
    leftEar.position.set(-0.12, 1.15, 0.05);
    leftEar.rotation.z = -0.25;
    leftEar.rotation.x = -0.1;
    leftEar.userData.isEar = true;
    group.add(leftEar);

    const rightEar = leftEar.clone();
    rightEar.position.set(0.12, 1.15, 0.05);
    rightEar.rotation.z = 0.25;
    rightEar.userData.isEar = true;
    group.add(rightEar);

    const cheekGeometry = new THREE.SphereGeometry(0.1, 12, 12);
    const leftCheek = new THREE.Mesh(cheekGeometry, accentMaterial);
    leftCheek.position.set(-0.18, 0.78, 0.32);
    leftCheek.scale.set(0.8, 0.6, 0.5);
    group.add(leftCheek);

    const rightCheek = leftCheek.clone();
    rightCheek.position.set(0.18, 0.78, 0.32);
    group.add(rightCheek);

    const eyeGeometry = new THREE.SphereGeometry(0.055, 12, 12);
    const eyeWhiteGeometry = new THREE.SphereGeometry(0.08, 12, 12);

    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
    leftEyeWhite.position.set(-0.1, 0.9, 0.42);
    group.add(leftEyeWhite);

    const leftEye = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.3,
      metalness: 0.5
    }));
    leftEye.position.set(-0.1, 0.9, 0.46);
    leftEye.userData.isEye = true;
    group.add(leftEye);

    const leftEyeHighlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    leftEyeHighlight.position.set(-0.12, 0.92, 0.5);
    group.add(leftEyeHighlight);

    const rightEyeWhite = leftEyeWhite.clone();
    rightEyeWhite.position.set(0.1, 0.9, 0.42);
    group.add(rightEyeWhite);

    const rightEye = leftEye.clone();
    rightEye.position.set(0.1, 0.9, 0.46);
    rightEye.userData.isEye = true;
    group.add(rightEye);

    const rightEyeHighlight = leftEyeHighlight.clone();
    rightEyeHighlight.position.set(0.08, 0.92, 0.5);
    group.add(rightEyeHighlight);

    const noseGeometry = new THREE.SphereGeometry(0.04, 12, 12);
    const nose = new THREE.Mesh(noseGeometry, accentMaterial);
    nose.position.set(0, 0.8, 0.48);
    nose.scale.set(1.2, 0.8, 0.6);
    group.add(nose);

    const mouthLeft = this.createCurve([
      { x: -0.02, y: 0.75, z: 0.46 },
      { x: -0.06, y: 0.73, z: 0.47 },
      { x: -0.04, y: 0.72, z: 0.46 }
    ], accentMaterial);
    group.add(mouthLeft);

    const mouthRight = this.createCurve([
      { x: 0.02, y: 0.75, z: 0.46 },
      { x: 0.06, y: 0.73, z: 0.47 },
      { x: 0.04, y: 0.72, z: 0.46 }
    ], accentMaterial);
    group.add(mouthRight);

    const tailGeometry = new THREE.SphereGeometry(0.12, 12, 12);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.set(0, 0.25, -0.45);
    tail.scale.set(1, 0.9, 0.8);
    tail.userData.isTail = true;
    group.add(tail);

    const frontLeftLeg = this.createLeg(0.25, 0.18, 0.15, bodyMaterial);
    frontLeftLeg.position.set(-0.2, 0.1, 0.2);
    group.add(frontLeftLeg);

    const frontRightLeg = this.createLeg(0.25, 0.18, 0.15, bodyMaterial);
    frontRightLeg.position.set(0.2, 0.1, 0.2);
    group.add(frontRightLeg);

    const backLeftLeg = this.createLeg(0.28, 0.22, 0.18, bodyMaterial);
    backLeftLeg.position.set(-0.22, 0.12, -0.2);
    group.add(backLeftLeg);

    const backRightLeg = this.createLeg(0.28, 0.22, 0.18, bodyMaterial);
    backRightLeg.position.set(0.22, 0.12, -0.2);
    group.add(backRightLeg);

    const pawLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      accentMaterial
    );
    pawLeft.position.set(-0.2, 0.02, 0.22);
    pawLeft.scale.set(1, 0.5, 1.2);
    group.add(pawLeft);

    const pawRight = pawLeft.clone();
    pawRight.position.set(0.2, 0.02, 0.22);
    group.add(pawRight);

    this.addSparkleEffect(group, 0xFFD700, 8);
    this.addBunnyWhiskers(group);
  }

  private createLeg(height: number, topRadius: number, bottomRadius: number, material: THREE.Material): THREE.Group {
    const leg = new THREE.Group();
    leg.userData.isLeg = true;

    const legGeometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 8);
    const legMesh = new THREE.Mesh(legGeometry, material);
    legMesh.position.y = height / 2;
    legMesh.castShadow = true;
    leg.add(legMesh);

    const footGeometry = new THREE.SphereGeometry(bottomRadius * 1.2, 8, 8);
    const foot = new THREE.Mesh(footGeometry, material);
    foot.position.set(0, 0.02, bottomRadius * 0.3);
    foot.scale.set(1, 0.5, 1.3);
    leg.add(foot);

    return leg;
  }

  private createCurve(points: { x: number; y: number; z: number }[], material: THREE.Material): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p.x, p.y, p.z))
    );
    const tubeGeometry = new THREE.TubeGeometry(curve, 8, 0.015, 6, false);
    return new THREE.Mesh(tubeGeometry, material);
  }

  private addBunnyWhiskers(group: THREE.Group): void {
    const whiskerMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });

    const whiskerPositions = [
      { x: -0.12, y: 0.8, z: 0.48, rotZ: 0.1 },
      { x: -0.12, y: 0.78, z: 0.48, rotZ: -0.1 },
      { x: -0.12, y: 0.76, z: 0.48, rotZ: 0 },
      { x: 0.12, y: 0.8, z: 0.48, rotZ: -0.1 },
      { x: 0.12, y: 0.78, z: 0.48, rotZ: 0.1 },
      { x: 0.12, y: 0.76, z: 0.48, rotZ: 0 }
    ];

    whiskerPositions.forEach(pos => {
      const whiskerGeometry = new THREE.CylinderGeometry(0.005, 0.002, 0.15, 4);
      const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
      whisker.position.set(pos.x, pos.y, pos.z);
      whisker.rotation.x = Math.PI / 2;
      whisker.rotation.z = pos.rotZ;
      group.add(whisker);
    });
  }

  private createCloudBirdMesh(group: THREE.Group): void {
    group.userData.type = 'cloud_bird';
    group.userData.animationPhase = Math.random() * Math.PI * 2;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xADD8E6,
      roughness: 0.6,
      metalness: 0.1
    });

    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.85,
      roughness: 0.4,
      metalness: 0.2
    });

    const bodyGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.scale.set(0.8, 1, 1.2);
    body.castShadow = true;
    body.userData.isBirdBody = true;
    group.add(body);

    const bellyGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const bellyMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.9
    });
    const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
    belly.position.set(0, 0.4, 0.15);
    belly.scale.set(0.9, 0.8, 0.7);
    group.add(belly);

    const headGeometry = new THREE.SphereGeometry(0.22, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 0.85, 0.25);
    head.castShadow = true;
    group.add(head);

    const leftWing = new THREE.Group();
    const leftWingMain = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.8, 4),
      wingMaterial
    );
    leftWingMain.rotation.z = Math.PI / 2;
    leftWingMain.position.x = 0.3;
    leftWing.add(leftWingMain);

    const leftWingTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.4, 4),
      new THREE.MeshStandardMaterial({ color: 0xFFD700, transparent: true, opacity: 0.7 })
    );
    leftWingTip.rotation.z = Math.PI / 2;
    leftWingTip.position.x = 0.65;
    leftWing.add(leftWingTip);

    leftWing.position.set(-0.3, 0.55, 0);
    leftWing.userData.isWing = true;
    leftWing.userData.side = 'left';
    group.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.set(0.3, 0.55, 0);
    rightWing.scale.x = -1;
    rightWing.userData.side = 'right';
    group.add(rightWing);

    const tailGeometry = new THREE.ConeGeometry(0.15, 0.4, 4);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.set(0, 0.45, -0.45);
    tail.rotation.x = -Math.PI / 4;
    tail.userData.isTail = true;
    group.add(tail);

    const tailFeather1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: 0xFFD700 })
    );
    tailFeather1.position.set(0, 0.5, -0.55);
    tailFeather1.rotation.x = -Math.PI / 3;
    group.add(tailFeather1);

    const tailFeather2 = tailFeather1.clone();
    tailFeather2.position.set(-0.08, 0.48, -0.5);
    tailFeather2.rotation.z = 0.3;
    group.add(tailFeather2);

    const tailFeather3 = tailFeather1.clone();
    tailFeather3.position.set(0.08, 0.48, -0.5);
    tailFeather3.rotation.z = -0.3;
    group.add(tailFeather3);

    const beakGeometry = new THREE.ConeGeometry(0.05, 0.2, 6);
    const beakMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFA500,
      roughness: 0.5
    });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0, 0.82, 0.42);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);

    const eyeGeometry = new THREE.SphereGeometry(0.05, 12, 12);
    const eyeWhiteGeometry = new THREE.SphereGeometry(0.07, 12, 12);

    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
    leftEyeWhite.position.set(-0.1, 0.9, 0.38);
    group.add(leftEyeWhite);

    const leftEye = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.2,
      metalness: 0.3
    }));
    leftEye.position.set(-0.1, 0.9, 0.42);
    group.add(leftEye);

    const leftEyeHighlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    leftEyeHighlight.position.set(-0.11, 0.92, 0.46);
    group.add(leftEyeHighlight);

    const rightEyeWhite = leftEyeWhite.clone();
    rightEyeWhite.position.set(0.1, 0.9, 0.38);
    group.add(rightEyeWhite);

    const rightEye = leftEye.clone();
    rightEye.position.set(0.1, 0.9, 0.42);
    group.add(rightEye);

    const rightEyeHighlight = leftEyeHighlight.clone();
    rightEyeHighlight.position.set(0.09, 0.92, 0.46);
    group.add(rightEyeHighlight);

    this.addSparkleEffect(group, 0x00BFFF, 6);
    this.addCloudTrail(group);
  }

  private addCloudTrail(group: THREE.Group): void {
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.4,
      roughness: 1.0
    });

    for (let i = 0; i < 5; i++) {
      const cloudGeometry = new THREE.SphereGeometry(0.15 - i * 0.02, 8, 8);
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial.clone());
      cloud.position.set(0, 0.3 - i * 0.1, -0.3 - i * 0.15);
      cloud.scale.set(1, 0.6, 1);
      cloud.userData.isCloudTrail = true;
      cloud.userData.trailIndex = i;
      group.add(cloud);
    }
  }

  private createFogDeerMesh(group: THREE.Group): void {
    group.userData.type = 'fog_deer';
    group.userData.animationPhase = Math.random() * Math.PI * 2;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xE8E8E8,
      roughness: 0.85,
      metalness: 0.05
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0xC0C0C0,
      roughness: 0.7,
      metalness: 0.1
    });

    const bodyGeometry = new THREE.CylinderGeometry(0.28, 0.35, 1.1, 12);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    const chestGeometry = new THREE.SphereGeometry(0.32, 12, 12);
    const chest = new THREE.Mesh(chestGeometry, bodyMaterial);
    chest.position.set(0, 0.85, 0.25);
    chest.scale.set(0.9, 1, 0.8);
    chest.castShadow = true;
    group.add(chest);

    const headGeometry = new THREE.SphereGeometry(0.22, 12, 12);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 1.4, 0.35);
    head.scale.set(1, 0.9, 1.1);
    head.castShadow = true;
    group.add(head);

    const snoutGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.25, 8);
    const snout = new THREE.Mesh(snoutGeometry, bodyMaterial);
    snout.position.set(0, 1.32, 0.55);
    snout.rotation.x = Math.PI / 2;
    group.add(snout);

    const noseGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const nose = new THREE.Mesh(noseGeometry, new THREE.MeshStandardMaterial({ color: 0x333333 }));
    nose.position.set(0, 1.32, 0.68);
    nose.scale.set(1.2, 0.7, 0.6);
    group.add(nose);

    const antlerMaterial = new THREE.MeshStandardMaterial({
      color: 0x9B8B7A,
      roughness: 0.5,
      metalness: 0.2
    });

    const leftAntlerGroup = new THREE.Group();
    const mainBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 0.5, 6),
      antlerMaterial
    );
    mainBeam.position.y = 0.25;
    mainBeam.rotation.z = -0.2;
    leftAntlerGroup.add(mainBeam);

    const branch1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.025, 0.25, 6),
      antlerMaterial
    );
    branch1.position.set(-0.08, 0.38, 0);
    branch1.rotation.z = -0.8;
    leftAntlerGroup.add(branch1);

    const branch2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.02, 0.2, 6),
      antlerMaterial
    );
    branch2.position.set(-0.05, 0.48, 0);
    branch2.rotation.z = -0.5;
    leftAntlerGroup.add(branch2);

    leftAntlerGroup.position.set(-0.1, 1.58, 0.35);
    leftAntlerGroup.userData.isAntler = true;
    leftAntlerGroup.userData.side = 'left';
    group.add(leftAntlerGroup);

    const rightAntlerGroup = leftAntlerGroup.clone();
    rightAntlerGroup.position.set(0.1, 1.58, 0.35);
    rightAntlerGroup.scale.x = -1;
    rightAntlerGroup.userData.side = 'right';
    group.add(rightAntlerGroup);

    const eyeGeometry = new THREE.SphereGeometry(0.04, 12, 12);
    const eyeWhiteGeometry = new THREE.SphereGeometry(0.055, 12, 12);

    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
    leftEyeWhite.position.set(-0.1, 1.46, 0.5);
    group.add(leftEyeWhite);

    const leftEye = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial({
      color: 0x4A90D9,
      emissive: 0x4A90D9,
      emissiveIntensity: 0.3,
      roughness: 0.3
    }));
    leftEye.position.set(-0.1, 1.46, 0.54);
    leftEye.userData.isEye = true;
    group.add(leftEye);

    const leftEyeHighlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    leftEyeHighlight.position.set(-0.11, 1.48, 0.57);
    group.add(leftEyeHighlight);

    const rightEyeWhite = leftEyeWhite.clone();
    rightEyeWhite.position.set(0.1, 1.46, 0.5);
    group.add(rightEyeWhite);

    const rightEye = leftEye.clone();
    rightEye.position.set(0.1, 1.46, 0.54);
    rightEye.userData.isEye = true;
    group.add(rightEye);

    const rightEyeHighlight = leftEyeHighlight.clone();
    rightEyeHighlight.position.set(0.09, 1.48, 0.57);
    group.add(rightEyeHighlight);

    const legGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.55, 8);
    const legPositions = [
      { x: -0.15, z: 0.25 },
      { x: 0.15, z: 0.25 },
      { x: -0.15, z: -0.25 },
      { x: 0.15, z: -0.25 }
    ];

    legPositions.forEach((pos, idx) => {
      const leg = new THREE.Group();
      const upperLeg = new THREE.Mesh(legGeometry, bodyMaterial);
      upperLeg.position.y = 0.275;
      upperLeg.castShadow = true;
      leg.add(upperLeg);

      const hoofGeometry = new THREE.CylinderGeometry(0.04, 0.035, 0.08, 8);
      const hoof = new THREE.Mesh(hoofGeometry, accentMaterial);
      hoof.position.y = 0.04;
      leg.add(hoof);

      leg.position.set(pos.x, 0.3, pos.z);
      leg.userData.isLeg = true;
      leg.userData.legIndex = idx;
      group.add(leg);
    });

    const tailGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const tail = new THREE.Mesh(tailGeometry, accentMaterial);
    tail.position.set(0, 0.7, -0.35);
    tail.scale.set(0.8, 1.2, 0.8);
    tail.userData.isTail = true;
    group.add(tail);

    this.addFogEffect(group);
    this.addDeerSpots(group);
  }

  private addDeerSpots(group: THREE.Group): void {
    const spotMaterial = new THREE.MeshStandardMaterial({
      color: 0xAAAAAA,
      roughness: 0.9,
      transparent: true,
      opacity: 0.5
    });

    const spotPositions = [
      { x: -0.15, y: 0.9, z: 0.2 },
      { x: 0.18, y: 0.85, z: 0.15 },
      { x: 0, y: 0.95, z: -0.2 },
      { x: -0.2, y: 0.75, z: -0.1 }
    ];

    spotPositions.forEach(pos => {
      const spotGeometry = new THREE.SphereGeometry(0.06, 8, 8);
      const spot = new THREE.Mesh(spotGeometry, spotMaterial.clone());
      spot.position.set(pos.x, pos.y, pos.z);
      spot.scale.set(1, 0.5, 0.7);
      group.add(spot);
    });
  }

  private createCrystalDolphinMesh(group: THREE.Group): void {
    group.userData.type = 'crystal_dolphin';
    group.userData.animationPhase = Math.random() * Math.PI * 2;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xE0FFFF,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
      envMapIntensity: 1.0
    });

    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.7
    });

    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0x00CED1,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x00CED1,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9
    });

    const bodyGeometry = new THREE.CapsuleGeometry(0.28, 0.7, 12, 16);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.55;
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    body.userData.isDolphinBody = true;
    group.add(body);

    const headGeometry = new THREE.SphereGeometry(0.22, 12, 12);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.55, 0.55, 0);
    head.scale.set(1.1, 0.9, 0.85);
    head.castShadow = true;
    group.add(head);

    const snoutGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const snout = new THREE.Mesh(snoutGeometry, bodyMaterial);
    snout.position.set(0.8, 0.52, 0);
    snout.rotation.z = Math.PI / 2;
    group.add(snout);

    const dorsalFinGeometry = new THREE.ConeGeometry(0.12, 0.35, 6);
    const dorsalFin = new THREE.Mesh(dorsalFinGeometry, finMaterial);
    dorsalFin.position.set(0.05, 0.85, 0);
    dorsalFin.rotation.x = -0.2;
    group.add(dorsalFin);

    const leftPectoralFin = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.3, 6),
      finMaterial
    );
    leftPectoralFin.position.set(0.25, 0.4, 0.25);
    leftPectoralFin.rotation.set(0.8, 0.3, 0.5);
    leftPectoralFin.userData.isFin = true;
    group.add(leftPectoralFin);

    const rightPectoralFin = leftPectoralFin.clone();
    rightPectoralFin.position.set(0.25, 0.4, -0.25);
    rightPectoralFin.rotation.set(-0.8, -0.3, 0.5);
    group.add(rightPectoralFin);

    const tailGroup = new THREE.Group();
    const tailBase = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.35, 6),
      bodyMaterial
    );
    tailBase.rotation.z = -Math.PI / 2;
    tailBase.position.x = -0.15;
    tailGroup.add(tailBase);

    const tailFluke1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.25, 6),
      finMaterial
    );
    tailFluke1.position.set(-0.25, 0.12, 0);
    tailFluke1.rotation.z = Math.PI / 2 + 0.5;
    tailGroup.add(tailFluke1);

    const tailFluke2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.25, 6),
      finMaterial
    );
    tailFluke2.position.set(-0.25, -0.12, 0);
    tailFluke2.rotation.z = Math.PI / 2 - 0.5;
    group.add(tailFluke2);

    tailGroup.position.set(-0.5, 0.55, 0);
    tailGroup.userData.isTail = true;
    group.add(tailGroup);
    group.add(tailFluke2);

    const eyeGeometry = new THREE.SphereGeometry(0.04, 12, 12);
    const leftEye = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.2,
      metalness: 0.5
    }));
    leftEye.position.set(0.6, 0.62, 0.18);
    leftEye.userData.isEye = true;
    group.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.position.set(0.6, 0.62, -0.18);
    group.add(rightEye);

    for (let i = 0; i < 4; i++) {
      const crystalGeometry = new THREE.OctahedronGeometry(0.05 + Math.random() * 0.03, 0);
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial.clone());
      crystal.position.set(
        -0.3 + i * 0.2,
        0.65 + Math.random() * 0.15,
        (Math.random() - 0.5) * 0.3
      );
      crystal.rotation.set(Math.random(), Math.random(), Math.random());
      crystal.userData.isCrystal = true;
      crystal.userData.rotationSpeed = 0.01 + Math.random() * 0.02;
      crystal.userData.phase = Math.random() * Math.PI * 2;
      group.add(crystal);
    }

    this.addWaterRipple(group);
  }

  private addWaterRipple(group: THREE.Group): void {
    const rippleMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.5
    });

    for (let i = 0; i < 3; i++) {
      const rippleGeometry = new THREE.RingGeometry(0.1 + i * 0.15, 0.12 + i * 0.15, 32);
      const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial.clone());
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.set(0, 0.05, 0);
      ripple.userData.isRipple = true;
      ripple.userData.rippleIndex = i;
      ripple.userData.phase = i * 0.5;
      group.add(ripple);
    }
  }

  private createStarFoxMesh(group: THREE.Group): void {
    group.userData.type = 'star_fox';
    group.userData.animationPhase = Math.random() * Math.PI * 2;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x6B3FA0,
      roughness: 0.6,
      metalness: 0.3,
      emissive: 0x4B0082,
      emissiveIntensity: 0.15
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x9370DB,
      roughness: 0.5,
      metalness: 0.4,
      emissive: 0x6B3FA0,
      emissiveIntensity: 0.2
    });

    const chestMaterial = new THREE.MeshStandardMaterial({
      color: 0xE6E6FA,
      roughness: 0.9,
      metalness: 0.0
    });

    const bodyGeometry = new THREE.SphereGeometry(0.4, 12, 12);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.45;
    body.scale.set(1, 0.85, 1.1);
    body.castShadow = true;
    body.userData.isFoxBody = true;
    group.add(body);

    const chestGeometry = new THREE.SphereGeometry(0.25, 12, 12);
    const chest = new THREE.Mesh(chestGeometry, chestMaterial);
    chest.position.set(0, 0.35, 0.2);
    chest.scale.set(0.8, 0.7, 0.5);
    group.add(chest);

    const headGeometry = new THREE.SphereGeometry(0.28, 12, 12);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 0.88, 0.22);
    head.scale.set(1, 0.9, 1);
    head.castShadow = true;
    group.add(head);

    const snoutGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const snout = new THREE.Mesh(snoutGeometry, accentMaterial);
    snout.position.set(0, 0.8, 0.48);
    snout.rotation.x = Math.PI / 2;
    group.add(snout);

    const noseGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const nose = new THREE.Mesh(noseGeometry, new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.3
    }));
    nose.position.set(0, 0.8, 0.63);
    group.add(nose);

    const leftEarGroup = new THREE.Group();
    const leftEarOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.35, 6),
      bodyMaterial
    );
    const leftEarInner = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.25, 6),
      accentMaterial
    );
    leftEarInner.position.z = 0.02;
    leftEarGroup.add(leftEarOuter);
    leftEarGroup.add(leftEarInner);
    leftEarGroup.position.set(-0.15, 1.12, 0.18);
    leftEarGroup.rotation.z = -0.25;
    leftEarGroup.userData.isEar = true;
    group.add(leftEarGroup);

    const rightEarGroup = leftEarGroup.clone();
    rightEarGroup.position.set(0.15, 1.12, 0.18);
    rightEarGroup.rotation.z = 0.25;
    group.add(rightEarGroup);

    const eyeGeometry = new THREE.SphereGeometry(0.055, 12, 12);
    const eyeWhiteGeometry = new THREE.SphereGeometry(0.08, 12, 12);

    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
    leftEyeWhite.position.set(-0.12, 0.93, 0.42);
    group.add(leftEyeWhite);

    const leftEye = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.3
    }));
    leftEye.position.set(-0.12, 0.93, 0.46);
    leftEye.userData.isEye = true;
    group.add(leftEye);

    const leftEyeHighlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    leftEyeHighlight.position.set(-0.14, 0.95, 0.5);
    group.add(leftEyeHighlight);

    const rightEyeWhite = leftEyeWhite.clone();
    rightEyeWhite.position.set(0.12, 0.93, 0.42);
    group.add(rightEyeWhite);

    const rightEye = leftEye.clone();
    rightEye.position.set(0.12, 0.93, 0.46);
    rightEye.userData.isEye = true;
    group.add(rightEye);

    const rightEyeHighlight = leftEyeHighlight.clone();
    rightEyeHighlight.position.set(0.1, 0.95, 0.5);
    group.add(rightEyeHighlight);

    const tailGroup = new THREE.Group();
    const tailBaseGeometry = new THREE.ConeGeometry(0.18, 0.6, 8);
    const tailBase = new THREE.Mesh(tailBaseGeometry, bodyMaterial);
    tailBase.position.y = 0.3;
    tailGroup.add(tailBase);

    const tailTipGeometry = new THREE.ConeGeometry(0.12, 0.4, 8);
    const tailTip = new THREE.Mesh(tailTipGeometry, accentMaterial);
    tailTip.position.y = 0.7;
    tailTip.rotation.x = 0.3;
    tailGroup.add(tailTip);

    const tailTipGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.8
      })
    );
    tailTipGlow.position.y = 0.85;
    tailGroup.add(tailTipGlow);

    tailGroup.position.set(0, 0.3, -0.4);
    tailGroup.rotation.x = -0.6;
    tailGroup.userData.isTail = true;
    group.add(tailGroup);

    const legGeometry = new THREE.CylinderGeometry(0.06, 0.07, 0.35, 8);
    const pawGeometry = new THREE.SphereGeometry(0.07, 8, 8);

    const legPositions = [
      { x: -0.2, z: 0.2 },
      { x: 0.2, z: 0.2 },
      { x: -0.18, z: -0.2 },
      { x: 0.18, z: -0.2 }
    ];

    legPositions.forEach((pos, idx) => {
      const leg = new THREE.Group();
      const upperLeg = new THREE.Mesh(legGeometry, bodyMaterial);
      upperLeg.position.y = 0.175;
      leg.add(upperLeg);

      const paw = new THREE.Mesh(pawGeometry, accentMaterial);
      paw.position.y = 0.02;
      paw.scale.set(1, 0.5, 1.2);
      leg.add(paw);

      leg.position.set(pos.x, 0.2, pos.z);
      leg.userData.isLeg = true;
      leg.userData.legIndex = idx;
      group.add(leg);
    });

    this.addSparkleEffect(group, 0xDDA0DD, 10);
    this.addFoxWhiskers(group);
  }

  private addFoxWhiskers(group: THREE.Group): void {
    const whiskerMaterial = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });

    const whiskerPositions = [
      { x: -0.08, y: 0.78, z: 0.55, rotZ: 0.15 },
      { x: -0.08, y: 0.76, z: 0.55, rotZ: 0 },
      { x: -0.08, y: 0.74, z: 0.55, rotZ: -0.1 },
      { x: 0.08, y: 0.78, z: 0.55, rotZ: -0.15 },
      { x: 0.08, y: 0.76, z: 0.55, rotZ: 0 },
      { x: 0.08, y: 0.74, z: 0.55, rotZ: 0.1 }
    ];

    whiskerPositions.forEach(pos => {
      const whiskerGeometry = new THREE.CylinderGeometry(0.004, 0.002, 0.18, 4);
      const whisker = new THREE.Mesh(whiskerGeometry, whiskerMaterial);
      whisker.position.set(pos.x, pos.y, pos.z);
      whisker.rotation.x = Math.PI / 2;
      whisker.rotation.z = pos.rotZ;
      group.add(whisker);
    });
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
    const animPhase = beast.mesh.userData.animationPhase || 0;

    beast.mesh.traverse((object) => {
      if (object.userData.isSparkle) {
        const phase = object.userData.phase;
        const rawScale = 0.7 + Math.sin(time * 1.5 + phase) * 0.3;
        const easedScale = EasingFunctions.easeInOutCubic(Math.max(0, Math.min(1, rawScale)));
        object.scale.setScalar(easedScale);

        const rawOpacity = 0.5 + Math.sin(time * 1.2 + phase) * 0.3;
        const mat = (object as THREE.Mesh).material as THREE.Material;
        mat.opacity = EasingFunctions.easeOutCubic(Math.max(0, Math.min(1, rawOpacity)));
      }

      if (object.userData.isFog) {
        const phase = object.userData.phase;
        const targetY = 0.3 + Math.sin(time * 0.8 + phase) * 0.1;
        object.position.y = InterpolationUtils.lerp(object.position.y, targetY, 0.1);

        const targetOpacity = 0.2 + Math.sin(time * 0.5 + phase) * 0.1;
        const mat = (object as THREE.Mesh).material as THREE.Material;
        mat.opacity = InterpolationUtils.lerp(mat.opacity, targetOpacity, 0.05);
      }

      if (object.userData.isCrystal) {
        const baseSpeed = object.userData.rotationSpeed || 0.01;
        const easedSpeed = EasingFunctions.easeInOutQuad(0.5 + Math.sin(time * 0.5) * 0.5) * baseSpeed;
        object.rotation.y += easedSpeed;
        object.rotation.x += easedSpeed * 0.5;
      }

      if (object.userData.isStarTrail) {
        const phase = object.userData.phase;
        const rawOpacity = 0.5 + Math.sin(time * 2 + phase) * 0.4;
        const mat = (object as THREE.Mesh).material as THREE.Material;
        mat.opacity = EasingFunctions.easeOutCubic(Math.max(0, Math.min(1, rawOpacity)));
      }

      if (object.userData.isCloudTrail) {
        const idx = object.userData.trailIndex || 0;
        const mat = (object as THREE.Mesh).material as THREE.Material;
        mat.opacity = 0.4 - idx * 0.06 + Math.sin(time * 2 + idx) * 0.05;
        object.position.z = -0.3 - idx * 0.15 + Math.sin(time * 1.5 + idx * 0.5) * 0.03;
      }

      if (object.userData.isWing) {
        const wingFlapSpeed = beast.data.type === BeastType.CLOUD_BIRD ? 3.0 : 1.5;
        const wingAngle = Math.sin(time * wingFlapSpeed + animPhase) * 0.5;
        const side = object.userData.side === 'left' ? 1 : -1;
        object.rotation.z = side * (0.3 + wingAngle);
      }

      if (object.userData.isEar) {
        const earWiggle = Math.sin(time * 2.5 + animPhase) * 0.08;
        object.rotation.x = -0.1 + earWiggle;
        object.rotation.z += Math.sin(time * 3 + animPhase) * 0.02;
      }

      if (object.userData.isTail) {
        object.rotation.x = Math.sin(time * 2 + animPhase) * 0.15;
        object.rotation.z = Math.sin(time * 1.5 + animPhase) * 0.1;
      }

      if (object.userData.isLeg) {
        const legBob = Math.abs(Math.sin(time * 4 + animPhase)) * 0.03;
        object.position.y = object.position.y + legBob * 0.1;
      }

      if (object.userData.isEye) {
        const blinkSpeed = beast.data.type === BeastType.STAR_FOX ? 0.5 : 0.8;
        const blink = Math.sin(time * blinkSpeed + animPhase);
        if (blink > 0.95) {
          object.scale.y = 0.1;
        } else {
          object.scale.y = InterpolationUtils.lerp(object.scale.y, 1, 0.3);
        }
      }
    });

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

    if (beast.data.type === BeastType.CLOUD_BIRD) {
      const hoverY = 1.5 + Math.sin(time * 1.2 + animPhase) * 0.3;
      beast.mesh.position.y = InterpolationUtils.lerp(beast.mesh.position.y, hoverY, 0.05);
    }

    if (beast.data.type === BeastType.FOG_DEER) {
      const swayX = Math.sin(time * 0.8 + animPhase) * 0.05;
      beast.mesh.rotation.z = InterpolationUtils.lerp(beast.mesh.rotation.z, swayX, 0.05);
    }

    const targetRotationY = Math.sin(time * 0.5 + animPhase) * 0.2;
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
