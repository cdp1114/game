// 《星野栖所》作物种植系统 - 包含共生种植逻辑

import * as THREE from 'three';
import { TimeSystem } from './TimeSystem';
import { CropData, CropSaveData, CropType, Season, Weather, Vector3 } from '../core/types';
import { EventEmitter } from '../core/EventEmitter';

interface CropInstance {
  id: string;
  data: CropData;
  mesh: THREE.Group;
  plantedTime: number;
  growthProgress: number;
  currentStage: number;
  position: Vector3;
  adjacentBonus: number;
  isHarvestable: boolean;
}

export class CropSystem extends EventEmitter {
  private scene: THREE.Scene;
  private timeSystem: TimeSystem;
  
  private crops: Map<string, CropInstance> = new Map();
  private cropConfigs: Map<string, CropData> = new Map();
  private cropCounter: number = 0;

  constructor(scene: THREE.Scene, timeSystem: TimeSystem) {
    super();
    this.scene = scene;
    this.timeSystem = timeSystem;
    this.initializeCropConfigs();
  }

  private initializeCropConfigs(): void {
    // 基础作物配置
    const basicCrops: CropData[] = [
      {
        id: 'wheat',
        name: '小麦',
        type: CropType.BASIC,
        growthTime: 60, // 60分钟
        seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER],
        harvestYield: [{ itemId: 'wheat_grain', amount: 3 }],
        adjacentBonus: [
          { neighborType: 'flower', bonusType: 'YIELD', bonusValue: 0.20 }
        ]
      },
      {
        id: 'tomato',
        name: '番茄',
        type: CropType.BASIC,
        growthTime: 45,
        seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        harvestYield: [{ itemId: 'tomato', amount: 4 }],
        adjacentBonus: [
          { neighborType: 'herb', bonusType: 'YIELD', bonusValue: 0.15 }
        ]
      },
      {
        id: 'carrot',
        name: '胡萝卜',
        type: CropType.BASIC,
        growthTime: 40,
        seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        harvestYield: [{ itemId: 'carrot', amount: 3 }],
        adjacentBonus: []
      },
      {
        id: 'cabbage',
        name: '卷心菜',
        type: CropType.BASIC,
        growthTime: 50,
        seasons: [Season.SPRING, Season.AUTUMN, Season.WINTER],
        harvestYield: [{ itemId: 'cabbage', amount: 2 }],
        adjacentBonus: []
      }
    ];

    // 星植作物配置
    const starPlants: CropData[] = [
      {
        id: 'star_flower',
        name: '星绒花',
        type: CropType.STAR_PLANT,
        growthTime: 90,
        seasons: [Season.SPRING, Season.SUMMER],
        weatherRequirement: [Weather.CLEAR, Weather.STAR_RAIN],
        harvestYield: [{ itemId: 'star_petal', amount: 2 }, { itemId: 'rare_material', amount: 1 }],
        adjacentBonus: [
          { neighborType: 'star_flower', bonusType: 'RARE_DROP', bonusValue: 0.10 }
        ]
      },
      {
        id: 'moon_fruit',
        name: '月华果',
        type: CropType.STAR_PLANT,
        growthTime: 120,
        seasons: [Season.SUMMER, Season.AUTUMN],
        weatherRequirement: [Weather.CLEAR],
        harvestYield: [{ itemId: 'moon_crystal', amount: 3 }],
        adjacentBonus: [
          { neighborType: 'star_flower', bonusType: 'YIELD', bonusValue: 0.30 }
        ]
      }
    ];

