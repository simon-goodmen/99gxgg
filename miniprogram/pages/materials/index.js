const { request } = require('../../utils/request');

Page({
  data: {
    activeCategory: 0,
    categories: ['大沙', '水泥', '砌体砖', '内墙腻子', '石子', '干混砂浆', '项目求购'],
    
    allProducts: {},
    approvedRequests: [
      { id: 'RQ-001', category: '大沙', title: '优质河沙 1000吨', specs: '粗砂, 含泥量 < 3%', price: '面谈', buyer: '李**', project: '新郑机场T3航站楼', time: '2小时前' },
      { id: 'RQ-002', category: '石子', title: '青石子 1-2石 500吨', specs: '10-20mm 碎石', price: '低于 ¥48/吨', buyer: '张**', project: '郑东体育中心辅馆', time: '5小时前' }
    ],

    currentProducts: [],
    isRequestTab: false,

    // Cart
    cart: {}, // { id: { prod, qty, tax, freight, unload } }
    cartCount: 0,
    cartTotal: 0,
    showCart: false,

    // Detail Panel
    selectedProduct: null,
    includeTax: false,
    includeFreight: true,
    includeUnload: false,
    quantity: 1
  },

  onLoad() {
    this.fetchProducts();
  },

  fetchProducts() {
    request({ url: '/materials/products' })
      .then((products = []) => {
        const grouped = {};
        products.forEach((product) => {
          const rawCategoryId = Number(product.category_id ?? 0);
          const categoryIndex = rawCategoryId > 0 ? rawCategoryId - 1 : rawCategoryId;
          if (!grouped[categoryIndex]) grouped[categoryIndex] = [];
          grouped[categoryIndex].push({
            ...product,
            price: Number(product.price ?? 0),
            groupPrice: Number(product.group_price ?? product.groupPrice ?? 0),
            currentQty: Number(product.current_qty ?? product.currentQty ?? 0),
            targetQty: Number(product.target_qty ?? product.targetQty ?? 0)
          });
        });
        this.setData({ allProducts: grouped });
        this.updateProductList(this.data.activeCategory);
      });
  },

  updateProductList(idx) {
    const isRequestTab = idx === this.data.categories.length - 1;
    this.setData({
      activeCategory: idx,
      isRequestTab: isRequestTab,
      currentProducts: isRequestTab ? [] : (this.data.allProducts[idx] || [])
    });
  },

  onCategorySelect(e) {
    this.updateProductList(e.currentTarget.dataset.index);
  },

  // Detail Panel Handlers
  openDetail(e) {
    const prod = e.currentTarget.dataset.prod;
    const existing = this.data.cart[prod.id] || null;
    this.setData({
      selectedProduct: prod,
      quantity: existing ? existing.qty : 1,
      includeTax: existing ? existing.tax : false,
      includeFreight: existing ? existing.freight : true,
      includeUnload: existing ? existing.unload : false
    });
  },
  closeDetail() { this.setData({ selectedProduct: null }); },

  onQtyChange(e) { this.setData({ quantity: e.detail.value }); },
  toggleTax() { this.setData({ includeTax: !this.data.includeTax }); },
  toggleFreight() { this.setData({ includeFreight: !this.data.includeFreight }); },
  toggleUnload() { this.setData({ includeUnload: !this.data.includeUnload }); },

  addToCart() {
    const { selectedProduct, quantity, includeTax, includeFreight, includeUnload, cart } = this.data;
    const newCart = { ...cart };
    newCart[selectedProduct.id] = {
      product: selectedProduct,
      qty: parseInt(quantity),
      tax: includeTax,
      freight: includeFreight,
      unload: includeUnload
    };
    this.setData({ cart: newCart, selectedProduct: null });
    this.calculateCart();
  },

  calculateCart() {
    const cartItems = Object.values(this.data.cart);
    let count = 0;
    let total = 0;
    cartItems.forEach(item => {
      count += item.qty;
      let unit = parseFloat(item.product.groupPrice ?? item.product.price);
      if (item.tax) unit *= 1.03;
      if (item.freight) unit += 15;
      if (item.unload) unit += 10;
      total += unit * item.qty;
    });
    this.setData({ cartCount: count, cartTotal: total });
  },

  // Cart Drawer
  toggleCart() { if (this.data.cartCount > 0) this.setData({ showCart: !this.data.showCart }); },
  removeFromCart(e) {
    const id = e.currentTarget.dataset.id;
    const newCart = { ...this.data.cart };
    delete newCart[id];
    this.setData({ cart: newCart });
    this.calculateCart();
    if (Object.keys(newCart).length === 0) this.setData({ showCart: false });
  },

  handleCheckout() {
    const { cart, cartTotal } = this.data;
    wx.showLoading({ title: '正在提交' });
    
    // Create actual order
    request({
      url: '/orders',
      method: 'POST',
      data: {
        order_type: 'materials',
        items: Object.values(cart).map(item => ({
          product_name: item.product.name,
          product_spec: item.product.model || '',
          qty: item.qty,
          unit_price: parseFloat(item.product.groupPrice ?? item.product.price),
          unit: item.product.unit
        })),
        delivery_address: '自提/协商配送'
      }
    }).then(() => {
      wx.hideLoading();
      wx.showModal({
        title: '提交成功！',
        content: `采购清单合计 ¥${cartTotal.toFixed(2)}\n工作人员将在24小时内联系您。`,
        showCancel: false,
        success: () => {
          this.setData({ cart: {}, cartCount: 0, cartTotal: 0, showCart: false });
        }
      });
    }).catch(() => wx.hideLoading());
  }
});
