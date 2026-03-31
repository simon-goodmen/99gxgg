// pages/profile/index.js
Page({
  data: {
    isLoggedIn: true, // Default to true for demo parity
    showPublishModal: false,
    showSettings: false,

    userInfo: {
      name: '李标',
      phone: '138****6789',
      email: 'libiao@biaojie.com',
    },

    // Multi-project tracking
    projects: [
      { id: 1, name: '新郑机场T3航站楼', company: '河南省标杰建设工程有限公司', addr: '郑州市惠济区大河路', invoiceTitle: '河南省标杰建设工程有限公司', invoiceTaxId: '91410100MA4****', contactPhone: '0371-6856****' },
      { id: 2, name: '郑东体育中心辅馆', company: '中建七局第三建设有限公司', addr: '郑东新区CBD体育场路', invoiceTitle: '中建七局第三建设有限公司', invoiceTaxId: '91410100MA3****', contactPhone: '0371-5588****' }
    ],
    expandedProjectId: null,

    projectLedger: [
      { id: 1, name: '新郑机场T3航站楼', subtitle: '钢构工程 / 郑州项目', progress: 65, value: '¥280w' },
      { id: 2, name: '郑东体育中心辅馆', subtitle: '商砼供应 / 郑东新区', progress: 88, value: '¥112w' },
      { id: 3, name: '中牟物流园基地', subtitle: '物资众筹 / 中牟项目', progress: 12, value: '¥45w' }
    ],

    myRequirements: [
      { 
        id: 'REQ-20231024-01', 
        title: '优质河沙 1000吨 采购需求',
        specs: '规格: 粗砂, 含泥量 < 3%',
        price: '价格: 面谈',
        status: '已发布至共享资源'
      },
      { 
        id: 'REQ-20231025-02', 
        title: '螺纹钢 HRB400E 12mm-20mm',
        specs: '规格: 12mm, 14mm, 18mm',
        price: '价格: 低于 ¥4150/吨',
        status: '拼价进行中'
      }
    ],

    // Publish Form
    categories: ['河沙', '石子', '水泥', '螺纹钢', '型钢', '商砼', '其他'],
    formCategoryIdx: 0,
    formQty: '',
    formSpecs: '',
    formPriceType: '面谈', // 面谈, 指定价, 低于
    formPriceValue: ''
  },

  onLoad() {
    // Initial data setup
  },

  handleLogin() { this.setData({ isLoggedIn: true }); },
  handleLogout() { this.setData({ isLoggedIn: false, showSettings: false }); },

  toggleSettings() { this.setData({ showSettings: !this.data.showSettings }); },

  toggleProjectExpand(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedProjectId: this.data.expandedProjectId === id ? null : id
    });
  },

  openPublishModal() { this.setData({ showPublishModal: true }); },
  closePublishModal() { this.setData({ showPublishModal: false }); },

  onCategoryChange(e) { this.setData({ formCategoryIdx: e.detail.value }); },
  onPriceTypeSelect(e) { this.setData({ formPriceType: e.currentTarget.dataset.type }); },

  handlePublish() {
    const { formQty, formSpecs, categories, formCategoryIdx, formPriceType, formPriceValue } = this.data;
    if (!formQty || !formSpecs) {
      wx.showToast({ title: '请完善必要信息', icon: 'none' });
      return;
    }
    const newReq = {
      id: `REQ-${Date.now().toString().slice(-8)}`,
      title: `${categories[formCategoryIdx]} ${formQty}吨 采购需求`,
      specs: `规格: ${formSpecs}`,
      price: `价格: ${formPriceType === '面谈' ? '面谈' : '¥' + formPriceValue}`,
      status: '已发布至共享资源'
    };
    this.setData({
      myRequirements: [newReq, ...this.data.myRequirements],
      showPublishModal: false
    });
    wx.showToast({ title: '发布成功' });
  }
});
