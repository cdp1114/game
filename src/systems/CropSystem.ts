// 《星野栖所》作物种植系统 - 包含共生种植逻辑

import * as THREE from 'three';
import { TimeSystem } from './TimeSystem';
import { CropData, CropSaveData, Season, Weather, Vector3 } from '../core/types';
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
        type: 'BASIC',
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
        type: 'BASIC',
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
        type: 'BASIC',
        growthTime: 40,
        seasons: [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        harvestYield: [{ itemId: 'carrot', amount: 3 }],
        adjacentBonus: []
      },
      {
        id: 'cabbage',
        name: '卷心菜',
        type: 'BASIC',
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
        type: 'STAR_PLANT',
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
        type: 'STAR_PLANT',
        growthTime: 120,
        seasons: [Season.SUMMER, Season.AUTUMN],
        weatherRequirement: [Weather.NIGHT],
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
    
    // 根据生长阶段创建不同的mesh
    const stageRatio = stage / 4; // 假设有4个生长阶段
    
    // 茎干
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
    
    // 叶片
    if (stage > 1) {
      const leafGeometry = new THREE.SphereGeometry(0.15 * stageRatio, 6, 6);
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x32CD32,
        roughness: 0.7
      });
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.y = stemHeight * 0.7;
      leaf.scale.y = 0.5;
      group.add(leaf);
    }
    
    // 果实/花朵
    if (stage > 2) {
      const fruitColor = this.getCropColor(cropData);
      const fruitGeometry = new THREE.SphereGeometry(0.2 * stageRatio, 8, 8);
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
    
    // 星植特效
    if (cropData.type === 'STAR_PLANT' && stage > 2) {
      const sparkleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
      const sparkleMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.8
      });
      
      for (let i = 0; i < 5; i++) {
        const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
        sparkle.position.set(
          (Math.random() - 0.5) * 0.5,
          stemHeight + 0.2 + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.5
        );
        sparkle.userData.isSparkle = true;
        sparkle.userData.phase = Math.random() * Math.PI * 2;
        group.add(sparkle);
      }
    }
    
    return group;
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
    
    this.crops.forEach((otherCrop, otherId) => {
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

  public update(deltaTime: number): void {
    const currentTime = Date.now();
    const weatherConfig = this.timeSystem.getWeatherConfig();
    const weatherMultiplier = weatherConfig?.effects.cropGrowthMultiplier || 1.0;

    this.crops.forEach((crop, instanceId) => {
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
        (object as THREE.Mesh).material.opacity = 0.5 + Math.sin(currentTime * 0.005 + phase) * 0.3;
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