    // 注册所有作物配置
    [...basicCrops, ...starPlants].forEach(crop => {
      this.cropConfigs.set(crop.id, crop);
    });
  }

  public plantCrop(cropId: string, position: Vector3): CropInstance | null {
    const cropData = this.cropConfigs.get(cropId);
    if (!cropData) {
      console.warn(`作物配置不存在: ${cropId}`);
      return null;
    }

    // 检查季节是否适合种植
    const currentSeason = this.timeSystem.getCurrentSeason();
    if (!cropData.seasons.includes(currentSeason)) {
      console.warn(`当前季节 ${currentSeason} 不适合种植 ${cropData.name}`);
      return null;
    }

    const instanceId = `crop_${this.cropCounter++}`;
    const mesh = this.createCropMesh(cropData, 0);
    
    mesh.position.set(position.x, position.y, position.z);
    mesh.userData.selectable = true;
    mesh.userData.cropId = instanceId;
    
    this.scene.add(mesh);

    const cropInstance: CropInstance = {
      id: instanceId,
      data: cropData,
      mesh,
      plantedTime: Date.now(),
      growthProgress: 0,
      currentStage: 0,
      position,
      adjacentBonus: 0,
      isHarvestable: false
    };

    // 计算相邻加成
    this.calculateAdjacentBonus(cropInstance);
    
    this.crops.set(instanceId, cropInstance);
    this.emit('cropPlanted', cropInstance);
    
    console.log(`种植了 ${cropData.name} 在 (${position.x}, ${position.y}, ${position.z})`);
    return cropInstance;
  }

  private createCropMesh(cropData: CropData, stage: number): THREE.Group {
    const group = new THREE.Group();
    
    switch (cropData.id) {
      case 'wheat':
        this.createWheatMesh(group, stage);
        break;
      case 'tomato':
        this.createTomatoMesh(group, stage);
        break;
      case 'carrot':
        this.createCarrotMesh(group, stage);
        break;
      case 'cabbage':
        this.createCabbageMesh(group, stage);
        break;
      case 'star_flower':
        this.createStarFlowerMesh(group, stage);
        break;
      case 'moon_fruit':
        this.createMoonFruitMesh(group, stage);
        break;
      default:
        this.createGenericCropMesh(group, stage, cropData);
    }
    
    return group;
  }

  private createWheatMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    const strawCount = 3 + Math.floor(stageRatio * 3);
    for (let i = 0; i < strawCount; i++) {
      const angle = (i / strawCount) * Math.PI * 2;
      const radius = 0.05 + stageRatio * 0.1;
      
      const strawHeight = 0.2 + stageRatio * 0.5;
      const strawGeometry = new THREE.CylinderGeometry(0.015, 0.025, strawHeight, 5);
      const strawMaterial = new THREE.MeshStandardMaterial({
        color: stage >= 3 ? 0xDAA520 : 0x228B22,
        roughness: 0.8
      });
      const straw = new THREE.Mesh(strawGeometry, strawMaterial);
      
      straw.position.set(
        Math.cos(angle) * radius,
        strawHeight / 2,
        Math.sin(angle) * radius
      );
      straw.rotation.z = (Math.random() - 0.5) * 0.2;
      straw.rotation.x = (Math.random() - 0.5) * 0.2;
      straw.castShadow = true;
      group.add(straw);
      
      if (stage >= 2) {
        const headGeometry = new THREE.SphereGeometry(0.04 + stageRatio * 0.02, 6, 4);
        const headMaterial = new THREE.MeshStandardMaterial({
          color: 0xF4D03F,
          roughness: 0.7,
          emissive: 0xF4D03F,
          emissiveIntensity: stage >= 3 ? 0.2 : 0
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = strawHeight + 0.03;
        head.scale.y = 1.5;
        straw.add(head);
      }
    }
  }

  private createTomatoMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    const stemHeight = 0.15 + stageRatio * 0.35;
    const stemGeometry = new THREE.CylinderGeometry(0.02, 0.035, stemHeight, 6);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x355E3B,
      roughness: 0.9
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = stemHeight / 2;
    stem.castShadow = true;
    group.add(stem);
    
    if (stage >= 1) {
      const leafGeometry = new THREE.SphereGeometry(0.08 + stageRatio * 0.1, 6, 4);
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22,
        roughness: 0.8
      });
      
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
        leaf.position.set(
          Math.cos(angle) * 0.1,
          stemHeight * 0.8,
          Math.sin(angle) * 0.1
        );
        leaf.scale.set(1, 0.4, 0.8);
        group.add(leaf);
      }
    }
    
    if (stage >= 2) {
      const tomatoGeometry = new THREE.SphereGeometry(0.12 + stageRatio * 0.05, 10, 8);
      const tomatoMaterial = new THREE.MeshStandardMaterial({
        color: 0xE74C3C,
        roughness: 0.4,
        metalness: 0.1
      });
      const tomato = new THREE.Mesh(tomatoGeometry, tomatoMaterial);
      tomato.position.set(
        (Math.random() - 0.5) * 0.1,
        stemHeight + 0.08,
        (Math.random() - 0.5) * 0.1
      );
      tomato.scale.y = 0.85;
      tomato.castShadow = true;
      group.add(tomato);
      
      if (stage >= 3) {
        const calyxGeometry = new THREE.ConeGeometry(0.04, 0.03, 5);
        const calyxMaterial = new THREE.MeshStandardMaterial({
          color: 0x355E3B,
          roughness: 0.9
        });
        const calyx = new THREE.Mesh(calyxGeometry, calyxMaterial);
        calyx.position.y = 0.1;
        tomato.add(calyx);
        
        tomatoMaterial.emissive = new THREE.Color(0xC0392B);
        tomatoMaterial.emissiveIntensity = 0.15;
      }
    }
  }

  private createCarrotMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    if (stage < 3) {
      const leafHeight = 0.15 + stageRatio * 0.35;
      for (let i = 0; i < 4; i++) {
        const leafGeometry = new THREE.ConeGeometry(0.02, leafHeight, 4);
        const leafMaterial = new THREE.MeshStandardMaterial({
          color: 0x228B22,
          roughness: 0.8
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (i / 4) * Math.PI * 2;
        leaf.position.set(
          Math.cos(angle) * 0.03,
          leafHeight / 2,
          Math.sin(angle) * 0.03
        );
        leaf.rotation.x = (Math.random() - 0.3) * 0.5;
        leaf.rotation.z = (Math.random() - 0.5) * 0.3;
        leaf.castShadow = true;
        group.add(leaf);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const leafGeometry = new THREE.ConeGeometry(0.02, 0.25, 4);
        const leafMaterial = new THREE.MeshStandardMaterial({
          color: 0x27AE60,
          roughness: 0.7
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (i / 5) * Math.PI * 2;
        leaf.position.set(
          Math.cos(angle) * 0.04,
          0.3,
          Math.sin(angle) * 0.04
        );
        leaf.rotation.x = (Math.random() - 0.3) * 0.5;
        leaf.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(leaf);
      }
      
      const carrotGeometry = new THREE.ConeGeometry(0.1, 0.35, 8);
      const carrotMaterial = new THREE.MeshStandardMaterial({
        color: 0xE67E22,
        roughness: 0.6
      });
      const carrot = new THREE.Mesh(carrotGeometry, carrotMaterial);
      carrot.position.y = 0.05;
      carrot.rotation.x = Math.PI;
      carrot.castShadow = true;
      group.add(carrot);
    }
  }

  private createCabbageMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    if (stage < 2) {
      const leafGeometry = new THREE.SphereGeometry(0.1 + stageRatio * 0.15, 6, 4);
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x27AE60,
        roughness: 0.8
      });
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.y = 0.1 + stageRatio * 0.05;
      leaf.scale.y = 0.5;
      leaf.castShadow = true;
      group.add(leaf);
    } else {
      for (let layer = 0; layer < 4; layer++) {
        const layerRatio = layer / 4;
        const radius = 0.15 + layerRatio * 0.1;
        const leafCount = 6 + layer * 2;
        
        for (let i = 0; i < leafCount; i++) {
          const angle = (i / leafCount) * Math.PI * 2 + layer * 0.3;
          const leafGeometry = new THREE.SphereGeometry(0.08 + layerRatio * 0.05, 6, 4);
          const leafMaterial = new THREE.MeshStandardMaterial({
            color: layer < 2 ? 0x27AE60 : (stage >= 3 ? 0xA8D8B9 : 0x58D68D),
            roughness: 0.7,
            side: THREE.DoubleSide
          });
          const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
          leaf.position.set(
            Math.cos(angle) * radius * 0.7,
            0.08 + layerRatio * 0.1,
            Math.sin(angle) * radius * 0.7
          );
          leaf.scale.set(1, 0.3, 0.8);
          leaf.rotation.y = angle;
          group.add(leaf);
        }
      }
      
      const coreGeometry = new THREE.SphereGeometry(0.08, 8, 6);
      const coreMaterial = new THREE.MeshStandardMaterial({
        color: stage >= 3 ? 0xF4F9F4 : 0x82E0AA,
        roughness: 0.6
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.y = 0.12;
      core.scale.y = 0.6;
      group.add(core);
    }
  }

  private createStarFlowerMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    const stemHeight = 0.2 + stageRatio * 0.4;
    const stemGeometry = new THREE.CylinderGeometry(0.015, 0.025, stemHeight, 5);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x228B22,
      roughness: 0.8
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = stemHeight / 2;
    stem.castShadow = true;
    group.add(stem);
    
    if (stage >= 2) {
      const leafGeometry = new THREE.SphereGeometry(0.06, 5, 4);
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x2ECC71,
        roughness: 0.7
      });
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.set(0.08, stemHeight * 0.6, 0);
      leaf.scale.set(1, 0.4, 0.6);
      leaf.rotation.z = 0.5;
      group.add(leaf);
    }
    
    if (stage >= 3) {
      const petalCount = 5;
      const petalGeometry = new THREE.SphereGeometry(0.06, 6, 4);
      
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petalMaterial = new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xFF69B4 : 0xFFB6C1,
          roughness: 0.4,
          emissive: 0xFF69B4,
          emissiveIntensity: 0.3,
          side: THREE.DoubleSide
        });
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.position.set(
          Math.cos(angle) * 0.08,
          stemHeight + 0.05,
          Math.sin(angle) * 0.08
        );
        petal.scale.set(1, 0.3, 0.7);
        petal.rotation.y = angle;
        petal.rotation.x = -0.3;
        group.add(petal);
      }
      
      const centerGeometry = new THREE.SphereGeometry(0.04, 8, 6);
      const centerMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.5,
        roughness: 0.3
      });
      const center = new THREE.Mesh(centerGeometry, centerMaterial);
      center.position.y = stemHeight + 0.05;
      center.userData.isSparkle = true;
      center.userData.phase = 0;
      group.add(center);
      
      for (let i = 0; i < 3; i++) {
        const sparkleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
        const sparkleMaterial = new THREE.MeshBasicMaterial({
          color: 0xFFD700,
          transparent: true,
          opacity: 0.8
        });
        const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
        sparkle.position.set(
          (Math.random() - 0.5) * 0.2,
          stemHeight + 0.1 + Math.random() * 0.15,
          (Math.random() - 0.5) * 0.2
        );
        sparkle.userData.isSparkle = true;
        sparkle.userData.phase = Math.random() * Math.PI * 2;
        group.add(sparkle);
      }
    }
  }

  private createMoonFruitMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    const stemHeight = 0.25 + stageRatio * 0.25;
    const stemGeometry = new THREE.CylinderGeometry(0.02, 0.03, stemHeight, 6);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x5D6D7E,
      roughness: 0.7
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = stemHeight / 2;
    stem.castShadow = true;
    group.add(stem);
    
    if (stage >= 1) {
      for (let i = 0; i < 3; i++) {
        const leafGeometry = new THREE.SphereGeometry(0.07, 5, 4);
        const leafMaterial = new THREE.MeshStandardMaterial({
          color: 0x85929E,
          roughness: 0.7
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (i / 3) * Math.PI * 2 + Math.PI / 3;
        leaf.position.set(
          Math.cos(angle) * 0.08,
          stemHeight * 0.7,
          Math.sin(angle) * 0.08
        );
        leaf.scale.set(1, 0.4, 0.6);
        group.add(leaf);
      }
    }
    
    if (stage >= 2) {
      const fruitGeometry = new THREE.SphereGeometry(0.12 + stageRatio * 0.03, 10, 10);
      const fruitMaterial = new THREE.MeshStandardMaterial({
        color: 0xE8DAEF,
        roughness: 0.3,
        metalness: 0.4,
        emissive: 0xD7BDE2,
        emissiveIntensity: stage >= 3 ? 0.3 : 0.1
      });
      const fruit = new THREE.Mesh(fruitGeometry, fruitMaterial);
      fruit.position.y = stemHeight + 0.1;
      fruit.castShadow = true;
      group.add(fruit);
      
      const markGeometry = new THREE.SphereGeometry(0.04, 6, 4);
      const markMaterial = new THREE.MeshStandardMaterial({
        color: 0xAED6F1,
        roughness: 0.2,
        emissive: 0x85C1E9,
        emissiveIntensity: 0.5
      });
      const mark = new THREE.Mesh(markGeometry, markMaterial);
      mark.position.set(0.08, stemHeight + 0.12, 0.05);
      fruit.add(mark);
    }
  }

  private createGenericCropMesh(group: THREE.Group, stage: number, cropData: CropData): void {
    const stageRatio = stage / 4;
    const stageRatio2 = stage / 4;
    
    const stemHeight = 0.3 + stageRatio * 0.7;
    const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, stemHeight, 6);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x228B22,
      roughness: 0.8
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = stemHeight / 2;
    stem.castShadow = true;
    group.add(stem);
    
    if (stage > 1) {
      const leafGeometry = new THREE.SphereGeometry(0.15 * stageRatio2, 6, 6);
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x32CD32,
        roughness: 0.7
      });
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.y = stemHeight * 0.7;
      leaf.scale.y = 0.5;
      group.add(leaf);
    }
    
    if (stage > 2) {
      const fruitColor = this.getCropColor(cropData);
      const fruitGeometry = new THREE.SphereGeometry(0.2 * stageRatio2, 8, 8);
      const fruitMaterial = new THREE.MeshStandardMaterial({
        color: fruitColor,
        roughness: 0.5,
        emissive: fruitColor,
        emissiveIntensity: cropData.type === 'STAR_PLANT' ? 0.3 : 0
      });
      const fruit = new THREE.Mesh(fruitGeometry, fruitMaterial);
      fruit.position.y = stemHeight + 0.1;
      fruit.castShadow = true;
      group.add(fruit);
    }
  }

  private getCropColor(cropData: CropData): number {
    switch (cropData.id) {
      case 'wheat':
        return 0xFFD700;
      case 'tomato':
        return 0xFF6347;
      case 'carrot':
        return 0xFFA500;
      case 'cabbage':
        return 0x90EE90;
      case 'star_flower':
        return 0xFF69B4;
      case 'moon_fruit':
        return 0xE6E6FA;
      default:
        return 0xFFFF00;
    }
  }

  private calculateAdjacentBonus(crop: CropInstance): void {
    let totalBonus = 0;
    
    this.crops.forEach((otherCrop) => {
      if (otherCrop.id === crop.id) return;
      
      const distance = Math.sqrt(
        Math.pow(crop.position.x - otherCrop.position.x, 2) +
        Math.pow(crop.position.z - otherCrop.position.z, 2)
      );
      
      // 相邻范围假设为2个单位
      if (distance <= 2) {
        const adjacentBonus = crop.data.adjacentBonus.find(
          bonus => bonus.neighborType === otherCrop.data.type ||
                   bonus.neighborType === otherCrop.data.id
        );
        
        if (adjacentBonus) {
          totalBonus += adjacentBonus.bonusValue;
        }
      }
    });
    
    crop.adjacentBonus = totalBonus;
  }

  public update(_deltaTime: number): void {
    const currentTime = Date.now();
    const weatherConfig = this.timeSystem.getWeatherConfig();
    const weatherMultiplier = weatherConfig?.effects.cropGrowthMultiplier || 1.0;

    this.crops.forEach((crop) => {
      if (crop.isHarvestable) return;

      // 计算生长进度
      const elapsedMinutes = (currentTime - crop.plantedTime) / 60000;
      const adjustedGrowthTime = crop.data.growthTime / weatherMultiplier;
      
      crop.growthProgress = Math.min(elapsedMinutes / adjustedGrowthTime, 1.0);
      
      // 计算当前阶段 (0-4)
      const newStage = Math.min(Math.floor(crop.growthProgress * 4), 3);
      
      if (newStage !== crop.currentStage) {
        crop.currentStage = newStage;
        this.updateCropMesh(crop);
      }

      // 检查是否可以收获
      if (crop.growthProgress >= 1.0 && !crop.isHarvestable) {
        crop.isHarvestable = true;
        this.onCropReady(crop);
      }

      // 更新动画
      this.updateCropAnimation(crop, currentTime);
    });
  }

  private updateCropMesh(crop: CropInstance): void {
    // 移除旧的mesh
    this.scene.remove(crop.mesh);
    
    // 创建新的mesh
    crop.mesh = this.createCropMesh(crop.data, crop.currentStage);
    crop.mesh.position.set(crop.position.x, crop.position.y, crop.position.z);
    crop.mesh.userData.selectable = true;
    crop.mesh.userData.cropId = crop.id;
    
    this.scene.add(crop.mesh);
  }

  private updateCropAnimation(crop: CropInstance, currentTime: number): void {
    crop.mesh.traverse((object) => {
      if (object.userData.isSparkle) {
        const phase = object.userData.phase;
        const scale = 0.8 + Math.sin(currentTime * 0.003 + phase) * 0.3;
        object.scale.setScalar(scale);
        const mat = (object as THREE.Mesh).material as THREE.Material;
        mat.opacity = 0.5 + Math.sin(currentTime * 0.005 + phase) * 0.3;
      }
      
      // 微风摆动效果
      if (object instanceof THREE.Mesh && object.geometry.type !== 'SphereGeometry') {
        object.rotation.z = Math.sin(currentTime * 0.002 + crop.position.x) * 0.05;
      }
    });
  }

  private onCropReady(crop: CropInstance): void {
    console.log(`作物 ${crop.data.name} 已成熟！`);
    this.emit('cropReady', {
      crop: crop,
      position: crop.position
    });
  }

  public harvestCrop(instanceId: string): boolean {
    const crop = this.crops.get(instanceId);
    if (!crop || !crop.isHarvestable) {
      return false;
    }

    // 计算收获数量（考虑相邻加成）
    const yieldMultiplier = 1 + crop.adjacentBonus;
    const harvestedItems = crop.data.harvestYield.map(
      item => ({
        itemId: item.itemId,
        amount: Math.floor(item.amount * yieldMultiplier)
      })
    );

    // 触发收获事件
    this.emit('cropHarvested', {
      crop: crop,
      items: harvestedItems,
      yieldBonus: crop.adjacentBonus
    });

    // 从场景中移除
    this.scene.remove(crop.mesh);
    this.crops.delete(instanceId);

    console.log(`收获了 ${crop.data.name}，获得物品:`, harvestedItems);
    return true;
  }

  public getCrop(instanceId: string): CropInstance | undefined {
    return this.crops.get(instanceId);
  }

  public getCropConfig(cropId: string): CropData | undefined {
    return this.cropConfigs.get(cropId);
  }

  public getAllCrops(): CropInstance[] {
    return Array.from(this.crops.values());
  }

  public getCropsByPosition(position: Vector3, radius: number): CropInstance[] {
    return Array.from(this.crops.values()).filter(crop => {
      const distance = Math.sqrt(
        Math.pow(crop.position.x - position.x, 2) +
        Math.pow(crop.position.z - position.z, 2)
      );
      return distance <= radius;
    });
  }

  public getHarvestableCrops(): CropInstance[] {
    return Array.from(this.crops.values()).filter(crop => crop.isHarvestable);
  }

  public batchHarvest(): void {
    const harvestableCrops = this.getHarvestableCrops();
    harvestableCrops.forEach(crop => {
      this.harvestCrop(crop.id);
    });
    console.log(`批量收获了 ${harvestableCrops.length} 个作物`);
  }

  public tryPlantSeedAt(position: Vector3): void {
    const timeData = this.timeSystem.getTimeData();
    const currentSeason = timeData.season as Season;
    const currentWeather = timeData.weather as Weather;

    const suitableCrops: CropData[] = [];
    this.cropConfigs.forEach((crop) => {
      if (
        crop.seasons.includes(currentSeason) &&
        (!crop.weatherRequirement || crop.weatherRequirement.includes(currentWeather))
      ) {
        suitableCrops.push(crop);
      }
    });

    if (suitableCrops.length === 0) return;

    this.plantCrop(suitableCrops[0].id, position);
  }

  public getSaveData(): CropSaveData[] {
    return Array.from(this.crops.values()).map(crop => ({
      cropId: crop.data.id,
      instanceId: crop.id,
      position: crop.position,
      plantedTime: crop.plantedTime,
      growthProgress: crop.growthProgress,
      currentStage: crop.currentStage
    }));
  }

  public loadSaveData(data: CropSaveData[]): void {
    // 清空现有作物
    this.crops.forEach(crop => {
      this.scene.remove(crop.mesh);
    });
    this.crops.clear();

    // 重新加载作物
    data.forEach(cropData => {
      const instance = this.plantCrop(cropData.cropId, cropData.position);
      if (instance) {
        instance.plantedTime = cropData.plantedTime;
        instance.growthProgress = cropData.growthProgress;
        instance.currentStage = cropData.currentStage;
        instance.isHarvestable = cropData.growthProgress >= 1.0;
      }
    });
  }

  public dispose(): void {
    this.crops.forEach(crop => {
      this.scene.remove(crop.mesh);
    });
    this.crops.clear();
    this.removeAllListeners();
  }
}
