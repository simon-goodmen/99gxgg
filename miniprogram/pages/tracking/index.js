// pages/tracking/index.js
Page({
  data: {
    activeTab: 'steel',
    tabs: [
      { id: 'steel', label: '共享钢构', icon: '🏗️' },
      { id: 'concrete', label: '共享商砼', icon: '🚛' },
      { id: 'materials', label: '共享物资', icon: '📦' }
    ],
    expandedOrderId: 'O-1024-001',
    orders: {
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
            { id: 4, name: 'H型钢自动组立', status: 'processing', time: '预计今日 18:00 完成' },
            { id: 5, name: '龙门式埋弧焊接', status: 'pending', time: '--' },
            { id: 6, name: '数字化质检与合单发货', status: 'pending', time: '--' }
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
            { id: 3, name: '质检校验与正式发货', status: 'completed', time: '10-27 10:30' }
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
            { id: 2, name: '中央控制室生产中', status: 'completed', time: '今日 13:00' },
            { id: 3, name: '泵送运输 (豫A·M8899)', status: 'processing', time: '实时路况追踪' },
            { id: 4, name: '工地电子签收确认', status: 'pending', time: '预计 15:20 抵达' }
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
            { id: 3, name: '全闭环物流启运', status: 'pending', time: '--' }
          ]
        }
      ]
    },
    currentOrders: []
  },

  onLoad() {
    this.updateCurrentOrders('steel');
  },

  updateCurrentOrders(tabId) {
    this.setData({
      activeTab: tabId,
      currentOrders: this.data.orders[tabId] || []
    });
  },

  onTabChange(e) {
    const tabId = e.currentTarget.dataset.id;
    this.updateCurrentOrders(tabId);
  },

  toggleOrder(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedOrderId: this.data.expandedOrderId === id ? null : id
    });
  }
});
