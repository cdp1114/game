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
    const geometry = new THREE.BoxGeometry(
      def.gridSize.w * this.gridSize * 0.8,
      1.5,
      def.gridSize.h * this.gridSize * 0.8
    );

    let color = 0xcccccc;
    switch (def.type) {
      case BuildingType.DECORATION: color = 0x88ccaa; break;
      case BuildingType.BASIC: color = 0xccaa88; break;
      case BuildingType.SPECIAL: color = 0xaa88cc; break;
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.3
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(placed.position.x, 0.75, placed.position.z);
    mesh.userData.isBuilding = true;
    mesh.userData.buildingId = placed.id;
    this.scene.add(mesh);
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
