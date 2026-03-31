const BASE_URL = 'http://localhost:5000/api';

/**
 * 通用请求工具函数
 * @param {Object} options 请求配置
 * @param {string} options.url 路径
 * @param {string} [options.method='GET'] 方法
 * @param {Object} [options.data] 数据
 * @param {Object} [options.header] 请求头
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          wx.showToast({
            title: res.data.message || '请求失败',
            icon: 'none'
          });
          reject(res.data);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络连接失败',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
};

module.exports = {
  request,
  BASE_URL
};
