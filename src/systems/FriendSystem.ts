// 好友系统 - 玩家社交、互赠礼物、拜访家园

import { EventEmitter } from '../core/EventEmitter';

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  level: number;
  status: 'online' | 'offline' | 'away';
  lastOnline: number;
  intimacy: number;
  giftCount: number;
  visitCount: number;
}

export interface Gift {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  value: number;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: number;
  message?: string;
}

export interface VisitRecord {
  friendId: string;
  friendName: string;
  timestamp: number;
  giftSent: boolean;
}

export interface FriendSaveData {
  friends: Friend[];
  sentGifts: { friendId: string; giftId: string; timestamp: number }[];
  receivedGifts: { friendId: string; giftId: string; timestamp: number }[];
  visitHistory: VisitRecord[];
  pendingRequests: FriendRequest[];
}

export class FriendSystem extends EventEmitter {
  private friends: Map<string, Friend> = new Map();
  private sentGifts: { friendId: string; giftId: string; timestamp: number }[] = [];
  private receivedGifts: { friendId: string; giftId: string; timestamp: number }[] = [];
  private visitHistory: VisitRecord[] = [];
  private pendingRequests: FriendRequest[] = [];

  private gifts: Map<string, Gift> = new Map();

  constructor() {
    super();
    this.initializeGifts();
    this.addDemoFriends();
  }

  private initializeGifts(): void {
    const giftList: Gift[] = [
      { id: 'star_flower', name: '星绒花', description: '散发着柔和光芒的神秘花朵', icon: '🌸', rarity: 'rare', value: 50 },
      { id: 'moon_crystal', name: '月华晶', description: '蕴含月光精华的结晶', icon: '💎', rarity: 'epic', value: 100 },
      { id: 'lucky_clover', name: '幸运四叶草', description: '传说能带来好运的草', icon: '🍀', rarity: 'rare', value: 30 },
      { id: 'crystal_bell', name: '水晶风铃', description: '清脆悦耳的风铃', icon: '🔔', rarity: 'rare', value: 40 },
      { id: 'golden_acorn', name: '金色橡果', description: '闪闪发光的珍贵橡果', icon: '🌰', rarity: 'epic', value: 80 },
      { id: 'rainbow_feather', name: '彩虹羽毛', description: '七彩斑斓的梦幻羽毛', icon: '🪶', rarity: 'legendary', value: 200 },
      { id: 'moon_cake', name: '星月月饼', description: '可爱的小点心', icon: '🥮', rarity: 'common', value: 10 },
      { id: 'honey_jam', name: '花蜜果酱', description: '香甜可口', icon: '🍯', rarity: 'common', value: 15 },
      { id: 'crystal_grape', name: '水晶葡萄', description: '晶莹剔透的美味葡萄', icon: '🍇', rarity: 'rare', value: 35 },
      { id: 'golden_apple', name: '金色苹果', description: '传说中的黄金苹果', icon: '🍎', rarity: 'legendary', value: 150 }
    ];

    giftList.forEach(gift => this.gifts.set(gift.id, gift));
  }

  private addDemoFriends(): void {
    this.friends.set('demo_friend_1', {
      id: 'demo_friend_1',
      name: '星云游侠',
      avatar: '🧑‍🚀',
      level: 15,
      status: 'online',
      lastOnline: Date.now(),
      intimacy: 450,
      giftCount: 3,
      visitCount: 5
    });
    this.friends.set('demo_friend_2', {
      id: 'demo_friend_2',
      name: '月夜精灵',
      avatar: '🧚',
      level: 22,
      status: 'offline',
      lastOnline: Date.now() - 3600000,
      intimacy: 720,
      giftCount: 8,
      visitCount: 12
    });
  }

  public addFriend(friendId: string, name: string, avatar: string = '🧑‍🌾'): Friend {
    if (this.friends.has(friendId)) {
      return this.friends.get(friendId)!;
    }

    const friend: Friend = {
      id: friendId,
      name,
      avatar,
      level: 1,
      status: 'offline',
      lastOnline: Date.now(),
      intimacy: 0,
      giftCount: 0,
      visitCount: 0
    };

    this.friends.set(friendId, friend);
    this.emit('friendAdded', { friend });
    return friend;
  }

