import React, { useState, useEffect } from 'react';
import { Database, Truck, Package, CheckCircle2, Clock, GitCommit, ChevronDown, ChevronUp } from 'lucide-react';
import './Tracking.css';

const API = 'http://localhost:5000/api';

const Tracking = () => {
  const [activeTab, setActiveTab] = useState('concrete');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [allOrders, setAllOrders] = useState({ steel: [], concrete: [], materials: [] });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const tabs = [
    { id: 'concrete', label: '共享商砼', icon: Truck },
    { id: 'steel',    label: '共享钢构', icon: Database },
    { id: 'materials',label: '共享物资', icon: Package }
  ];

  // Get userId from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    setUserId(storedUserId);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      // Use stored userId or fallback to 1 for demo
      const uid = userId || 1;
      try {
        const res = await fetch(`${API}/orders?user_id=${uid}`);
        const data = await res.json();
        const grouped = { steel: [], concrete: [], materials: [] };
        data.forEach(o => {
          const type = o.order_type;
          if (grouped[type]) {
            grouped[type].push({
              id: o.order_no,
              _id: o.id,
              title: (o.items && o.items[0])
                ? `${o.items[0].product_name} × ${o.items[0].qty}${o.items[0].unit}`
                : o.order_no,
              date: o.created_at ? String(o.created_at).slice(0, 10) : '',
              status: o.status === 'delivering' ? 'processing' : o.status === 'completed' ? 'completed' : 'pending',
              address: o.delivery_address,
              amount: o.total_amount,
              nodes: (o.tracking || []).map(n => ({
                id: n.id,
                name: n.node_name,
                status: n.status,
                time: n.event_time ? String(n.event_time).slice(0, 16) : (n.status === 'pending' ? '--' : '处理中'),
              }))
            });
          }
        });
        setAllOrders(grouped);
        // Auto-expand first order
        const first = (grouped.concrete[0] || grouped.steel[0] || grouped.materials[0]);
        if (first) setExpandedOrder(first.id);
      } catch (err) {
        console.error('Fetch orders error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [userId]);

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'#888'}}>加载订单数据...</div>;

  // ── keep original static orders as fallback if API returns empty ──
  const STATIC_ORDERS = {
    steel: [
      {
        id: 'O-1024-001',
        title: '新郑机场T3航站楼网架工程',
        date: '2023-10-24',
        status: 'processing',
        nodes: [
          { id: 1, name: '深化设计图纸审核', status: 'completed', time: '10-24 09:30' },
          { id: 2, name: '原材料套料与入库', status: 'completed', time: '10-25 14:15' },
          { id: 3, name: '工单下发/精益排产', status: 'completed', time: '10-26 08:00' },
          { id: 4, name: '数控下料切割加工', status: 'completed', time: '10-26 16:45' },
          { id: 5, name: 'H型钢自动组立', status: 'processing', time: '预计今日 18:00 完成' },
          { id: 6, name: '龙门式埋弧焊接', status: 'pending', time: '--' },
          { id: 7, name: '抛丸除锈/喷涂工艺', status: 'pending', time: '--' },
          { id: 8, name: '数字化质检与合单发货', status: 'pending', time: '--' },
        ]
      },
      {
        id: 'O-1021-088',
        title: '郑东新区体育中心辅馆钢构',
        date: '2023-10-21',
        status: 'completed',
        nodes: [
          { id: 1, name: '订单正式立项', status: 'completed', time: '10-21 09:00' },
          { id: 2, name: '全工序精益加工', status: 'completed', time: '10-25 18:00' },
          { id: 3, name: '质检校验与正式发货', status: 'completed', time: '10-27 10:30' },
        ]
      }
    ],
    concrete: [
      {
        id: 'C-0912-331',
        title: '商砼订单 - 郑密路扩建标段2',
        date: '2023-09-12',
        status: 'processing',
        nodes: [
          { id: 1, name: '支付锁单 (120m³ C30)', status: 'completed', time: '09-12 08:30' },
          { id: 2, name: '发货指令下发 (C30)', status: 'completed', time: '09-12 09:15' },
          { id: 3, name: '中央控制室生产中', status: 'completed', time: '今日 13:00' },
          { id: 4, name: '泵送运输 (豫A·M8899)', status: 'processing', time: '实时路况追踪' },
          { id: 5, name: '工地电子签收确认', status: 'pending', time: '预计 15:20 抵达' },
        ]
      }
    ],
    materials: [
      {
        id: 'M-1102-045',
        title: '散装水泥 (天瑞 P.O 42.5) x 60吨',
        date: '2023-11-02',
        status: 'pending',
        nodes: [
          { id: 1, name: '拼单成功/转入锁单', status: 'completed', time: '11-02 10:00' },
          { id: 2, name: '基地货位分配/打印', status: 'processing', time: '处理中' },
          { id: 3, name: '全闭环物流启运', status: 'pending', time: '--' },
          { id: 4, name: '郑州基地收货确认', status: 'pending', time: '--' },
        ]
      }
    ]
  };

  const orders = (allOrders[activeTab] && allOrders[activeTab].length > 0) ? allOrders : STATIC_ORDERS;
  const currentOrders = orders[activeTab] || [];

  const toggleOrder = (id) => {
    setExpandedOrder(expandedOrder === id ? null : id);
  };

  return (
    <div className="tracking-page">
      <div className="tab-switcher-container">
        <div className="tab-switcher premium-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <div 
                key={tab.id}
                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} /> <span>{tab.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="orders-container">
        {currentOrders.length === 0 ? (
          <div className="empty-state">暂无待处理订单</div>
        ) : (
          currentOrders.map(order => {
            const isExpanded = expandedOrder === order.id;
            
            return (
              <div key={order.id} className={`order-accordion card shadow-sm ${isExpanded ? 'expanded-mode' : ''}`}>
                <div className="order-summary" onClick={() => toggleOrder(order.id)}>
                  <div className="order-main-info">
                    <div className="order-id-row">
                      <span className="order-id-tag">#{order.id}</span>
                      <span className="order-date">{order.date}</span>
                    </div>
                    <h3 className="order-title">{order.title}</h3>
                  </div>
                  <div className="order-status-area">
                    <span className={`status-pill ${order.status}`}>
                      {order.status === 'completed' ? '已完成' : order.status === 'processing' ? '处理中' : '待处理'}
                    </span>
                    <div className={`chevron-wrap ${isExpanded ? 'rotated' : ''}`}>
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="order-details-body">
                    <div className="timeline-container">
                      {order.nodes.map(node => (
                        <div key={node.id} className={`timeline-step ${node.status}`}>
                          <div className="step-marker">
                            {node.status === 'completed' ? <CheckCircle2 size={16} /> : 
                             node.status === 'processing' ? <Clock size={16} /> : 
                             <GitCommit size={16} />}
                          </div>
                          <div className="step-content">
                            <div className="step-title">{node.name}</div>
                            <div className="step-time">{node.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Tracking;
