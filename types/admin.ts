export interface AdminUser {
  id: number;
  username: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Product {
  id: number;
  externalId?: string;
  name: string;
  description?: string;
  retailPrice: number;
  productUse?: string;
  productBenefits?: string;
  application?: string;
  productType?: string;
  category?: string;
  categorySortOrder?: number;
  imageUrl?: string;
  imageTag?: string;
  inStock: boolean;
  quantity: number;
  minQuantity?: number;
  skinTypes?: string[];
  matchingAttributes?: string[];
  matches?: string;
  discount?: string;
  shopifyUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendingSlot {
  slotId: number;
  productId?: number;
  quantity: number;
  productName?: string;
  category?: string;
  retailPrice?: number;
  lastUpdated?: string;
}

export interface SlotInfo {
  slotId: number;
  quantity: number;
  productId?: number;
  productName?: string;
  category?: string;
  retailPrice?: number;
  imageUrl?: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
  };
}

export interface AssignProductRequest {
  slotId: number;
  productId?: number;
  quantity?: number;
}

export interface UpdateSlotQuantityRequest {
  slotId: number;
  changeAmount: number;
}

export interface SyncResponse {
  success: boolean;
  message: string;
}

export interface MotorControlRequest {
  command: string;
}

export interface MotorControlResponse {
  success: boolean;
  message: string;
  response?: string;
}
