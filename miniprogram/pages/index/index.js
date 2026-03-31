const { request } = require('../../utils/request');

Page({
  data: {
    services: [
      {
        id: 'steel',
        title: '共享钢构',
        sub: '数字化排产 · 99元码头',
        icon: '🏗️',
        path: '/pages/steel/index',
        color: '#0F8265',
        desc: '支持图纸深化、来料加工、人工自选，激活四万平生产线。'
      },
      {
        id: 'concrete',
        title: '共享商砼',
        sub: '精准配比 · 实时配送',
        icon: '🚛',
        path: '/pages/concrete/index',
        color: '#1976D2',
        desc: '智能化调度系统，确保每一方混凝土准时到达工位。'
      },
      {
        id: 'materials',
        title: '共享建材',
        sub: '阳光采购 · 正品保障',
        icon: '📦',
        path: '/pages/materials/index',
        color: '#FFA000',
        desc: '精选大厂物资，价格透明，一键下单直达现场。'
      }
    ],
    stats: [
      { label: '入驻工厂', value: '--', unit: '家' },
      { label: '商砼站点', value: '--', unit: '站' },
      { label: '履约成功', value: '98', unit: '%' }
    ],
    phoneKefu: '400-888-9999'
  },

  onLoad() {
    this.fetchHomeData();
  },

  fetchHomeData() {
    // Fetch stats
    request({ url: '/homepage/stats' }).then(res => {
      this.setData({
        'stats[0].value': res.shared_steel_factories,
        'stats[1].value': res.partner_concrete_stations,
        'stats[2].value': res.fulfillment_rate.replace('%', '')
      });
    });

    // Fetch settings for phone
    request({ url: '/settings' }).then(res => {
      if (res.phone_kefu) {
        this.setData({ phoneKefu: res.phone_kefu.value });
      }
    });
  },

  navigateToService(e) {
    const { path } = e.currentTarget.dataset;
    wx.switchTab({
      url: path,
      fail: () => {
        wx.navigateTo({ url: path });
      }
    });
  },

  onContactUs() {
    wx.showActionSheet({
      itemList: ['拨打客服热线', '在线即时咨询'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.makePhoneCall({ phoneNumber: this.data.phoneKefu });
        } else {
          wx.showToast({ title: '客服正忙，请稍后', icon: 'none' });
        }
      }
    });
  }
});

