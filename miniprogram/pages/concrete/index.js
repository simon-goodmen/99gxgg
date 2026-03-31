const { request } = require('../../utils/request');

Page({
  data: {
    stations: [],
    activeStationIdx: 0,
    currentStation: null,
    selectedGrade: '',
    currentPrice: 385,

    // Form Stats
    formGradeIdx: 0,
    formDate: '',
    formQty: '',
    formAddress: '',
    
    // Cart
    orderItems: [],
    totalQty: 0,

    // UI States
    showStationSwitcher: false,
    showConfirmModal: false,
    ordererName: '',
    ordererPhone: ''
  },

  onLoad() {
    this.fetchStations();
  },

  fetchStations() {
    wx.showLoading({ title: '加载中' });
    request({ url: '/concrete/stations' })
      .then(res => {
        wx.hideLoading();
        const defaultStation = res[0];
        if (defaultStation) {
          this.setData({
            stations: res,
            currentStation: defaultStation,
            selectedGrade: defaultStation.grades[0],
            currentPrice: this.calculatePrice(defaultStation.price, defaultStation.grades[0])
          });
        }
      })
      .catch(() => wx.hideLoading());
  },

  calculatePrice(base, grade) {
    let price = parseFloat(base) || 0;
    const numMatch = grade.match(/C(\d+)/);
    const num = numMatch ? parseInt(numMatch[1]) : 30;
    const diff = num - 30;
    price += (diff / 5) * 15;
    if (grade.includes('P6')) price += 15;
    if (grade.includes('P8')) price += 25;
    return price;
  },

  onGradeSelect(e) {
    const grade = e.currentTarget.dataset.grade;
    this.setData({
      selectedGrade: grade,
      currentPrice: this.calculatePrice(this.data.currentStation.price, grade)
    });
  },

  // Station Switcher
  openStationSwitcher() { this.setData({ showStationSwitcher: true }); },
  closeStationSwitcher() { this.setData({ showStationSwitcher: false }); },
  selectStation(e) {
    const idx = e.currentTarget.dataset.index;
    const st = this.data.stations[idx];
    this.setData({
      activeStationIdx: idx,
      currentStation: st,
      selectedGrade: st.grades[0],
      currentPrice: this.calculatePrice(st.price, st.grades[0]),
      showStationSwitcher: false
    });
  },

  // Form Handlers
  onPickerGradeChange(e) { this.setData({ formGradeIdx: e.detail.value }); },
  onDateChange(e) { this.setData({ formDate: e.detail.value }); },
  onQtyInput(e) { this.setData({ formQty: e.detail.value }); },
  onAddressInput(e) { this.setData({ formAddress: e.detail.value }); },

  addToList() {
    const { formDate, formQty, formAddress, currentStation, formGradeIdx } = this.data;
    if (!formDate || !formQty || !formAddress) {
      wx.showToast({ title: '请完善配置信息', icon: 'none' });
      return;
    }
    const newItem = {
      id: Date.now(),
      stationId: currentStation.id,
      stationName: currentStation.name,
      grade: currentStation.grades[formGradeIdx],
      date: formDate,
      qty: parseInt(formQty),
      unitPrice: this.calculatePrice(currentStation.price, currentStation.grades[formGradeIdx]),
      address: formAddress
    };
    const newList = [...this.data.orderItems, newItem];
    this.setData({
      orderItems: newList,
      totalQty: newList.reduce((sum, i) => sum + i.qty, 0),
      formQty: '',
      formAddress: ''
    });
  },

  removeItem(e) {
    const id = e.currentTarget.dataset.id;
    const newList = this.data.orderItems.filter(i => i.id !== id);
    this.setData({
      orderItems: newList,
      totalQty: newList.reduce((sum, i) => sum + i.qty, 0)
    });
  },

  // Final Submission
  openConfirmModal() {
    if (this.data.orderItems.length === 0) {
      wx.showToast({ title: '清单为空', icon: 'none' });
      return;
    }
    this.setData({ showConfirmModal: true });
  },
  closeConfirmModal() { this.setData({ showConfirmModal: false }); },
  onNameInput(e) { this.setData({ ordererName: e.detail.value }); },
  onPhoneInput(e) { this.setData({ ordererPhone: e.detail.value }); },

  submitFinal() {
    const { ordererName, ordererPhone, totalQty, orderItems } = this.data;
    if (!ordererName || !ordererPhone) {
      wx.showToast({ title: '请填写联系信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交订单...' });
    request({
      url: '/orders',
      method: 'POST',
      data: {
        order_type: 'concrete',
        delivery_address: this.data.orderItems[0].address,
        remark: `联系人：${ordererName} ${ordererPhone}`,
        items: orderItems.map(item => ({
          product_name: item.stationName + ' 混凝土',
          product_spec: item.grade,
          qty: item.qty,
          unit_price: item.unitPrice,
          unit: 'm³'
        }))
      }
    }).then(() => {
      wx.hideLoading();
      wx.showModal({
        title: '抢订成功！',
        content: `【${ordererName}】下周清单额度 ${totalQty} m³ 已锁定\n供货方将在24小时内联系您。`,
        showCancel: false,
        success: () => {
          this.setData({
            orderItems: [],
            totalQty: 0,
            ordererName: '',
            ordererPhone: '',
            showConfirmModal: false
          });
        }
      });
    }).catch(() => wx.hideLoading());
  }
});
