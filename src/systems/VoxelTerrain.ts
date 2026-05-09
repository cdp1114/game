import * as THREE from 'three';

export interface BlockType {
  id: number;
  name: string;
  color: number;
  transparent: boolean;
  emissive?: number;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
}

export interface ChunkData {
  meshes: THREE.Mesh[];
  blocks: Uint8Array;
}

export class VoxelTerrain {
  public static readonly BLOCK_TYPES: BlockType[] = [
    { id: 0, name: 'air', color: 0x000000, transparent: true },
    { id: 1, name: 'grass', color: 0x4CAF50, transparent: false, roughness: 0.8 },
    { id: 2, name: 'dirt', color: 0x8B4513, transparent: false, roughness: 0.9 },
    { id: 3, name: 'stone', color: 0x808080, transparent: false, roughness: 0.95, metalness: 0.1 },
    { id: 4, name: 'wood', color: 0x8B4513, transparent: false, roughness: 0.7 },
    { id: 5, name: 'leaves', color: 0x228B22, transparent: true, roughness: 0.8 },
    { id: 6, name: 'sand', color: 0xF4D03F, transparent: false, roughness: 0.95 },
    { id: 7, name: 'water', color: 0x3498DB, transparent: true, emissive: 0x1A5276, emissiveIntensity: 0.2, roughness: 0.1, metalness: 0.3 },
    { id: 8, name: 'cobblestone', color: 0x696969, transparent: false, roughness: 0.9, metalness: 0.05 },
    { id: 9, name: 'brick', color: 0xB22222, transparent: false, roughness: 0.85 },
    { id: 10, name: 'glass', color: 0xADD8E6, transparent: true, roughness: 0.05, metalness: 0.1 },
    { id: 11, name: 'coal_ore', color: 0x2F4F4F, transparent: false, roughness: 0.95 },
    { id: 12, name: 'iron_ore', color: 0xD2691E, transparent: false, roughness: 0.9 },
    { id: 13, name: 'gold_ore', color: 0xFFD700, transparent: false, roughness: 0.8, metalness: 0.5 },
    { id: 14, name: 'diamond_ore', color: 0x00CED1, transparent: false, roughness: 0.3, metalness: 0.8 },
    { id: 15, name: 'snow', color: 0xFFFAFA, transparent: false, roughness: 0.7 },
    { id: 16, name: 'clay', color: 0xC0C0C0, transparent: false, roughness: 0.85 },
    { id: 17, name: 'planks', color: 0xDEB887, transparent: false, roughness: 0.6 },
    { id: 18, name: 'wool_white', color: 0xFFFFFF, transparent: false, roughness: 0.9 },
    { id: 19, name: 'wool_orange', color: 0xFF8C00, transparent: false, roughness: 0.9 },
    { id: 20, name: 'concrete', color: 0x95A5A6, transparent: false, roughness: 0.5 },
    { id: 21, name: 'slime', color: 0x32CD32, transparent: true, emissive: 0x228B22, emissiveIntensity: 0.3, roughness: 0.2 },
    { id: 22, name: 'obsidian', color: 0x1C1C1C, transparent: false, roughness: 0.3, metalness: 0.4 },
    { id: 23, name: 'glowstone', color: 0xFFFF00, transparent: false, emissive: 0xFFD700, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.2 },
    { id: 24, name: 'bedrock', color: 0x1a1a1a, transparent: false, roughness: 1.0, metalness: 0.2 },
    { id: 25, name: 'netherrack', color: 0x8B0000, transparent: false, roughness: 0.95 },
    { id: 26, name: 'mycelium', color: 0x7B3F00, transparent: false, roughness: 0.85 },
    { id: 27, name: 'podzol', color: 0x5D4037, transparent: false, roughness: 0.9 },
    { id: 28, name: 'gravel', color: 0xA9A9A9, transparent: false, roughness: 0.95 },
    { id: 29, name: 'ice', color: 0xE0FFFF, transparent: true, roughness: 0.1, metalness: 0.2 },
    { id: 30, name: 'packed_ice', color: 0xADD8E6, transparent: false, roughness: 0.4, metalness: 0.1 },
    { id: 31, name: 'mossy_cobblestone', color: 0x6B8E23, transparent: false, roughness: 0.9 },
    { id: 32, name: 'prismarine', color: 0x009900, transparent: false, roughness: 0.4, metalness: 0.3 },
    { id: 33, name: 'sea_lantern', color: 0xADD8E6, transparent: true, emissive: 0x87CEEB, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.2 },
    { id: 34, name: 'end_stone', color: 0xF5F5DC, transparent: false, roughness: 0.6 },
    { id: 35, name: 'purpur_block', color: 0x9B59B6, transparent: false, roughness: 0.5, metalness: 0.1 },
    { id: 36, name: 'terracotta', color: 0xE2725B, transparent: false, roughness: 0.85 },
    { id: 37, name: 'hardened_clay', color: 0xBDA88E, transparent: false, roughness: 0.8 },
    { id: 38, name: 'stained_hardened_clay', color: 0xD35400, transparent: false, roughness: 0.8 },
    { id: 39, name: 'hay_block', color: 0xDAA520, transparent: false, roughness: 0.8 },
    { id: 40, name: 'red_nether_brick', color: 0x400000, transparent: false, roughness: 0.85 },
    { id: 41, name: 'bone_block', color: 0xF5F5F5, transparent: false, roughness: 0.7 },
    { id: 42, name: 'dried_kelp', color: 0x556B2F, transparent: false, roughness: 0.9 },
    { id: 43, name: 'conduit', color: 0x00CED1, transparent: true, emissive: 0x40E0D0, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.6 },
    { id: 44, name: 'shulker_box', color: 0x9B59B6, transparent: false, roughness: 0.6 },
    { id: 45, name: 'magma_block', color: 0xFF4500, transparent: false, emissive: 0xFF6347, emissiveIntensity: 0.6, roughness: 0.4 },
    { id: 46, name: 'nether_wart', color: 0x8B0000, transparent: false, roughness: 0.85 },
    { id: 47, name: 'crying_obsidian', color: 0x2F4F4F, transparent: false, emissive: 0x4169E1, emissiveIntensity: 0.3, roughness: 0.4, metalness: 0.3 },
    { id: 48, name: 'soul_sand', color: 0x3D2B1F, transparent: false, roughness: 0.95 },
    { id: 49, name: 'glow_lichen', color: 0x90EE90, transparent: true, emissive: 0x98FB98, emissiveIntensity: 0.4, roughness: 0.5 },
    { id: 50, name: 'deepslate', color: 0x2F4F4F, transparent: false, roughness: 0.95, metalness: 0.1 },
    { id: 51, name: 'cobbled_deepslate', color: 0x4A4A4A, transparent: false, roughness: 0.95, metalness: 0.1 },
    { id: 52, name: 'raw_iron_block', color: 0xCD853F, transparent: false, roughness: 0.7, metalness: 0.6 },
    { id: 53, name: 'raw_gold_block', color: 0xFFD700, transparent: false, roughness: 0.5, metalness: 0.8 },
    { id: 54, name: 'amethyst_block', color: 0x9966CC, transparent: false, roughness: 0.3, metalness: 0.2 },
    { id: 55, name: 'calcite', color: 0xFFFAF0, transparent: false, roughness: 0.4 },
    { id: 56, name: 'tuff', color: 0x708090, transparent: false, roughness: 0.95, metalness: 0.05 },
    { id: 57, name: 'dripstone', color: 0xD2B48C, transparent: false, roughness: 0.7 },
    { id: 58, name: 'pointed_dripstone', color: 0xC4A484, transparent: false, roughness: 0.6 },
    { id: 59, name: 'smooth_basalt', color: 0x2F2F2F, transparent: false, roughness: 0.5, metalness: 0.1 },
    { id: 60, name: 'blackstone', color: 0x1C1C1C, transparent: false, roughness: 0.8, metalness: 0.2 },
    { id: 61, name: 'polished_blackstone', color: 0x2C2C2C, transparent: false, roughness: 0.4, metalness: 0.3 },
    { id: 62, name: 'polished_granite', color: 0xCD9B7D, transparent: false, roughness: 0.3, metalness: 0.1 },
    { id: 63, name: 'moss_block', color: 0x4A5D23, transparent: false, roughness: 0.95 }
  ];

