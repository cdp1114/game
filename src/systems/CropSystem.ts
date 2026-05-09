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
      this.emit('plant:failed', { reason: 'invalid_crop', message: '作物配置不存在' });
      return null;
    }

    // 检查季节是否适合种植
    const currentSeason = this.timeSystem.getCurrentSeason();
    if (!cropData.seasons.includes(currentSeason)) {
      const seasonNames: Record<string, string> = {
        'SPRING': '春季',
        'SUMMER': '夏季',
        'AUTUMN': '秋季',
        'WINTER': '冬季'
      };
      const suitableSeasons = cropData.seasons.map(s => seasonNames[s] || s).join('、');
      const message = `${cropData.name}只能在${suitableSeasons}种植！`;
      console.warn(`当前季节 ${currentSeason} 不适合种植 ${cropData.name}`);
      this.emit('plant:season_mismatch', { 
        cropId, 
        cropName: cropData.name,
        currentSeason,
        suitableSeasons: cropData.seasons,
        message 
      });
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
    
    const strawCount = 5 + Math.floor(stageRatio * 4);
    for (let i = 0; i < strawCount; i++) {
      const angle = (i / strawCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = 0.04 + stageRatio * 0.12 + Math.random() * 0.03;
      
      const strawHeight = 0.25 + stageRatio * 0.55;
      const strawGeom = new THREE.CylinderGeometry(0.012, 0.022, strawHeight, 6);
      const strawMat = new THREE.MeshStandardMaterial({
        color: stage >= 3 ? 0xC4A035 : (stage >= 2 ? 0x8B9B35 : 0x4A7A35),
        roughness: 0.85,
        flatShading: false
      });
      const straw = new THREE.Mesh(strawGeom, strawMat);
      
      straw.position.set(
        Math.cos(angle) * radius,
        strawHeight / 2,
        Math.sin(angle) * radius
      );
      straw.rotation.z = (Math.random() - 0.5) * 0.3 + 0.06;
      straw.rotation.x = (Math.random() - 0.5) * 0.25;
      straw.castShadow = true;
      straw.userData.isStalk = true;
      group.add(straw);
      
      if (stage >= 2) {
        const headHeight = 0.08 + stageRatio * 0.06;
        const headGeom = new THREE.CapsuleGeometry(0.025, headHeight, 4, 6);
        const headMat = new THREE.MeshStandardMaterial({
          color: stage >= 3 ? 0xE8C547 : 0xC4B035,
          roughness: 0.7,
          flatShading: false,
          emissive: 0xD4A82F,
          emissiveIntensity: stage >= 3 ? 0.15 : 0
        });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = strawHeight / 2 + 0.01;
        head.rotation.z = (Math.random() - 0.5) * 0.12;
        head.userData.isWheatHead = true;
        straw.add(head);
        
        if (stage >= 3) {
          for (let j = 0; j < 8; j++) {
            const grainGeom = new THREE.SphereGeometry(0.014, 4, 4);
            grainGeom.scale(0.55, 1.2, 0.55);
            const grain = new THREE.Mesh(grainGeom, headMat);
            const grainAngle = (j / 8) * Math.PI * 2;
            const grainY = -headHeight / 2 + 0.01 + (j % 2) * 0.015;
            grain.position.set(
              Math.cos(grainAngle) * 0.022,
              grainY,
              Math.sin(grainAngle) * 0.022
            );
            grain.rotation.x = Math.random() * 0.4;
            head.add(grain);
          }
        }
      }
    }
    
    if (stage < 1) {
      const sproutGeom = new THREE.SphereGeometry(0.045, 6, 4);
      const sproutMat = new THREE.MeshStandardMaterial({
        color: 0x4A7C3B,
        roughness: 0.9
      });
      const sprout = new THREE.Mesh(sproutGeom, sproutMat);
      sprout.position.y = 0.035;
      sprout.scale.y = 0.45;
      group.add(sprout);
    }
  }

  private createTomatoMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    const stemHeight = 0.2 + stageRatio * 0.4;
    const stemGeom = new THREE.CylinderGeometry(0.018, 0.026, stemHeight, 6);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x3A6B35,
      roughness: 0.88,
      flatShading: false
    });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = stemHeight / 2;
    stem.castShadow = true;
    stem.userData.isTomatoStem = true;
    group.add(stem);
    
    if (stage >= 1) {
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x3A7D32,
        roughness: 0.75,
        flatShading: false,
        side: THREE.DoubleSide
      });
      
      for (let i = 0; i < 5; i++) {
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(0.05, 0.02, 0.11, 0.05, 0.14, 0);
        leafShape.bezierCurveTo(0.11, -0.03, 0.05, -0.02, 0, 0);
        
        const leafGeom = new THREE.ExtrudeGeometry(leafShape, {
          depth: 0.008,
          bevelEnabled: true,
          bevelThickness: 0.002,
          bevelSize: 0.002,
          bevelSegments: 2
        });
        
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        const angle = (i / 5) * Math.PI * 2 + Math.PI / 10;
        const leafY = stemHeight * (0.45 + i * 0.12);
        leaf.position.set(
          Math.cos(angle) * 0.07,
          leafY,
          Math.sin(angle) * 0.07
        );
        leaf.rotation.y = angle;
        leaf.rotation.x = -0.35 - Math.random() * 0.2;
        leaf.castShadow = true;
        group.add(leaf);
      }
    }
    
    if (stage >= 2) {
      const fruitRadius = 0.1 + stageRatio * 0.06;
      const fruitGeom = new THREE.SphereGeometry(fruitRadius, 14, 12);
      fruitGeom.scale(1, 0.88, 1);
      
      const fruitMat = new THREE.MeshStandardMaterial({
        color: stage >= 3 ? 0xDC4637 : 0xE07A5F,
        roughness: 0.35,
        metalness: 0.08,
        flatShading: false
      });
      
      const fruitPositions = stage >= 3 ? [
        [0, stemHeight + 0.06, 0, 1.0],
        [0.09, stemHeight - 0.03, 0.06, 0.82],
        [-0.07, stemHeight, -0.06, 0.88],
        [0.05, stemHeight + 0.16, -0.04, 0.72]
      ] : [[0, stemHeight + 0.02, 0, 1.0]];
      
      fruitPositions.forEach((pos) => {
        const fruit = new THREE.Mesh(fruitGeom, fruitMat.clone());
        fruit.position.set(pos[0] as number, pos[1] as number, pos[2] as number);
        fruit.scale.setScalar(pos[3] as number);
        fruit.castShadow = true;
        fruit.userData.isTomato = true;
        group.add(fruit);
        
        const calyxGeom = new THREE.ConeGeometry(0.038, 0.028, 6);
        const calyxMat = new THREE.MeshStandardMaterial({
          color: 0x3A6B35,
          roughness: 0.82
        });
        const calyx = new THREE.Mesh(calyxGeom, calyxMat);
        calyx.position.y = fruitRadius * 0.85;
        fruit.add(calyx);
        
        for (let i = 0; i < 5; i++) {
          const sepalGeom = new THREE.SphereGeometry(0.014, 4, 4);
          sepalGeom.scale(1, 0.38, 1);
          const sepal = new THREE.Mesh(sepalGeom, calyxMat);
          const sepalAngle = (i / 5) * Math.PI * 2;
          sepal.position.set(
            Math.cos(sepalAngle) * 0.028,
            fruitRadius * 0.72,
            Math.sin(sepalAngle) * 0.028
          );
          sepal.rotation.x = -0.5;
          sepal.rotation.y = sepalAngle;
          fruit.add(sepal);
        }
        
        if (stage >= 3) {
          fruit.material.emissive = new THREE.Color(0x8B1A1A);
          fruit.material.emissiveIntensity = 0.12;
          
          const highlightGeom = new THREE.SphereGeometry(0.018, 6, 6);
          const highlightMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.35
          });
          const highlight = new THREE.Mesh(highlightGeom, highlightMat);
          highlight.position.set(-fruitRadius * 0.28, fruitRadius * 0.22, -fruitRadius * 0.28);
          fruit.add(highlight);
        }
      });
    }
  }

  private createCarrotMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    if (stage < 3) {
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x2E7D32,
        roughness: 0.72,
        flatShading: false
      });
      
      const leafCount = 4 + Math.floor(stageRatio * 4);
      const leafHeights = [0.15, 0.25, 0.32, 0.38, 0.42];
      
      for (let i = 0; i < leafCount; i++) {
        const leafHeight = leafHeights[i % leafHeights.length] * (0.5 + stageRatio * 0.85);
        const leafGeom = new THREE.ConeGeometry(0.024, leafHeight, 5);
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        
        const angle = (i / leafCount) * Math.PI * 2 + Math.random() * 0.25;
        const radius = 0.022 + Math.random() * 0.028;
        leaf.position.set(
          Math.cos(angle) * radius,
          leafHeight / 2,
          Math.sin(angle) * radius
        );
        leaf.rotation.x = -0.32 + (Math.random() - 0.5) * 0.42;
        leaf.rotation.z = (Math.random() - 0.5) * 0.32;
        leaf.rotation.y = angle;
        leaf.castShadow = true;
        leaf.userData.isCarrotLeaf = true;
        group.add(leaf);
      }
    } else {
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x388E3C,
        roughness: 0.68,
        flatShading: false
      });
      
      for (let i = 0; i < 7; i++) {
        const leafHeight = 0.22 + Math.random() * 0.14;
        const leafGeom = new THREE.ConeGeometry(0.022, leafHeight, 5);
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        
        const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.35;
        const radius = 0.032 + Math.random() * 0.02;
        leaf.position.set(
          Math.cos(angle) * radius,
          0.28 + leafHeight / 2,
          Math.sin(angle) * radius
        );
        leaf.rotation.x = -0.42 + Math.random() * 0.32;
        leaf.rotation.z = (Math.random() - 0.5) * 0.22;
        leaf.rotation.y = angle;
        leaf.castShadow = true;
        group.add(leaf);
      }
      
      const carrotLen = 0.38 + Math.random() * 0.12;
      const carrotGeom = new THREE.CylinderGeometry(0.028, 0.092, carrotLen, 10);
      carrotGeom.scale(1, 1, 1);
      const carrotMat = new THREE.MeshStandardMaterial({
        color: 0xE8722A,
        roughness: 0.52,
        flatShading: false
      });
      const carrot = new THREE.Mesh(carrotGeom, carrotMat);
      carrot.position.y = carrotLen / 2 - 0.06;
      carrot.rotation.x = Math.PI + (Math.random() - 0.5) * 0.12;
      carrot.rotation.z = (Math.random() - 0.5) * 0.12;
      carrot.castShadow = true;
      carrot.userData.isCarrot = true;
      group.add(carrot);
      
      for (let i = 0; i < 4; i++) {
        const lineGeom = new THREE.BoxGeometry(0.0012, carrotLen * 0.55, 0.0012);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xCC5A1F });
        const line = new THREE.Mesh(lineGeom, lineMat);
        const lineAngle = (i / 4) * Math.PI * 2;
        line.position.set(
          Math.cos(lineAngle) * 0.045,
          -carrotLen * 0.15,
          Math.sin(lineAngle) * 0.045
        );
        carrot.add(line);
      }
      
      const tipGeom = new THREE.ConeGeometry(0.028, 0.08, 8);
      const tip = new THREE.Mesh(tipGeom, carrotMat);
      tip.position.y = -carrotLen / 2 + 0.02;
      tip.rotation.x = Math.PI;
      carrot.add(tip);
    }
  }

  private createCabbageMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    if (stage < 2) {
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x43A047,
        roughness: 0.72,
        flatShading: false,
        side: THREE.DoubleSide
      });
      
      const leafCount = 3 + stage;
      for (let i = 0; i < leafCount; i++) {
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(0.07, 0.02, 0.14, 0.04, 0.17, 0);
        leafShape.bezierCurveTo(0.14, -0.04, 0.07, -0.02, 0, 0);
        
        const leafGeom = new THREE.ExtrudeGeometry(leafShape, {
          depth: 0.014,
          bevelEnabled: true,
          bevelThickness: 0.003,
          bevelSize: 0.003,
          bevelSegments: 3
        });
        
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        const angle = (i / leafCount) * Math.PI * 2;
        const radius = 0.05 + stageRatio * 0.08;
        leaf.position.set(
          Math.cos(angle) * radius * 0.5,
          0.05 + i * 0.04,
          Math.sin(angle) * radius * 0.5
        );
        leaf.rotation.y = angle;
        leaf.rotation.x = -0.52 - Math.random() * 0.32;
        leaf.scale.setScalar(0.82 + stageRatio * 0.38);
        leaf.castShadow = true;
        group.add(leaf);
      }
    } else {
      const cabbageRadius = 0.22 + stageRatio * 0.08;
      
      for (let layer = 0; layer < 6; layer++) {
        const layerRatio = layer / 6;
        const leafCount = 8 + layer * 2;
        const radius = cabbageRadius * (0.38 + layerRatio * 0.62);
        
        const leafColor = layer < 2 ? 0x558B2F : (stage >= 3 ? 0xC5E1A5 : 0x7CB342);
        const leafMat = new THREE.MeshStandardMaterial({
          color: leafColor,
          roughness: 0.58 + layerRatio * 0.18,
          flatShading: false,
          side: THREE.DoubleSide
        });
        
        for (let i = 0; i < leafCount; i++) {
          const angle = (i / leafCount) * Math.PI * 2 + layer * 0.42;
          const leafShape = new THREE.Shape();
          const leafWidth = radius * 0.82;
          const leafLength = radius * (0.58 + layerRatio * 0.42);
          
          leafShape.moveTo(0, 0);
          leafShape.bezierCurveTo(
            leafWidth * 0.32, leafLength * 0.12,
            leafWidth * 0.82, leafLength * 0.22,
            leafWidth, 0
          );
          leafShape.bezierCurveTo(
            leafWidth * 0.82, -leafLength * 0.12,
            leafWidth * 0.32, -leafLength * 0.06,
            0, 0
          );
          
          const leafGeom = new THREE.ExtrudeGeometry(leafShape, {
            depth: 0.022,
            bevelEnabled: true,
            bevelThickness: 0.004,
            bevelSize: 0.004,
            bevelSegments: 2
          });
          
          const leaf = new THREE.Mesh(leafGeom, leafMat);
          leaf.position.set(
            Math.cos(angle) * radius * 0.28,
            0.02 + layerRatio * cabbageRadius * 0.82,
            Math.sin(angle) * radius * 0.28
          );
          leaf.rotation.y = angle;
          leaf.rotation.x = -0.62 - layerRatio * 0.32;
          leaf.castShadow = true;
          group.add(leaf);
        }
      }
      
      const coreGeom = new THREE.SphereGeometry(cabbageRadius * 0.26, 12, 10);
      const coreMat = new THREE.MeshStandardMaterial({
        color: stage >= 3 ? 0xF1F8E9 : 0xDCEDC8,
        roughness: 0.38,
        flatShading: false
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.position.y = cabbageRadius * 0.58;
      core.scale.y = 0.48;
      core.castShadow = true;
      group.add(core);
      
      for (let i = 0; i < 10; i++) {
        const veinGeom = new THREE.BoxGeometry(0.0022, cabbageRadius * 0.16, 0.0022);
        const veinMat = new THREE.MeshBasicMaterial({ 
          color: 0xC5E1A5, 
          transparent: true, 
          opacity: 0.52 
        });
        const vein = new THREE.Mesh(veinGeom, veinMat);
        const veinAngle = (i / 10) * Math.PI * 2;
        vein.position.set(
          Math.cos(veinAngle) * cabbageRadius * 0.16,
          0,
          Math.sin(veinAngle) * cabbageRadius * 0.16
        );
        vein.rotation.z = veinAngle;
        core.add(vein);
      }
    }
  }

  private createStarFlowerMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    const stemHeight = 0.25 + stageRatio * 0.45;
    const stemGeom = new THREE.CylinderGeometry(0.015, 0.022, stemHeight, 6);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x2E7D32,
      roughness: 0.72,
      flatShading: false
    });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = stemHeight / 2;
    stem.castShadow = true;
    stem.userData.isStem = true;
    group.add(stem);
    
    if (stage >= 1) {
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x388E3C,
        roughness: 0.68,
        flatShading: false,
        side: THREE.DoubleSide
      });
      
      for (let side = 0; side < 2; side++) {
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(0.04, 0.02, 0.1, 0.06, 0.12, 0);
        leafShape.bezierCurveTo(0.1, -0.03, 0.04, -0.02, 0, 0);
        
        const leafGeom = new THREE.ExtrudeGeometry(leafShape, {
          depth: 0.006,
          bevelEnabled: true,
          bevelThickness: 0.001,
          bevelSize: 0.001,
          bevelSegments: 2
        });
        
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        const leafY = stemHeight * (0.4 + side * 0.35);
        leaf.position.set(
          side === 0 ? 0.06 : -0.06,
          leafY,
          0
        );
        leaf.rotation.z = side === 0 ? 0.62 : -0.62;
        leaf.rotation.y = 0.32;
        leaf.castShadow = true;
        group.add(leaf);
      }
    }
    
    if (stage >= 2) {
      const petalCount = 6;
      const petalShape = new THREE.Shape();
      petalShape.moveTo(0, 0);
      petalShape.bezierCurveTo(0.02, 0.04, 0.05, 0.1, 0.04, 0.14);
      petalShape.bezierCurveTo(0.03, 0.1, 0.02, 0.04, 0, 0);
      
      const petalGeom = new THREE.ExtrudeGeometry(petalShape, {
        depth: 0.008,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 3
      });
      
      for (let i = 0; i < petalCount; i++) {
        const petalMat = new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xFF6B9D : 0xFFB6C1,
          roughness: 0.32,
          flatShading: false,
          side: THREE.DoubleSide,
          emissive: 0xFF1493,
          emissiveIntensity: 0.18
        });
        
        const petal = new THREE.Mesh(petalGeom, petalMat);
        const angle = (i / petalCount) * Math.PI * 2;
        petal.position.set(
          Math.cos(angle) * 0.05,
          stemHeight + 0.04,
          Math.sin(angle) * 0.05
        );
        petal.rotation.y = angle + Math.PI / 2;
        petal.rotation.x = -0.42;
        petal.scale.setScalar(1.22 + stageRatio * 0.28);
        petal.castShadow = true;
        petal.userData.isPetal = true;
        group.add(petal);
      }
    }
    
    if (stage >= 3) {
      const centerGeom = new THREE.SphereGeometry(0.048, 12, 10);
      const centerMat = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        roughness: 0.22,
        metalness: 0.32,
        emissive: 0xFFA500,
        emissiveIntensity: 0.52
      });
      const center = new THREE.Mesh(centerGeom, centerMat);
      center.position.y = stemHeight + 0.05;
      center.castShadow = true;
      center.userData.isCenter = true;
      center.userData.phase = 0;
      group.add(center);
      
      for (let i = 0; i < 14; i++) {
        const sparkleGeom = new THREE.SphereGeometry(0.012 + Math.random() * 0.012, 4, 4);
        const sparkleMat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0xFFD700 : 0xFFFFFF,
          transparent: true,
          opacity: 0.72
        });
        const sparkle = new THREE.Mesh(sparkleGeom, sparkleMat);
        const sparkleAngle = (i / 14) * Math.PI * 2;
        const sparkleRadius = 0.1 + Math.random() * 0.12;
        sparkle.position.set(
          Math.cos(sparkleAngle) * sparkleRadius,
          stemHeight + 0.1 + Math.random() * 0.22,
          Math.sin(sparkleAngle) * sparkleRadius
        );
        sparkle.userData.isSparkle = true;
        sparkle.userData.phase = Math.random() * Math.PI * 2;
        group.add(sparkle);
      }
    }
  }

  private createMoonFruitMesh(group: THREE.Group, stage: number): void {
    const stageRatio = stage / 4;
    
    const stemHeight = 0.3 + stageRatio * 0.25;
    const stemGeom = new THREE.CylinderGeometry(0.018, 0.025, stemHeight, 6);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x5D6D7E,
      roughness: 0.68,
      flatShading: false
    });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = stemHeight / 2;
    stem.castShadow = true;
    stem.userData.isStem = true;
    group.add(stem);
    
    if (stage >= 1) {
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x78909C,
        roughness: 0.62,
        flatShading: false,
        side: THREE.DoubleSide
      });
      
      for (let i = 0; i < 5; i++) {
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(0.05, 0.02, 0.1, 0.05, 0.12, 0);
        leafShape.bezierCurveTo(0.1, -0.03, 0.05, -0.02, 0, 0);
        
        const leafGeom = new THREE.ExtrudeGeometry(leafShape, {
          depth: 0.006,
          bevelEnabled: true,
          bevelThickness: 0.001,
          bevelSize: 0.001,
          bevelSegments: 2
        });
        
        const leaf = new THREE.Mesh(leafGeom, leafMat);
        const angle = (i / 5) * Math.PI * 2 + Math.PI / 5;
        leaf.position.set(
          Math.cos(angle) * 0.07,
          stemHeight * (0.5 + i * 0.1),
          Math.sin(angle) * 0.07
        );
        leaf.rotation.y = angle;
        leaf.rotation.x = -0.42;
        leaf.castShadow = true;
        group.add(leaf);
      }
    }
    
    if (stage >= 2) {
      const fruitRadius = 0.12 + stageRatio * 0.04;
      const fruitGeom = new THREE.SphereGeometry(fruitRadius, 14, 12);
      fruitGeom.scale(1, 1.08, 1);
      
      const fruitMat = new THREE.MeshStandardMaterial({
        color: 0xE8E0F0,
        roughness: 0.22,
        metalness: 0.38,
        flatShading: false,
        emissive: 0xD8C8E8,
        emissiveIntensity: stage >= 3 ? 0.28 : 0.1
      });
      const fruit = new THREE.Mesh(fruitGeom, fruitMat);
      fruit.position.y = stemHeight + 0.08;
      fruit.castShadow = true;
      fruit.userData.isMoonFruit = true;
      group.add(fruit);
      
      const markGeom = new THREE.SphereGeometry(0.036, 8, 6);
      const markMat = new THREE.MeshStandardMaterial({
        color: 0xB8D4E8,
        roughness: 0.18,
        metalness: 0.52,
        emissive: 0x87CEEB,
        emissiveIntensity: 0.42
      });
      const mark = new THREE.Mesh(markGeom, markMat);
      mark.position.set(0.06, 0.08, 0.04);
      mark.scale.set(1.22, 0.78, 0.58);
      fruit.add(mark);
      
      const mark2Geom = new THREE.SphereGeometry(0.022, 6, 4);
      const mark2 = new THREE.Mesh(mark2Geom, markMat);
      mark2.position.set(-0.04, -0.05, 0.06);
      mark2.scale.set(0.82, 0.62, 0.52);
      fruit.add(mark2);
      
      const calyxGeom = new THREE.ConeGeometry(0.042, 0.032, 5);
      const calyxMat = new THREE.MeshStandardMaterial({
        color: 0x6D7B8D,
        roughness: 0.78
      });
      const calyx = new THREE.Mesh(calyxGeom, calyxMat);
      calyx.position.y = fruitRadius + 0.02;
      fruit.add(calyx);
      
      if (stage >= 3) {
        const glowGeom = new THREE.SphereGeometry(fruitRadius * 0.16, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xE0D0F0,
          transparent: true,
          opacity: 0.32
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.set(0, 0, -fruitRadius * 0.5);
        fruit.add(glow);
        
        for (let i = 0; i < 8; i++) {
          const sparkleGeom = new THREE.SphereGeometry(0.012, 4, 4);
          const sparkleMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.62
          });
          const sparkle = new THREE.Mesh(sparkleGeom, sparkleMat);
          const angle = (i / 8) * Math.PI * 2;
          sparkle.position.set(
            Math.cos(angle) * fruitRadius * 1.12,
            Math.sin(angle * 0.5) * fruitRadius * 0.52,
            Math.sin(angle) * fruitRadius * 1.12
          );
          sparkle.userData.isSparkle = true;
          sparkle.userData.phase = i * 0.5;
          fruit.add(sparkle);
        }
      }
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
