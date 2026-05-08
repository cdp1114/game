// 资源背包系统 - 物品管理、商店订单、货币

import { EventEmitter } from '../core/EventEmitter';
import { InventoryItemType } from '../core/types';
import { ShopItem, OrderConfig, OrderItem } from './BuildingTypes';

export interface InventoryItem {
  itemId: string;
  name: string;
  type: InventoryItemType;
  amount: number;
  maxStack: number;
  description: string;
  iconPath?: string;
  tags?: string[];
}

export interface CurrencyData {
  starDust: number;
  starCrystals: number;
  beastTokens: number;
}

export interface InventorySaveData {
  items: { itemId: string; name: string; type: string; amount: number; maxStack: number; description: string; tags?: string[] }[];
  currencies: CurrencyData;
  capacity: number;
}

export interface ShopSaveData {
  availableItems: string[];
  orderHistory: { orderId: string; timestamp: number }[];
}

export class InventorySystem extends EventEmitter {
  private items: Map<string, InventoryItem> = new Map();
  private currencies: CurrencyData = {
    starDust: 0,
    starCrystals: 0,
    beastTokens: 0
  };

  private shopItems: Map<string, ShopItem> = new Map();
  private capacity: number = 50;
  private orderHistory: { orderId: string; timestamp: number }[] = [];

  constructor() {
    super();
    this.initializeShopItems();
  }

  private initializeShopItems(): void {
    const items: ShopItem[] = [
      { id: 'wood', name: '木材', description: '基础建造材料', type: InventoryItemType.RESOURCE, price: 10, tags: ['material', 'basic'] },
      { id: 'stone', name: '石材', description: '基础建造材料', type: InventoryItemType.RESOURCE, price: 15, tags: ['material', 'basic'] },
      { id: 'soil', name: '泥土', description: '种植用泥土', type: InventoryItemType.RESOURCE, price: 5, tags: ['material', 'crop'] },
      { id: 'glass', name: '玻璃', description: '透明建材', type: InventoryItemType.RESOURCE, price: 25, tags: ['material'] },
      { id: 'water_crystal', name: '水之结晶', description: '蕴含水元素的结晶', type: InventoryItemType.RESOURCE, price: 50, tags: ['crystal', 'element'] },
      { id: 'star_crystal', name: '星之结晶', description: '珍贵的星元素结晶', type: InventoryItemType.CURRENCY, price: 100, tags: ['crystal', 'currency'] },
      { id: 'wheat_seed', name: '小麦种子', description: '小麦的种子', type: InventoryItemType.CROP, price: 5, tags: ['seed', 'basic'] },
      { id: 'tomato_seed', name: '番茄种子', description: '番茄的种子', type: InventoryItemType.CROP, price: 8, tags: ['seed', 'basic'] },
      { id: 'star_flower_seed', name: '星绒花种子', description: '稀有星绒花的种子', type: InventoryItemType.CROP, price: 30, tags: ['seed', 'star'] },
      { id: 'moon_fruit_seed', name: '月华果种子', description: '珍贵月华果的种子', type: InventoryItemType.CROP, price: 50, tags: ['seed', 'star'] },
      { id: 'bunny_treat', name: '星兔点心', description: '星绒兔喜欢的食物', type: InventoryItemType.BEAST_FOOD, price: 20, tags: ['food', 'bunny'] },
      { id: 'bird_seed_mix', name: '云雀混合粮', description: '云朵鸟喜欢的食物', type: InventoryItemType.BEAST_FOOD, price: 25, tags: ['food', 'bird'] },
      { id: 'deer_moss', name: '雾鹿苔藓', description: '迷雾鹿喜欢的食物', type: InventoryItemType.BEAST_FOOD, price: 30, tags: ['food', 'deer'] },
    ];

    items.forEach(item => this.shopItems.set(item.id, item));
  }

  public addItem(itemId: string, name: string, type: InventoryItemType, amount: number, maxStack: number, description: string, tags?: string[]): boolean {
    const currentAmount = this.getItemAmount(itemId);
    if (currentAmount + amount > this.capacity) {
      this.emit('inventory:full', {});
      return false;
    }

    const existing = this.items.get(itemId);
    if (existing) {
      existing.amount += amount;
    } else {
      this.items.set(itemId, {
        itemId, name, type, amount, maxStack, description, tags
      });
    }

    this.emit('inventory:item_added', { itemId, amount });
    return true;
  }