  private scene: THREE.Scene;
  private worldSize: number;
  private chunkSize: number;
  private chunks: Map<string, THREE.Mesh>;
  private blockData: Map<string, Uint8Array>;
  private noiseScale: number;
  private seaLevel: number;
  private geometry: THREE.BoxGeometry;
  private materials: Map<number, THREE.Material>;

  constructor(scene: THREE.Scene, worldSize: number = 64, chunkSize: number = 16) {
    this.scene = scene;
    this.worldSize = worldSize;
    this.chunkSize = chunkSize;
    this.chunks = new Map();
    this.blockData = new Map();
    this.noiseScale = 0.05;
    this.seaLevel = 8;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = new Map();

    this.initializeMaterials();
  }

  private initializeMaterials(): void {
    VoxelTerrain.BLOCK_TYPES.forEach(block => {
      if (block.id !== 0) {
        const material = new THREE.MeshStandardMaterial({
          color: block.color,
          transparent: block.transparent,
          roughness: block.roughness ?? 0.8,
          metalness: block.metalness ?? 0,
          emissive: block.emissive ?? 0x000000,
          emissiveIntensity: block.emissiveIntensity ?? 0,
          side: block.transparent ? THREE.DoubleSide : THREE.FrontSide,
          alphaTest: block.transparent ? 0.1 : 0
        });
        this.materials.set(block.id, material);
      }
    });
  }

