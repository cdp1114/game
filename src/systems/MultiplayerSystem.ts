// 联机系统 - 多人游戏、房间管理、同步

import { EventEmitter } from '../core/EventEmitter';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  position: { x: number; y: number; z: number };
  isHost: boolean;
  isReady: boolean;
  color: string;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'playing';
  settings: RoomSettings;
  createdAt: number;
}

export interface RoomSettings {
  allowCheats: boolean;
  gameSpeed: number;
  weatherSync: boolean;
  inventoryShare: boolean;
}

export interface GameAction {
  type: 'player_join' | 'player_leave' | 'player_move' | 'player_action' | 'sync_state';
  playerId: string;
  timestamp: number;
  data: any;
}

export interface MultiplayerSaveData {
  currentRoomId: string | null;
  playerId: string;
  playerName: string;
  roomHistory: { roomId: string; roomName: string; timestamp: number }[];
}

export class MultiplayerSystem extends EventEmitter {
  private playerId: string;
  private playerName: string;
  private currentRoom: Room | null = null;
  private connectedPlayers: Map<string, Player> = new Map();
  private roomHistory: { roomId: string; roomName: string; timestamp: number }[] = [];
  private actionQueue: GameAction[] = [];
  private isHost: boolean = false;
  private isConnected: boolean = false;
  private syncInterval: number | null = null;

  private availableRooms: Room[] = [];

  constructor() {
    super();
    this.playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.playerName = '星野旅人';
    this.addDemoRooms();
  }

  private addDemoRooms(): void {
    this.availableRooms.push({
      id: 'room_demo_1',
      name: '🌟 星野工坊 - 休闲种植',
      hostId: 'host_1',
      players: [
        { id: 'host_1', name: '小星', avatar: '⭐', position: { x: 0, y: 0, z: 0 }, isHost: true, isReady: true, color: '#FFD700' },
        { id: 'player_2', name: '月光', avatar: '🌙', position: { x: 5, y: 0, z: 3 }, isHost: false, isReady: true, color: '#87CEEB' }
      ],
      maxPlayers: 4,
      status: 'waiting',
      settings: { allowCheats: false, gameSpeed: 1, weatherSync: true, inventoryShare: false },
      createdAt: Date.now() - 3600000
    });

    this.availableRooms.push({
      id: 'room_demo_2',
      name: '🌾 丰收乐园 - 新手友好',
      hostId: 'host_2',
      players: [
        { id: 'host_2', name: '农夫阿星', avatar: '🧑‍🌾', position: { x: 0, y: 0, z: 0 }, isHost: true, isReady: true, color: '#90EE90' }
      ],
      maxPlayers: 4,
      status: 'waiting',
      settings: { allowCheats: true, gameSpeed: 1.5, weatherSync: true, inventoryShare: true },
      createdAt: Date.now() - 7200000
    });
  }

  public createRoom(name: string, maxPlayers: number = 4): Room {
    if (this.currentRoom) {
      this.leaveRoom();
    }

    const room: Room = {
      id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      hostId: this.playerId,
      players: [{
        id: this.playerId,
        name: this.playerName,
        avatar: '🌟',
        position: { x: 0, y: 0, z: 0 },
        isHost: true,
        isReady: true,
        color: '#FFD700'
      }],
      maxPlayers,
      status: 'waiting',
      settings: {
        allowCheats: false,
        gameSpeed: 1,
        weatherSync: true,
        inventoryShare: false
      },
      createdAt: Date.now()
    };

    this.currentRoom = room;
    this.connectedPlayers.set(this.playerId, room.players[0]);
    this.isHost = true;
    this.isConnected = true;

    this.startSync();
    this.emit('roomCreated', { room });
    return room;
  }

  public joinRoom(roomId: string): boolean {
    const room = this.availableRooms.find(r => r.id === roomId);
    if (!room) return false;

    if (room.players.length >= room.maxPlayers) {
      this.emit('joinFailed', { reason: 'room_full' });
      return false;
    }

    if (room.status !== 'waiting') {
      this.emit('joinFailed', { reason: 'game_in_progress' });
      return false;
    }

    const player: Player = {
      id: this.playerId,
      name: this.playerName,
      avatar: '🌟',
      position: { x: 0, y: 0, z: 0 },
      isHost: false,
      isReady: false,
      color: this.getRandomColor()
    };

    room.players.push(player);
    this.currentRoom = room;
    this.connectedPlayers.set(this.playerId, player);
    this.isHost = false;
    this.isConnected = true;

    this.roomHistory.push({ roomId, roomName: room.name, timestamp: Date.now() });

    this.startSync();
    this.emit('roomJoined', { room, player });
    this.emit('playerJoined', { player });
    return true;
  }

