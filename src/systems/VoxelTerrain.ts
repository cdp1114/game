import * as THREE from 'three';
import { EventEmitter } from '../core/EventEmitter';

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  SAND = 6,
  WATER = 7,
  COBBLESTONE = 8,
  PLANKS = 9,
  BRICK = 10,
  GLASS = 11,
  WOOL = 12,
  SNOW = 13,
  GRAVEL = 14,
  COAL_ORE = 15,
  IRON_ORE = 16,
  GOLD_ORE = 17,
  DIAMOND_ORE = 18,
  BEDROCK = 19,
  CRAFTING_TABLE = 20,
  FURNACE = 21,
  CHEST = 22,
  TORCH = 23,
  SAPLING = 24,
  CROP_WHEAT = 25,
  CROP_CARROT = 26,
  CROP_POTATO = 27
}

export interface BlockData {
  type: BlockType;
  name: string;
  color: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  solid: boolean;
  breakable: boolean;
  tool?: string;
  drops?: { type: BlockType; amount: number }[];
}

export interface VoxelPosition {
  x: number;
  y: number;
  z: number;
}

export class VoxelTerrain extends EventEmitter {
  private scene: THREE.Scene;
  private chunkSize: number = 16;
  private worldSize: number = 4;
  private blocks: Map<string, BlockType> = new Map();
  private blockMeshes: Map<string, THREE.Mesh> = new Map();
  private chunkMeshes: Map<string, THREE.Group> = new Map();
  
  private blockGeometry: THREE.BoxGeometry;
  private blockMaterials: Map<BlockType, THREE.Material | THREE.Material[]> = new Map();
  private blockData: Map<BlockType, BlockData>;
  