  public generateWorld(seed: number = Math.random() * 10000): void {
    const halfSize = this.worldSize / 2;
    
    for (let x = -halfSize; x < halfSize; x++) {
      for (let z = -halfSize; z < halfSize; z++) {
        const height = this.generateHeight(x, z, seed);
        
        for (let y = 0; y <= height; y++) {
          let blockType = 2;
          
          if (y === height) {
            blockType = 1;
            if (height < this.seaLevel - 2) {
              blockType = 6;
            } else if (height > this.seaLevel + 5) {
              blockType = 15;
            }
          } else if (y < height - 4) {
            blockType = 3;
            if (Math.random() < 0.02) {
              blockType = 11;
            }
          }
          
          this.setBlock(x, y, z, blockType);
        }
        
        for (let y = 0; y < this.seaLevel; y++) {
          if (this.getBlock(x, y, z) === 0 && y <= height) {
            this.setBlock(x, y, z, 7);
          }
        }
      }
    }
    
    this.generateTrees(halfSize, seed);
    this.buildAllChunks();
  }

  private generateHeight(x: number, z: number, seed: number): number {
    const simplex = this.createSimplexNoise(seed);
    const baseHeight = 15;
    const variation = 8;
    
    let height = baseHeight;
    height += simplex.noise2D(x * this.noiseScale, z * this.noiseScale) * variation;
    height += simplex.noise2D(x * this.noiseScale * 2, z * this.noiseScale * 2) * (variation / 2);
    height += simplex.noise2D(x * this.noiseScale * 4, z * this.noiseScale * 4) * (variation / 4);
    
    return Math.floor(height);
  }

