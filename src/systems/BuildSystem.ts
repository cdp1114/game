// 建造系统 - 地形编辑、建筑/家具摆放

import * as THREE from 'three';
import { EventEmitter } from '../core/EventEmitter';
import { Vector3, BuildingType } from '../core/types';
import {
  BuildingDefinition,
  PlacedBuilding,
  TerrainGridCell,
  BuildSystemSaveData,
  TerrainTool
} from './BuildingTypes';

export class BuildSystem extends EventEmitter {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private buildingDefs: Map<string, BuildingDefinition> = new Map();
  private placedBuildings: Map<string, PlacedBuilding> = new Map();
  private terrainTools: Map<string, TerrainTool> = new Map();
  private grid: Map<string, TerrainGridCell> = new Map();
  private gridWidth: number = 40;
  private gridHeight: number = 40;
  private gridSize: number = 1;

  private selectedBuildingId: string | null = null;
  private selectedToolId: string | null = null;
  private previewMesh: THREE.Mesh | null = null;
  private isEditMode: boolean = false;

  private gridHelper: THREE.GridHelper | null = null;
  private highlightMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.initializeDefs();
    this.initializeTools();
    this.initializeGrid();
  }

  private initializeDefs(): void {
    const buildings: BuildingDefinition[] = [
      {
        id: 'windmill',
        name: '风车',
        type: BuildingType.DECORATION,
        description: '一座小型风车，随风转动',
        gridSize: { w: 2, h: 2 },
        cost: [{ itemId: 'stone', amount: 5 }, { itemId: 'wood', amount: 3 }],
        tags: ['decoration', 'outdoor']
      },
      {
        id: 'garden_bench',
        name: '花园长椅',
        type: BuildingType.DECORATION,
        description: '木质长椅，可以休息的地方',
        gridSize: { w: 2, h: 1 },
        cost: [{ itemId: 'wood', amount: 4 }],
        tags: ['decoration', 'outdoor', 'rest']
      },
      {
        id: 'stone_lamp',
        name: '石灯笼',
        type: BuildingType.DECORATION,
        description: '柔和的石灯，夜晚提供温暖光线',
        gridSize: { w: 1, h: 1 },
        cost: [{ itemId: 'stone', amount: 2 }, { itemId: 'star_crystal', amount: 1 }],
        tags: ['decoration', 'lighting']
      },
      {
        id: 'flower_bed',
        name: '花坛',
        type: BuildingType.DECORATION,
        description: '种植各种花卉的花坛',
        gridSize: { w: 2, h: 2 },
        cost: [{ itemId: 'wood', amount: 2 }, { itemId: 'soil', amount: 3 }],
        tags: ['decoration', 'garden']
      },
      {
        id: 'fence',
        name: '木栅栏',
        type: BuildingType.DECORATION,
        description: '可爱的木栅栏，用来圈地',
        gridSize: { w: 1, h: 1 },
        cost: [{ itemId: 'wood', amount: 2 }],
        tags: ['decoration', 'fence']
      },
      {
        id: 'storage_cabinet',
        name: '收纳柜',
        type: BuildingType.BASIC,
        description: '增加背包容量上限',
        gridSize: { w: 2, h: 1 },
        cost: [{ itemId: 'wood', amount: 6 }, { itemId: 'stone', amount: 2 }],
        tags: ['functional', 'storage']
      },
      {
        id: 'beast_house',
        name: '兽兽小屋',
        type: BuildingType.SPECIAL,
        description: '给兽兽们的小屋，提升亲密度获取速度',
        gridSize: { w: 3, h: 3 },
        cost: [{ itemId: 'wood', amount: 10 }, { itemId: 'stone', amount: 5 }, { itemId: 'star_crystal', amount: 3 }],
        tags: ['beast', 'special']
      },
      {
        id: 'greenhouse',
        name: '温室',
        type: BuildingType.SPECIAL,
        description: '加速附近农作物生长',
        gridSize: { w: 3, h: 3 },
        cost: [{ itemId: 'stone', amount: 8 }, { itemId: 'glass', amount: 5 }],
        tags: ['crop', 'special']
      },
      {
        id: 'fountain',
        name: '许愿池',
        type: BuildingType.SPECIAL,
        description: '美丽的喷泉，偶尔出现星雨',
        gridSize: { w: 3, h: 3 },
        cost: [{ itemId: 'stone', amount: 15 }, { itemId: 'star_crystal', amount: 5 }],
        tags: ['decoration', 'special']
      }
    ];

    buildings.forEach(def => this.buildingDefs.set(def.id, def));
  }

  private initializeTools(): void {
    const tools: TerrainTool[] = [
      {
        id: 'fill_tool',
        name: '填土',
        type: 'FILL',
        description: '填高地形',
        gridSize: 3,
        costPerUse: [{ itemId: 'soil', amount: 1 }]
      },
      {
        id: 'dig_tool',
        name: '挖掘',
        type: 'DIG',
        description: '挖低地形',
        gridSize: 3,
        costPerUse: []
      },
      {
        id: 'water_tool',
        name: '引水',
        type: 'WATER',
        description: '创造小型水池',
        gridSize: 2,
        costPerUse: [{ itemId: 'water_crystal', amount: 1 }]
      },
      {
        id: 'pave_tool',
        name: '铺路',
        type: 'PAVE',
        description: '铺设石板路',
        gridSize: 1,
        costPerUse: [{ itemId: 'stone', amount: 1 }]
      }
    ];

    tools.forEach(tool => this.terrainTools.set(tool.id, tool));
  }

  private initializeGrid(): void {
    for (let gx = 0; gx < this.gridWidth; gx++) {
      for (let gz = 0; gz < this.gridHeight; gz++) {
        const key = `${gx},${gz}`;
        this.grid.set(key, {
          position: { x: gx * this.gridSize, y: 0, z: gz * this.gridSize },
          gridX: gx,
          gridZ: gz,
          occupied: false,
          terrainHeight: 0
        });
      }
    }
  }

  public enterEditMode(): void {
    this.isEditMode = true;
    this.showGrid();
    this.emit('build:edit_mode_entered', { mode: 'build' });
  }

  public exitEditMode(): void {
    this.isEditMode = false;
    this.selectedBuildingId = null;
    this.selectedToolId = null;
    this.hidePreview();
    this.hideGrid();
    this.emit('build:edit_mode_exited', {});
  }

  public showGrid(): void {
    if (this.gridHelper) return;
    this.gridHelper = new THREE.GridHelper(
      Math.max(this.gridWidth, this.gridHeight) * this.gridSize,
      Math.max(this.gridWidth, this.gridHeight),
      0x88aacc,
      0x445566
    );
    this.gridHelper.position.y = 0.05;
    this.scene.add(this.gridHelper);
  }

  public hideGrid(): void {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper = null;
    }
  }

  public selectBuilding(buildingId: string): void {
    this.selectedBuildingId = buildingId;
    this.selectedToolId = null;
    this.emit('build:building_selected', { buildingId });
  }

  public selectTool(toolId: string): void {
    this.selectedToolId = toolId;
    this.selectedBuildingId = null;
    this.emit('build:tool_selected', { toolId });
  }

  public getToolName(toolId: string): string | undefined {
    const tool = this.terrainTools.get(toolId);
    return tool?.name;
  }

  public update(_deltaTime: number): void {
    if (!this.isEditMode) return;
    this.updatePreview();
  }

  private updatePreview(): void {
    if (!this.selectedBuildingId && !this.selectedToolId) {
      this.hidePreview();
      return;
    }

    if (this.selectedBuildingId) {
      this.updateBuildingPreview();
    } else if (this.selectedToolId) {
      this.updateToolPreview();
    }
  }

  private updateBuildingPreview(): void {
    const def = this.buildingDefs.get(this.selectedBuildingId!);
    if (!def) return;

    if (!this.previewMesh) {
      const geometry = new THREE.BoxGeometry(
        def.gridSize.w * this.gridSize,
        0.5,
        def.gridSize.h * this.gridSize
      );
      const material = new THREE.MeshBasicMaterial({
        color: 0x88bbff,
        transparent: true,
        opacity: 0.4,
        depthWrite: false
      });
      this.previewMesh = new THREE.Mesh(geometry, material);
      this.scene.add(this.previewMesh);
    }

    const pos = this.getMouseWorldPosition();
    if (pos) {
      this.previewMesh.position.set(pos.x, 0.25, pos.z);
      this.updateHighlightMesh(pos);
    }
  }

  private updateToolPreview(): void {
    const tool = this.terrainTools.get(this.selectedToolId!);
    if (!tool) return;

    if (!this.previewMesh) {
      const geometry = new THREE.BoxGeometry(
        tool.gridSize * this.gridSize,
        0.1,
        tool.gridSize * this.gridSize
      );
      const material = new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
      });
      this.previewMesh = new THREE.Mesh(geometry, material);
      this.scene.add(this.previewMesh);
    }

    const pos = this.getMouseWorldPosition();
    if (pos) {
      this.previewMesh.position.set(pos.x, 0.05, pos.z);
    }
  }

  private hidePreview(): void {
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh = null;
    }
  }

  private updateHighlightMesh(worldPos: Vector3): void {
    const { gridX, gridZ } = this.worldToGrid(worldPos.x, worldPos.z);
    const def = this.buildingDefs.get(this.selectedBuildingId!);
    if (!def) return;

    const valid = this.canPlaceBuilding(gridX, gridZ, def);

    if (!this.highlightMesh) {
      const geometry = new THREE.PlaneGeometry(
        def.gridSize.w * this.gridSize,
        def.gridSize.h * this.gridSize
      );
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      this.highlightMesh = new THREE.Mesh(geometry, material);
      this.highlightMesh.rotation.x = -Math.PI / 2;
      this.highlightMesh.position.y = 0.03;
      this.scene.add(this.highlightMesh);
    }

    const centerX = (gridX + def.gridSize.w / 2) * this.gridSize;
    const centerZ = (gridZ + def.gridSize.h / 2) * this.gridSize;

    this.highlightMesh.position.x = centerX;
    this.highlightMesh.position.z = centerZ;
    (this.highlightMesh.material as THREE.MeshBasicMaterial).color.set(
      valid ? 0x44ff44 : 0xff4444
    );
  }

  private canPlaceBuilding(gridX: number, gridZ: number, def: BuildingDefinition): boolean {
    for (let dx = 0; dx < def.gridSize.w; dx++) {
      for (let dz = 0; dz < def.gridSize.h; dz++) {
        const cx = gridX + dx;
        const cz = gridZ + dz;
        if (cx < 0 || cx >= this.gridWidth || cz < 0 || cz >= this.gridHeight) {
          return false;
        }
        const cell = this.grid.get(`${cx},${cz}`);
        if (cell && cell.occupied) return false;
      }
    }
    return true;
  }

  public placeBuilding(worldPos: Vector3): string | null {
    if (!this.selectedBuildingId) return null;
    const def = this.buildingDefs.get(this.selectedBuildingId);
    if (!def) return null;

    const { gridX, gridZ } = this.worldToGrid(worldPos.x, worldPos.z);

    if (!this.canPlaceBuilding(gridX, gridZ, def)) {
      this.emit('build:place_failed', { reason: 'invalid_position' });
      return null;
    }

    for (let dx = 0; dx < def.gridSize.w; dx++) {
      for (let dz = 0; dz < def.gridSize.h; dz++) {
        const cell = this.grid.get(`${gridX + dx},${gridZ + dz}`);
        if (cell) cell.occupied = true;
      }
    }

    const instanceId = `${def.id}_${Date.now()}`;
    const centerX = (gridX + def.gridSize.w / 2) * this.gridSize;
    const centerZ = (gridZ + def.gridSize.h / 2) * this.gridSize;

    const placed: PlacedBuilding = {
      id: instanceId,
      buildingId: def.id,
      position: { x: centerX, y: 0, z: centerZ },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      placedTime: Date.now()
    };

    this.placedBuildings.set(instanceId, placed);

    this.createBuildingMesh(placed, def);
    this.emit('build:building_placed', { building: placed });
    return instanceId;
  }

  private createBuildingMesh(placed: PlacedBuilding, def: BuildingDefinition): void {
    let mesh: THREE.Group;

    switch (def.id) {
      case 'windmill':
        mesh = this.createWindmillMesh(def);
        break;
      case 'garden_bench':
        mesh = this.createGardenBenchMesh(def);
        break;
      case 'stone_lamp':
        mesh = this.createStoneLampMesh(def);
        break;
      case 'flower_bed':
        mesh = this.createFlowerBedMesh(def);
        break;
      case 'fence':
        mesh = this.createFenceMesh(def);
        break;
      case 'storage_cabinet':
        mesh = this.createStorageCabinetMesh(def);
        break;
      case 'beast_house':
        mesh = this.createBeastHouseMesh(def);
        break;
      case 'greenhouse':
        mesh = this.createGreenhouseMesh(def);
        break;
      case 'fountain':
        mesh = this.createFountainMesh(def);
        break;
      default:
        mesh = this.createGenericBuildingMesh(def);
    }

    mesh.position.set(placed.position.x, 0, placed.position.z);
    mesh.userData.isBuilding = true;
    mesh.userData.buildingId = placed.id;
    mesh.userData.buildingDefId = def.id;
    this.scene.add(mesh);
  }

  private createWindmillMesh(_def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    const baseGeometry = new THREE.CylinderGeometry(0.6, 0.8, 2.5, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xD4C4A8, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 1.25;
    base.castShadow = true;
    group.add(base);

    const roofGeometry = new THREE.ConeGeometry(0.7, 0.6, 8);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 2.8;
    roof.castShadow = true;
    group.add(roof);

    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(0, 2.2, 0.55);

    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xF5F5DC, roughness: 0.7 });
    for (let i = 0; i < 4; i++) {
      const bladeGeometry = new THREE.BoxGeometry(0.15, 1.2, 0.05);
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.position.y = 0.6;
      blade.rotation.z = (i * Math.PI) / 2;
      blade.castShadow = true;
      bladeGroup.add(blade);
    }

    const hubGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const hubMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.5 });
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    bladeGroup.add(hub);

    bladeGroup.userData.isWindmillBlade = true;
    group.add(bladeGroup);

    const doorGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.1);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0.5, 0.71);
    group.add(door);

    return group;
  }

  private createGardenBenchMesh(_def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    const seatGeometry = new THREE.BoxGeometry(1.6, 0.1, 0.5);
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const seat = new THREE.Mesh(seatGeometry, woodMaterial);
    seat.position.y = 0.5;
    seat.castShadow = true;
    group.add(seat);

    for (let i = -1; i <= 1; i += 2) {
      const legGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.4);
      const leg = new THREE.Mesh(legGeometry, woodMaterial);
      leg.position.set(i * 0.65, 0.25, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    const backGeometry = new THREE.BoxGeometry(1.6, 0.5, 0.08);
    const back = new THREE.Mesh(backGeometry, woodMaterial);
    back.position.set(0, 0.85, -0.2);
    back.rotation.x = 0.1;
    back.castShadow = true;
    group.add(back);

    return group;
  }

  private createStoneLampMesh(_def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    const pillarGeometry = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 6);
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
    const pillar = new THREE.Mesh(pillarGeometry, stoneMaterial);
    pillar.position.y = 0.6;
    pillar.castShadow = true;
    group.add(pillar);

    const lampGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const lampMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFAA,
      emissive: 0xFFAA00,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8
    });
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
    lamp.position.y = 1.35;
    lamp.userData.isLamp = true;
    group.add(lamp);

    const roofGeometry = new THREE.ConeGeometry(0.3, 0.3, 6);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.8 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 1.6;
    roof.castShadow = true;
    group.add(roof);

    return group;
  }

  private createFlowerBedMesh(_def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    const bedGeometry = new THREE.BoxGeometry(1.6, 0.4, 1.6);
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const bed = new THREE.Mesh(bedGeometry, woodMaterial);
    bed.position.y = 0.2;
    bed.castShadow = true;
    group.add(bed);

    const soilGeometry = new THREE.BoxGeometry(1.4, 0.25, 1.4);
    const soilMaterial = new THREE.MeshStandardMaterial({ color: 0x3D2B1F, roughness: 1 });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.y = 0.4;
    group.add(soil);

    const colors = [0xFF6B6B, 0xFFE66D, 0x4ECDC4, 0xFF8C42, 0x9B59B6];
    for (let i = 0; i < 8; i++) {
      const flowerGroup = new THREE.Group();

      const stemGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.3, 4);
      const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.y = 0.15;
      flowerGroup.add(stem);

      const petalGeometry = new THREE.SphereGeometry(0.08, 6, 4);
      const petalMaterial = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.5
      });
      const petal = new THREE.Mesh(petalGeometry, petalMaterial);
      petal.position.y = 0.35;
      flowerGroup.add(petal);

      flowerGroup.position.set(
        (Math.random() - 0.5) * 1.2,
        0.45,
        (Math.random() - 0.5) * 1.2
      );
      flowerGroup.userData.isFlower = true;
      group.add(flowerGroup);
    }

    return group;
  }

  private createFenceMesh(_def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    const postGeometry = new THREE.BoxGeometry(0.08, 0.8, 0.08);
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const post = new THREE.Mesh(postGeometry, woodMaterial);
    post.position.y = 0.4;
    post.castShadow = true;
    group.add(post);

    const capGeometry = new THREE.ConeGeometry(0.06, 0.15, 4);
    const cap = new THREE.Mesh(capGeometry, woodMaterial);
    cap.position.y = 0.88;
    cap.rotation.y = Math.PI / 4;
    group.add(cap);

    const railGeometry = new THREE.BoxGeometry(0.9, 0.08, 0.05);
    const rail1 = new THREE.Mesh(railGeometry, woodMaterial);
    rail1.position.set(0, 0.3, 0);
    group.add(rail1);

    const rail2 = new THREE.Mesh(railGeometry, woodMaterial);
    rail2.position.set(0, 0.6, 0);
    group.add(rail2);

    return group;
  }

  private createStorageCabinetMesh(_def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(1.6, 1.2, 0.5);
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0xDEB887, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeometry, woodMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xB8860B, metalness: 0.8, roughness: 0.3 });

    for (let i = -1; i <= 1; i += 2) {
      const doorGeometry = new THREE.BoxGeometry(0.48, 1.0, 0.05);
      const door = new THREE.Mesh(doorGeometry, woodMaterial);
      door.position.set(i * 0.52, 0.6, 0.26);
      group.add(door);

      const handleGeometry = new THREE.BoxGeometry(0.04, 0.15, 0.04);
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.set(i * 0.42, 0.6, 0.3);
      group.add(handle);
    }

    const topGeometry = new THREE.BoxGeometry(1.7, 0.08, 0.55);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D, roughness: 0.6 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 1.24;
    top.castShadow = true;
    group.add(top);

    return group;
  }

  private createBeastHouseMesh(_def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    const baseGeometry = new THREE.BoxGeometry(2.4, 0.3, 2.4);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    base.castShadow = true;
    group.add(base);

    const houseGeometry = new THREE.BoxGeometry(2, 1.8, 2);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xF5DEB3, roughness: 0.9 });
    const house = new THREE.Mesh(houseGeometry, wallMaterial);
    house.position.y = 1.2;
    house.castShadow = true;
    group.add(house);

    const roofGeometry = new THREE.BoxGeometry(2.3, 0.2, 2.3);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xCD853F, roughness: 0.7 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 2.15;
    roof.castShadow = true;
    group.add(roof);

    const peakGeometry = new THREE.ConeGeometry(0.15, 0.5, 4);
    const peak = new THREE.Mesh(peakGeometry, roofMaterial);
    peak.position.y = 2.5;
    peak.rotation.y = Math.PI / 4;
    group.add(peak);

    const doorGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.1);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0.65, 1.05);
    group.add(door);

    const windowGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.6
    });
    for (let i = -1; i <= 1; i += 2) {
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(i * 0.7, 1.5, 1.05);
      group.add(window);
    }

    return group;
  }

  private createGreenhouseMesh(_def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    const baseGeometry = new THREE.BoxGeometry(2.4, 0.2, 2.4);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.1;
    base.castShadow = true;
    group.add(base);

    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x2F4F4F, metalness: 0.5, roughness: 0.5 });

    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 6);
      const pole = new THREE.Mesh(poleGeometry, frameMaterial);
      pole.position.set(Math.cos(angle) * 1, 1.2, Math.sin(angle) * 1);
      pole.castShadow = true;
      group.add(pole);
    }

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x98FB98,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    const roofGeometry = new THREE.BoxGeometry(2.2, 1.8, 2.2);
    const roof = new THREE.Mesh(roofGeometry, glassMaterial);
    roof.position.y = 1.2;
    group.add(roof);

    const topFrameGeometry = new THREE.BoxGeometry(2.4, 0.1, 2.4);
    const topFrame = new THREE.Mesh(topFrameGeometry, frameMaterial);
    topFrame.position.y = 2.15;
    group.add(topFrame);

    for (let i = -1; i <= 1; i += 2) {
      const sideGeometry = new THREE.BoxGeometry(0.1, 1.5, 2.2);
      const side = new THREE.Mesh(sideGeometry, frameMaterial);
      side.position.set(i * 1.1, 1.0, 0);
      group.add(side);
    }

    return group;
  }

  private createFountainMesh(_def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    const baseGeometry = new THREE.CylinderGeometry(2, 2.3, 0.4, 16);
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeometry, stoneMaterial);
    base.position.y = 0.2;
    base.castShadow = true;
    group.add(base);

    const poolGeometry = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 16);
    const poolMaterial = new THREE.MeshStandardMaterial({ color: 0x4169E1, transparent: true, opacity: 0.7 });
    const pool = new THREE.Mesh(poolGeometry, poolMaterial);
    pool.position.y = 0.35;
    group.add(pool);

    const pillarGeometry = new THREE.CylinderGeometry(0.2, 0.25, 1.5, 8);
    const pillar = new THREE.Mesh(pillarGeometry, stoneMaterial);
    pillar.position.y = 1.0;
    pillar.castShadow = true;
    group.add(pillar);

    const topGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.3
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 1.85;
    top.userData.isFountainTop = true;
    group.add(top);

    return group;
  }

  private createGenericBuildingMesh(def: BuildingDefinition): THREE.Group {
    const group = new THREE.Group();

    let color = 0xcccccc;
    switch (def.type) {
      case BuildingType.DECORATION: color = 0x88ccaa; break;
      case BuildingType.BASIC: color = 0xccaa88; break;
      case BuildingType.SPECIAL: color = 0xaa88cc; break;
    }

    const geometry = new THREE.BoxGeometry(
      def.gridSize.w * this.gridSize * 0.8,
      1.5,
      def.gridSize.h * this.gridSize * 0.8
    );
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.3 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.75;
    mesh.castShadow = true;
    group.add(mesh);

    return group;
  }

  public animateBuildings(time: number): void {
    this.scene.traverse((object) => {
      if (object.userData.isWindmillBlade) {
        object.rotation.z = time * 0.5;
      }
      if (object.userData.isLamp) {
        const mesh = object as THREE.Mesh;
        if (mesh.material && 'emissiveIntensity' in mesh.material) {
          const material = mesh.material as THREE.MeshStandardMaterial;
          material.emissiveIntensity = 0.4 + Math.sin(time * 2) * 0.2;
        }
      }
      if (object.userData.isFountainTop) {
        object.rotation.y = time * 0.3;
      }
    });
  }

  public removeBuilding(instanceId: string): boolean {
    const placed = this.placedBuildings.get(instanceId);
    if (!placed) return false;

    const def = this.buildingDefs.get(placed.buildingId);
    if (def) {
      const { gridX, gridZ } = this.worldToGrid(placed.position.x, placed.position.z);
      for (let dx = 0; dx < def.gridSize.w; dx++) {
        for (let dz = 0; dz < def.gridSize.h; dz++) {
          const cell = this.grid.get(`${gridX + dx},${gridZ + dz}`);
          if (cell) cell.occupied = false;
        }
      }
    }

    this.scene.traverse((object) => {
      if (object.userData.buildingId === instanceId) {
        this.scene.remove(object);
      }
    });

    this.placedBuildings.delete(instanceId);
    this.emit('build:building_removed', { instanceId });
    return true;
  }

  public useTerrainTool(worldPos: Vector3): boolean {
    if (!this.selectedToolId) return false;
    const tool = this.terrainTools.get(this.selectedToolId);
    if (!tool) return false;

    const { gridX, gridZ } = this.worldToGrid(worldPos.x, worldPos.z);
    const radius = Math.floor(tool.gridSize / 2);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = gridX + dx;
        const cz = gridZ + dz;
        if (cx < 0 || cx >= this.gridWidth || cz < 0 || cz >= this.gridHeight) continue;

        const cell = this.grid.get(`${cx},${cz}`);
        if (cell) {
          switch (tool.type) {
            case 'FILL':
              cell.terrainHeight += 0.5;
              break;
            case 'DIG':
              cell.terrainHeight = Math.max(-2, cell.terrainHeight - 0.5);
              break;
            case 'WATER':
              cell.terrainHeight = -0.5;
              break;
            case 'PAVE':
              cell.terrainHeight = Math.max(cell.terrainHeight, 0.05);
              break;
          }
        }
      }
    }

    this.updateTerrainMesh();
    this.emit('build:terrain_modified', { toolId: tool.id, position: worldPos });
    return true;
  }

  private terrainMesh: THREE.Mesh | null = null;

  private updateTerrainMesh(): void {
    const totalWidth = this.gridWidth * this.gridSize;
    const totalHeight = this.gridHeight * this.gridSize;
    const geometry = new THREE.PlaneGeometry(totalWidth, totalHeight, this.gridWidth, this.gridHeight);

    const positions = geometry.attributes.position;
    for (let gx = 0; gx < this.gridWidth; gx++) {
      for (let gz = 0; gz < this.gridHeight; gz++) {
        const vertexIndex = (gz * (this.gridWidth + 1) + gx);
        const cell = this.grid.get(`${gx},${gz}`);
        if (cell && cell.terrainHeight !== 0) {
          positions.setZ(vertexIndex, cell.terrainHeight);
        }
      }
    }
    geometry.computeVertexNormals();

    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x88aa66,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.rotation.x = -Math.PI / 2;
    this.terrainMesh.position.set(totalWidth / 2, 0, totalHeight / 2);
    this.terrainMesh.userData.isTerrain = true;
    this.scene.add(this.terrainMesh);
  }

  private getMouseWorldPosition(): Vector3 | null {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.ray.intersectPlane(plane, intersection);

    if (hit) {
      return { x: intersection.x, y: 0, z: intersection.z };
    }
    return null;
  }

  private worldToGrid(worldX: number, worldZ: number): { gridX: number; gridZ: number } {
    const gridX = Math.floor(worldX / this.gridSize);
    const gridZ = Math.floor(worldZ / this.gridSize);
    return { gridX, gridZ };
  }

  public getBuildingDefinitions(): BuildingDefinition[] {
    return Array.from(this.buildingDefs.values());
  }

  public getTerrainTools(): TerrainTool[] {
    return Array.from(this.terrainTools.values());
  }

  public getPlacedBuildings(): PlacedBuilding[] {
    return Array.from(this.placedBuildings.values());
  }

  public isBuildEditMode(): boolean {
    return this.isEditMode;
  }

  public getSelectedBuilding(): string | null {
    return this.selectedBuildingId;
  }

  public getSelectedTool(): string | null {
    return this.selectedToolId;
  }

  public save(): BuildSystemSaveData {
    return {
      placedBuildings: this.getPlacedBuildings(),
      terrainModifications: []
    };
  }

  public load(data: BuildSystemSaveData): void {
    this.placedBuildings.clear();
    this.grid.forEach(cell => {
      cell.occupied = false;
      cell.terrainHeight = 0;
    });

    data.placedBuildings.forEach(placed => {
      this.placedBuildings.set(placed.id, placed);
      const def = this.buildingDefs.get(placed.buildingId);
      if (def) {
        const { gridX, gridZ } = this.worldToGrid(placed.position.x, placed.position.z);
        for (let dx = 0; dx < def.gridSize.w; dx++) {
          for (let dz = 0; dz < def.gridSize.h; dz++) {
            const cell = this.grid.get(`${gridX + dx},${gridZ + dz}`);
            if (cell) cell.occupied = true;
          }
        }
        this.createBuildingMesh(placed, def);
      }
    });
  }

  public getGridDimensions(): { width: number; height: number } {
    return { width: this.gridWidth, height: this.gridHeight };
  }

  public getGridCell(gridX: number, gridZ: number): TerrainGridCell | undefined {
    return this.grid.get(`${gridX},${gridZ}`);
  }
}
