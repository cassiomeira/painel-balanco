export interface Product {
  id?: number; // Supabase ID
  code: string;
  quantity: number;
  name?: string;
  needs_correction?: boolean;
}

export interface CartItem {
  code: string;
  name: string;
  price: number;
  quantity: number;
}

export type InventoryContextType = {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (index: number, quantity: number) => void;
  removeProduct: (index: number) => void;
  clearInventory: () => void;
  // Shopping Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  // Security
  isIpAuthorized: boolean | null;
  checkIp: () => Promise<void>;
};
