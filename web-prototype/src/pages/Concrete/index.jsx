import React, { useState, useEffect } from 'react';
import { MapPin, Clock, X, ChevronDown, Plus, Trash2, Zap, Factory } from 'lucide-react';
import './Concrete.css';

const Concrete = () => {
  const [stations, setStations] = useState([]);
  const [activeStationIdx, setActiveStationIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/concrete/stations')
      .then(res => res.json())
      .then(data => {
        setStations(data);
        setLoading(false);
      });
  }, []);

  const [selectedDashboardGrade, setSelectedDashboardGrade] = useState('');

  useEffect(() => {
    if (stations.length > 0) {
      setSelectedDashboardGrade(stations[activeStationIdx]?.grades?.[0] || '');
    }
  }, [activeStationIdx, stations]);

  const [orderItems, setOrderItems] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showStationSwitcher, setShowStationSwitcher] = useState(false);

  const [formStationId, setFormStationId] = useState(1);
  const [formGrade, setFormGrade] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [ordererName, setOrdererName] = useState('');
  const [ordererPhone, setOrdererPhone] = useState('');

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>加载商砼站实时数据...</div>;
  if (stations.length === 0) return <div style={{padding: '40px', textAlign: 'center'}}>暂无商砼站数据</div>;

  const currentStation = stations[activeStationIdx];

  const getGradePrice = (basePrice, grade) => {
    let price = basePrice;
    const numMatch = grade.match(/C(\d+)/);
    const num = numMatch ? parseInt(numMatch[1]) : 30;
    const diff = num - 30;
    price += (diff / 5) * 15;
    
    // 防水和特种附加费
    if (grade.includes('P6')) price += 15;
    if (grade.includes('P8')) price += 25;
    
    return price;
  };

  const totalQty = orderItems.reduce((sum, i) => sum + i.qty, 0);

  const handleOpenModal = () => {
    setFormStationId(currentStation.id);
    setFormGrade(currentStation.grades[0]);
    setFormDate('');
    setFormQty('');
    setFormAddress('');
    setShowOrderModal(true);
  };

  const handleAddToList = () => {
    if (!formDate || !formQty || !formAddress) {
      alert('请填写完整配置信息后再添加');
      return;
    }
    const selectedStationObj = stations.find(s => s.id === formStationId);
    const newItem = {
      id: Date.now(),
      station: selectedStationObj,
      grade: formGrade,
      date: formDate,
      qty: parseInt(formQty) || 0,
      address: formAddress
    };
    setOrderItems([...orderItems, newItem]);
    setFormQty('');
    setShowOrderModal(false);
  };

  const handleGrabOrder = () => {
    if (orderItems.length === 0) {
      alert('配置清单为空，请先配置站点参数并加入清单');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSubmitFinal = async () => {
    if (!ordererName || !ordererPhone) { alert('请填写联系信息'); return; }
    if (ordererPhone.length < 11) { alert('请输入正确的11位手机号'); return; }

    const userId = localStorage.getItem('userId') || null;

    // Build order items from orderItems
    const items = orderItems.map(item => ({
      product_name: `${item.grade} 商砼`,
      product_spec: `站点: ${item.station.name}, 日期: ${item.date}`,
      unit: 'm³',
      qty: item.qty,
      unit_price: getGradePrice(item.station.price, item.grade)
    }));

    try {
      // First deduct inventory for each station
      for (const item of orderItems) {
        const deductRes = await fetch(`http://localhost:5000/api/concrete/stations/${item.station.id}/deduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qty: item.qty })
        });
        const deductData = await deductRes.json();
        if (!deductData.success) {
          alert(`库存扣减失败: ${deductData.message || '库存不足'}`);
          return;
        }
      }

      // Create order
      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          order_type: 'concrete',
          items: items,
          delivery_address: orderItems[0]?.address || '',
          remark: `联系人: ${ordererName}, 电话: ${ordererPhone}`
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`🎉 抢订成功！\n订单号: ${data.order_no}\n【${ordererName}】下周清单额度 ${totalQty} m³ 已锁定\n供货方将在24小时内联系您。`);
        setOrderItems([]);
        setOrdererName('');
        setOrdererPhone('');
        setShowConfirmModal(false);
      } else {
        alert('提交失败: ' + (data.error || '请稍后重试'));
      }
    } catch (err) {
      alert('网络错误，请检查网络连接后重试');
    }
  };

  return (
    <div className="concrete-page">
      <div className="main-content">
        {/* ── Premium Dashboard Card ───────────────────── */}
        <div className="dashboard-card card premium-card">
          <div className="card-accent" />
          <div className="dash-header">
            <div className="factory-selector-pill" onClick={() => setShowStationSwitcher(true)}>
              <Factory size={14} />
              <span className="fs-name">{currentStation.name}</span>
              <ChevronDown size={14} />
            </div>
            <div className="live-indicator">
              <span className="dot pulse" style={{background: currentStation.statusColor}} />
              <span className="status-lbl" style={{color: currentStation.statusColor}}>{currentStation.status}</span>
            </div>
          </div>
          
          <div className="dash-grade-selector" style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
            {currentStation.grades.map(g => (
              <div 
                key={g} 
                onClick={() => setSelectedDashboardGrade(g)}
                style={{
                  padding: '4px 14px', borderRadius: '14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  border: selectedDashboardGrade === g ? '1px solid #FFD700' : '1px solid rgba(255,255,255,0.2)',
                  background: selectedDashboardGrade === g ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                  color: selectedDashboardGrade === g ? '#FFD700' : 'rgba(255,255,255,0.7)',
                  transition: 'all 0.2s'
                }}
              >
                {g}
              </div>
            ))}
          </div>

          <div className="dash-slogan flex-slogan" style={{alignItems: 'baseline'}}>
            <div className="price-tag-highlight" style={{fontSize: '24px', padding:'4px 16px'}}>¥{getGradePrice(currentStation.price, selectedDashboardGrade)}</div>
            <div style={{fontSize: '12px', color:'rgba(255,255,255,0.8)', marginLeft: '-8px'}}>/方</div>
            <div className="slogan-text-group" style={{marginLeft: 'auto'}}>
              <div className="slogan-line1" style={{textAlign:'right'}}>共享厂站最低直供价</div>
              <div className="slogan-line2" style={{borderLeft:'none', borderRight:'2px solid #FFD700', paddingLeft:'0', paddingRight:'8px'}}>让您的订单实现最大的利益转化</div>
            </div>
          </div>
          <div className="dash-tag-list">
            {currentStation.tags.map((tag, i) => (
              <span key={i} className="info-tag">{tag}</span>
            ))}
          </div>

          <div className="dash-stats feature-highlights">
            <div className="stat-box">
              <span className="stat-num" style={{color: currentStation.statusColor}}>{currentStation.status}</span>
              <span className="stat-label">站点状态</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{currentStation.distance}</span>
              <span className="stat-label">据您距离</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{currentStation.capacity} <small style={{fontSize:'10px'}}>m³</small></span>
              <span className="stat-label">剩余产能</span>
            </div>
            <div className="stat-box">
              <span className="stat-num" style={{color: currentStation.conditionColor}}>{currentStation.condition}</span>
              <span className="stat-label">今日站况</span>
            </div>
          </div>
        </div>



        {/* ── Block 2: Order Booking Form ──────────────────── */}
        <div className="section-header">
          <h3>预定排单</h3>
          <div className="sh-accent" />
        </div>
        <div className="order-form-card card" style={{marginBottom:'16px', padding:'20px'}}>
          
          {/* Inline Order Form */}
          <div className="inline-order-form">
            <div className="form-group" style={{marginBottom:'12px'}}>
              <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'4px'}}>意向承接商砼站 <span style={{color:'#E53935'}}>*</span></label>
              <select value={formStationId} onChange={(e) => {
                const sId = parseInt(e.target.value);
                setFormStationId(sId);
                const st = stations.find(x => x.id === sId);
                if(st && st.grades.length > 0) setFormGrade(st.grades[0]);
              }} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #DDD', background:'#F9FAFB'}}>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name} (下周可售: {s.weeklyQuota > 0 ? s.weeklyQuota+' m³' : '暂停'})</option>)}
              </select>
            </div>
            
            <div className="form-group row-group" style={{display:'flex', gap:'12px', marginBottom:'12px'}}>
              <div className="half-field" style={{flex:1}}>
                <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'4px'}}>所需标号</label>
                <select value={formGrade} onChange={e => setFormGrade(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #DDD'}}>
                  {stations.find(x => x.id === formStationId)?.grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="half-field" style={{flex:1}}>
                <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'4px'}}>计划日期 (下周)</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #DDD'}}/>
              </div>
            </div>
            
            <div className="form-group" style={{marginBottom:'12px'}}>
              <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'4px'}}>该批次预估方量 (m³)</label>
              <input type="number" placeholder="输入预估方量，如 120" value={formQty} onChange={e => setFormQty(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #DDD'}}/>
            </div>
            
            <div className="form-group" style={{marginBottom:'16px'}}>
              <label style={{display:'block', fontSize:'12px', color:'#666', marginBottom:'4px'}}>项目卸车地址</label>
              <div className="address-picker" onClick={() => setShowMapModal(true)} style={{display:'flex', alignItems:'center', gap:'8px', padding:'10px', background:'#F5F5F7', borderRadius:'8px', fontSize:'13px', color: formAddress?'#333':'#999'}}>
                <MapPin size={16} color="#0F8265" />
                <span>{formAddress || '点击选择浇筑定位 ＞'}</span>
              </div>
            </div>
            
            <button className="btn-solid-full" onClick={handleAddToList} style={{width:'100%', padding:'12px', background:'#E8F5EE', color:'#0F8265', border:'1px solid #0F8265', borderRadius:'8px', fontWeight:'700'}}>
              <Plus size={16} style={{marginRight: '6px'}}/> 添加进待排清单
            </button>
          </div>
        </div>

        {/* ── Block 3: Cart / Lock Order ──────────────────── */}
        <div className="section-header">
          <h3>待排清单与锁单</h3>
          <div className="sh-accent" />
        </div>
        <div className="cart-card card" style={{marginBottom:'24px', padding:'20px'}}>
          {/* Cart List Box */}
          <div className="order-list-box">
            <div className="list-header" style={{display:'flex', justifyContent:'space-between', fontSize:'13px', fontWeight:'600', marginBottom:'12px', color:'#333'}}>
              <span>您的待排清单</span>
              <span className="list-total-qty" style={{color:'#E53935'}}>总计: {totalQty} m³</span>
            </div>
            
            {orderItems.length > 0 ? (
              <div className="list-items" style={{display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px'}}>
                {orderItems.map(item => (
                  <div key={item.id} className="list-row" style={{background:'#F9FAFB', padding:'10px', borderRadius:'8px', border:'1px solid #EEE'}}>
                    <div className="row-main" style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                      <span className="r-grade" style={{fontWeight:'700', color:'#333'}}>{item.grade}</span>
                      <span className="r-qty" style={{fontWeight:'700', color:'#0F8265'}}>{item.qty} m³</span>
                    </div>
                    <div className="row-sub" style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#888'}}>
                      <span>{item.station.name} · {item.date}</span>
                      <button className="row-del" onClick={() => setOrderItems(orderItems.filter(i => i.id !== item.id))} style={{background:'none', border:'none', color:'#E53935', cursor:'pointer'}}><Trash2 size={14}/></button>
                    </div>
                    <div style={{fontSize:'11px', color:'#0F8265', marginTop:'4px', padding:'3px 6px', background:'#E8F5EE', borderRadius:'4px', borderLeft:'3px solid #0F8265'}}>
                      {item.address}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-order-info" style={{textAlign:'center', color:'#999', padding:'20px 0'}}>
                <p style={{fontSize:'13px'}}>暂无待排批次，请在上方填写并添加</p>
              </div>
            )}
            
            <button className="btn-grab pulse-btn" onClick={handleGrabOrder} style={{width:'100%', padding:'14px', background:'#0F8265', color:'white', border:'none', borderRadius:'12px', fontWeight:'700', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px'}}>
              <Zap size={16} /> 确定锁单
            </button>
          </div>
        </div>

        {/* ── Top Overview Section (Moved Below Quota Card) ── */}
        <div className="overview-section" style={{marginBottom: '40px'}}>
          <div className="overview-title" style={{marginTop:'16px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span>本周各站发货进度情况</span>
            <span style={{fontSize:'12px', color:'#A0AAB5', fontWeight:'400'}}>{new Date().getMonth() + 1}月{new Date().getDate()}日 数据</span>
          </div>
          <div className="overview-list">
            {stations.map(s => {
              const remain = s.weeklyQuota - s.soldQty;
              const pct = s.weeklyQuota > 0 ? Math.round(s.soldQty / s.weeklyQuota * 100) : 100;
              return (
                <div key={s.id} className="overview-item" onClick={() => setActiveStationIdx(s.id - 1)}>
                  <div className="ov-left">
                    <span className="ov-name">{s.name}</span>
                    <span className={`status-pill`} style={{background: s.statusColor+'20', color: s.statusColor, border: `1px solid ${s.statusColor}40`}}>{s.status}</span>
                  </div>
                  <div className="ov-right">
                    <div className="ov-bar-bg">
                      <div className={`ov-bar-fill ${s.weeklyQuota === 0 ? 'full' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="ov-numbers">
                      <span className={`ov-quota ${s.weeklyQuota === 0 ? 'gray' : ''}`}>
                        {s.weeklyQuota === 0 ? '暂停' : `${s.weeklyQuota} m³`}
                      </span>
                      <span className={`ov-remain ${s.weeklyQuota > 0 && remain > 0 ? 'green' : 'gray'}`}>
                        {s.weeklyQuota > 0 ? `余${remain} m³` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Switch Station Modal */}
      {showStationSwitcher && (
        <>
          <div className="modal-backdrop" onClick={() => setShowStationSwitcher(false)}></div>
          <div className="bottom-sheet select-factory-sheet" style={{maxHeight: '60vh'}}>
            <div className="sheet-header">
              <h3>切换为您服务的主控商砼站</h3>
              <button className="close-btn" onClick={() => setShowStationSwitcher(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="sheet-content" style={{padding: '12px 16px'}}>
              <div className="factory-list">
                {stations.map((fac, idx) => (
                  <div 
                    key={fac.id} 
                    className={`factory-list-item ${activeStationIdx === idx ? 'active-fac' : ''}`}
                    onClick={() => { setActiveStationIdx(idx); setShowStationSwitcher(false); }}
                  >
                    <div className="f-icon"><Factory size={20} /></div>
                    <div className="f-details">
                      <h4>{fac.name}</h4>
                      <div className="f-tags">
                        <span style={{color: fac.statusColor}}>{fac.status}</span>
                        <span>可预订产能: {fac.capacity} m³</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}



      {/* ── Confirm Final Modal ──────────────── */}
      {showConfirmModal && (
        <div className="modal-backdrop" style={{ zIndex: 300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="center-card" style={{background:'white', width:'85%', borderRadius:'16px', overflow:'hidden'}}>
            <div className="modal-header" style={{padding:'20px', borderBottom:'1px solid #EEE', display:'flex', justifyContent:'space-between'}}>
              <h3 style={{fontSize:'16px', fontWeight:'700'}}>完善联系信息</h3>
              <button className="close-btn" onClick={() => setShowConfirmModal(false)} style={{background:'none', border:'none'}}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{padding:'20px'}}>
              <div className="form-group" style={{marginBottom:'16px'}}>
                <input type="text" placeholder="联系姓名" value={ordererName} onChange={e => setOrdererName(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #DDD'}}/>
              </div>
              <div className="form-group" style={{marginBottom:'24px'}}>
                <input type="tel" placeholder="手机号 (接收通知)" maxLength={11} value={ordererPhone} onChange={e => setOrdererPhone(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #DDD'}}/>
              </div>
              <button className="btn-solid-full" onClick={handleSubmitFinal} style={{width:'100%', padding:'14px', background:'#E53935', color:'white', border:'none', borderRadius:'12px', fontWeight:'700'}}>确认提交这 {totalQty} 方需求</button>
            </div>
          </div>
        </div>
      )}

      {/* Mock Map remains unchanged */}
      {showMapModal && (
        <div className="modal-backdrop" style={{ zIndex: 400, alignItems: 'flex-end', padding: 0 }}>
          <div className="bottom-sheet map-sheet">
            <div className="sheet-header" style={{padding:'20px', borderBottom:'1px solid #EEE', display:'flex', justifyContent:'space-between'}}>
              <h3 style={{fontSize:'16px', fontWeight:'700'}}>选择工地位置</h3>
              <button className="close-btn" onClick={() => setShowMapModal(false)} style={{background:'none', border:'none'}}><X size={20} /></button>
            </div>
            <div className="mock-map-view" style={{padding:'20px'}}>
              <div className="nearby-locations">
                {[
                  { name: '二七万达广场二期项目部', addr: '郑州市二七区航海路与大学路交叉口' },
                  { name: '郑州科创园在建标段',     addr: '中原区西三环与建设路交叉口' },
                  { name: '宏运大厦项目部',         addr: '金水区花园路与农业路交叉口' },
                ].map(loc => (
                  <div key={loc.name} className="loc-item" onClick={() => { setFormAddress(`${loc.addr} (${loc.name})`); setShowMapModal(false); }} style={{padding:'12px 0', borderBottom:'1px solid #EEE', display:'flex', alignItems:'center', gap:'12px'}}>
                    <MapPin size={20} color="#9E9E9E" />
                    <div className="loc-text">
                      <p className="loc-name" style={{fontSize:'14px', fontWeight:'600', color:'#333'}}>{loc.name}</p>
                      <p className="loc-desc" style={{fontSize:'11px', color:'#888', marginTop:'4px'}}>{loc.addr}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Concrete;
