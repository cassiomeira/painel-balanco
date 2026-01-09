export interface Product {
  id?: number; // Supabase ID
  code: string;
  quantity: number;
  name?: string;
}

export type InventoryContextType = {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (index: number, quantity: number) => void;
  removeProduct: (index: number) => void;
  clearInventory: () => void;
};
