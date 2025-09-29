(() => {
  const PAGE_SIZE = 12;

  const state = {
    products: [],
    filtered: [],
    cart: [],
    filters: { keyword: '', categoryId: 'all' },
    categories: [],
    pagination: { currentPage: 1, pageSize: PAGE_SIZE, totalPages: 0 }
  };

  const els = {
    productList: document.querySelector('[data-product-list]'),
    loadingState: document.querySelector('[data-loading-state]'),
    search: document.querySelector('[data-product-search]'),
    categoryFilter: document.querySelector('[data-category-filter]'),
    pagination: document.querySelector('[data-pagination]'),
    cartButton: document.querySelector('.cart-button'),
    cartCount: document.querySelector('[data-cart-count]'),
    cartPanel: document.querySelector('[data-cart-panel]'),
    cartBody: document.querySelector('[data-cart-body]'),
    cartFooter: document.querySelector('[data-cart-footer]'),
    cartTotal: document.querySelector('[data-cart-total]'),
    openCart: document.querySelector('[data-open-cart]'),
    closeCart: document.querySelector('[data-close-cart]'),
    checkout: document.querySelector('[data-checkout]'),
    productTemplate: document.querySelector('#product-card-template')
  };

  const shouldLoadProducts = Boolean(els.productList && els.productTemplate);

  const currencyFormatter = new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0
  });

  function readCartFromStore() {
    if (typeof window === 'undefined' || !window.CartStore) {
      return [];
    }
    return window.CartStore.readCart();
  }

  function persistCart() {
    if (typeof window === 'undefined' || !window.CartStore) {
      return;
    }
    window.CartStore.writeCart(state.cart);
  }

  function formatPrice(value) {
    return currencyFormatter.format(value);
  }

  function syncCartFromStore() {
    state.cart = readCartFromStore();
    renderCart();
    updateCartCount();
  }

  function buildCategories(products) {
    const map = new Map();

    products.forEach(product => {
      const id = product.categoryId || 'uncategorized';
      const label = product.category || id;

      if (!map.has(id)) {
        map.set(id, {
          id,
          label,
          display: `${label}（${id} 類）`,
          count: 0
        });
      }

      map.get(id).count += 1;
    });

    return Array.from(map.values());
  }

  function renderCategoryFilter() {
    if (!els.categoryFilter) return;

    const categories = [
      { id: 'all', label: '全部', display: '全部', count: state.products.length },
      ...state.categories
    ];

    els.categoryFilter.textContent = '';

    categories.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'filter-category__button';
      button.dataset.categoryId = category.id;
      button.textContent = `${category.display} (${category.count})`;

      if (state.filters.categoryId === category.id) {
        button.classList.add('is-active');
      }

      els.categoryFilter.appendChild(button);
    });
  }

  function setActiveCategoryButton() {
    if (!els.categoryFilter) return;
    els.categoryFilter
      .querySelectorAll('.filter-category__button')
      .forEach(button => {
        const categoryId = button.dataset.categoryId;
        button.classList.toggle('is-active', categoryId === state.filters.categoryId);
      });
  }

  function updatePaginationMeta(resetPage) {
    const total = state.filtered.length
      ? Math.ceil(state.filtered.length / state.pagination.pageSize)
      : 0;

    state.pagination.totalPages = total;

    if (total === 0) {
      state.pagination.currentPage = 1;
      return;
    }

    if (resetPage) {
      state.pagination.currentPage = 1;
    } else {
      if (state.pagination.currentPage > total) {
        state.pagination.currentPage = total;
      }
      if (state.pagination.currentPage < 1) {
        state.pagination.currentPage = 1;
      }
    }
  }

  function renderPagination() {
    if (!els.pagination) return;

    const { totalPages, currentPage } = state.pagination;

    if (totalPages <= 1) {
      els.pagination.hidden = true;
      els.pagination.textContent = '';
      return;
    }

    els.pagination.hidden = false;
    els.pagination.textContent = '';

    const createButton = (label, page, options = {}) => {
      const { disabled = false, ariaLabel, isActive = false } = options;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pagination__button';
      button.textContent = label;
      if (ariaLabel) {
        button.setAttribute('aria-label', ariaLabel);
      }
      if (page !== undefined && page !== null) {
        button.dataset.page = String(page);
      }
      if (disabled) {
        button.disabled = true;
      }
      if (isActive) {
        button.classList.add('is-active');
      }
      return button;
    };

    const prevButton = createButton('<', currentPage - 1, {
      disabled: currentPage === 1,
      ariaLabel: '上一頁'
    });
    els.pagination.appendChild(prevButton);

    for (let page = 1; page <= totalPages; page += 1) {
      const pageButton = createButton(String(page), page, {
        isActive: page === currentPage,
        ariaLabel: `前往第 ${page} 頁`
      });
      els.pagination.appendChild(pageButton);
    }

    const nextButton = createButton('>', currentPage + 1, {
      disabled: currentPage === totalPages,
      ariaLabel: '下一頁'
    });
    els.pagination.appendChild(nextButton);
  }

  function applyFilters(options = {}) {
    const { resetPage = false } = options;
    const keyword = state.filters.keyword.trim().toLowerCase();
    const categoryId = state.filters.categoryId;

    state.filtered = state.products.filter(product => {
      const name = (product.name || '').toLowerCase();
      const description = (product.description || '').toLowerCase();
      const category = (product.category || '').toLowerCase();
      const matchesKeyword =
        !keyword ||
        name.includes(keyword) ||
        description.includes(keyword) ||
        category.includes(keyword);
      const matchesCategory = categoryId === 'all' || product.categoryId === categoryId;
      return matchesKeyword && matchesCategory;
    });

    updatePaginationMeta(resetPage);
  }

  function setLoading(isLoading) {
    if (!els.loadingState) return;
    els.loadingState.toggleAttribute('hidden', !isLoading);
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('無法取得商品資料');
      }
      const data = await response.json();
      const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      state.products = items;
      state.filters = { keyword: '', categoryId: 'all' };
      state.categories = buildCategories(state.products);
      renderCategoryFilter();
      applyFilters({ resetPage: true });
      renderProducts();
      setActiveCategoryButton();
      if (els.search) {
        els.search.value = '';
      }
    } catch (error) {
      console.error(error);
      renderError('載入商品失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  function renderError(message) {
    if (!els.productList) return;
    els.productList.innerHTML = `<div class="error-state">${message}</div>`;
    if (els.pagination) {
      els.pagination.hidden = true;
      els.pagination.textContent = '';
    }
  }

  function renderProducts() {
    if (!els.productList) return;

    els.productList.textContent = '';

    if (!state.filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '目前沒有符合條件的商品。';
      els.productList.appendChild(empty);
      renderPagination();
      return;
    }

    const { currentPage, pageSize } = state.pagination;
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = state.filtered.slice(startIndex, startIndex + pageSize);

    pageItems.forEach(product => {
      const card = renderProductCard(product);
      els.productList.appendChild(card);
    });

    renderPagination();
  }

  function renderProductCard(product) {
    const template = els.productTemplate.content.cloneNode(true);
    const imageLink = template.querySelector('.product-card__image-link');
    const image = template.querySelector('.product-card__image');
    const titleLink = template.querySelector('.product-card__title a');
    const description = template.querySelector('.product-card__description');
    const highlights = template.querySelector('.product-card__highlights');
    const price = template.querySelector('.product-card__price');
    const addToCartBtn = template.querySelector('[data-add-to-cart]');
    const categoryBadge = template.querySelector('[data-product-category]');

    if (image) {
      image.src = product.image;
      image.alt = `${product.name} 商品圖片`;
    }

    if (titleLink) {
      titleLink.textContent = product.name;
    } else {
      const titleFallback = template.querySelector('.product-card__title');
      if (titleFallback) {
        titleFallback.textContent = product.name;
      }
    }

    if (description) {
      description.textContent = product.description;
    }

    if (price) {
      price.textContent = formatPrice(product.price);
    }

    if (categoryBadge) {
      categoryBadge.textContent = product.category ? `${product.category}（${product.categoryId} 類）` : '未分類';
    }

    const detailHref = `product.html?id=${encodeURIComponent(product.id)}`;

    const detailLinks = Array.from(template.querySelectorAll('[data-view-detail]'));
    detailLinks.forEach(link => {
      link.href = detailHref;
    });

    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        addToCart(product.id, 1);
        toggleCart(true);
      });
    }

    highlights.textContent = '';
    if (Array.isArray(product.highlights)) {
      product.highlights.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        highlights.appendChild(li);
      });
    }

    return template;
  }

  function addToCart(productId, quantity = 1) {
    const product = state.products.find(item => item.id === productId);
    if (!product) return;

    const existing = state.cart.find(item => item.id === productId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      state.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity
      });
    }

    persistCart();
    syncCartFromStore();
  }

  function updateCartCount() {
    if (!els.cartCount) return;
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    els.cartCount.textContent = totalItems;
  }

  function renderCart() {
    if (!els.cartBody || !els.cartFooter) return;

    els.cartBody.textContent = '';

    if (!state.cart.length) {
      const empty = document.createElement('p');
      empty.className = 'cart-empty';
      empty.textContent = '購物車目前沒有商品。';
      els.cartBody.appendChild(empty);
      els.cartFooter.hidden = true;
      if (els.cartTotal) {
        els.cartTotal.textContent = formatPrice(0);
      }
      return;
    }

    state.cart.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.className = 'cart-item';

      wrapper.innerHTML = `
        <div class="cart-item__header">
          <h4 class="cart-item__title">${item.name}</h4>
          <span class="cart-item__price">${formatPrice(item.price * item.quantity)}</span>
        </div>
        <div class="cart-item__controls">
          <button type="button" data-action="decrease" aria-label="減少數量">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-action="increase" aria-label="增加數量">＋</button>
          <button type="button" data-action="remove" aria-label="移除">移除</button>
        </div>
      `;

      wrapper.addEventListener('click', event => {
        const action = event.target.dataset.action;
        if (!action) return;
        event.stopPropagation();
        if (action === 'increase') incrementItem(item.id);
        if (action === 'decrease') decrementItem(item.id);
        if (action === 'remove') removeItem(item.id);
      });

      els.cartBody.appendChild(wrapper);
    });

    els.cartFooter.hidden = false;
    if (els.cartTotal) {
      els.cartTotal.textContent = formatPrice(
        state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      );
    }
  }

  function incrementItem(productId) {
    const item = state.cart.find(cartItem => cartItem.id === productId);
    if (!item) return;
    item.quantity += 1;
    persistCart();
    syncCartFromStore();
  }

  function decrementItem(productId) {
    const item = state.cart.find(cartItem => cartItem.id === productId);
    if (!item) return;
    item.quantity -= 1;
    if (item.quantity <= 0) {
      removeItem(productId);
      return;
    }
    persistCart();
    syncCartFromStore();
  }

  function removeItem(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    persistCart();
    syncCartFromStore();
  }

  function toggleCart(shouldOpen) {
    if (!els.cartPanel || !els.cartButton) return;
    const isOpen = shouldOpen !== undefined ? shouldOpen : els.cartPanel.hidden;
    els.cartPanel.hidden = !isOpen;
    els.cartButton.setAttribute('aria-expanded', String(isOpen));
  }

  async function handleCheckout() {
    if (!state.cart.length) return;

    const payload = {
      cart: state.cart.map(item => ({ id: item.id, quantity: item.quantity })),
      customer: {
        name: 'POC 測試用戶',
        email: 'customer@example.com'
      }
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('下單失敗');
      }

      const data = await response.json();
      alert(`訂單建立成功：${data.order.id}`);
      state.cart = [];
      persistCart();
      syncCartFromStore();
      toggleCart(false);
    } catch (error) {
      console.error(error);
      alert('下單失敗，請稍後再試。');
    }
  }

  function bindEvents() {
    els.cartButton?.addEventListener('click', () => toggleCart());
    els.openCart?.addEventListener('click', () => toggleCart(true));
    els.closeCart?.addEventListener('click', () => toggleCart(false));
    els.checkout?.addEventListener('click', handleCheckout);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        toggleCart(false);
      }
    });

    if (els.search) {
      let debounceTimer;
      els.search.addEventListener('input', event => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.filters.keyword = event.target.value || '';
          applyFilters({ resetPage: true });
          renderProducts();
        }, 200);
      });
    }

    els.categoryFilter?.addEventListener('click', event => {
      const button = event.target.closest('[data-category-id]');
      if (!button) return;
      const categoryId = button.dataset.categoryId;
      if (!categoryId || state.filters.categoryId === categoryId) return;
      state.filters.categoryId = categoryId;
      applyFilters({ resetPage: true });
      renderProducts();
      setActiveCategoryButton();
    });

    els.pagination?.addEventListener('click', event => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      const page = Number.parseInt(button.dataset.page, 10);
      if (Number.isNaN(page)) return;
      const { totalPages } = state.pagination;
      const nextPage = Math.min(Math.max(page, 1), totalPages || 1);
      if (nextPage === state.pagination.currentPage) return;
      state.pagination.currentPage = nextPage;
      renderProducts();
      const productSection = document.getElementById('products');
      productSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    window.addEventListener('cart:updated', syncCartFromStore);
  }

  function init() {
    bindEvents();
    syncCartFromStore();
    if (shouldLoadProducts) {
      fetchProducts();
    }
  }

  init();
})();