  public removeFriend(friendId: string): boolean {
    const friend = this.friends.get(friendId);
    if (!friend) return false;

    this.friends.delete(friendId);
    this.emit('friendRemoved', { friend });
    return true;
  }

  public getFriend(friendId: string): Friend | undefined {
    return this.friends.get(friendId);
  }

  public getAllFriends(): Friend[] {
    return Array.from(this.friends.values());
  }

  public getOnlineFriends(): Friend[] {
    return Array.from(this.friends.values()).filter(f => f.status === 'online');
  }

  public getOfflineFriends(): Friend[] {
    return Array.from(this.friends.values()).filter(f => f.status === 'offline');
  }

  public sendGift(friendId: string, giftId: string): boolean {
    const friend = this.friends.get(friendId);
    const gift = this.gifts.get(giftId);

    if (!friend || !gift) return false;

    this.sentGifts.push({ friendId, giftId, timestamp: Date.now() });
    friend.giftCount++;
    friend.intimacy += gift.value;

    this.emit('giftSent', { friend, gift });
    return true;
  }

  public receiveGift(fromFriendId: string, giftId: string): void {
    const gift = this.gifts.get(giftId);
    if (!gift) return;

    this.receivedGifts.push({ friendId: fromFriendId, giftId, timestamp: Date.now() });
    this.emit('giftReceived', { friendId: fromFriendId, gift });
  }

  public visitFriend(friendId: string): void {
    const friend = this.friends.get(friendId);
    if (!friend) return;

    friend.visitCount++;
    this.visitHistory.push({
      friendId,
      friendName: friend.name,
      timestamp: Date.now(),
      giftSent: false
    });

    this.emit('friendVisited', { friend });
  }

  public sendGiftOnVisit(friendId: string, giftId: string): void {
    const friend = this.friends.get(friendId);
    const gift = this.gifts.get(giftId);
    if (!friend || !gift) return;

    this.visitHistory.push({
      friendId,
      friendName: friend.name,
      timestamp: Date.now(),
      giftSent: true
    });

    friend.visitCount++;
    friend.giftCount++;
    friend.intimacy += gift.value;

    this.emit('giftSentOnVisit', { friend, gift });
  }

  public addFriendRequest(request: FriendRequest): void {
    this.pendingRequests.push(request);
    this.emit('friendRequestReceived', { request });
  }

  public acceptFriendRequest(requestId: string): boolean {
    const requestIndex = this.pendingRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return false;

    const request = this.pendingRequests[requestIndex];
    this.pendingRequests.splice(requestIndex, 1);

    this.addFriend(request.senderId, request.senderName, request.senderAvatar);
    this.emit('friendRequestAccepted', { request });

    return true;
  }

  public rejectFriendRequest(requestId: string): boolean {
    const requestIndex = this.pendingRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return false;

    this.pendingRequests.splice(requestIndex, 1);
    this.emit('friendRequestRejected', { requestId });
    return true;
  }

  public getPendingRequests(): FriendRequest[] {
    return [...this.pendingRequests];
  }

  public getGifts(): Gift[] {
    return Array.from(this.gifts.values());
  }

  public getGift(giftId: string): Gift | undefined {
    return this.gifts.get(giftId);
  }

  public getGiftsByRarity(rarity: Gift['rarity']): Gift[] {
    return Array.from(this.gifts.values()).filter(g => g.rarity === rarity);
  }

  public getVisitHistory(): VisitRecord[] {
    return [...this.visitHistory].sort((a, b) => b.timestamp - a.timestamp);
  }

  public getTotalGiftCount(): number {
    return this.sentGifts.length;
  }

  public getTotalVisitCount(): number {
    return this.visitHistory.length;
  }

  public save(): FriendSaveData {
    return {
      friends: Array.from(this.friends.values()),
      sentGifts: [...this.sentGifts],
      receivedGifts: [...this.receivedGifts],
      visitHistory: [...this.visitHistory],
      pendingRequests: [...this.pendingRequests]
    };
  }

  public load(data: FriendSaveData): void {
    this.friends.clear();
    data.friends.forEach(friend => this.friends.set(friend.id, friend));
    this.sentGifts = data.sentGifts;
    this.receivedGifts = data.receivedGifts;
    this.visitHistory = data.visitHistory;
    this.pendingRequests = data.pendingRequests;
  }
}
