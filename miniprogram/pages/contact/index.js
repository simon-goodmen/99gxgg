const { request } = require('../../utils/request');

Page({
  data: {
    name: '',
    phone: '',
    message: ''
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onMessageInput(e) { this.setData({ message: e.detail.value }); },

  submitLead() {
    const { name, phone, message } = this.data;
    if (!name || !phone) {
      wx.showToast({ title: '请填写姓名和手机号', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中' });
    request({
      url: '/leads',
      method: 'POST',
      data: {
        source: 'miniprogram',
        lead_type: 'consultation',
        name,
        phone,
        message
      }
    }).then(() => {
      wx.hideLoading();
      wx.showModal({
        title: '提交成功',
        content: '您的咨询已进入后台，工作人员会尽快联系您。',
        showCancel: false,
        success: () => {
          this.setData({ name: '', phone: '', message: '' });
          wx.navigateBack({ delta: 1 });
        }
      });
    }).catch(() => wx.hideLoading());
  }
});
