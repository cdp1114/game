import * as THREE from 'three';
import { VoxelGameEngine } from './systems/VoxelGameEngine';

const container = document.getElementById('game-container')!;
const loadingScreen = document.getElementById('loading-screen')!;

// 体素模式初始化
async function initVoxelGame() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(32, 20, 32);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -100;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  scene.add(directionalLight);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const engine = new VoxelGameEngine(scene, camera, renderer);

  engine.on('showNotification', (data: { message: string }) => {
    showNotification(data.message);
  });

  engine.on('itemCollected', (data: { itemId: string; name: string; amount: number }) => {
    console.log(`获得物品: ${data.name} x${data.amount}`);
  });

  engine.on('blockPlace', (data: { position: THREE.Vector3; blockType: number }) => {
    console.log(`放置方块: ${data.blockType} at (${data.position.x}, ${data.position.y}, ${data.position.z})`);
  });

  engine.on('blockBreak', (data: { position: THREE.Vector3 }) => {
    console.log(`破坏方块 at (${data.position.x}, ${data.position.y}, ${data.position.z})`);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  loadingScreen.classList.add('hidden');
  
  setTimeout(() => {
    engine.start();
  }, 1000);
}

function showNotification(message: string) {
  const existing = document.querySelector('.voxel-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'voxel-notification';
  notification.innerHTML = `
    <div class="voxel-notification-content">
      ${message}
    </div>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 16px 32px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #4ade80;
    border-radius: 12px;
    color: white;
    font-size: 18px;
    font-weight: bold;
    z-index: 1000;
    animation: fadeInOut 2s ease-in-out forwards;
    pointer-events: none;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
    style.remove();
  }, 2000);
}

// 直接初始化体素模式（HTML会根据URL参数加载此文件）
document.title = '🎮 体素世界 - 建造与探索';
initVoxelGame();
