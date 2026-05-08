// 建造系统类型定义

import { BuildingType, Vector3, InventoryItemType } from '../core/types';

export interface BuildingDefinition {
  id: string;
  name: string;
  type: BuildingType;
  description: string;
  gridSize: { w: number; h: number };
  cost?: { itemId: string; amount: number }[];
  modelPath?: string;
  iconPath?: string;
  tags?: string[];
}

export interface PlacedBuilding {
  id: string;
  buildingId: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  placedTime: number;
}

export interface TerrainGridCell {
  position: Vector3;
  gridX: number;
  gridZ: number;
  occupied: boolean;
  buildingId?: string;
  terrainHeight: number;
}

export interface BuildSystemSaveData {
  placedBuildings: PlacedBuilding[];
  terrainModifications: { position: Vector3; type: string; height?: number }[];
}

export interface TerrainTool {
  id: string;
  name: string;
  type: 'FILL' | 'DIG' | 'WATER' | 'PAVE';
  description: string;
  gridSize: number;
  costPerUse?: { itemId: string; amount: number }[];
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: InventoryItemType;
  price: number;
  iconPath?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface OrderItem {
  buildingId: string;
  amount: number;
}

export interface OrderConfig {
  orderId: string;
  items: OrderItem[];
  totalCost: number;
  discount?: number;
}
