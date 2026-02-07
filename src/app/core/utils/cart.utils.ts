import { CartItem } from '../models';


export function cartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartSubtotal(cart: CartItem[]): number {
  return cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
}
