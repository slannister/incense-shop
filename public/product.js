(() => {
  const els = {
    heroSection: document.querySelector('[data-detail-hero]'),
    errorSection: document.querySelector('[data-detail-error]'),
    image: document.querySelector('[data-detail-image]'),
    title: document.querySelector('[data-detail-title]'),
    description: document.querySelector('[data-detail-description]'),
    price: document.querySelector('[data-detail-price]'),
    category: document.querySelector('[data-detail-category]'),
    highlights: document.querySelector('[data-detail-highlights]'),
    gallery: document.querySelector('[data-detail-gallery]'),
    lightbox: document.querySelector('[data-lightbox]'),
    lightboxImage: document.querySelector('[data-lightbox-image]'),
    lightboxIndicator: document.querySelector('[data-lightbox-indicator]'),
    lightboxPrev: document.querySelector('[data-lightbox-prev]'),
    lightboxNext: document.querySelector('[data-lightbox-next]'),
    lightboxClose: document.querySelectorAll('[data-lightbox-close]'),
    lightboxTrigger: document.querySelector('[data-open-lightbox]'),
    quantity: document.querySelector('[data-detail-quantity]'),
    addButton: document.querySelector('[data-detail-add]'),
    feedback: document.querySelector('[data-detail-feedback]')
  };

  let currentProduct = null;
  let currentImageIndex = 0;
  let lightboxIndex = 0;

  const currencyFormatter = new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0
  });

  function formatPrice(value) {
    return currencyFormatter.format(value);
  }

  function showError(message) {
    if (els.heroSection) {
      els.heroSection.hidden = true;
    }
    if (els.errorSection) {
      els.errorSection.hidden = false;
      if (message) {
        const paragraph = els.errorSection.querySelector('p');
        if (paragraph) {
          paragraph.textContent = message;
        }
      }
    }
  }

  function renderProduct(product) {
    if (!els.heroSection) return;

    els.heroSection.hidden = false;
    if (els.errorSection) {
      els.errorSection.hidden = true;
    }

    const galleryImages = Array.isArray(product.gallery) && product.gallery.length
      ? product.gallery
      : [product.image];
    currentProduct = { ...product, gallery: galleryImages };
    currentImageIndex = 0;

    if (els.quantity) {
      els.quantity.value = '1';
    }

    if (els.feedback) {
      els.feedback.hidden = true;
      els.feedback.textContent = '';
    }

    document.title = `${product.name} | Drip & Brew`;

    if (els.image) {
      els.image.src = galleryImages[0] || product.image;
      els.image.alt = `${product.name} 商品圖片`;
    }

    if (els.title) {
      els.title.textContent = product.name;
    }

    if (els.description) {
      els.description.textContent = product.description || '';
    }

    if (els.price) {
      els.price.textContent = formatPrice(product.price);
    }

    if (els.category) {
      const categoryLabel = product.category
        ? `${product.category}（${product.categoryId || ''} 類）`
        : '未分類';
      els.category.textContent = categoryLabel;
    }

    if (els.highlights) {
      els.highlights.textContent = '';
      if (Array.isArray(product.highlights) && product.highlights.length) {
        product.highlights.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          els.highlights.appendChild(li);
        });
        els.highlights.parentElement?.removeAttribute('hidden');
      } else {
        els.highlights.parentElement?.setAttribute('hidden', '');
      }
    }

    if (els.gallery) {
      renderGallery(galleryImages);
    }

    setLightboxImage(0);
  }

  function renderGallery(images) {
    if (!els.gallery) return;
    els.gallery.textContent = '';

    if (!Array.isArray(images) || images.length <= 1) {
      els.gallery.hidden = true;
      return;
    }

    els.gallery.hidden = false;

    images.forEach((src, index) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'detail-gallery__thumb';

      const img = document.createElement('img');
      img.src = src;
      img.alt = `${currentProduct?.name || '商品'} 圖片 ${index + 1}`;
      thumb.appendChild(img);

      thumb.addEventListener('click', () => setActiveImage(index));
      els.gallery.appendChild(thumb);
    });

    setActiveImage(0);
  }

  function openLightbox(index = currentImageIndex) {
    if (!els.lightbox || !currentProduct) return;
    setLightboxImage(index);
    els.lightbox.hidden = false;
    document.body.classList.add('no-scroll');
  }

  function closeLightbox() {
    if (!els.lightbox) return;
    els.lightbox.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  function setLightboxImage(index) {
    if (!currentProduct) return;
    const images = currentProduct.gallery || [];
    if (!images.length) return;
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    lightboxIndex = safeIndex;

    if (els.lightboxImage) {
      els.lightboxImage.src = images[safeIndex];
      els.lightboxImage.alt = `${currentProduct.name} 商品圖片 ${safeIndex + 1}`;
    }

    if (els.lightboxIndicator) {
      els.lightboxIndicator.textContent = `${safeIndex + 1} / ${images.length}`;
    }
  }

  function showNextImage(step = 1) {
    if (!currentProduct) return;
    const images = currentProduct.gallery || [];
    if (!images.length) return;
    const nextIndex = (currentImageIndex + step + images.length) % images.length;
    setActiveImage(nextIndex);
    setLightboxImage(nextIndex);
  }

  function setActiveImage(index) {
    if (!currentProduct || !Array.isArray(currentProduct.gallery)) return;
    const images = currentProduct.gallery;
    if (!images.length) return;

    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    currentImageIndex = safeIndex;

    if (els.image) {
      els.image.src = images[safeIndex];
      els.image.alt = `${currentProduct.name} 商品圖片 ${safeIndex + 1}`;
    }

    if (els.gallery) {
      const thumbs = els.gallery.querySelectorAll('.detail-gallery__thumb');
      thumbs.forEach((thumb, idx) => {
        thumb.classList.toggle('is-active', idx === safeIndex);
      });
    }

    if (els.lightbox && !els.lightbox.hidden) {
      setLightboxImage(safeIndex);
    } else {
      lightboxIndex = safeIndex;
      if (els.lightboxIndicator) {
        const images = currentProduct?.gallery || [];
        if (images.length) {
          els.lightboxIndicator.textContent = `${safeIndex + 1} / ${images.length}`;
        }
      }
    }
  }

  function getSelectedQuantity() {
    if (!els.quantity) return 1;
    const value = Number.parseInt(els.quantity.value, 10);
    if (Number.isNaN(value) || value <= 0) {
      return 1;
    }
    return value;
  }

  function handleQuantityChange() {
    if (!els.quantity) return;
    const value = getSelectedQuantity();
    els.quantity.value = String(value);
  }

  function showFeedback(message) {
    if (!els.feedback) return;
    els.feedback.textContent = message;
    els.feedback.hidden = false;
  }

  function handleAddToCartClick() {
    if (!currentProduct) return;
    const quantity = getSelectedQuantity();
    if (window.CartStore) {
      window.CartStore.addItem(currentProduct, quantity);
      window.dispatchEvent(new CustomEvent('cart:updated'));
    }
    showFeedback(`已將 ${currentProduct.name} x${quantity} 加入購物車`);
  }

  async function init() {
    els.quantity?.addEventListener('change', handleQuantityChange);
    els.quantity?.addEventListener('input', handleQuantityChange);
    els.addButton?.addEventListener('click', handleAddToCartClick);
    els.lightboxPrev?.addEventListener('click', () => showNextImage(-1));
    els.lightboxNext?.addEventListener('click', () => showNextImage(1));
    els.lightboxTrigger?.addEventListener('click', () => openLightbox(currentImageIndex));
    els.lightboxClose?.forEach(btn => btn.addEventListener('click', closeLightbox));
    window.addEventListener('keydown', event => {
      if (els.lightbox && !els.lightbox.hidden) {
        if (event.key === 'Escape') {
          closeLightbox();
        }
        if (event.key === 'ArrowRight') {
          showNextImage(1);
        }
        if (event.key === 'ArrowLeft') {
          showNextImage(-1);
        }
      }
    });

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
      showError('未提供商品編號，請回到商品列表重新選擇。');
      return;
    }

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`);
      if (!response.ok) {
        throw new Error('無法取得商品資料');
      }
      const product = await response.json();
      renderProduct(product);
    } catch (error) {
      console.error(error);
      showError('目前無法載入商品資訊，請稍後再試。');
    }
  }

  init();
})();
