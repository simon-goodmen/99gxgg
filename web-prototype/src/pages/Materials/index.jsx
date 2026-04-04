import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, Minus, X, CheckCircle, Trash2, MessageSquare, Clock } from 'lucide-react';
import './Materials.css';

const API = 'http://localhost:5001/api';
const CATEGORY_NAMES = ['砂石骨料', '水泥胶凝', '砌墙材料', '钢材辅材', '防水涂料', '项目求购'];
const mockDistance = 28;
const freightRate = 1.2;
const unloadFee = 8;

const approvedRequests = [
  { id: 1, category: '砂石骨料', title: '中砂 5000吨', specs: '细度模数 2.6-3.0', brand: '不限', conditions: '郑州交货', price: '面谈', buyer: '中建七局', time: '2小时前' },
  { id: 2, category: '水泥胶凝', title: 'P.O 42.5 水泥 200吨', specs: '散装/袋装均可', brand: '天瑞/中联', conditions: '含税含运', price: '≤¥420/吨', buyer: '标杰建设', time: '昨日' },
];

const Materials = () => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [allProducts, setAllProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(CATEGORY_NAMES);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  // Cart state: { [productId]: { product, qty, includeTax, includeFreight, includeUnload } }
  const [cart, setCart] = useState({});

  // Product detail sheet state
  const [includeTax, setIncludeTax] = useState(false);
  const [includeFreight, setIncludeFreight] = useState(true);
  const [includeUnload, setIncludeUnload] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetch(`${API}/materials/products`)
      .then(res => res.json())
      .then(data => {
        // Group by category_id (1-based index maps to CATEGORY_NAMES)
        const groups = {};
        data.forEach(p => {
          const idx = (p.category_id || 1) - 1;
          if (!groups[idx]) groups[idx] = [];
          // Normalize field names from DB (snake_case) to camelCase used in JSX
          groups[idx].push({
            ...p,
            groupPrice: p.group_price,
            currentQty: p.current_qty,
            targetQty:  p.target_qty,
          });
        });
        setAllProducts(groups);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>加载物资实时数据...</div>;

  const isRequestTab = activeCategory === categories.length - 1;
  const currentProducts = isRequestTab ? [] : (allProducts[activeCategory] || []);

  // ── Cart helpers ──────────────────────────────────────────────────
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  const calcItemPrice = (item) => {
    let unit = item.product.price;
    if (item.includeTax)     unit *= 1.03;
    if (item.includeFreight) unit += mockDistance * freightRate;
    if (item.includeUnload)  unit += unloadFee;
    return unit * item.qty;
  };

  const cartTotal = cartItems.reduce((sum, i) => sum + calcItemPrice(i), 0);
  const cartInCart = (id) => !!cart[id];

  // ── Open product detail ───────────────────────────────────────────
  const handleOpenDetail = (prod) => {
    setSelectedProduct(prod);
    // Pre-fill with existing cart options if already in cart
    if (cart[prod.id]) {
      const existing = cart[prod.id];
      setIncludeTax(existing.includeTax);
      setIncludeFreight(existing.includeFreight);
      setIncludeUnload(existing.includeUnload);
      setQuantity(existing.qty);
    } else {
      setIncludeTax(false);
      setIncludeFreight(true);
      setIncludeUnload(false);
      setQuantity(1);
    }
  };

  const calculateTotal = () => {
    if (!selectedProduct) return '0.00';
    let base = selectedProduct.price;
    if (includeTax)     base *= 1.03;
    if (includeFreight) base += mockDistance * freightRate;
    if (includeUnload)  base += unloadFee;
    return (base * quantity).toFixed(2);
  };

  // ── Add to cart ───────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    setCart(prev => ({
      ...prev,
      [selectedProduct.id]: {
        product: selectedProduct,
        qty: quantity,
        includeTax,
        includeFreight,
        includeUnload
      }
    }));
    setSelectedProduct(null);
  };

  // ── Cart item quantity controls ───────────────────────────────────
  const updateCartQty = (id, delta) => {
    setCart(prev => {
      const item = prev[id];
      if (!item) return prev;
      const newQty = Math.max(1, item.qty + delta);
      return { ...prev, [id]: { ...item, qty: newQty } };
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!buyerName.trim()) {
      alert('请填写姓名');
      return;
    }
    if (!buyerPhone || buyerPhone.length !== 11) {
      alert('请输入正确的11位手机号');
      return;
    }

    // Build order items from cart
    const items = cartItems.map(item => ({
      product_name: item.product.name,
      product_spec: `${item.product.mfr} ${item.product.model}${item.includeTax ? ', 含税' : ''}${item.includeFreight ? ', 含运费' : ''}${item.includeUnload ? ', 含卸车' : ''}`,
      unit: item.product.unit,
      qty: item.qty,
      unit_price: calcItemPrice(item) / item.qty // unit price with all options
    }));

    try {
      const loginRes = await fetch(`${API}/auth/quick-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: buyerPhone, real_name: buyerName.trim() })
      });
      const loginData = await loginRes.json();
      if (!loginData.success) {
        alert(loginData.error || '登记失败，请稍后重试');
        return;
      }
      localStorage.setItem('userId', loginData.user.id);
      localStorage.setItem('userInfo', JSON.stringify({
        name: loginData.user.real_name || buyerName.trim(),
        phone: loginData.user.phone || buyerPhone,
        email: ''
      }));

      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: loginData.user.id,
          order_type: 'materials',
          items: items,
          delivery_address: '待确认（拼团成功后联系确认）',
          remark: `联系人: ${buyerName}，电话: ${buyerPhone}，拼团采购，运费距离: ${mockDistance}km`
        })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('lastOrderNo', data.order_no);
        alert(`🛒 提交采购单成功！\n订单号: ${data.order_no}\n共 ${cartItems.length} 类商品，合计 ¥${cartTotal.toFixed(2)}\n采购员将在24小时内与您对接。`);
        setCart({});
        setBuyerName('');
        setBuyerPhone('');
        setShowCart(false);
      } else {
        alert('提交失败: ' + (data.error || '请稍后重试'));
      }
    } catch (err) {
      alert('网络错误，请检查网络连接后重试');
    }
  };

  return (
    <div className="materials-page">
      <div className="search-bar-container">
        <div className="search-bar premium-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="搜索大宗建材 (砂石、水泥、砖块...)" />
        </div>
      </div>

      <div className="materials-layout">
        {/* Sidebar */}
        <div className="sidebar">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className={`sidebar-item ${activeCategory === idx ? 'active' : ''}`}
              onClick={() => setActiveCategory(idx)}
            >
              {cartItems.some(i => allProducts[idx]?.some(p => p.id === i.product.id)) && (
                <span className="sidebar-dot" />
              )}
              {cat}
            </div>
          ))}
        </div>

        {/* Product list / Request list */}
        <div className="product-area">
          {isRequestTab ? (
            <>
              <div className="category-title">
                <h3>项目求购信息</h3>
                <span className="text-muted" style={{fontSize: '11px'}}>后台审核通过 · 实名认证</span>
              </div>
              <div className="products-list">
                {approvedRequests.map(req => (
                  <div key={req.id} className="request-card">
                    <div className="rq-top">
                      <span className="rq-cat-tag">{req.category}</span>
                      <span className="rq-time"><Clock size={11} /> {req.time}</span>
                    </div>
                    <div className="rq-title">{req.title}</div>
                    <div className="rq-detail-tags">
                      <span className="rq-tag">规格: {req.specs}</span>
                      <span className="rq-tag brand">品牌: {req.brand}</span>
                      <span className="rq-tag">条件: {req.conditions}</span>
                      <span className="rq-tag price">价格: {req.price}</span>
                    </div>
                    <div className="rq-bottom">
                      <div className="rq-buyer">
                        <span className="rq-buyer-name">{req.buyer}</span>
                        <span className="rq-project">{req.project}</span>
                      </div>
                      <button className="rq-contact-btn">
                        <MessageSquare size={13} /> 我能供货
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="category-title">
                <h3>{categories[activeCategory]}直销</h3>
                <span className="text-muted" style={{fontSize: '11px'}}>郑州同城直供</span>
              </div>
              <div className="products-list">
                {currentProducts.map(prod => {
                  const inCart = cartInCart(prod.id);
                  const progressPct = Math.min(100, (prod.currentQty / prod.targetQty) * 100);
                  
                  return (
                    <div key={prod.id} className={`product-card card premium-list-card ${inCart ? 'active-item' : ''}`} onClick={() => handleOpenDetail(prod)}>
                      {inCart && <div className="in-cart-pill">已参与</div>}
                      
                      <div className="card-top">
                        <div className="product-img">
                          <span className="p-emoji">{prod.img}</span>
                        </div>
                        <div className="product-info">
                          <h4 className="p-name">{prod.name}</h4>
                          <div className="prod-meta">
                            <span className="meta-tag">厂家: {prod.mfr}</span>
                            <span className="meta-tag">型号: {prod.model}</span>
                          </div>
                        </div>
                      </div>

                      <div className="crowd-box">
                        <div className="crowd-meta">
                          <span className="c-rule">周期：锁单后 7 天达郑州</span>
                          <span className="c-target">目标满 {prod.targetQty}{prod.unit} 发{prod.transport || '车'}</span>
                        </div>
                        <div className="progress-bg">
                          <div className="progress-fill" style={{width: `${progressPct}%`}}></div>
                        </div>
                        <div className="crowd-stats">
                          <span className="c-current">本期已拼 <strong>{prod.currentQty}</strong> {prod.unit}</span>
                          <span className="c-left">缺口 <strong style={{color:'#E64A19'}}>{Math.max(0, prod.targetQty - prod.currentQty)}</strong> {prod.unit}</span>
                        </div>
                      </div>

                      <div className="price-action-row">
                        <div className="price-group">
                          <div className="price-label">拼团价</div>
                          <div className="price">
                            ¥<span>{prod.groupPrice}</span>/{prod.unit}
                          </div>
                          <div className="old-price">郑州现货价 ¥{prod.price}</div>
                        </div>
                        <button
                          className={`join-btn ${inCart ? 'in-cart-btn' : 'pulse-btn'}`}
                          onClick={(e) => { e.stopPropagation(); handleOpenDetail(prod); }}
                        >
                          {inCart ? '已加拼单' : '我要参与拼单'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Cart Bar */}
      <div className={`floating-cart ${cartCount > 0 ? 'has-items' : ''}`} onClick={() => cartCount > 0 && setShowCart(true)}>
        <div className="cart-icon">
          <ShoppingCart size={24} />
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </div>
        <div className="estimate-text">
          {cartCount > 0 ? (
            <>
              <p>我的拼购清单: ¥{cartTotal.toFixed(2)}</p>
              <span>含预估运费 (距工地 {mockDistance}km)  ·  共拼 {cartItems.length} 项</span>
            </>
          ) : (
            <>
              <p>尚未参与本期拼团</p>
              <span>直接从源头走货，组团享最低拼团价</span>
            </>
          )}
        </div>
        {cartCount > 0 && (
          <button className="checkout-btn" onClick={(e) => { e.stopPropagation(); setShowCart(true); }}>
            查看清单
          </button>
        )}
      </div>

      {/* ===== Cart Drawer ===== */}
      {showCart && (
        <>
          <div className="modal-backdrop" onClick={() => setShowCart(false)} />
          <div className="bottom-sheet cart-sheet">
            <div className="sheet-header">
              <div>
                <h4>我的拼购清单</h4>
                <p className="cart-subtitle">{cartItems.length} 个拼团项目  ·  预估 ¥{cartTotal.toFixed(2)}</p>
              </div>
              <button className="close-btn" onClick={() => setShowCart(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="cart-list">
              {cartItems.map(item => (
                <div key={item.product.id} className="cart-item">
                  <div className="cart-item-img">{item.product.img}</div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.product.name}</div>
                    <div className="cart-item-meta">{item.product.mfr}  ·  {item.product.model}</div>
                    <div className="cart-item-tags">
                      {item.includeTax && <span className="ct">含税</span>}
                      {item.includeFreight && <span className="ct">含运费</span>}
                      {item.includeUnload && <span className="ct">含卸车</span>}
                    </div>
                    <div className="cart-item-bottom">
                      <span className="cart-item-price">¥{calcItemPrice(item).toFixed(2)}</span>
                      <div className="cart-qty-ctrl">
                        <button onClick={() => updateCartQty(item.product.id, -1)}><Minus size={12} /></button>
                        <span>{item.qty} {item.product.unit}</span>
                        <button onClick={() => updateCartQty(item.product.id, 1)}><Plus size={12} /></button>
                      </div>
                    </div>
                  </div>
                  <button className="cart-item-del" onClick={() => removeFromCart(item.product.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div style={{display:'grid', gap:'10px', marginBottom:'14px'}}>
                <input
                  type="text"
                  placeholder="姓名"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #E5E7EB'}}
                />
                <input
                  type="tel"
                  placeholder="手机号"
                  maxLength={11}
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  style={{width:'100%', padding:'12px', borderRadius:'10px', border:'1px solid #E5E7EB'}}
                />
              </div>
              <div className="cart-total-row">
                <span>拼购预估总价 (含送卸)</span>
                <span className="cart-total-price">¥ {cartTotal.toFixed(2)}</span>
              </div>
              <button className="checkout-btn-full" onClick={handleCheckout}>
                提交拼购需求并锁单
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== Product Detail Bottom Sheet ===== */}
      {selectedProduct && (
        <>
          <div className="modal-backdrop" onClick={() => setSelectedProduct(null)} />
          <div className="bottom-sheet">
            <div className="sheet-header">
              <div className="sheet-prod">
                <div className="sheet-img">{selectedProduct.img}</div>
                <div className="sheet-pinfo">
                  <h4>{selectedProduct.name}</h4>
                  <p className="sp-price">拼团价: <strong>¥{selectedProduct.groupPrice}</strong>/{selectedProduct.unit}</p>
                  <p className="sp-rules" style={{fontSize:'10px', color:'#FF9800', marginTop:'2px'}}>周期：锁单后 7 天运达郑州交货</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedProduct(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="sheet-content">
              <div className="sheet-section">
                <h5>基本信息与质检</h5>
                <div className="info-grid">
                  <div className="ig-row"><span className="lbl">生产厂家:</span><span className="val">{selectedProduct.mfr}</span></div>
                  <div className="ig-row"><span className="lbl">规格型号:</span><span className="val">{selectedProduct.model}</span></div>
                </div>
                <div className="qa-report-box">
                  <CheckCircle size={16} color="var(--primary-color)" />
                  <span>带有《出厂合格证》及近期检验报告</span>
                  <span className="view-link">点击查看预览 &gt;</span>
                </div>
              </div>

              <div className="sheet-section">
                <h5>服务选项</h5>
                <div className="options-list">
                  <label className="opt-item">
                    <div className="opt-text">
                      <span className="opt-name">含税 (+3%)</span>
                    </div>
                    <input type="checkbox" checked={includeTax} onChange={e => setIncludeTax(e.target.checked)} />
                  </label>
                  <label className="opt-item">
                    <div className="opt-text">
                      <span className="opt-name">含运费</span>
                      <span className="opt-sub">预估: ¥{(mockDistance * freightRate).toFixed(2)}/{selectedProduct.unit}  (距 {mockDistance}km)</span>
                    </div>
                    <input type="checkbox" checked={includeFreight} onChange={e => setIncludeFreight(e.target.checked)} />
                  </label>
                  <label className="opt-item">
                    <div className="opt-text">
                      <span className="opt-name">含卸车 (+¥{unloadFee}/{selectedProduct.unit})</span>
                    </div>
                    <input type="checkbox" checked={includeUnload} onChange={e => setIncludeUnload(e.target.checked)} />
                  </label>
                </div>
              </div>

              <div className="sheet-section qty-section">
                <h5>预定拼购数量 ({selectedProduct.unit})</h5>
                <div className="qty-control" style={{display:'flex', gap:'8px'}}>
                  {/* Step logic based on unit */}
                  <button onClick={() => setQuantity(Math.max(1, quantity - (selectedProduct.unit === '吨' ? 50 : 100)))}>- 减量</button>
                  <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} style={{width:'80px', textAlign:'center', border:'1px solid #DDD', borderRadius:'8px'}} />
                  <button onClick={() => setQuantity(quantity + (selectedProduct.unit === '吨' ? 50 : 100))}>+ 增量</button>
                </div>
              </div>
            </div>

            <div className="sheet-footer">
              <div className="calc-total">
                <span className="lbl">综合预估总价:</span>
                <span className="val" style={{color:'#E64A19'}}>¥ {calculateTotal()}</span>
              </div>
              <button className="confirm-btn" onClick={handleAddToCart} style={{background:'#E64A19', boxShadow:'0 4px 12px rgba(230,74,25,0.3)'}}>
                {cartInCart(selectedProduct.id) ? '更新拼购票数' : '确认参与拼单'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Materials;