  public leaveRoom(): void {
    if (!this.currentRoom) return;

    const roomId = this.currentRoom.id;
    const wasHost = this.isHost;

    if (wasHost) {
      if (this.currentRoom.players.length > 1) {
        const newHost = this.currentRoom.players.find(p => p.id !== this.playerId);
        if (newHost) {
          newHost.isHost = true;
          this.currentRoom.hostId = newHost.id;
        }
      }
    }

    this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== this.playerId);
    this.connectedPlayers.delete(this.playerId);
    this.isConnected = false;
    this.isHost = false;

    if (this.currentRoom.players.length === 0) {
      this.availableRooms = this.availableRooms.filter(r => r.id !== roomId);
    }

    this.stopSync();
    this.currentRoom = null;

    this.emit('roomLeft', { roomId, wasHost });
    if (!wasHost) {
      this.emit('playerLeft', { playerId: this.playerId });
    }
  }

  public kickPlayer(playerId: string): boolean {
    if (!this.isHost || !this.currentRoom) return false;

    const player = this.currentRoom.players.find(p => p.id === playerId);
    if (!player || player.isHost) return false;

    this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== playerId);
    this.connectedPlayers.delete(playerId);

    this.emit('playerKicked', { playerId });
    return true;
  }

  public setReady(ready: boolean): void {
    const player = this.connectedPlayers.get(this.playerId);
    if (player) {
      player.isReady = ready;
      this.emit('playerReadyChanged', { player, isReady: ready });
    }
  }

  public startGame(): boolean {
    if (!this.isHost || !this.currentRoom) return false;

    const allReady = this.currentRoom.players.every(p => p.isHost || p.isReady);
    if (!allReady) {
      this.emit('startFailed', { reason: 'not_all_ready' });
      return false;
    }

    this.currentRoom.status = 'starting';
    this.emit('gameStarting', { room: this.currentRoom });

    setTimeout(() => {
      if (this.currentRoom) {
        this.currentRoom.status = 'playing';
        this.emit('gameStarted', { room: this.currentRoom });
      }
    }, 3000);

    return true;
  }

  public updatePosition(x: number, y: number, z: number): void {
    const player = this.connectedPlayers.get(this.playerId);
    if (player) {
      player.position = { x, y, z };
      this.queueAction({
        type: 'player_move',
        playerId: this.playerId,
        timestamp: Date.now(),
        data: { x, y, z }
      });
    }
  }

  public performAction(action: string, data: any): void {
    this.queueAction({
      type: 'player_action',
      playerId: this.playerId,
      timestamp: Date.now(),
      data: { action, ...data }
    });
  }

  private queueAction(action: GameAction): void {
    this.actionQueue.push(action);
    if (this.actionQueue.length > 100) {
      this.actionQueue.shift();
    }
  }

  private startSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      if (this.currentRoom && this.isConnected) {
        this.syncState();
      }
    }, 100);
  }

  private stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private syncState(): void {
    if (!this.currentRoom) return;

    this.emit('stateSync', {
      room: this.currentRoom,
      actions: [...this.actionQueue]
    });

    this.actionQueue = [];
  }

  public updateSettings(settings: Partial<RoomSettings>): void {
    if (!this.isHost || !this.currentRoom) return;

    this.currentRoom.settings = { ...this.currentRoom.settings, ...settings };
    this.emit('settingsChanged', { settings: this.currentRoom.settings });
  }

  public getAvailableRooms(): Room[] {
    return this.availableRooms.filter(r => r.status === 'waiting' && r.players.length < r.maxPlayers);
  }

  public getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  public getPlayers(): Player[] {
    return this.currentRoom ? this.currentRoom.players : [];
  }

  public getPlayerCount(): number {
    return this.currentRoom ? this.currentRoom.players.length : 0;
  }

  public isPlayerHost(): boolean {
    return this.isHost;
  }

  public getPlayerId(): string {
    return this.playerId;
  }

  public getPlayerName(): string {
    return this.playerName;
  }

  public setPlayerName(name: string): void {
    this.playerName = name;
    const player = this.connectedPlayers.get(this.playerId);
    if (player) {
      player.name = name;
    }
  }

  public isInRoom(): boolean {
    return this.currentRoom !== null;
  }

  public isInGame(): boolean {
    return this.currentRoom?.status === 'playing';
  }

  public getRoomHistory(): { roomId: string; roomName: string; timestamp: number }[] {
    return [...this.roomHistory];
  }

  private getRandomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public save(): MultiplayerSaveData {
    return {
      currentRoomId: this.currentRoom?.id || null,
      playerId: this.playerId,
      playerName: this.playerName,
      roomHistory: [...this.roomHistory]
    };
  }

  public load(data: MultiplayerSaveData): void {
    this.playerId = data.playerId;
    this.playerName = data.playerName;
    this.roomHistory = data.roomHistory;
  }
}
