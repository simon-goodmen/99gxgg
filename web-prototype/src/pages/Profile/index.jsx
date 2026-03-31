import React, { useState, useEffect } from 'react';
import {
  Settings, ChevronRight, ChevronLeft, FileText, Wallet,
  UserCircle2, ShieldCheck,
  PlusCircle, LogIn,
  Target, PackageSearch, ArrowUpRight,
  X, MapPin, User, Save, Trash2, Building2, Receipt,
  Phone, Landmark, StickyNote
} from 'lucide-react';
import './Profile.css';

const API = 'http://localhost:5000/api';

const Profile = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: '', phone: '', email: '' });
  const [projects, setProjects] = useState([]);
  const [myRequirements, setMyRequirements] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Login form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // 发布需求表单
  const [reqForm, setReqForm] = useState({
    title: '',
    category: '河沙',
    quantity: '',
    unit: '吨',
    specs: '',
    brand: '',
    conditions: '',
    priceType: '面谈',
    priceValue: '',
    deliveryAddr: '郑州',
    deliveryDays: '7',
  });

  const [showAddProject, setShowAddProject] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', company: '', addr: '', invoiceTitle: '', invoiceTaxId: '', bank: '', bankAccount: '', contactPhone: '', notes: '' });

  // Check login status on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserId) {
      setUserId(storedUserId);
      setIsLoggedIn(true);
      if (storedUserInfo) {
        setUserInfo(JSON.parse(storedUserInfo));
      }
    }
  }, []);

  // Fetch user data when logged in
  useEffect(() => {
    if (isLoggedIn && userId) {
      fetchUserData();
    }
  }, [isLoggedIn, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch user info
      const userRes = await fetch(`${API}/users/${userId}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        const newUserInfo = {
          name: userData.real_name || '',
          phone: userData.phone || '',
          email: ''
        };
        setUserInfo(newUserInfo);
        localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
      }

      // Fetch projects
      const projRes = await fetch(`${API}/users/${userId}/projects`);
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData.map(p => ({
          id: p.id,
          name: p.name,
          company: p.company || '',
          addr: p.addr || '',
          invoiceTitle: p.invoice_title || '',
          invoiceTaxId: p.invoice_tax_id || '',
          bank: p.bank || '',
          bankAccount: p.bank_account || '',
          contactPhone: p.contact_phone || '',
          notes: p.notes || ''
        })));
      }

      // Fetch orders as requirements
      const ordersRes = await fetch(`${API}/orders?user_id=${userId}`);
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        const reqs = orders.map(o => ({
          id: o.order_no,
          title: o.items && o.items[0] ? `${o.items[0].product_name} ${o.items[0].qty}${o.items[0].unit}` : '采购需求',
          specs: `规格: ${o.items && o.items[0] ? o.items[0].product_spec : '详见订单'}`,
          brand: `类型: ${o.order_type === 'steel' ? '钢构' : o.order_type === 'concrete' ? '商砼' : '物资'}`,
          conditions: `地址: ${o.delivery_address || '待定'}`,
          price: `金额: ¥${o.total_amount || 0}`,
          status: o.status === 'pending' ? '待处理' : o.status === 'confirmed' ? '已确认' : o.status === 'delivering' ? '配送中' : o.status === 'completed' ? '已完成' : '已取消'
        }));
        setMyRequirements(reqs);
      }
    } catch (err) {
      console.error('Fetch user data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!loginPhone || loginPhone.length !== 11) {
      alert('请输入正确的11位手机号');
      return;
    }
    try {
      const res = await fetch(`${API}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone })
      });
      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        alert('验证码已发送 (开发模式: 1234)');
      } else {
        alert(data.error || '发送失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  };

  const handleVerifyCode = async () => {
    if (!loginCode) {
      alert('请输入验证码');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, code: loginCode })
      });
      const data = await res.json();
      if (data.success) {
        setUserId(data.user.id);
        setIsLoggedIn(true);
        localStorage.setItem('userId', data.user.id);
        setShowLoginModal(false);
        setLoginPhone('');
        setLoginCode('');
        setCodeSent(false);
      } else {
        alert(data.error || '验证失败');
      }
    } catch (err) {
      alert('网络错误');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setUserInfo({ name: '', phone: '', email: '' });
    setProjects([]);
    setMyRequirements([]);
    localStorage.removeItem('userId');
    localStorage.removeItem('userInfo');
    setShowSettings(false);
  };

  const handlePublish = () => {
    if (!reqForm.title && !reqForm.quantity) return;
    const newId = `REQ-${Date.now().toString().slice(-8)}`;
    const priceStr = reqForm.priceType === '面谈'
      ? '价格: 面谈'
      : reqForm.priceType === '指定价'
        ? `价格: ¥${reqForm.priceValue}/${reqForm.unit}`
        : `价格: 低于 ¥${reqForm.priceValue}/${reqForm.unit}`;
    const newReq = {
      id: newId,
      title: `${reqForm.category} ${reqForm.quantity}${reqForm.unit} 采购需求`,
      specs: `规格: ${reqForm.specs || '详见需求描述'}`,
      brand: `品牌: ${reqForm.brand || '不限'}`,
      conditions: `条件: 锁单后${reqForm.deliveryDays}天到场, 交付${reqForm.deliveryAddr}`,
      price: priceStr,
      status: '已发布至共享资源'
    };
    setMyRequirements([newReq, ...myRequirements]);
    setShowPublishModal(false);
    setReqForm({ title: '', category: '河沙', quantity: '', unit: '吨', specs: '', brand: '', conditions: '', priceType: '面谈', priceValue: '', deliveryAddr: '郑州', deliveryDays: '7' });
  };

  const handleAddProject = async () => {
    if (!newProject.name) return;
    try {
      const res = await fetch(`${API}/users/${userId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProject.name,
          company: newProject.company,
          addr: newProject.addr,
          invoice_title: newProject.invoiceTitle,
          invoice_tax_id: newProject.invoiceTaxId,
          bank: newProject.bank,
          bank_account: newProject.bankAccount,
          contact_phone: newProject.contactPhone,
          notes: newProject.notes
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProjects([...projects, { ...newProject, id: data.id }]);
        setNewProject({ name: '', company: '', addr: '', invoiceTitle: '', invoiceTaxId: '', bank: '', bankAccount: '', contactPhone: '', notes: '' });
        setShowAddProject(false);
      } else {
        alert('添加失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      const res = await fetch(`${API}/users/${userId}/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
        if (expandedProjectId === id) setExpandedProjectId(null);
      } else {
        alert('删除失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          real_name: userInfo.name,
          phone: userInfo.phone
        })
      });
      if (res.ok) {
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        alert('保存成功');
      } else {
        alert('保存失败');
      }
    } catch (err) {
      alert('网络错误');
    }
  };

  const categoryOptions = ['河沙', '石子', '水泥', '螺纹钢', '盘螺', '线材', '型钢', '商砼', '其他'];
  const unitOptions = ['吨', '方', 'm³', '件', '根'];
  const priceTypeOptions = [
    { value: '面谈', label: '面谈 (双方协商)' },
    { value: '指定价', label: '指定价格' },
    { value: '低于', label: '低于指定价' },
  ];

  // ========== 设置页 ==========
  if (showSettings) {
    return (
      <div className="profile-page">
        <div className="settings-header">
          <button className="settings-back-btn" onClick={() => setShowSettings(false)}>
            <ChevronLeft size={20} /> 返回
          </button>
          <h2>个人设置</h2>
          <div style={{ width: 60 }} />
        </div>
        <div className="settings-body">
          {/* 个人信息 */}
          <div className="settings-section">
            <h3 className="settings-section-title"><User size={16} /> 个人信息</h3>
            <div className="settings-card">
              <div className="settings-field">
                <label>姓名</label>
                <input value={userInfo.name} onChange={e => setUserInfo({...userInfo, name: e.target.value})} />
              </div>
              <div className="settings-field">
                <label>手机号</label>
                <input value={userInfo.phone} onChange={e => setUserInfo({...userInfo, phone: e.target.value})} />
              </div>
              <div className="settings-field">
                <label>邮箱</label>
                <input value={userInfo.email} onChange={e => setUserInfo({...userInfo, email: e.target.value})} />
              </div>
            </div>
          </div>

          {/* 多项目管理 */}
          <div className="settings-section">
            <div className="settings-section-row">
              <h3 className="settings-section-title"><Building2 size={16} /> 我的项目</h3>
              <button className="add-project-btn" onClick={() => setShowAddProject(!showAddProject)}>
                <PlusCircle size={14} /> 添加项目
              </button>
            </div>

            {/* 添加新项目表单 */}
            {showAddProject && (
              <div className="new-project-form">
                <div className="npf-field">
                  <label>项目名称 *</label>
                  <input placeholder="例: 高新区双碳产业园" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
                </div>
                <div className="npf-field">
                  <label>所属公司</label>
                  <input placeholder="甲方或挂靠公司全称" value={newProject.company} onChange={e => setNewProject({...newProject, company: e.target.value})} />
                </div>
                <div className="npf-field">
                  <label>项目交付地址</label>
                  <input placeholder="详细地址" value={newProject.addr} onChange={e => setNewProject({...newProject, addr: e.target.value})} />
                </div>
                <div className="npf-field">
                  <label>开票抬头</label>
                  <input placeholder="发票抬头公司全称" value={newProject.invoiceTitle} onChange={e => setNewProject({...newProject, invoiceTitle: e.target.value})} />
                </div>
                <div className="npf-field">
                  <label>纳税人识别号</label>
                  <input placeholder="税号" value={newProject.invoiceTaxId} onChange={e => setNewProject({...newProject, invoiceTaxId: e.target.value})} />
                </div>
                <div className="npf-field">
                  <label>开户银行</label>
                  <input placeholder="例: 中国建设银行XX支行" value={newProject.bank} onChange={e => setNewProject({...newProject, bank: e.target.value})} />
                </div>
                <div className="npf-field">
                  <label>银行账号</label>
                  <input placeholder="对公账号" value={newProject.bankAccount} onChange={e => setNewProject({...newProject, bankAccount: e.target.value})} />
                </div>
                <div className="npf-field">
                  <label>项目联系电话</label>
                  <input placeholder="项目部座机或负责人手机" value={newProject.contactPhone} onChange={e => setNewProject({...newProject, contactPhone: e.target.value})} />
                </div>
                <div className="npf-field">
                  <label>项目备注</label>
                  <input placeholder="例: 限高4.2m, 周末不收货" value={newProject.notes} onChange={e => setNewProject({...newProject, notes: e.target.value})} />
                </div>
                <div className="npf-actions">
                  <button className="npf-cancel" onClick={() => setShowAddProject(false)}>取消</button>
                  <button className="npf-confirm" onClick={handleAddProject}>确认添加</button>
                </div>
              </div>
            )}

            {/* 已有项目列表 */}
            {projects.map(proj => (
              <div key={proj.id} className="project-detail-card">
                <div className="pdc-header" onClick={() => setExpandedProjectId(expandedProjectId === proj.id ? null : proj.id)}>
                  <div className="pdc-left">
                    <div className="pdc-dot" />
                    <div>
                      <div className="pdc-name">{proj.name}</div>
                      <div className="pdc-company">{proj.company}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#CCC" style={{ transform: expandedProjectId === proj.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
                {expandedProjectId === proj.id && (
                  <div className="pdc-detail">
                    <div className="pdc-row"><MapPin size={13} /> <span>{proj.addr}</span></div>
                    <div className="pdc-row"><Phone size={13} /> <span>联系电话: {proj.contactPhone}</span></div>
                    <div className="pdc-divider" />
                    <div className="pdc-row"><Receipt size={13} /> <span>开票: {proj.invoiceTitle}</span></div>
                    <div className="pdc-row" style={{ opacity: 0.5 }}><span>税号: {proj.invoiceTaxId}</span></div>
                    <div className="pdc-row"><Landmark size={13} /> <span>{proj.bank}</span></div>
                    <div className="pdc-row" style={{ opacity: 0.5 }}><span>账号: {proj.bankAccount}</span></div>
                    {proj.notes && (
                      <>
                        <div className="pdc-divider" />
                        <div className="pdc-row"><StickyNote size={13} /> <span>备注: {proj.notes}</span></div>
                      </>
                    )}
                    <button className="pdc-delete" onClick={() => handleDeleteProject(proj.id)}>
                      <Trash2 size={13} /> 移除此项目
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button className="settings-save-btn" onClick={handleSaveSettings}>
            <Save size={16} /> 保存设置
          </button>
          <div className="logout-action" onClick={handleLogout}>退出当前管理账号</div>
        </div>
      </div>
    );
  }

  // ========== 主页面 ==========
  return (
    <div className="profile-page">
      {/* 头部 */}
      <div className="profile-header-premium">
        <div className="header-overlay-radial" />
        <div className="user-profile-box">
          <div className="upb-left">
            <div className="avatar-large-glow">
              {isLoggedIn ? (userInfo.name ? userInfo.name.charAt(0) : '用') : <UserCircle2 size={32} opacity={0.5} />}
            </div>
            <div>
              {isLoggedIn ? (
                <>
                  <div className="user-name-row">
                    <h2>{userInfo.name || '项目采购负责人'}</h2>
                    <span className="pro-badge">高级认证</span>
                  </div>
                  <span className="partner-id">采购员 ID: PR-{userId || '0000'}-ZZ</span>
                </>
              ) : (
                <div className="user-name-row">
                  <h2>准采购经理</h2>
                </div>
              )}
            </div>
          </div>
          {isLoggedIn && (
            <button className="settings-icon-btn" onClick={() => setShowSettings(true)}>
              <Settings size={20} />
            </button>
          )}
        </div>

        {!isLoggedIn && (
          <div className="login-invitation" onClick={() => setShowLoginModal(true)}>
            <div className="li-left">
              <LogIn className="li-icon" size={20} />
              <span className="li-label">点击登录 / 注册账号</span>
            </div>
            <div className="li-action">
              立即开启 <ChevronRight size={14} />
            </div>
          </div>
        )}
      </div>

      <div className="profile-content">
        {isLoggedIn ? (
          <>
            {/* 发布新需求 - 顶部醒目按钮 */}
            <button className="publish-req-btn" onClick={() => setShowPublishModal(true)}>
              <PlusCircle size={18} /> 发布新需求
            </button>

            {/* 核心指标 */}
            <div className="stats-row">
              <div className="stat-item">
                <span className="num">{projects.length}</span>
                <span className="label">执行中项目</span>
              </div>
              <div className="stat-item">
                <span className="num">{myRequirements.length}</span>
                <span className="label">动态需求</span>
              </div>
              <div className="stat-item">
                <span className="num">¥2.4w</span>
                <span className="label">精益节省</span>
              </div>
            </div>

            {/* 我的需求列表 */}
            <div className="section-header">
              <h3>我的订单</h3>
            </div>
            <div className="requirements-grid">
              {loading ? (
                <div style={{textAlign: 'center', padding: '20px', color: '#999'}}>加载中...</div>
              ) : myRequirements.length === 0 ? (
                <div style={{textAlign: 'center', padding: '20px', color: '#999'}}>暂无订单</div>
              ) : (
                myRequirements.map(req => (
                  <div key={req.id} className="req-card-professional">
                    <div className="req-header">
                      <span className="req-id">{req.id}</span>
                      <span className="req-publish-tag">{req.status}</span>
                    </div>
                    <div className="req-title">{req.title}</div>
                    <div className="req-specs">
                      <span className="spec-tag">{req.specs}</span>
                      <span className="spec-tag brand">{req.brand}</span>
                      <span className="spec-tag">{req.conditions}</span>
                      <span className="spec-tag price">{req.price}</span>
                    </div>
                    <div className="req-footer">
                      <div className="req-status">
                        <Target size={14} /> 资源匹配中...
                      </div>
                      <div className="req-action-btn">
                        详情 <ArrowUpRight size={14} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 项目执行底账 */}
            <div className="section-header">
              <h3>项目执行底账</h3>
              <span>查看台账</span>
            </div>
            <div className="project-list-vertical">
              {loading ? (
                <div style={{textAlign: 'center', padding: '20px', color: '#999'}}>加载中...</div>
              ) : projects.length === 0 ? (
                <div style={{textAlign: 'center', padding: '20px', color: '#999'}}>暂无项目，请在设置中添加</div>
              ) : (
                projects.slice(0, 3).map((proj, idx) => (
                  <div key={proj.id} className="project-ledger-row">
                    <div className="plr-main">
                      <div className="plr-name">{proj.name}</div>
                      <div className="plr-meta">{proj.company}</div>
                    </div>
                    <div className="plr-progress-box">
                      <span className="plr-val">{['¥280w', '¥112w', '¥45w'][idx] || '¥0'}</span>
                      <span className="plr-label">已采比例 {[65, 88, 12][idx] || 0}%</span>
                    </div>
                    <ChevronRight size={16} color="#DDD" style={{ marginLeft: '12px' }} />
                  </div>
                ))
              )}
            </div>

            {/* 管理工具 */}
            <div className="menu-group-container">
              <div className="section-header" style={{ paddingLeft: '4px' }}>
                <h3 style={{ fontSize: '14px', opacity: 0.6 }}>专业管理工具</h3>
              </div>
              <div className="menu-card card">
                <div className="menu-item-premium">
                  <div className="mip-left">
                    <div className="mip-icon industrial-orange"><FileText size={20} /></div>
                    <div>
                      <span className="mip-text">电子合同与签证中心</span>
                      <span className="mip-sub">支持甲乙双方在线签约</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="mip-arrow" />
                </div>
                <div className="menu-item-premium">
                  <div className="mip-left">
                    <div className="mip-icon industrial-green"><Wallet size={20} /></div>
                    <div>
                      <span className="mip-text">财务对账与结算流水</span>
                      <span className="mip-sub">项目欠款与现金拼价返利</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="mip-arrow" />
                </div>
                <div className="menu-item-premium">
                  <div className="mip-left">
                    <div className="mip-icon industrial-steel"><ShieldCheck size={20} /></div>
                    <div>
                      <span className="mip-text">供应商合规与资质库</span>
                      <span className="mip-sub">全省工厂产能与信用评级</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="mip-arrow" />
                </div>
              </div>
            </div>

            <div className="logout-action" onClick={handleLogout}>退出当前管理账号</div>
          </>
        ) : (
          <div className="guest-content-lock">
            <PackageSearch size={48} opacity={0.1} style={{ marginBottom: '20px' }} />
            <p>登录后即可发布采购需求、</p>
            <p>管理项目底账及查看精益节省明细</p>
          </div>
        )}
      </div>

      {/* ======= 登录 Modal ======= */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="publish-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-header">
              <h3>手机号登录</h3>
              <button className="pm-close" onClick={() => setShowLoginModal(false)}><X size={20} /></button>
            </div>
            <div className="pm-body">
              <div className="pm-field">
                <label>手机号</label>
                <input
                  type="tel"
                  placeholder="请输入11位手机号"
                  maxLength={11}
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value)}
                />
              </div>
              {codeSent && (
                <div className="pm-field">
                  <label>验证码 (开发模式: 1234)</label>
                  <input
                    type="text"
                    placeholder="请输入验证码"
                    value={loginCode}
                    onChange={e => setLoginCode(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="pm-footer">
              {!codeSent ? (
                <button className="pm-submit-btn" onClick={handleSendCode}>
                  获取验证码
                </button>
              ) : (
                <button className="pm-submit-btn" onClick={handleVerifyCode} disabled={loginLoading}>
                  {loginLoading ? '登录中...' : '登录'}
                </button>
              )}
              <p className="pm-footer-hint">未注册手机号将自动创建账号</p>
            </div>
          </div>
        </div>
      )}

      {/* ======= 发布新需求 Modal ======= */}
      {showPublishModal && (
        <div className="modal-overlay" onClick={() => setShowPublishModal(false)}>
          <div className="publish-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-header">
              <h3>发布采购需求</h3>
              <button className="pm-close" onClick={() => setShowPublishModal(false)}><X size={20} /></button>
            </div>

            <div className="pm-body">
              {/* 品类 + 数量 */}
              <div className="pm-row-double">
                <div className="pm-field">
                  <label>采购品类 *</label>
                  <select value={reqForm.category} onChange={e => setReqForm({...reqForm, category: e.target.value})}>
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="pm-field">
                  <label>采购数量 *</label>
                  <div className="pm-input-group">
                    <input type="number" placeholder="1000" value={reqForm.quantity} onChange={e => setReqForm({...reqForm, quantity: e.target.value})} />
                    <select className="pm-unit-select" value={reqForm.unit} onChange={e => setReqForm({...reqForm, unit: e.target.value})}>
                      {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 规格 */}
              <div className="pm-field">
                <label>规格要求 *</label>
                <input placeholder="例: 粗砂, 含泥量 < 3%; 或 HRB400E 12mm" value={reqForm.specs} onChange={e => setReqForm({...reqForm, specs: e.target.value})} />
              </div>

              {/* 品牌 */}
              <div className="pm-field">
                <label>指定品牌</label>
                <input placeholder="例: 安钢 / 天瑞, 或填写 '不限'" value={reqForm.brand} onChange={e => setReqForm({...reqForm, brand: e.target.value})} />
              </div>

              {/* 附加条件 */}
              <div className="pm-field">
                <label>附加条件</label>
                <textarea placeholder="例: 含装车费, 需增值税专票, 分批到货..." rows={2} value={reqForm.conditions} onChange={e => setReqForm({...reqForm, conditions: e.target.value})} />
              </div>

              {/* 价格策略 */}
              <div className="pm-field">
                <label>价格策略 *</label>
                <div className="price-type-row">
                  {priceTypeOptions.map(pt => (
                    <button
                      key={pt.value}
                      className={`price-type-chip ${reqForm.priceType === pt.value ? 'active' : ''}`}
                      onClick={() => setReqForm({...reqForm, priceType: pt.value})}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
                {reqForm.priceType !== '面谈' && (
                  <div className="pm-price-input-row">
                    <span className="pm-price-prefix">{reqForm.priceType === '指定价' ? '¥' : '低于 ¥'}</span>
                    <input type="number" placeholder="4200" value={reqForm.priceValue} onChange={e => setReqForm({...reqForm, priceValue: e.target.value})} />
                    <span className="pm-price-suffix">/ {reqForm.unit}</span>
                  </div>
                )}
              </div>

              {/* 交货信息 */}
              <div className="pm-row-double">
                <div className="pm-field">
                  <label>交付地点</label>
                  <input placeholder="郑州" value={reqForm.deliveryAddr} onChange={e => setReqForm({...reqForm, deliveryAddr: e.target.value})} />
                </div>
                <div className="pm-field">
                  <label>锁单后到货(天)</label>
                  <input type="number" placeholder="7" value={reqForm.deliveryDays} onChange={e => setReqForm({...reqForm, deliveryDays: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="pm-footer">
              <button className="pm-submit-btn" onClick={handlePublish}>
                确认发布至共享资源
              </button>
              <p className="pm-footer-hint">发布后将自动匹配全省优质供应商资源</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
