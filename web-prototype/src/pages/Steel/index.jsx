import React, { useState, useEffect } from 'react';
import { PenTool, Scissors, Users, Calculator, BadgeDollarSign, FileCheck, CalendarClock, Zap, X, Factory, ChevronDown, MapPin } from 'lucide-react';
import './Steel.css';

const API = 'http://localhost:5001/api';

const Home = () => {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showFactoryModal, setShowFactoryModal] = useState(false);
  const [activeFactoryIdx, setActiveFactoryIdx] = useState(0);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states — all hooks must be declared before any early returns
  const [formType, setFormType] = useState('H型钢、网架');
  const [formTonnage, setFormTonnage] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTargetFactoryId, setFormTargetFactoryId] = useState(null);
  const [needCorporate, setNeedCorporate] = useState(false);
  const [needDrawing, setNeedDrawing] = useState(false);
  const [needProcessing, setNeedProcessing] = useState(true);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    fetch(`${API}/steel/factories`)
      .then(res => res.json())
      .then(data => {
        setFactories(data);
        if (data.length > 0) setFormTargetFactoryId(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>加载工厂实时数据...</div>;
  if (factories.length === 0) return <div style={{padding: '40px', textAlign: 'center'}}>暂无工厂数据</div>;

  const currentFactory = factories[activeFactoryIdx];

  const processTypes = ['H型钢、网架', '箱型柱/十字柱', '管桁架', '重钢非标异形件', '光伏支架代工'];

  const handleSubmit = async () => {
    if (!formTonnage || !contactName || !contactPhone || !formTargetFactoryId) {
      alert('请将必填信息（加工吨位、联络人等）填写完整！');
      return;
    }

    const tgtFactoryName = factories.find(f => f.id === formTargetFactoryId)?.name;

    // Build order items
    const items = [{
      product_name: `钢构加工 - ${formType}`,
      product_spec: `吨位: ${formTonnage}吨, 进场日期: ${formDate || '待定'}`,
      unit: '吨',
      qty: parseFloat(formTonnage) || 0,
      unit_price: 99 // 99元/吨
    }];

    // Add service items if selected
    if (needDrawing) {
      items.push({ product_name: '图纸深化服务', product_spec: '含拆图、套料、BIM建模', unit: '项', qty: 1, unit_price: 500 });
    }

    try {
      const loginRes = await fetch(`${API}/auth/quick-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: contactPhone, real_name: contactName.trim() })
      });
      const loginData = await loginRes.json();
      if (!loginData.success) {
        alert(loginData.error || '登记失败，请稍后重试');
        return;
      }
      localStorage.setItem('userId', loginData.user.id);
      localStorage.setItem('userInfo', JSON.stringify({
        name: loginData.user.real_name || contactName.trim(),
        phone: loginData.user.phone || contactPhone,
        email: ''
      }));

      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: loginData.user.id,
          order_type: 'steel',
          items: items,
          delivery_address: `工厂: ${tgtFactoryName}`,
          remark: `联系人: ${contactName}, 电话: ${contactPhone}, 代工模式: ${needProcessing ? '全包代工' : '共享合伙人'}, 对公开票: ${needCorporate ? '是' : '否'}`
        })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('lastOrderNo', data.order_no);
        alert(`提交成功！\n订单号: ${data.order_no}\n已锁定【${tgtFactoryName}】排产档期，业务经理五分钟内联系您。`);
        setShowBookingModal(false);
        // Clear form
        setFormTonnage('');
        setFormDate('');
        setContactName('');
        setContactPhone('');
      } else {
        alert('提交失败: ' + (data.error || '请稍后重试'));
      }
    } catch (err) {
      alert('网络错误，请检查网络连接后重试');
    }
  };

  const openBookingModal = () => {
    setFormTargetFactoryId(currentFactory.id); // Default to current
    setShowBookingModal(true);
  };

  return (
    <div className="home-page">
      <div className="main-content">
        {/* Part 1: Top section showing Shared Steel Plant Features */}
        <div className="dashboard-card card premium-card">
          <div className="card-accent" />
          <div className="dash-header">
            <div className="factory-selector-pill" onClick={() => setShowFactoryModal(true)}>
              <Factory size={14} />
              <span className="fs-name">{currentFactory.name}</span>
              <ChevronDown size={14} />
            </div>
            <div className="live-indicator">
              <span className="dot pulse" />
              <span className="status-lbl">{currentFactory.status}</span>
            </div>
          </div>
          <div className="dash-slogan flex-slogan">
            <div className="price-tag-highlight">99元/吨</div>
            <div className="slogan-text-group">
              <div className="slogan-line1">包含场地费和设备使用费</div>
              <div className="slogan-line2">让您的订单实现最大的利益转化</div>
            </div>
          </div>
          <div className="dash-tag-list">
            {currentFactory.tags.map((tag, i) => (
              <span key={i} className="info-tag">{tag}</span>
            ))}
          </div>

          <div className="dash-stats feature-highlights">
            <div className="stat-box">
              <span className="stat-num" style={{fontSize: '14px', color: currentFactory.statusColor}}>{currentFactory.status}</span>
              <span className="stat-label">工厂状态</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{currentFactory.orders}</span>
              <span className="stat-label">在产订单</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{currentFactory.weeklyCapacity}</span>
              <span className="stat-label">周产吨位</span>
            </div>
            <div className="stat-box">
              <span className="stat-num" style={{fontSize: '14px', color: currentFactory.conditionColor}}>{currentFactory.condition}</span>
              <span className="stat-label">今日厂况</span>
            </div>
          </div>
        </div>

        {/* Part 2: Shared Steel Provided Services - 6 Items */}
        <div className="section-header">
          <h3>我们提供的服务</h3>
          <div className="sh-accent" />
        </div>
        
        <div className="services-grid">
          <div className="service-card">
            <div className="svc-icon"><PenTool size={20} /></div>
            <h4>图纸深化</h4>
            <p>总工室资深拆图团队支持，提供方案优化、BIM建模及精确套料算量，帮您省材避坑。</p>
          </div>
          <div className="service-card">
            <div className="svc-icon"><Scissors size={20} /></div>
            <h4>来料加工</h4>
            <p>支持自购物料直送厂区，享受全套数控抛丸、等离子精准下料切割与H型钢高标组立服务。</p>
          </div>
          <div className="service-card">
            <div className="svc-icon"><Users size={20} /></div>
            <h4>人工自选</h4>
            <p>除共享顶尖重型设备外，您可自主聘用我厂全证件齐备的高效焊工与组装班组为您打工作业。</p>
          </div>
          <div className="service-card">
            <div className="svc-icon"><Calculator size={20} /></div>
            <h4>辅材核算</h4>
            <p>所有焊丝、气体消耗、环保油漆与电力定额耗材均按大厂进货成本阳光核计，杜绝糊涂账。</p>
          </div>
          <div className="service-card">
            <div className="svc-icon"><BadgeDollarSign size={20} /></div>
            <h4>99元极简付费</h4>
            <p>每吨仅需99元的使用费，即可完全激活覆盖天车吊装、环保设备等四万平生产线的所有硬件。</p>
          </div>
          <div className="service-card">
            <div className="svc-icon"><FileCheck size={20} /></div>
            <h4>资料配合与投标</h4>
            <p>专业企划工程部为“合伙人们”提供原厂特级资质背书辅助、标书编制与后期整套质检报告护航。</p>
          </div>
        </div>

        {/* Part 3: This month's schedule arrangement (Capacity) */}
        <div className="capacity-section">
          <div className="capacity-header">
            <div className="left-title">
              <h3><CalendarClock size={20} color="#FFD700"/> 本月工期大盘</h3>
            </div>
            <span className="month-tag">3月可用档期</span>
          </div>
          
          <div className="capacity-status-card">
            <div className="status-top">
              <div className="status-item">
                <span className="s-label">本月总体总产</span>
                <span className="s-val">{currentFactory.monthTotal} <small>吨</small></span>
              </div>
              <div className="status-item highlight">
                <span className="s-label">剩余可预订产能</span>
                <span className="s-val primary">{currentFactory.monthRemain} <small>吨</small></span>
              </div>
            </div>
            
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${currentFactory.percentage}%` }}></div>
              </div>
              <div className="progress-labels">
                <span className="pl-left">排产{currentFactory.timelineStatus}</span>
                <span className="pl-right">排期已达 {currentFactory.percentage}%</span>
              </div>
            </div>

            <div className="timeline-blocks">
              {currentFactory.timelineBlocks.map((blk, idx) => (
                <div key={idx} className={`t-block ${blk.theme}`}>
                  {blk.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Part 4: Book Now */}
        <div className="book-now-section">
          <button className="book-btn-giant" onClick={openBookingModal}>
            <Zap size={20} /> 立即锁定档期，马上排产
          </button>
        </div>
      </div>

      {/* Switch Factory Modal */}
      {showFactoryModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowFactoryModal(false)}></div>
          <div className="bottom-sheet select-factory-sheet" style={{maxHeight: '60vh'}}>
            <div className="sheet-header">
              <h3>切换为您服务的主控工厂</h3>
              <button className="close-btn" onClick={() => setShowFactoryModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="sheet-content" style={{padding: '12px 16px'}}>
              <p style={{fontSize: '12px', color: '#888', marginBottom: '16px'}}>请根据您的项目所在地或工厂可用档期进行最优匹配：</p>
              
              <div className="factory-list">
                {factories.map((fac, idx) => (
                  <div 
                    key={fac.id} 
                    className={`factory-list-item ${activeFactoryIdx === idx ? 'active-fac' : ''}`}
                    onClick={() => {
                      setActiveFactoryIdx(idx);
                      setShowFactoryModal(false);
                    }}
                  >
                    <div className="f-icon"><Factory size={20} /></div>
                    <div className="f-details">
                      <h4>{fac.name}</h4>
                      <div className="f-tags">
                        <span style={{color: fac.statusColor}}>{fac.status}</span>
                        <span>可预订产能: {fac.monthRemain}吨</span>
                      </div>
                    </div>
                    {activeFactoryIdx === idx && <div className="f-check"><FileCheck size={18} /></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Booking Modal / Bottom Sheet */}
      {showBookingModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowBookingModal(false)}></div>
          <div className="bottom-sheet booking-sheet">
            <div className="sheet-header">
              <h3>共享钢构排产档期预订</h3>
              <button className="close-btn" onClick={() => setShowBookingModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="sheet-content">
              <div className="form-alert">
                <Zap size={14} color="#FF9800"/> 
                <span>提交预定后系统会自动下发占位码，业务经理五分钟内响应。</span>
              </div>

              {/* Basic Information */}
              <div className="form-group-card">
                <h4 className="fg-title">1. 加工基础信息</h4>
                <div className="field-group">
                  <label>意向承接工厂 <span className="req">*</span></label>
                  <select value={formTargetFactoryId} onChange={e => setFormTargetFactoryId(e.target.value)}>
                    {factories.map(fac => <option key={fac.id} value={fac.id}>{fac.name} (剩余产能: {fac.monthRemain}吨)</option>)}
                  </select>
                  <div className="modal-timeline-preview">
                    {factories.find(f => f.id === formTargetFactoryId)?.timelineBlocks.map((blk, idx) => (
                      <div key={idx} className={`t-block ${blk.theme}`}>
                        {blk.name}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field-group">
                  <label>主要结构类型 <span className="req">*</span></label>
                  <select value={formType} onChange={e => setFormType(e.target.value)}>
                    {processTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                </div>
                <div className="field-group row-group">
                  <div className="half-field">
                    <label>预估吨位 (吨) <span className="req">*</span></label>
                    <input type="number" placeholder="例如: 300" value={formTonnage} onChange={e => setFormTonnage(e.target.value)} />
                  </div>
                  <div className="half-field">
                    <label>计划进场日期</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Extended Services */}
              <div className="form-group-card">
                <h4 className="fg-title">2. 定制服务项 (多选)</h4>
                
                <div className="switch-row" onClick={() => setNeedProcessing(!needProcessing)}>
                  <div className="sr-text">
                    <span className="sr-title">委托纯代工 (省心包干)</span>
                    <span className="sr-desc">不使用共享合伙人99元场地模式，全包给我厂代加工</span>
                  </div>
                  <div className={`switch-track ${needProcessing ? 'on' : 'off'}`}>
                    <div className="switch-thumb"></div>
                  </div>
                </div>
                
                <div className="switch-row" onClick={() => setNeedCorporate(!needCorporate)}>
                  <div className="sr-text">
                    <span className="sr-title">需要对公转账/开票</span>
                    <span className="sr-desc">要求提供大额增值税专用发票支持</span>
                  </div>
                  <div className={`switch-track ${needCorporate ? 'on' : 'off'}`}>
                    <div className="switch-thumb"></div>
                  </div>
                </div>
                
                <div className="switch-row" onClick={() => setNeedDrawing(!needDrawing)}>
                  <div className="sr-text">
                    <span className="sr-title">包含图纸深化</span>
                    <span className="sr-desc">提供原图，需工程部重新深化排版、套料算量</span>
                  </div>
                  <div className={`switch-track ${needDrawing ? 'on' : 'off'}`}>
                    <div className="switch-thumb"></div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="form-group-card no-border">
                <h4 className="fg-title">3. 联系方式</h4>
                <div className="field-group row-group">
                  <div className="half-field">
                    <label>姓名 <span className="req">*</span></label>
                    <input type="text" placeholder="怎么称呼您" value={contactName} onChange={e => setContactName(e.target.value)} />
                  </div>
                  <div className="half-field">
                    <label>联系电话 <span className="req">*</span></label>
                    <input type="tel" placeholder="接收占位确认码" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="sheet-footer">
              <button className="confirm-btn full" onClick={handleSubmit}>
                确认提交排产需求
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
