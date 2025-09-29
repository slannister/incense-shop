(() => {
  const STORAGE_KEY = 'poc-cart';

  function readCart() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('讀取購物車失敗，已重置', error);
      return [];
    }
  }

  function writeCart(cart) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.warn('儲存購物車失敗', error);
    }
  }

  function addItem(product, quantity) {
    const cart = readCart();
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity
      });
    }

    writeCart(cart);
    return cart;
  }

  function updateQuantity(productId, quantity) {
    const cart = readCart();
    const item = cart.find(entry => entry.id === productId);
    if (!item) return cart;

    if (quantity <= 0) {
      const nextCart = cart.filter(entry => entry.id !== productId);
      writeCart(nextCart);
      return nextCart;
    }

    item.quantity = quantity;
    writeCart(cart);
    return cart;
  }

  function clearCart() {
    writeCart([]);
  }

  window.CartStore = {
    readCart,
    writeCart,
    addItem,
    updateQuantity,
    clearCart
  };
})();
