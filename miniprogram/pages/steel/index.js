const { request } = require('../../utils/request');

Page({
  data: {
    factories: [],
    processTypes: ['H型钢、网架', '箱型柱/十字柱', '管桁架', '重钢非标异形件', '光伏支架代工'],
    activeFactoryIdx: 0,
    currentFactory: null,
    showFactoryModal: false,
    showBookingModal: false,
    
    // Form fields
    formTargetFactoryId: '',
    formTypeIdx: 0,
    formTonnage: '',
    formDate: '',
    needProcessing: true,
    needCorporate: false,
    needDrawing: false,
    contactName: '',
    contactPhone: ''
  },

  onLoad() {
    this.fetchFactories();
  },

  fetchFactories() {
    wx.showLoading({ title: '加载中' });
    request({ url: '/steel/factories' })
      .then(res => {
        wx.hideLoading();
        this.setData({
          factories: res,
          currentFactory: res[0],
          formTargetFactoryId: res[0] ? res[0].id : ''
        });
      })
      .catch(() => wx.hideLoading());
  },

  // Factory Selection
  openFactoryModal() { this.setData({ showFactoryModal: true }); },
  closeFactoryModal() { this.setData({ showFactoryModal: false }); },
  selectFactory(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({
      activeFactoryIdx: idx,
      currentFactory: this.data.factories[idx],
      formTargetFactoryId: this.data.factories[idx].id,
      showFactoryModal: false
    });
  },

  // Booking Modal
  openBookingModal() { this.setData({ showBookingModal: true }); },
  closeBookingModal() { this.setData({ showBookingModal: false }); },

  // Form Interactions
  onTonnageInput(e) { this.setData({ formTonnage: e.detail.value }); },
  onDateChange(e) { this.setData({ formDate: e.detail.value }); },
  onTypeChange(e) { this.setData({ formTypeIdx: e.detail.value }); },
  onNameInput(e) { this.setData({ contactName: e.detail.value }); },
  onPhoneInput(e) { this.setData({ contactPhone: e.detail.value }); },
  
  toggleProcessing() { this.setData({ needProcessing: !this.data.needProcessing }); },
  toggleCorporate() { this.setData({ needCorporate: !this.data.needCorporate }); },
  toggleDrawing() { this.setData({ needDrawing: !this.data.needDrawing }); },

  handleSubmit() {
    const { formTonnage, contactName, contactPhone, currentFactory, formDate } = this.data;
    if (!formTonnage || !contactName || !contactPhone) {
      wx.showToast({ title: '请填写必填信息', icon: 'none' });
      return;
    }

    // Call backend to log inquiry or create order
    request({
      url: '/orders',
      method: 'POST',
      data: {
        order_type: 'steel',
        remark: `预约工厂：${currentFactory.name}, 吨位：${formTonnage}, 期望日期：${formDate}`,
        items: [{
          product_name: '钢构加工定制',
          product_spec: this.data.processTypes[this.data.formTypeIdx],
          qty: parseFloat(formTonnage),
          unit_price: 0, // In factory inquiry, price is usually quoted later
          unit: '吨'
        }],
        delivery_address: '联系人：' + contactName + ' ' + contactPhone
      }
    }).then(() => {
      wx.showModal({
        title: '提交成功！',
        content: `已提交至【${currentFactory.name}】成功！\n您的锁定需求已同步至系统后台，业务经理五分钟内响应。`,
        showCancel: false,
        success: () => {
          this.setData({
            showBookingModal: false,
            formTonnage: '',
            contactName: '',
            contactPhone: ''
          });
        }
      });
    });
  }
});
