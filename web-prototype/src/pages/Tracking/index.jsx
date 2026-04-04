import React, { useState, useEffect } from 'react';
import { Database, Truck, Package, CheckCircle2, Clock, GitCommit, ChevronDown, ChevronUp } from 'lucide-react';
import './Tracking.css';

const API = 'http://localhost:5001/api';
const LOGISTICS_LABELS = {
  assigned: '已派车',
  loaded: '已装车',
  in_transit: '运输中',
  arriving: '即将到达',
  signed: '已签收',
  exception: '异常'
};

const Tracking = () => {
  const [activeTab, setActiveTab] = useState('concrete');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [allOrders, setAllOrders] = useState({ steel: [], concrete: [], materials: [] });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const tabs = [
    { id: 'concrete', label: '共享商砼', icon: Truck },
    { id: 'steel',    label: '共享钢构', icon: Database },
    { id: 'materials',label: '共享建材', icon: Package }
  ];

  // Get userId from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    setUserId(storedUserId);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        let data = [];
        const lastOrderNo = localStorage.getItem('lastOrderNo');

        if (userId) {
          const res = await fetch(`${API}/orders?user_id=${userId}`);
          if (!res.ok) throw new Error('加载订单失败');
          data = await res.json();
        }

        if ((!Array.isArray(data) || data.length === 0) && lastOrderNo) {
          const res = await fetch(`${API}/orders?order_no=${encodeURIComponent(lastOrderNo)}`);
          if (!res.ok) throw new Error('加载订单失败');
          data = await res.json();
        }

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
              logistics: {
                company: o.logistics_company,
                no: o.logistics_no,
                driverName: o.driver_name,
                driverPhone: o.driver_phone,
                dispatcherPhone: o.dispatcher_phone,
                vehicleNo: o.vehicle_no,
                shippedAt: o.shipped_at,
                status: o.logistics_status,
                remark: o.logistics_remark,
              },
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
  const currentOrders = allOrders[activeTab] || [];

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
                    <div style={{marginBottom: '14px', padding: '12px', border: '1px solid #ECECEC', borderRadius: '10px', background: '#FAFAFA'}}>
                      <div style={{fontSize: '12px', fontWeight: 700, color: '#777', marginBottom: '6px'}}>物流单信息</div>
                      <div style={{fontSize: '13px', fontWeight: 600}}>
                        {order.logistics?.company ? `${order.logistics.company} / ${order.logistics.no}` : '暂未发物流'}
                      </div>
                      {(order.logistics?.driverName || order.logistics?.driverPhone || order.logistics?.vehicleNo) && (
                        <div style={{fontSize: '12px', color: '#777', marginTop: '4px'}}>
                          {order.logistics?.driverName ? `司机：${order.logistics.driverName}` : ''}
                          {order.logistics?.driverPhone ? ` · 电话：${order.logistics.driverPhone}` : ''}
                          {order.logistics?.dispatcherPhone ? ` · 调度：${order.logistics.dispatcherPhone}` : ''}
                          {order.logistics?.vehicleNo ? ` · 车牌：${order.logistics.vehicleNo}` : ''}
                        </div>
                      )}
                      {(order.logistics?.status || order.logistics?.remark) && (
                        <div style={{fontSize: '12px', color: '#777', marginTop: '4px'}}>
                          当前进度：{LOGISTICS_LABELS[order.logistics?.status] || '未更新'}
                          {order.logistics?.remark ? ` · ${order.logistics.remark}` : ''}
                        </div>
                      )}
                    </div>
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
