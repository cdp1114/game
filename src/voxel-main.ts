import { VoxelGameEngine } from './systems/VoxelGameEngine';

const container = document.getElementById('game-container')!;
const loadingScreen = document.getElementById('loading-screen')!;

async function initVoxelGame() {
  const engine = new VoxelGameEngine({
    container,
    width: window.innerWidth,
    height: window.innerHeight
  });

  engine.on('showNotification', (data: { message: string }) => {
    showNotification(data.message);
  });

  engine.on('itemCollected', (data: { itemId: string; name: string; amount: number }) => {
    console.log(`获得物品: ${data.name} x${data.amount}`);
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

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');

if (mode === 'voxel') {
  document.title = '体素世界 - 建造与探索';
  initVoxelGame();
} else {
  import('./main').then(() => {
    console.log('原版星野栖所已加载');
  }).catch(() => {
    console.warn('无法加载原版游戏，切换到体素模式');
    initVoxelGame();
  });
}
