// 《星野栖所》场景管理器 - 场景加载、光照、天气、季节管理

import * as THREE from 'three';
import { Season, Weather, DayPhase } from '../core/types';

export class SceneManager {
  private scene: THREE.Scene;
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private weatherTime: number = 0;
  
  // 天气粒子系统
  private rainSystem: THREE.Points | null = null;
  private snowSystem: THREE.Points | null = null;
  private fogSystem: THREE.Points | null = null;
  private starRainSystem: THREE.Points | null = null;
  
  // 晴天太阳光晕
  private sunGlow: THREE.Sprite | null = null;
  private sunFlareGroup: THREE.Group | null = null;
  
  // 动态3D云朵系统
  private cloudGroup: THREE.Group | null = null;
  
  private loadedChunks: Map<string, THREE.Object3D> = new Map();
  private unlockedScenes: Set<string> = new Set(['spring_plains']);

  constructor(scene: THREE.Scene, _camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.createBaseEnvironment();
  }

  private createBaseEnvironment(): void {
    // 创建基础地面
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x7CFC00,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true
    });
    
    // 添加地形起伏
    const positions = groundGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 2 + Math.random() * 0.5;
      positions.setZ(i, z);
    }
    groundGeometry.computeVertexNormals();
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.scene.add(ground);
    
    // 创建浮空岛屿（远景装饰）
    this.createFloatingIsland(40, 12, -30, 8);
    this.createFloatingIsland(-35, 10, 25, 6);
    
    // 创建农田区域
    this.createFarmPlots();
    
    // 创建小路
    this.createPath();
    
    // 创建池塘
    this.createPond();
    
    // 创建篱笆
    this.createFences();
    
    // 创建装饰性树木
    this.createTrees();
    
    // 创建装饰性花草
    this.createFlowers();
    
    // 创建蘑菇和矿石
    this.createMushrooms();
    this.createCrystals();
    
    // 创建天空盒
    this.createSkybox();
    
    // 创建太阳光晕（晴天）
    this.createSunGlow();
    
    // 创建3D云朵系统
    this.createCloudSystem();
  }

  private createFloatingIsland(x: number, y: number, z: number, size: number): void {
    const islandGeometry = new THREE.ConeGeometry(size, size * 0.6, 8);
    const islandMaterial = new THREE.MeshStandardMaterial({
      color: 0x8FBC8F,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true
    });
    
    const island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.position.set(x, y, z);
    island.castShadow = true;
    island.receiveShadow = true;
    island.name = `floatingIsland_${x}_${y}_${z}`;
    this.scene.add(island);
    
    // 添加草地顶层
    const grassGeometry = new THREE.CylinderGeometry(size * 0.95, size, 1, 8);
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x90EE90,
      roughness: 0.7,
      metalness: 0.0
    });
    
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.position.set(x, y + size * 0.3 + 0.5, z);
    grass.name = `islandGrass_${x}`;
    this.scene.add(grass);
  }

  private createTrees(): void {
    const treePositions = [
      { x: -8, z: -5 },
      { x: 10, z: 8 },
      { x: -15, z: -10 },
      { x: 5, z: -12 },
      { x: -20, z: 5 }
    ];
    
    treePositions.forEach((pos, index) => {
      this.createTree(pos.x, 0, pos.z, index);
    });
  }

  private createTree(x: number, groundY: number, z: number, seed: number): void {
    const treeGroup = new THREE.Group();
    treeGroup.name = `tree_${seed}`;
    
    // 树干
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    // 树冠 - 使用多个球体组合
    const foliageColors = [0x228B22, 0x32CD32, 0x006400];
    const foliagePositions = [
      { x: 0, y: 4, z: 0, scale: 1.2 },
      { x: 0.8, y: 3.5, z: 0.5, scale: 0.9 },
      { x: -0.6, y: 3.8, z: -0.4, scale: 0.8 },
      { x: 0.3, y: 5, z: -0.3, scale: 0.7 }
    ];
    
    foliagePositions.forEach((foliagePos, i) => {
      const foliageGeometry = new THREE.IcosahedronGeometry(foliagePos.scale, 0);
      const foliageMaterial = new THREE.MeshStandardMaterial({
        color: foliageColors[i % foliageColors.length],
        roughness: 0.8,
        flatShading: true
      });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.set(foliagePos.x, foliagePos.y, foliagePos.z);
      foliage.castShadow = true;
      treeGroup.add(foliage);
    });
    
    treeGroup.position.set(x, groundY, z);
    this.scene.add(treeGroup);
  }

  private createFlowers(): void {
    const flowerColors = [0xFF69B4, 0xFFB6C1, 0xFFA07A, 0xDDA0DD, 0xE6E6FA];
    
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      
      this.createFlower(x, 0, z, color);
    }
  }

  private createFlower(x: number, groundY: number, z: number, color: number): void {
    const flowerGroup = new THREE.Group();
    flowerGroup.name = `flower_${x}_${z}`;
    
    // 花茎
    const stemGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.25;
    flowerGroup.add(stem);
    
    // 花朵
    const flowerGeometry = new THREE.SphereGeometry(0.15, 6, 6);
    const flowerMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
    flower.position.y = 0.55;
    flowerGroup.add(flower);
    
    flowerGroup.position.set(x, groundY, z);
    this.scene.add(flowerGroup);
  }

  private createFarmPlots(): void {
    // 创建3块农田，排列在场景中央
    const plotPositions = [
      { x: -3, z: 2 },
      { x: 0, z: 2 },
      { x: 3, z: 2 }
    ];
    
    plotPositions.forEach((pos, index) => {
      // 农田土壤（深褐色）
      const soilGeometry = new THREE.BoxGeometry(2.5, 0.15, 2.5);
      const soilMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 1.0,
        flatShading: true
      });
      
      const soil = new THREE.Mesh(soilGeometry, soilMaterial);
      soil.position.set(pos.x, 0.08, pos.z);
      soil.receiveShadow = true;
      soil.name = `farmPlot_${index}`;
      this.scene.add(soil);
      
      // 添加田垄（垄起的线条）
      for (let i = -1; i <= 1; i++) {
        const ridgeGeometry = new THREE.BoxGeometry(2.3, 0.05, 0.08);
        const ridgeMaterial = new THREE.MeshStandardMaterial({
          color: 0xA0522D,
          roughness: 0.9
        });
        const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
        ridge.position.set(pos.x, 0.16, pos.z + i * 0.6);
        this.scene.add(ridge);
      }
    });
  }

  private createPath(): void {
    // 创建一条从场景入口到农田的小路
    const pathSegments = [
      { x: 0, z: -5, width: 1.5, length: 3 },
      { x: 0, z: -2, width: 1.5, length: 2 },
      { x: 0, z: 0, width: 2, length: 4 }
    ];
    
    pathSegments.forEach((segment, index) => {
      const pathGeometry = new THREE.BoxGeometry(segment.width, 0.05, segment.length);
      const pathMaterial = new THREE.MeshStandardMaterial({
        color: 0xD2B48C,
        roughness: 0.95,
        flatShading: true
      });
      
      const path = new THREE.Mesh(pathGeometry, pathMaterial);
      path.position.set(segment.x, 0.03, segment.z);
      path.receiveShadow = true;
      path.name = `path_${index}`;
      this.scene.add(path);
    });
    
    // 添加路边的碎石
    for (let i = 0; i < 15; i++) {
      const stoneGeometry = new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 5, 4);
      const stoneMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0B0,
        roughness: 0.9,
        flatShading: true
      });
      
      const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
      const side = Math.random() > 0.5 ? 1 : -1;
      stone.position.set(
        side * (0.8 + Math.random() * 0.3),
        0.04,
        -5 + Math.random() * 8
      );
      this.scene.add(stone);
    }
  }

  private createPond(): void {
    // 创建池塘（在场景左下角）
    const pondGeometry = new THREE.CylinderGeometry(3, 2.5, 0.3, 12);
    const pondMaterial = new THREE.MeshStandardMaterial({
      color: 0x4682B4,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7,
      flatShading: true
    });
    
    const pond = new THREE.Mesh(pondGeometry, pondMaterial);
    pond.position.set(-12, 0.05, -8);
    pond.receiveShadow = true;
    pond.name = 'pond';
    this.scene.add(pond);
    
    // 添加池塘边的石头
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const stoneGeometry = new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 5, 4);
      const stoneMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8,
        flatShading: true
      });
      
      const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
      stone.position.set(
        -12 + Math.cos(angle) * 3.2,
        0.2,
        -8 + Math.sin(angle) * 3.2
      );
      stone.castShadow = true;
      this.scene.add(stone);
    }
    
    // 添加池塘里的睡莲
    for (let i = 0; i < 3; i++) {
      const lilyGeometry = new THREE.CircleGeometry(0.3, 8);
      const lilyMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22,
        roughness: 0.6,
        side: THREE.DoubleSide
      });
      
      const lily = new THREE.Mesh(lilyGeometry, lilyMaterial);
      lily.position.set(
        -12 + (Math.random() - 0.5) * 3,
        0.22,
        -8 + (Math.random() - 0.5) * 3
      );
      lily.rotation.x = -Math.PI / 2;
      this.scene.add(lily);
    }
  }

  private createFences(): void {
    // 在农田周围创建篱笆
    const fencePositions = [
      // 北侧篱笆
      { x: -5, z: 0, rotation: 0, count: 4 },
      { x: 5, z: 0, rotation: 0, count: 4 },
      // 东侧篱笆
      { x: 8, z: -2, rotation: Math.PI / 2, count: 3 },
      // 西侧篱笆
      { x: -8, z: -2, rotation: Math.PI / 2, count: 3 }
    ];
    
    for (const fence of fencePositions) {
      for (let i = 0; i < fence.count; i++) {
        // 篱笆柱
        const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 4);
        const postMaterial = new THREE.MeshStandardMaterial({
          color: 0xDEB887,
          roughness: 0.9
        });
        
        const post = new THREE.Mesh(postGeometry, postMaterial);
        if (fence.rotation === 0) {
          post.position.set(fence.x + i * 2.5, 0.6, fence.z);
        } else {
          post.position.set(fence.x, 0.6, fence.z + i * 2.5);
        }
        post.castShadow = true;
        this.scene.add(post);
        
        // 横杆
        if (i < fence.count - 1) {
          const railGeometry = new THREE.BoxGeometry(2.4, 0.04, 0.04);
          const railMaterial = new THREE.MeshStandardMaterial({
            color: 0xD2B48C,
            roughness: 0.85
          });
          
          const rail = new THREE.Mesh(railGeometry, railMaterial);
          if (fence.rotation === 0) {
            rail.position.set(fence.x + i * 2.5 + 1.25, 0.8, fence.z);
          } else {
            rail.position.set(fence.x, 0.8, fence.z + i * 2.5 + 1.25);
            rail.rotation.y = Math.PI / 2;
          }
          this.scene.add(rail);
        }
      }
    }
  }

  private createMushrooms(): void {
    // 在树木附近创建蘑菇
    const mushroomPositions = [
      { x: -7, z: -4 },
      { x: 11, z: 9 },
      { x: -14, z: -9 },
      { x: -19, z: 6 }
    ];
    
    mushroomPositions.forEach((pos, index) => {
      const mushroomGroup = new THREE.Group();
      mushroomGroup.name = `mushroom_${index}`;
      
      // 蘑菇柄
      const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 5);
      const stemMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFF8DC,
        roughness: 0.7
      });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.y = 0.15;
      mushroomGroup.add(stem);
      
      // 蘑菇伞
      const capGeometry = new THREE.SphereGeometry(0.2, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const capColors = [0xFF6347, 0xFFD700, 0x8B0000];
      const capColor = capColors[index % capColors.length];
      const capMaterial = new THREE.MeshStandardMaterial({
        color: capColor,
        roughness: 0.6,
        flatShading: true
      });
      const cap = new THREE.Mesh(capGeometry, capMaterial);
      cap.position.y = 0.3;
      mushroomGroup.add(cap);
      
      // 伞上的白点
      for (let i = 0; i < 3; i++) {
        const dotGeometry = new THREE.SphereGeometry(0.03, 4, 4);
        const dotMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        const angle = (i / 3) * Math.PI * 2;
        dot.position.set(
          Math.cos(angle) * 0.12,
          0.32,
          Math.sin(angle) * 0.12
        );
        mushroomGroup.add(dot);
      }
      
      mushroomGroup.position.set(pos.x, 0, pos.z);
      this.scene.add(mushroomGroup);
    });
  }

  private createCrystals(): void {
    // 在场景边缘创建水晶矿石
    const crystalPositions = [
      { x: 15, z: -15 },
      { x: -18, z: 12 },
      { x: 20, z: 10 }
    ];
    
    crystalPositions.forEach((pos, index) => {
      const crystalGroup = new THREE.Group();
      crystalGroup.name = `crystal_${index}`;
      
      // 水晶簇（多个棱柱组合）
      const crystalColors = [0x9370DB, 0x00CED1, 0xFF69B4];
      const baseColor = crystalColors[index % crystalColors.length];
      
      for (let i = 0; i < 3; i++) {
        const height = 0.5 + Math.random() * 0.5;
        const crystalGeometry = new THREE.ConeGeometry(0.15 + Math.random() * 0.1, height, 6);
        const crystalMaterial = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.3,
          metalness: 0.5,
          emissive: baseColor,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.8,
          flatShading: true
        });
        
        const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        crystal.position.set(
          (Math.random() - 0.5) * 0.4,
          height / 2,
          (Math.random() - 0.5) * 0.4
        );
        crystal.rotation.x = (Math.random() - 0.5) * 0.2;
        crystal.rotation.z = (Math.random() - 0.5) * 0.2;
        crystalGroup.add(crystal);
      }
      
      // 水晶底座（岩石）
      const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.2, 6);
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x696969,
        roughness: 0.9,
        flatShading: true
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.1;
      crystalGroup.add(base);
      
      crystalGroup.position.set(pos.x, 0, pos.z);
      this.scene.add(crystalGroup);
    });
  }

  private createSkybox(): void {
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 20 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.name = 'skybox';
    this.scene.add(sky);
  }

  private createSunGlow(): void {
    const sunTexture = this.createSunTexture();
    
    // 主光晕
    const sunGlowMaterial = new THREE.SpriteMaterial({
      map: sunTexture,
      color: 0xffdd44,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.sunGlow = new THREE.Sprite(sunGlowMaterial);
    this.sunGlow.position.set(50, 100, -150);
    this.sunGlow.scale.set(60, 60, 1);
    this.sunGlow.name = 'sunGlow';
    this.scene.add(this.sunGlow);
    
    // 太阳耀斑组
    this.sunFlareGroup = new THREE.Group();
    this.sunFlareGroup.name = 'sunFlare';
    
    // 内圈光晕
    const innerGlowMaterial = new THREE.SpriteMaterial({
      map: sunTexture,
      color: 0xffff88,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6
    });
    
    const innerGlow = new THREE.Sprite(innerGlowMaterial);
    innerGlow.scale.set(40, 40, 1);
    this.sunFlareGroup.add(innerGlow);
    
    // 外圈散射光
    const outerGlowMaterial = new THREE.SpriteMaterial({
      map: sunTexture,
      color: 0xffaa00,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.25
    });
    
    const outerGlow = new THREE.Sprite(outerGlowMaterial);
    outerGlow.scale.set(80, 80, 1);
    this.sunFlareGroup.add(outerGlow);
    
    // 添加镜头光晕效果（多个小光点）
    for (let i = 0; i < 5; i++) {
      const flareDot = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: sunTexture,
          color: new THREE.Color().setHSL(0.12 + i * 0.05, 0.8, 0.6),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.15 - i * 0.02
        })
      );
      flareDot.position.set(
        Math.cos(i * 1.2) * (10 + i * 8),
        Math.sin(i * 1.2) * (10 + i * 8),
        0
      );
      flareDot.scale.set(5 + i * 3, 5 + i * 3, 1);
      this.sunFlareGroup.add(flareDot);
    }
    
    this.sunFlareGroup.position.copy(this.sunGlow.position);
    this.scene.add(this.sunFlareGroup);
    
    // 晴天默认显示太阳
    this.sunGlow.visible = true;
    this.sunFlareGroup.visible = true;
  }

  private createSunTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 200, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 220, 100, 0.5)');
    gradient.addColorStop(0.6, 'rgba(255, 180, 50, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createCloudSystem(): void {
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'cloudSystem';
    
    // 使用Sprite云纹理创建真实云朵
    const cloudTexture = this.createCloudTexture();
    
    const cloudLayers = [
      { y: 80, count: 6, size: 60, opacity: 0.75, speed: 0.03 },
      { y: 70, count: 8, size: 45, opacity: 0.85, speed: 0.05 },
      { y: 60, count: 5, size: 75, opacity: 0.6, speed: 0.02 }
    ];
    
    cloudLayers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const cloudMaterial = new THREE.SpriteMaterial({
          map: cloudTexture,
          color: 0xffffff,
          transparent: true,
          opacity: layer.opacity,
          depthWrite: false,
          blending: THREE.NormalBlending
        });
        
        const cloud = new THREE.Sprite(cloudMaterial);
        cloud.position.set(
          (Math.random() - 0.5) * 300,
          layer.y,
          (Math.random() - 0.5) * 200
        );
        cloud.scale.set(layer.size, layer.size * 0.35, 1);
        cloud.userData.speed = layer.speed;
        cloud.userData.direction = Math.random() > 0.5 ? 1 : -1;
        this.cloudGroup!.add(cloud);
      }
    });
    
    this.showClearWeatherClouds();
  }

  public showClearWeatherClouds(): void {
    if (!this.cloudGroup) return;
    this.cloudGroup.visible = true;
    // 晴天显示部分云朵
    this.cloudGroup.children.forEach((cloud, i) => {
      cloud.visible = i < 10;
    });
  }

  private createCloudTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx2 = canvas.getContext('2d')!;
    
    // 创建柔和的云形状
    ctx2.clearRect(0, 0, 512, 256);
    
    // 主云体 - 使用多个圆形叠加
    const drawCloudPuff = (cx: number, cy: number, r: number, alpha: number) => {
      const gradient = ctx2.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.6})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx2.fillStyle = gradient;
      ctx2.beginPath();
      ctx2.arc(cx, cy, r, 0, Math.PI * 2);
      ctx2.fill();
    };
    
    // 绘制云朵形状 - 扁平的椭圆形云团
    drawCloudPuff(128, 128, 90, 0.9);
    drawCloudPuff(160, 118, 80, 0.85);
    drawCloudPuff(96, 122, 75, 0.8);
    drawCloudPuff(192, 125, 70, 0.75);
    drawCloudPuff(72, 126, 65, 0.7);
    drawCloudPuff(216, 128, 60, 0.65);
    drawCloudPuff(256, 130, 50, 0.55);
    drawCloudPuff(40, 130, 50, 0.5);
    
    // 顶部小突起
    drawCloudPuff(140, 100, 55, 0.7);
    drawCloudPuff(170, 105, 50, 0.6);
    drawCloudPuff(110, 108, 45, 0.55);
    
    // 边缘柔和
    drawCloudPuff(280, 135, 40, 0.4);
    drawCloudPuff(20, 135, 35, 0.35);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  public update(deltaTime: number): void {
    this.weatherTime += deltaTime * 0.001;
    this.updateWeatherAnimations(deltaTime);
  }

  public updateSunPosition(gameTime: number, _dayPhase: DayPhase): void {
    if (!this.sunGlow || !this.sunFlareGroup) return;
    
    // 太阳运行轨迹：4:00 升起 -> 12:00 最高点 -> 20:00 落下
    const sunriseHour = 4;
    const sunsetHour = 20;
    
    // 只计算白天
    let progress = 0; // 0 = 日出, 0.5 = 正午, 1 = 日落
    const isDaytime = gameTime >= sunriseHour && gameTime <= sunsetHour;
    
    if (isDaytime) {
      progress = (gameTime - sunriseHour) / (sunsetHour - sunriseHour);
      progress = Math.max(0, Math.min(1, progress));
    } else {
      // 夜间太阳隐藏到地平线以下
      this.sunGlow.visible = false;
      this.sunFlareGroup.visible = false;
      return;
    }
    
    // 确保白天时太阳可见
    this.sunGlow.visible = true;
    this.sunFlareGroup.visible = true;
    
    // 使用正弦曲线模拟太阳高度（日出日落时为0，正午为1）
    const sunHeight = Math.sin(progress * Math.PI);
    
    // 太阳水平移动（从东到西）
    const sunHorizontalX = -120 + progress * 240; // 从 -120 到 +120
    
    // 太阳高度
    const sunY = sunHeight * 120; // 最高点 120
    
    // 太阳深度（正午更远，日出日落较近）
    const sunZ = -150 + (1 - Math.abs(progress - 0.5) * 2) * 50;
    
    this.sunGlow.position.set(sunHorizontalX, sunY, sunZ);
    this.sunFlareGroup.position.set(sunHorizontalX, sunY, sunZ);
  }

  private updateWeatherAnimations(_deltaTime: number): void {
    const time = this.weatherTime;
    
    // 更新下雨系统
    if (this.rainSystem && this.rainSystem.visible) {
      const material = this.rainSystem.material as THREE.ShaderMaterial;
      if (material.uniforms.uTime) {
        material.uniforms.uTime.value = time;
      }
    }
    
    // 更新星雨系统
    if (this.starRainSystem && this.starRainSystem.visible) {
      const material = this.starRainSystem.material as THREE.ShaderMaterial;
      if (material.uniforms.uTime) {
        material.uniforms.uTime.value = time;
      }
    }
    
    // 更新下雪系统
    if (this.snowSystem && this.snowSystem.visible) {
      const material = this.snowSystem.material as THREE.ShaderMaterial;
      if (material.uniforms.uTime) {
        material.uniforms.uTime.value = time;
      }
    }
    
    // 更新雾系统
    if (this.fogSystem && this.fogSystem.visible) {
      const material = this.fogSystem.material as THREE.ShaderMaterial;
      if (material.uniforms.uTime) {
        material.uniforms.uTime.value = time;
      }
    }
    
    // 更新云朵飘动动画
    if (this.cloudGroup && this.cloudGroup.visible) {
      this.cloudGroup.children.forEach((cloud) => {
        if (cloud.userData.speed && cloud.userData.direction) {
          cloud.position.x += cloud.userData.speed * cloud.userData.direction;
          // 云朵超出范围后从另一侧重新出现
          if (cloud.position.x > 150) cloud.position.x = -150;
          if (cloud.position.x < -150) cloud.position.x = 150;
        }
      });
    }
    
    // 花草微动效
    this.scene.traverse((object) => {
      if (object.name.startsWith('flower_')) {
        object.rotation.z = Math.sin(time * 2 + object.position.x) * 0.05;
      }
    });
  }

  public updateLighting(timeData: any): void {
    const phase = timeData.dayPhase;
    const weather = timeData.weather as Weather;
    
    let lightIntensity = 1.0;
    let lightColor = new THREE.Color(0xffffff);
    let ambientIntensity = 0.5;
    let skyColor = new THREE.Color(0x87CEEB);
    
    switch (phase) {
      case DayPhase.DAWN:
        lightIntensity = 0.6;
        lightColor = new THREE.Color(0xFFE4B5);
        ambientIntensity = 0.45;
        skyColor = new THREE.Color(0xFFB6C1);
        break;
      case DayPhase.MORNING:
        lightIntensity = 1.0;
        lightColor = new THREE.Color(0xFFFACD);
        ambientIntensity = 0.65;
        skyColor = new THREE.Color(0x87CEEB);
        break;
      case DayPhase.NOON:
        lightIntensity = 1.5;
        lightColor = new THREE.Color(0xFFFFFF);
        ambientIntensity = 0.8;
        skyColor = new THREE.Color(0x4A90D9);
        break;
      case DayPhase.AFTERNOON:
        lightIntensity = 1.2;
        lightColor = new THREE.Color(0xFFFACD);
        ambientIntensity = 0.7;
        skyColor = new THREE.Color(0x87CEEB);
        break;
      case DayPhase.EVENING:
        lightIntensity = 0.8;
        lightColor = new THREE.Color(0xFFA07A);
        ambientIntensity = 0.5;
        skyColor = new THREE.Color(0xFF7F50);
        break;
      case DayPhase.DUSK:
        lightIntensity = 0.4;
        lightColor = new THREE.Color(0xFF6B6B);
        ambientIntensity = 0.35;
        skyColor = new THREE.Color(0xFF4500);
        break;
      case DayPhase.NIGHT:
        lightIntensity = 0.15;
        lightColor = new THREE.Color(0xB0C4DE);
        ambientIntensity = 0.15;
        skyColor = new THREE.Color(0x191970);
        break;
    }
    
    // 根据天气调整光照（白天不过度变暗）
    const isNight = phase === DayPhase.NIGHT || phase === DayPhase.DUSK;
    const weatherModifiers = {
      [Weather.CLEAR]: { light: 1.0, ambient: 1.0, sky: 1.0 },
      [Weather.CLOUDY]: { light: isNight ? 0.9 : 0.85, ambient: 0.9, sky: 0.9 },
      [Weather.OVERCAST]: { light: isNight ? 0.7 : 0.65, ambient: 0.8, sky: 0.75 },
      [Weather.RAIN]: { light: isNight ? 0.5 : 0.55, ambient: 0.7, sky: 0.65 },
      [Weather.STORM]: { light: isNight ? 0.35 : 0.4, ambient: 0.6, sky: 0.5 },
      [Weather.FOG]: { light: isNight ? 0.7 : 0.75, ambient: 0.8, sky: 0.8 },
      [Weather.SNOW]: { light: isNight ? 0.8 : 0.85, ambient: 0.85, sky: 0.9 },
      [Weather.STAR_RAIN]: { light: 1.0, ambient: 1.0, sky: 1.0 },
      [Weather.AURORA]: { light: 1.0, ambient: 1.0, sky: 1.0 }
    };
    
    const modifier = weatherModifiers[weather] || weatherModifiers[Weather.CLEAR];
    lightIntensity *= modifier.light;
    ambientIntensity *= modifier.ambient;
    skyColor.multiplyScalar(modifier.sky);
    
    // 根据季节调整
    const seasonModifier = this.getSeasonLightingModifier(timeData.season);
    lightIntensity *= seasonModifier;
    
    // 应用光照设置
    if (this.directionalLight) {
      this.directionalLight.intensity = lightIntensity;
      this.directionalLight.color = lightColor;
    }
    
    if (this.ambientLight) {
      this.ambientLight.intensity = ambientIntensity;
    }
    
    // 更新天空颜色
    const sky = this.scene.getObjectByName('skybox') as THREE.Mesh;
    if (sky && sky.material instanceof THREE.ShaderMaterial) {
      sky.material.uniforms.topColor.value = skyColor;
      sky.material.uniforms.bottomColor.value = skyColor.clone().lerp(new THREE.Color(0xffffff), 0.4);
    }
    
    // 更新雾效
    this.scene.fog = new THREE.FogExp2(skyColor.getHex(), 0.006);
    this.scene.background = skyColor;
  }

  private getSeasonLightingModifier(season: Season): number {
    switch (season) {
      case Season.SPRING:
        return 1.0;
      case Season.SUMMER:
        return 1.2;
      case Season.AUTUMN:
        return 0.9;
      case Season.WINTER:
        return 0.7;
      default:
        return 1.0;
    }
  }

  public updateWeather(weather: Weather): void {
    this.updateWeatherSystems(weather);
  }

  private updateWeatherSystems(weather: Weather): void {
    switch (weather) {
      case Weather.CLEAR:
        if (this.sunGlow) this.sunGlow.visible = true;
        if (this.sunFlareGroup) this.sunFlareGroup.visible = true;
        this.showClearWeatherClouds();
        this.hideAllWeatherSystems();
        this.setCloudColor(0xffffff, 0.8);
        break;
        
      case Weather.CLOUDY:
        if (this.sunGlow) this.sunGlow.visible = false;
        if (this.sunFlareGroup) this.sunFlareGroup.visible = false;
        this.showAllClouds();
        this.hideAllWeatherSystems();
        this.setCloudColor(0xf0f0f0, 0.9);
        break;
        
      case Weather.OVERCAST:
        if (this.sunGlow) this.sunGlow.visible = false;
        if (this.sunFlareGroup) this.sunFlareGroup.visible = false;
        this.showAllClouds();
        this.hideAllWeatherSystems();
        this.setCloudColor(0x999999, 0.95);
        break;
        
      case Weather.RAIN:
        if (this.sunGlow) this.sunGlow.visible = false;
        if (this.sunFlareGroup) this.sunFlareGroup.visible = false;
        if (!this.rainSystem) this.createRainSystem();
        if (this.rainSystem) this.rainSystem.visible = true;
        this.showAllClouds();
        this.setCloudColor(0x777788, 0.95);
        break;
        
      case Weather.STORM:
        if (this.sunGlow) this.sunGlow.visible = false;
        if (this.sunFlareGroup) this.sunFlareGroup.visible = false;
        if (!this.rainSystem) this.createRainSystem();
        if (this.rainSystem) {
          this.rainSystem.visible = true;
          const material = this.rainSystem.material as THREE.ShaderMaterial;
          material.uniforms.uOpacity.value = 0.6;
          material.uniforms.uColor.value.set(0x6666aa);
        }
        this.showAllClouds();
        this.setCloudColor(0x555566, 1.0);
        break;
        
      case Weather.STAR_RAIN:
        if (!this.starRainSystem) this.createStarRainSystem();
        if (this.starRainSystem) this.starRainSystem.visible = true;
        this.hideOtherWeatherSystems();
        break;
        
      case Weather.SNOW:
        if (this.sunGlow) this.sunGlow.visible = false;
        if (this.sunFlareGroup) this.sunFlareGroup.visible = false;
        if (!this.snowSystem) this.createSnowSystem();
        if (this.snowSystem) this.snowSystem.visible = true;
        this.showAllClouds();
        this.setCloudColor(0xe8e8f0, 0.85);
        break;
        
      case Weather.FOG:
        if (this.sunGlow) this.sunGlow.visible = false;
        if (this.sunFlareGroup) this.sunFlareGroup.visible = false;
        if (!this.fogSystem) this.createFogSystem();
        if (this.fogSystem) this.fogSystem.visible = true;
        if (this.cloudGroup) this.cloudGroup.visible = false;
        break;
        
      case Weather.AURORA:
        this.hideAllWeatherSystems();
        break;
    }
  }

  private setCloudColor(color: number, opacity: number): void {
    if (!this.cloudGroup) return;
    this.cloudGroup.children.forEach((cloud) => {
      if (cloud instanceof THREE.Sprite && cloud.material instanceof THREE.SpriteMaterial) {
        cloud.material.color.setHex(color);
        cloud.material.opacity = opacity;
      }
    });
  }

  private showAllClouds(): void {
    if (!this.cloudGroup) return;
    this.cloudGroup.visible = true;
    this.cloudGroup.children.forEach((cloud) => {
      cloud.visible = true;
    });
  }
  
  private hideOtherWeatherSystems(): void {
    if (this.rainSystem) this.rainSystem.visible = false;
    if (this.snowSystem) this.snowSystem.visible = false;
    if (this.fogSystem) this.fogSystem.visible = false;
    if (this.starRainSystem) this.starRainSystem.visible = false;
  }

  private hideAllWeatherSystems(): void {
    if (this.rainSystem) this.rainSystem.visible = false;
    if (this.snowSystem) this.snowSystem.visible = false;
    if (this.fogSystem) this.fogSystem.visible = false;
    if (this.starRainSystem) this.starRainSystem.visible = false;
  }

  private createRainSystem(): void {
    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      velocities[i] = 0.8 + Math.random() * 0.4;
      sizes[i] = 0.5 + Math.random() * 0.5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x8888ff) },
        uOpacity: { value: 0.4 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float velocity;
        attribute float size;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          pos.y = mod(pos.y - uTime * velocity * 20.0, 80.0);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (80.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          vAlpha = smoothstep(80.0, 10.0, pos.y);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.2, dist) * uOpacity * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    this.rainSystem = new THREE.Points(geometry, material);
    this.scene.add(this.rainSystem);
  }

  private createStarRainSystem(): void {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      velocities[i] = 0.3 + Math.random() * 0.3;
      sizes[i] = 1.0 + Math.random() * 1.5;
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffd700) },
        uOpacity: { value: 0.7 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float velocity;
        attribute float size;
        attribute float phase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          pos.y = mod(pos.y - uTime * velocity * 8.0, 60.0);
          pos.x += sin(uTime * 0.5 + phase) * 0.5;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (60.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          vAlpha = smoothstep(60.0, 5.0, pos.y) * (0.7 + 0.3 * sin(uTime * 2.0 + phase));
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float glow = exp(-dist * 4.0);
          float alpha = glow * uOpacity * vAlpha;
          gl_FragColor = vec4(uColor * 1.5, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    this.starRainSystem = new THREE.Points(geometry, material);
    this.scene.add(this.starRainSystem);
  }

  private createSnowSystem(): void {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      velocities[i] = 0.2 + Math.random() * 0.3;
      sizes[i] = 1.5 + Math.random() * 2.5;
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
        uOpacity: { value: 0.8 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float velocity;
        attribute float size;
        attribute float phase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          pos.y = mod(pos.y - uTime * velocity * 5.0, 60.0);
          pos.x += sin(uTime * 0.3 + phase) * 2.0;
          pos.z += cos(uTime * 0.4 + phase * 1.3) * 1.5;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (60.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          vAlpha = smoothstep(60.0, 5.0, pos.y);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.1, dist) * uOpacity * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    
    this.snowSystem = new THREE.Points(geometry, material);
    this.scene.add(this.snowSystem);
  }

  private createFogSystem(): void {
    const particleCount = 1500;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      sizes[i] = 5.0 + Math.random() * 10.0;
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xcccccc) },
        uOpacity: { value: 0.15 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        
        void main() {
          vec3 pos = position;
          pos.x += sin(uTime * 0.1 + phase) * 3.0;
          pos.z += cos(uTime * 0.08 + phase * 0.7) * 2.0;
          pos.y += sin(uTime * 0.05 + phase * 1.5) * 0.5;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (80.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          vAlpha = 0.3 + 0.7 * smoothstep(0.0, 15.0, pos.y);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float fog = exp(-dist * 3.0);
          float alpha = fog * uOpacity * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    
    this.fogSystem = new THREE.Points(geometry, material);
    this.scene.add(this.fogSystem);
  }

  public updateSeason(season: Season): void {
    console.log(`场景切换到 ${season} 季节`);
    // 可以在这里添加季节特定的场景变化，如草地颜色、树叶等
  }

  public unlockScene(sceneId: string): void {
    this.unlockedScenes.add(sceneId);
    console.log(`场景解锁: ${sceneId}`);
  }

  public loadChunk(chunkId: string): void {
    if (this.loadedChunks.has(chunkId)) return;
    console.log(`加载场景分片: ${chunkId}`);
    // 实际项目中这里会加载具体的场景数据
  }

  public unloadChunk(chunkId: string): void {
    const chunk = this.loadedChunks.get(chunkId);
    if (chunk) {
      this.scene.remove(chunk);
      this.loadedChunks.delete(chunkId);
      console.log(`卸载场景分片: ${chunkId}`);
    }
  }

  public getAllSelectableObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (object.userData.selectable) {
        objects.push(object);
      }
    });
    return objects;
  }

  public dispose(): void {
    this.hideAllWeatherSystems();
    if (this.rainSystem) {
      this.scene.remove(this.rainSystem);
      this.rainSystem.geometry.dispose();
      (this.rainSystem.material as THREE.Material).dispose();
    }
    if (this.snowSystem) {
      this.scene.remove(this.snowSystem);
      this.snowSystem.geometry.dispose();
      (this.snowSystem.material as THREE.Material).dispose();
    }
    if (this.fogSystem) {
      this.scene.remove(this.fogSystem);
      this.fogSystem.geometry.dispose();
      (this.fogSystem.material as THREE.Material).dispose();
    }
    if (this.starRainSystem) {
      this.scene.remove(this.starRainSystem);
      this.starRainSystem.geometry.dispose();
      (this.starRainSystem.material as THREE.Material).dispose();
    }
    this.loadedChunks.clear();
  }
}