  public removeItem(itemId: string, amount: number): boolean {
    const existing = this.items.get(itemId);
    if (!existing || existing.amount < amount) return false;

    existing.amount -= amount;
    if (existing.amount <= 0) {
      this.items.delete(itemId);
    }

    this.emit('inventory:item_removed', { itemId, amount });
    return true;
  }

  public getItemAmount(itemId: string): number {
    const item = this.items.get(itemId);
    return item ? item.amount : 0;
  }

  public hasItem(itemId: string, amount: number): boolean {
    return this.getItemAmount(itemId) >= amount;
  }

  public getItems(): InventoryItem[] {
    return Array.from(this.items.values());
  }

  public getItemCount(): number {
    let count = 0;
    this.items.forEach(item => count += item.amount);
    return count;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getUsedCapacity(): number {
    return this.items.size;
  }

  public getCurrencies(): CurrencyData {
    return { ...this.currencies };
  }

  public addCurrency(type: keyof CurrencyData, amount: number): void {
    this.currencies[type] += amount;
    this.emit('inventory:currency_added', { type, amount });
  }

  public removeCurrency(type: keyof CurrencyData, amount: number): boolean {
    if (this.currencies[type] < amount) return false;
    this.currencies[type] -= amount;
    this.emit('inventory:currency_spent', { type, amount });
    return true;
  }

  public getShopItems(): ShopItem[] {
    return Array.from(this.shopItems.values());
  }

  public getShopItem(itemId: string): ShopItem | undefined {
    return this.shopItems.get(itemId);
  }

  public purchaseItem(itemId: string, amount: number): boolean {
    const shopItem = this.shopItems.get(itemId);
    if (!shopItem) return false;

    const totalCost = shopItem.price * amount;
    if (this.currencies.starDust < totalCost) {
      this.emit('shop:purchase_failed', { reason: 'insufficient_funds' });
      return false;
    }

    this.removeCurrency('starDust', totalCost);
    this.addItem(
      itemId,
      shopItem.name,
      shopItem.type,
      amount,
      999,
      shopItem.description,
      shopItem.tags
    );

    this.emit('shop:item_purchased', { itemId, amount, cost: totalCost });
    return true;
  }

  public createOrder(items: OrderItem[]): OrderConfig | null {
    let totalCost = 0;
    for (const orderItem of items) {
      const shopItem = this.shopItems.get(orderItem.buildingId);
      if (!shopItem) return null;
      totalCost += shopItem.price * orderItem.amount;
    }

    const discount = totalCost > 500 ? 0.9 : totalCost > 200 ? 0.95 : 1.0;
    const finalCost = Math.floor(totalCost * discount);

    const orderId = `order_${Date.now()}`;

    return {
      orderId,
      items,
      totalCost: finalCost,
      discount: discount < 1.0 ? discount : undefined
    };
  }

  public fulfillOrder(order: OrderConfig): boolean {
    if (this.currencies.starDust < order.totalCost) {
      this.emit('shop:order_failed', { reason: 'insufficient_funds' });
      return false;
    }

    for (const orderItem of order.items) {
      const shopItem = this.shopItems.get(orderItem.buildingId);
      if (!shopItem) continue;
      this.addItem(
        orderItem.buildingId,
        shopItem.name,
        shopItem.type,
        orderItem.amount,
        999,
        shopItem.description,
        shopItem.tags
      );
    }

    this.removeCurrency('starDust', order.totalCost);
    this.orderHistory.push({ orderId: order.orderId, timestamp: Date.now() });
    this.emit('shop:order_fulfilled', { order });
    return true;
  }

  public save(): InventorySaveData {
    return {
      items: Array.from(this.items.values()).map(item => ({
        itemId: item.itemId,
        name: item.name,
        type: item.type,
        amount: item.amount,
        maxStack: item.maxStack,
        description: item.description,
        tags: item.tags
      })),
      currencies: { ...this.currencies },
      capacity: this.capacity
    };
  }

  public load(data: InventorySaveData): void {
    this.items.clear();
    data.items.forEach(itemData => {
      this.items.set(itemData.itemId, {
        itemId: itemData.itemId,
        name: itemData.name,
        type: itemData.type as InventoryItemType,
        amount: itemData.amount,
        maxStack: itemData.maxStack,
        description: itemData.description,
        tags: itemData.tags
      });
    });
    this.currencies = { ...data.currencies };
    this.capacity = data.capacity;
  }

  public getShopSaveData(): ShopSaveData {
    return {
      availableItems: Array.from(this.shopItems.keys()),
      orderHistory: [...this.orderHistory]
    };
  }

  public loadShopData(data: ShopSaveData): void {
    this.orderHistory = data.orderHistory;
  }
}
