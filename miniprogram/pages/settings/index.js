// pages/settings/index.js
Page({
  data: {
    userInfo: {
      name: '李标',
      phone: '138****6789',
      email: 'libiao@biaojie.com'
    },
    projects: [
      { id: 1, name: '新郑机场T3航站楼', company: '河南省标杰建设工程有限公司', addr: '郑州市惠济区大河路与天河路交叉口', invoiceTitle: '河南省标杰建设工程有限公司', invoiceTaxId: '91410100MA4****', bank: '中国建设银行郑州花园路支行', bankAccount: '4100 1523 **** 8876', contactPhone: '0371-6856****', notes: '注意: 需配合甲方安全检查, 周末不收货' },
      { id: 2, name: '郑东体育中心辅馆', company: '中建七局第三建设有限公司', addr: '郑东新区CBD体育场路8号', invoiceTitle: '中建七局第三建设有限公司', invoiceTaxId: '91410100MA3****', bank: '工商银行郑州CBD支行', bankAccount: '1702 0264 **** 3301', contactPhone: '0371-5588****', notes: '' },
      { id: 3, name: '中牟物流园基地', company: '河南省标杰建设工程有限公司', addr: '中牟县官渡大道178号', invoiceTitle: '河南省标杰建设工程有限公司', invoiceTaxId: '91410100MA4****', bank: '农业银行中牟县支行', bankAccount: '1605 0101 **** 7790', contactPhone: '0371-6277****', notes: '大车需提前报备, 限高4.2m' }
    ],
    showAddProject: false,
    expandedProjectId: null,
    newProject: { name: '', company: '', addr: '', invoiceTitle: '', invoiceTaxId: '', bank: '', bankAccount: '', contactPhone: '', notes: '' }
  },

  onUserInfoInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`userInfo.${field}`]: e.detail.value });
  },

  toggleAddProject() {
    this.setData({ showAddProject: !this.data.showAddProject });
  },

  onNewProjectInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`newProject.${field}`]: e.detail.value });
  },

  handleAddProject() {
    const { newProject, projects } = this.data;
    if (!newProject.name) {
      wx.showToast({ title: '请填写项目名称', icon: 'none' });
      return;
    }
    const proj = Object.assign({}, newProject, { id: Date.now() });
    this.setData({
      projects: [...projects, proj],
      showAddProject: false,
      newProject: { name: '', company: '', addr: '', invoiceTitle: '', invoiceTaxId: '', bank: '', bankAccount: '', contactPhone: '', notes: '' }
    });
    wx.showToast({ title: '项目已添加', icon: 'success' });
  },

  toggleExpandProject(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedProjectId: this.data.expandedProjectId === id ? null : id
    });
  },

  handleDeleteProject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认移除',
      content: '确定要移除此项目吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            projects: this.data.projects.filter(p => p.id !== id),
            expandedProjectId: this.data.expandedProjectId === id ? null : this.data.expandedProjectId
          });
        }
      }
    });
  },

  handleSave() {
    wx.showToast({ title: '设置已保存', icon: 'success' });
  },

  handleLogout() {
    wx.showModal({
      title: '退出确认',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  }
});