  private maxHeight: number = 64;
  
  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.blockData = this.initializeBlockData();
    this.initializeMaterials();
    this.generateWorld();
  }

  private initializeBlockData(): Map<BlockType, BlockData> {
    const data = new Map<BlockType, BlockData>();
    
    data.set(BlockType.AIR, { type: BlockType.AIR, name: '空气', color: 0x000000, solid: false, breakable: false });
    data.set(BlockType.GRASS, { 
      type: BlockType.GRASS, name: '草方块', color: 0x7CBA5D, solid: true, breakable: true, 
      tool: 'shovel', drops: [{ type: BlockType.DIRT, amount: 1 }]
    });
    data.set(BlockType.DIRT, { 
      type: BlockType.DIRT, name: '泥土', color: 0x8B5A2B, solid: true, breakable: true, 
      tool: 'shovel', drops: [{ type: BlockType.DIRT, amount: 1 }]
    });
    data.set(BlockType.STONE, { 
      type: BlockType.STONE, name: '石头', color: 0x808080, solid: true, breakable: true, 
      tool: 'pickaxe', drops: [{ type: BlockType.COBBLESTONE, amount: 1 }]
    });
    data.set(BlockType.WOOD, { 
      type: BlockType.WOOD, name: '木头', color: 0x8B4513, solid: true, breakable: true, 
      tool: 'axe', drops: [{ type: BlockType.WOOD, amount: 1 }]
    });
    data.set(BlockType.LEAVES, { 
      type: BlockType.LEAVES, name: '树叶', color: 0x228B22, solid: true, breakable: true, 
      drops: [{ type: BlockType.SAPLING, amount: 0 }]
    });
    data.set(BlockType.SAND, { 
      type: BlockType.SAND, name: '沙子', color: 0xF4D03F, solid: true, breakable: true, 
      tool: 'shovel', drops: [{ type: BlockType.SAND, amount: 1 }]
    });
    data.set(BlockType.WATER, { 
      type: BlockType.WATER, name: '水', color: 0x3498DB, solid: false, breakable: false, transparent: true 
    });
    data.set(BlockType.COBBLESTONE, { 
      type: BlockType.COBBLESTONE, name: '圆石', color: 0x6B6B6B, solid: true, breakable: true, 
      tool: 'pickaxe', drops: [{ type: BlockType.COBBLESTONE, amount: 1 }]
    });
    data.set(BlockType.PLANKS, { 
      type: BlockType.PLANKS, name: '木板', color: 0xDEB887, solid: true, breakable: true, 
      tool: 'axe', drops: [{ type: BlockType.PLANKS, amount: 1 }]
    });
    data.set(BlockType.BRICK, { 
      type: BlockType.BRICK, name: '砖块', color: 0xB22222, solid: true, breakable: true, 
      tool: 'pickaxe', drops: [{ type: BlockType.BRICK, amount: 1 }]
    });
    data.set(BlockType.GLASS, { 
      type: BlockType.GLASS, name: '玻璃', color: 0xADD8E6, solid: true, breakable: true, 
      transparent: true, drops: []
    });
    data.set(BlockType.WOOL, { 
      type: BlockType.WOOL, name: '羊毛', color: 0xFFFFFF, solid: true, breakable: true, 
      drops: [{ type: BlockType.WOOL, amount: 1 }]
    });
    data.set(BlockType.SNOW, { 
      type: BlockType.SNOW, name: '雪', color: 0xFFFAFA, solid: true, breakable: true, 
      tool: 'shovel', drops: [{ type: BlockType.SNOW, amount: 1 }]
    });
    data.set(BlockType.GRAVEL, { 
      type: BlockType.GRAVEL, name: '砂砾', color: 0xA9A9A9, solid: true, breakable: true, 
      drops: [{ type: BlockType.GRAVEL, amount: 1 }]
    });
    data.set(BlockType.COAL_ORE, { 
      type: BlockType.COAL_ORE, name: '煤矿', color: 0x363636, solid: true, breakable: true, 
      tool: 'pickaxe', drops: [{ type: BlockType.COAL_ORE, amount: 1 }]
    });
    data.set(BlockType.IRON_ORE, { 
      type: BlockType.IRON_ORE, name: '铁矿', color: 0xD2691E, solid: true, breakable: true, 
      tool: 'pickaxe', drops: [{ type: BlockType.IRON_ORE, amount: 1 }]
    });
    data.set(BlockType.GOLD_ORE, { 
      type: BlockType.GOLD_ORE, name: '金矿', color: 0xFFD700, solid: true, breakable: true, 
      tool: 'pickaxe', drops: [{ type: BlockType.GOLD_ORE, amount: 1 }]
    });
    data.set(BlockType.DIAMOND_ORE, { 
      type: BlockType.DIAMOND_ORE, name: '钻石矿', color: 0x00FFFF, emissive: 0x00FFFF, emissiveIntensity: 0.3, solid: true, breakable: true, 
      tool: 'pickaxe', drops: [{ type: BlockType.DIAMOND_ORE, amount: 1 }]
    });
    data.set(BlockType.BEDROCK, { 
      type: BlockType.BEDROCK, name: '基岩', color: 0x1a1a1a, solid: true, breakable: false 
    });
    data.set(BlockType.CRAFTING_TABLE, { 
      type: BlockType.CRAFTING_TABLE, name: '工作台', color: 0xCD853F, solid: true, breakable: true, 
      tool: 'axe', drops: [{ type: BlockType.CRAFTING_TABLE, amount: 1 }]
    });
    data.set(BlockType.FURNACE, { 
      type: BlockType.FURNACE, name: '熔炉', color: 0x696969, solid: true, breakable: true, 
      tool: 'pickaxe', drops: [{ type: BlockType.FURNACE, amount: 1 }]
    });
    data.set(BlockType.CHEST, { 
      type: BlockType.CHEST, name: '箱子', color: 0xDAA520, solid: true, breakable: true, 
      tool: 'axe', drops: [{ type: BlockType.CHEST, amount: 1 }]
    });
    data.set(BlockType.TORCH, { 
      type: BlockType.TORCH, name: '火把', color: 0xFFA500, emissive: 0xFFA500, emissiveIntensity: 0.8, solid: false, breakable: true, 
      drops: [{ type: BlockType.TORCH, amount: 1 }]
    });
    data.set(BlockType.SAPLING, { 
      type: BlockType.SAPLING, name: '树苗', color: 0x228B22, solid: false, breakable: true, 
      drops: [{ type: BlockType.SAPLING, amount: 1 }]
    });
    data.set(BlockType.CROP_WHEAT, { 
      type: BlockType.CROP_WHEAT, name: '小麦', color: 0xDAA520, solid: false, breakable: true, 
      drops: [{ type: BlockType.CROP_WHEAT, amount: 1 }]
    });
    data.set(BlockType.CROP_CARROT, { 
      type: BlockType.CROP_CARROT, name: '胡萝卜', color: 0xFF8C00, solid: false, breakable: true, 
      drops: [{ type: BlockType.CROP_CARROT, amount: 1 }]
    });
    data.set(BlockType.CROP_POTATO, { 
      type: BlockType.CROP_POTATO, name: '土豆', color: 0xD2B48C, solid: false, breakable: true, 
      drops: [{ type: BlockType.CROP_POTATO, amount: 1 }]
    });
    
    return data;
  }

  private initializeMaterials(): void {
    this.blockData.forEach((data, type) => {
      if (data.emissive) {
        const material = new THREE.MeshStandardMaterial({
          color: data.color,
          emissive: data.emissive,
          emissiveIntensity: data.emissiveIntensity || 0,
          transparent: data.transparent || false,
          opacity: data.transparent ? 0.7 : 1,
          roughness: 0.8
        });
        this.blockMaterials.set(type, material);
      } else if (data.transparent) {
        const material = new THREE.MeshStandardMaterial({
          color: data.color,
          transparent: true,
          opacity: 0.5,
          roughness: 0.3
        });
        this.blockMaterials.set(type, material);
      } else {
        const material = new THREE.MeshStandardMaterial({
          color: data.color,
          roughness: 0.8
        });
        this.blockMaterials.set(type, material);
      }
    });
  }

  private generateWorld(): void {
    console.log('🗺️ 开始生成体素世界...');
    
    const totalSize = this.chunkSize * this.worldSize;
    
    for (let x = 0; x < totalSize; x++) {
      for (let z = 0; z < totalSize; z++) {
        const height = this.generateHeight(x, z);
        
        for (let y = 0; y < height; y++) {
          let blockType: BlockType;
          
          if (y === 0) {
            blockType = BlockType.BEDROCK;
          } else if (y < height - 4) {
            blockType = this.getOreBlock(x, y, z);
          } else if (y < height - 1) {
            blockType = BlockType.DIRT;
          } else {
            blockType = BlockType.GRASS;
          }
          
          this.setBlock(x, y, z, blockType);
        }
        
        if (height < 10 && Math.random() < 0.3) {
          this.setBlock(x, height, z, BlockType.WATER);
        }
        
        if (Math.random() < 0.02 && height >= 5) {
          this.generateTree(x, height + 1, z);
        }
      }
    }
    
    this.buildAllChunks();
    console.log('✅ 体素世界生成完成！');
  }

  private generateHeight(x: number, z: number): number {
    const scale1 = 0.05;
    const scale2 = 0.1;
    const scale3 = 0.02;
    
    const noise1 = Math.sin(x * scale1) * Math.cos(z * scale1) * 10;
    const noise2 = Math.sin(x * scale2 + 1) * Math.cos(z * scale2 + 1) * 5;
    const noise3 = Math.sin(x * scale3 + 2) * Math.cos(z * scale3 + 2) * 8;
    
    return Math.floor(10 + noise1 + noise2 + noise3);
  }

  private getOreBlock(x: number, y: number, z: number): BlockType {
    const seed = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
    const rand = Math.abs(seed % 1000) / 1000;
    
    if (y <= 16 && rand < 0.01) return BlockType.DIAMOND_ORE;
    if (y <= 32 && rand < 0.02) return BlockType.GOLD_ORE;
    if (y <= 64 && rand < 0.03) return BlockType.IRON_ORE;
    if (y <= 128 && rand < 0.05) return BlockType.COAL_ORE;
    if (rand < 0.1) return BlockType.GRAVEL;
    
    return BlockType.STONE;
  }

  private generateTree(x: number, y: number, z: number): void {
    const trunkHeight = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < trunkHeight; i++) {
      this.setBlock(x, y + i, z, BlockType.WOOD);
    }
    
    const leafStart = y + trunkHeight - 2;
    for (let ly = 0; ly < 4; ly++) {
      const radius = ly < 2 ? 2 : 1;
      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          if (lx === 0 && lz === 0 && ly < 2) continue;
          if (Math.random() < 0.8) {
            this.setBlock(x + lx, leafStart + ly, z + lz, BlockType.LEAVES);
          }
        }
      }
    }
  }

  private key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    return this.blocks.get(this.key(x, y, z)) || BlockType.AIR;
  }

  public setBlock(x: number, y: number, z: number, type: BlockType): void {
    const k = this.key(x, y, z);
    
    if (type === BlockType.AIR) {
      this.blocks.delete(k);
      const existingMesh = this.blockMeshes.get(k);
      if (existingMesh) {
        this.scene.remove(existingMesh);
        this.blockMeshes.delete(k);
      }
    } else {
      this.blocks.set(k, type);
    }
  }

  public placeBlock(x: number, y: number, z: number, type: BlockType): boolean {
    if (y < 0 || y >= this.maxHeight) return false;
    if (this.getBlock(x, y, z) !== BlockType.AIR) return false;
    
    this.setBlock(x, y, z, type);
    this.updateChunkAt(x, z);
    
    this.emit('blockPlaced', { x, y, z, type });
    return true;
  }

  public breakBlock(x: number, y: number, z: number): { type: BlockType; amount: number }[] | null {
    const blockType = this.getBlock(x, y, z);
    if (blockType === BlockType.AIR) return null;
    
    const data = this.blockData.get(blockType);
    if (!data || !data.breakable) return null;
    
    const drops = data.drops ? [...data.drops] : [];
    
    this.setBlock(x, y, z, BlockType.AIR);
    this.updateChunkAt(x, z);
    
    this.emit('blockBroken', { x, y, z, type: blockType, drops });
    return drops;
  }

  public getBlockData(type: BlockType): BlockData | undefined {
    return this.blockData.get(type);
  }

  public getAllBlockTypes(): BlockType[] {
    return Array.from(this.blockData.keys()).filter(t => t !== BlockType.AIR);
  }

  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 6): { hit: boolean; position: VoxelPosition | null; normal: THREE.Vector3 | null; block: VoxelPosition | null } {
    const step = 0.05;
    const pos = origin.clone();
    const normal = new THREE.Vector3();
    let lastAir: VoxelPosition | null = null;
    
    for (let d = 0; d < maxDistance; d += step) {
      pos.addScaledVector(direction, step);
      
      const bx = Math.floor(pos.x);
      const by = Math.floor(pos.y);
      const bz = Math.floor(pos.z);
      
      const block = this.getBlock(bx, by, bz);
      const data = this.blockData.get(block);
      
      if (block !== BlockType.AIR && data?.solid) {
        return {
          hit: true,
          position: { x: bx, y: by, z: bz },
          normal: normal.clone(),
          block: lastAir
        };
      }
      
      if (block === BlockType.AIR) {
        lastAir = { x: bx, y: by, z: bz };
      }
      
      normal.set(
        Math.floor(pos.x) - bx,
        Math.floor(pos.y) - by,
        Math.floor(pos.z) - bz
      ).normalize();
    }
    
    return { hit: false, position: null, normal: null, block: null };
  }

  private buildAllChunks(): void {
    for (let cx = 0; cx < this.worldSize; cx++) {
      for (let cz = 0; cz < this.worldSize; cz++) {
        this.buildChunk(cx, cz);
      }
    }
  }

  private buildChunk(chunkX: number, chunkZ: number): void {
    const group = new THREE.Group();
    group.name = `chunk_${chunkX}_${chunkZ}`;
    
    const startX = chunkX * this.chunkSize;
    const startZ = chunkZ * this.chunkSize;
    
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    
    let vertexIndex = 0;
    
    for (let x = startX; x < startX + this.chunkSize; x++) {
      for (let z = startZ; z < startZ + this.chunkSize; z++) {
        for (let y = 0; y < this.maxHeight; y++) {
          const block = this.getBlock(x, y, z);
          if (block === BlockType.AIR) continue;
          
          const data = this.blockData.get(block);
          if (!data) continue;
          
          const color = new THREE.Color(data.color);
          
          if (this.getBlock(x, y + 1, z) === BlockType.AIR) {
            this.addFace(positions, normals, colors, indices, x, y, z, 'top', color, vertexIndex);
            vertexIndex += 4;
          }
          
          if (this.getBlock(x, y - 1, z) === BlockType.AIR) {
            this.addFace(positions, normals, colors, indices, x, y, z, 'bottom', color, vertexIndex);
            vertexIndex += 4;
          }
          
          if (this.getBlock(x + 1, y, z) === BlockType.AIR) {
            this.addFace(positions, normals, colors, indices, x, y, z, 'right', color, vertexIndex);
            vertexIndex += 4;
          }
          
          if (this.getBlock(x - 1, y, z) === BlockType.AIR) {
            this.addFace(positions, normals, colors, indices, x, y, z, 'left', color, vertexIndex);
            vertexIndex += 4;
          }
          
          if (this.getBlock(x, y, z + 1) === BlockType.AIR) {
            this.addFace(positions, normals, colors, indices, x, y, z, 'front', color, vertexIndex);
            vertexIndex += 4;
          }
          
          if (this.getBlock(x, y, z - 1) === BlockType.AIR) {
            this.addFace(positions, normals, colors, indices, x, y, z, 'back', color, vertexIndex);
            vertexIndex += 4;
          }
        }
      }
    }
    
    if (positions.length === 0) return;
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.FrontSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    group.add(mesh);
    this.scene.add(group);
    
    const oldChunk = this.chunkMeshes.get(group.name);
    if (oldChunk) {
      this.scene.remove(oldChunk);
    }
    this.chunkMeshes.set(group.name, group);
  }

  private addFace(positions: number[], normals: number[], colors: number[], indices: number[], x: number, y: number, z: number, face: string, color: THREE.Color, vertexIndex: number): void {
    const r = color.r, g = color.g, b = color.b;
    
    let vertices: number[] = [];
    let normal: number[] = [];
    
    switch (face) {
      case 'top':
        vertices = [x, y + 1, z, x + 1, y + 1, z, x + 1, y + 1, z + 1, x, y + 1, z + 1];
        normal = [0, 1, 0];
        break;
      case 'bottom':
        vertices = [x, y, z + 1, x + 1, y, z + 1, x + 1, y, z, x, y, z];
        normal = [0, -1, 0];
        break;
      case 'right':
        vertices = [x + 1, y, z, x + 1, y, z + 1, x + 1, y + 1, z + 1, x + 1, y + 1, z];
        normal = [1, 0, 0];
        break;
      case 'left':
        vertices = [x, y, z + 1, x, y, z, x, y + 1, z, x, y + 1, z + 1];
        normal = [-1, 0, 0];
        break;
      case 'front':
        vertices = [x, y, z + 1, x, y + 1, z + 1, x + 1, y + 1, z + 1, x + 1, y, z + 1];
        normal = [0, 0, 1];
        break;
      case 'back':
        vertices = [x + 1, y, z, x + 1, y + 1, z, x, y + 1, z, x, y, z];
        normal = [0, 0, -1];
        break;
    }
    
    positions.push(...vertices);
    for (let i = 0; i < 4; i++) {
      normals.push(...normal);
      colors.push(r, g, b);
    }
    
    indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
    indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 3);
  }

  private updateChunkAt(x: number, z: number): void {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    this.buildChunk(chunkX, chunkZ);
  }

  public getWorldBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const size = this.chunkSize * this.worldSize;
    return {
      minX: 0,
      maxX: size,
      minZ: 0,
      maxZ: size
    };
  }

  public save(): { blocks: [string, BlockType][] } {
    return {
      blocks: Array.from(this.blocks.entries())
    };
  }

  public load(data: { blocks: [string, BlockType][] }): void {
    this.blocks.clear();
    this.blockMeshes.forEach(mesh => this.scene.remove(mesh));
    this.blockMeshes.clear();
    this.chunkMeshes.forEach(chunk => this.scene.remove(chunk));
    this.chunkMeshes.clear();
    
    data.blocks.forEach(([key, type]) => {
      this.blocks.set(key, type);
    });
    
    this.buildAllChunks();
  }

  public dispose(): void {
    this.blockMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    });
    this.blockMeshes.clear();
    
    this.chunkMeshes.forEach(chunk => {
      this.scene.remove(chunk);
      chunk.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.chunkMeshes.clear();
    
    this.blockGeometry.dispose();
    this.blockMaterials.forEach(mat => {
      if (Array.isArray(mat)) {
        mat.forEach(m => m.dispose());
      } else {
        mat.dispose();
      }
    });
    this.blockMaterials.clear();
  }
}