  private createSimplexNoise(seed: number): { noise2D: (x: number, y: number) => number } {
    const permutation: number[] = [];
    for (let i = 0; i < 512; i++) {
      permutation[i] = Math.floor(this.seededRandom(seed + i) * 256);
    }
    
    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    
    const dot3 = (g: number[], x: number, y: number) => g[0] * x + g[1] * y;
    
    return {
      noise2D: (xin: number, yin: number) => {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;
        
        let n0, n1, n2;
        
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        
        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else { i1 = 0; j1 = 1; }
        
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;
        
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = permutation[ii + permutation[jj]] % 12;
        const gi1 = permutation[ii + i1 + permutation[jj + j1]] % 12;
        const gi2 = permutation[ii + 1 + permutation[jj + 1]] % 12;
        
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0;
        else {
          t0 *= t0;
          n0 = t0 * t0 * dot3(grad3[gi0], x0, y0);
        }
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0;
        else {
          t1 *= t1;
          n1 = t1 * t1 * dot3(grad3[gi1], x1, y1);
        }
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0;
        else {
          t2 *= t2;
          n2 = t2 * t2 * dot3(grad3[gi2], x2, y2);
        }
        
        return 70 * (n0 + n1 + n2);
      }
    };
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  private generateTrees(halfSize: number, seed: number): void {
    const treeCount = Math.floor((halfSize * 2) * (halfSize * 2) / 100);
    const random = this.seededRandom;
    
    for (let i = 0; i < treeCount; i++) {
      const x = Math.floor(random(seed + i * 3) * (halfSize * 2)) - halfSize;
      const z = Math.floor(random(seed + i * 7) * (halfSize * 2)) - halfSize;
      
      const groundHeight = this.findGroundHeight(x, z);
      
      if (groundHeight >= this.seaLevel && groundHeight < halfSize - 10) {
        if (this.getBlock(x, groundHeight + 1, z) === 1) {
          this.generateTree(x, groundHeight + 1, z);
        }
      }
    }
  }

  private findGroundHeight(x: number, z: number): number {
    for (let y = this.worldSize - 1; y >= 0; y--) {
      if (this.getBlock(x, y, z) !== 0) {
        return y;
      }
    }
    return 0;
  }

  private generateTree(x: number, y: number, z: number): void {
    const trunkHeight = 4 + Math.floor(Math.random() * 2);
    
    for (let ty = 0; ty < trunkHeight; ty++) {
      this.setBlock(x, y + ty, z, 4);
    }
    
    const leafStart = y + trunkHeight - 2;
    for (let ly = 0; ly < 4; ly++) {
      const radius = ly < 2 ? 2 : 1;
      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          if (Math.abs(lx) === radius && Math.abs(lz) === radius && Math.random() > 0.5) continue;
          if (lx === 0 && lz === 0 && ly < 2) continue;
          
          const block = this.getBlock(x + lx, leafStart + ly, z + lz);
          if (block === 0) {
            this.setBlock(x + lx, leafStart + ly, z + lz, 5);
          }
        }
      }
    }
  }

  public getBlock(x: number, y: number, z: number): number {
    const chunkKey = this.getChunkKey(x, z);
    const blockData = this.blockData.get(chunkKey);
    
    if (!blockData) return 0;
    
    const local = this.worldToLocal(x, z);
    const index = (y * this.chunkSize + local.z) * this.chunkSize + local.x;
    
    if (index < 0 || index >= blockData.length) return 0;
    
    return blockData[index];
  }

  public setBlock(x: number, y: number, z: number, blockType: number): void {
    const chunkKey = this.getChunkKey(x, z);
    let blockData = this.blockData.get(chunkKey);
    
    if (!blockData) {
      blockData = new Uint8Array(this.chunkSize * this.chunkSize * (this.worldSize / 2));
      this.blockData.set(chunkKey, blockData);
    }
    
    const local = this.worldToLocal(x, z);
    const index = (y * this.chunkSize + local.z) * this.chunkSize + local.x;
    
    if (index >= 0 && index < blockData.length) {
      blockData[index] = blockType;
    }
  }

  private getChunkKey(x: number, z: number): string {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    return `${cx},${cz}`;
  }

  private worldToLocal(x: number, z: number): { x: number; z: number } {
    return {
      x: ((x % this.chunkSize) + this.chunkSize) % this.chunkSize,
      z: ((z % this.chunkSize) + this.chunkSize) % this.chunkSize
    };
  }

  private buildAllChunks(): void {
    this.chunkData.forEach((_, chunkKey) => {
      this.buildChunk(chunkKey);
    });
  }

  private get chunkData(): Map<string, Uint8Array> {
    return this.blockData;
  }

  public buildChunk(chunkKey: string): void {
    const existingMesh = this.chunks.get(chunkKey);
    if (existingMesh) {
      this.scene.remove(existingMesh);
      existingMesh.geometry.dispose();
    }
    
    const blockData = this.blockData.get(chunkKey);
    if (!blockData) return;
    
    const [cx, cz] = chunkKey.split(',').map(Number);
    const offsetX = cx * this.chunkSize;
    const offsetZ = cz * this.chunkSize;
    
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    
    let vertexIndex = 0;
    
    const maxY = this.worldSize / 2;
    
    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        for (let y = 0; y < maxY; y++) {
          const worldX = offsetX + x;
          const worldZ = offsetZ + z;
          const block = this.getBlock(worldX, y, worldZ);
          
          if (block === 0) continue;
          
          const blockType = VoxelTerrain.BLOCK_TYPES[block];
          if (!blockType) continue;
          
          const color = new THREE.Color(blockType.color);
          
          const faces = [
            { dir: [0, 1, 0], normal: [0, 1, 0] },
            { dir: [0, -1, 0], normal: [0, -1, 0] },
            { dir: [1, 0, 0], normal: [1, 0, 0] },
            { dir: [-1, 0, 0], normal: [-1, 0, 0] },
            { dir: [0, 0, 1], normal: [0, 0, 1] },
            { dir: [0, 0, -1], normal: [0, 0, -1] }
          ];
          
          for (const face of faces) {
            const nx = worldX + face.dir[0];
            const ny = y + face.dir[1];
            const nz = worldZ + face.dir[2];
            const neighbor = this.getBlock(nx, ny, nz);
            
            const neighborType = VoxelTerrain.BLOCK_TYPES[neighbor];
            
            if (neighbor === 0 || (neighborType.transparent && neighbor !== block)) {
              const verts = this.getFaceVertices(face.dir as [number, number, number], worldX, y, worldZ);
              
              for (let v = 0; v < 4; v++) {
                positions.push(...verts[v]);
                normals.push(...face.normal);
                
                const brightness = this.getFaceBrightness(face.normal as [number, number, number]);
                colors.push(color.r * brightness, color.g * brightness, color.b * brightness);
              }
              
              indices.push(
                vertexIndex, vertexIndex + 1, vertexIndex + 2,
                vertexIndex, vertexIndex + 2, vertexIndex + 3
              );
              vertexIndex += 4;
            }
          }
        }
      }
    }
    
    if (positions.length === 0) return;
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    this.scene.add(mesh);
    this.chunks.set(chunkKey, mesh);
  }

  private getFaceVertices(dir: [number, number, number], x: number, y: number, z: number): number[][] {
    const [dx, dy, dz] = dir;
    
    if (dy === 1) {
      return [
        [x, y + 1, z],
        [x + 1, y + 1, z],
        [x + 1, y + 1, z + 1],
        [x, y + 1, z + 1]
      ];
    } else if (dy === -1) {
      return [
        [x, y, z + 1],
        [x + 1, y, z + 1],
        [x + 1, y, z],
        [x, y, z]
      ];
    } else if (dx === 1) {
      return [
        [x + 1, y, z],
        [x + 1, y, z + 1],
        [x + 1, y + 1, z + 1],
        [x + 1, y + 1, z]
      ];
    } else if (dx === -1) {
      return [
        [x, y, z + 1],
        [x, y, z],
        [x, y + 1, z],
        [x, y + 1, z + 1]
      ];
    } else if (dz === 1) {
      return [
        [x + 1, y, z + 1],
        [x, y, z + 1],
        [x, y + 1, z + 1],
        [x + 1, y + 1, z + 1]
      ];
    } else {
      return [
        [x, y, z],
        [x + 1, y, z],
        [x + 1, y + 1, z],
        [x, y + 1, z]
      ];
    }
  }

  private getFaceBrightness(normal: [number, number, number]): number {
    const [, ny, nz] = normal;
    
    if (ny === 1) return 1.0;
    if (ny === -1) return 0.5;
    
    const brightness = 0.7 + 0.3 * Math.abs(nz);
    
    return brightness;
  }

  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 100): { hit: boolean; position: THREE.Vector3 | null; normal: THREE.Vector3 | null; block: number } {
    const step = 0.05;
    const pos = origin.clone();
    
    let lastX = Math.floor(pos.x);
    let lastY = Math.floor(pos.y);
    let lastZ = Math.floor(pos.z);
    
    for (let d = 0; d < maxDistance; d += step) {
      pos.addScaledVector(direction, step);
      
      const bx = Math.floor(pos.x);
      const by = Math.floor(pos.y);
      const bz = Math.floor(pos.z);
      
      if (bx < -this.worldSize / 2 || bx >= this.worldSize / 2 ||
          by < 0 || by >= this.worldSize / 2 ||
          bz < -this.worldSize / 2 || bz >= this.worldSize / 2) {
        continue;
      }
      
      const block = this.getBlock(bx, by, bz);
      
      if (block !== 0 && VoxelTerrain.BLOCK_TYPES[block] && !VoxelTerrain.BLOCK_TYPES[block].transparent) {
        const normal = new THREE.Vector3(
          bx - lastX,
          by - lastY,
          bz - lastZ
        ).normalize();
        
        return {
          hit: true,
          position: new THREE.Vector3(bx, by, bz),
          normal,
          block
        };
      }
      
      lastX = bx;
      lastY = by;
      lastZ = bz;
    }
    
    return { hit: false, position: null, normal: null, block: 0 };
  }

  public placeBlock(position: THREE.Vector3, blockType: number, normal: THREE.Vector3): void {
    const x = Math.floor(position.x + normal.x);
    const y = Math.floor(position.y + normal.y);
    const z = Math.floor(position.z + normal.z);
    
    this.setBlock(x, y, z, blockType);
    
    const chunkKey = this.getChunkKey(x, z);
    this.buildChunk(chunkKey);
    
    const neighborChunks = this.getNeighborChunks(chunkKey);
    neighborChunks.forEach(key => this.buildChunk(key));
  }

  public breakBlock(position: THREE.Vector3): boolean {
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    const z = Math.floor(position.z);
    
    const block = this.getBlock(x, y, z);
    if (block === 0 || block === 24) return false;
    
    this.setBlock(x, y, z, 0);
    
    const chunkKey = this.getChunkKey(x, z);
    this.buildChunk(chunkKey);
    
    const neighborChunks = this.getNeighborChunks(chunkKey);
    neighborChunks.forEach(key => this.buildChunk(key));
    
    return true;
  }

  private getNeighborChunks(chunkKey: string): string[] {
    const [cx, cz] = chunkKey.split(',').map(Number);
    return [
      `${cx - 1},${cz}`, `${cx + 1},${cz}`,
      `${cx},${cz - 1}`, `${cx},${cz + 1}`,
      `${cx - 1},${cz - 1}`, `${cx - 1},${cz + 1}`,
      `${cx + 1},${cz - 1}`, `${cx + 1},${cz + 1}`
    ];
  }

  public getBlockType(blockId: number): BlockType | undefined {
    return VoxelTerrain.BLOCK_TYPES[blockId];
  }

  public dispose(): void {
    this.chunks.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    });
    this.chunks.clear();
    this.blockData.clear();
    this.geometry.dispose();
    this.materials.forEach(mat => mat.dispose());
    this.materials.clear();
  }
}
