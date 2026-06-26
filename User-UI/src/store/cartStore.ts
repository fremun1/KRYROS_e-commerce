import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  shippingFee?: number;
  estimatedDeliveryDays?: number;
  estimatedDeliveryMinDays?: number;
  estimatedDeliveryMaxDays?: number;
  condition?: string;
}

interface CartState {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  cartCount: () => number;
  cartTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (item) => set((state) => {
        const existing = state.items.find(i => i.id === item.id);
        if (existing) {
          return {
            items: state.items.map(i =>
              i.id === item.id
                ? {
                    ...i,
                    qty: i.qty + item.qty,
                    // Ensure we update shipping and delivery info if it was missing in the old version
                    shippingFee: item.shippingFee ?? i.shippingFee,
                    estimatedDeliveryDays: item.estimatedDeliveryDays ?? i.estimatedDeliveryDays,
                    estimatedDeliveryMinDays: item.estimatedDeliveryMinDays ?? i.estimatedDeliveryMinDays,
                    estimatedDeliveryMaxDays: item.estimatedDeliveryMaxDays ?? i.estimatedDeliveryMaxDays,
                    condition: item.condition ?? i.condition,
                  }
                : i
            ),
          };
        }
        return { items: [...state.items, item] };
      }),
      removeFromCart: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),
      updateQty: (id, qty) => set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, qty } : i)
      })),
      clearCart: () => set({ items: [] }),
      cartCount: () => get().items.reduce((total, item) => total + item.qty, 0),
      cartTotal: () => get().items.reduce((total, item) => total + (item.price * item.qty), 0),
    }),
    {
      name: 'cart-storage',
    }
  )
);
