export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/batch/index',
    'pages/outbound/index',
    'pages/quota/index',
    'pages/inbound/index',
    'pages/batchDetail/index',
    'pages/outboundDetail/index',
    'pages/quotaApply/index',
    'pages/quotaApplicationDetail/index',
    'pages/inspection/index',
    'pages/warning/index',
    'pages/consumption/index',
    'pages/approvalHistory/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2D7D46',
    navigationBarTitleText: '粮库溯源',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#2D7D46',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/batch/index',
        text: '批次'
      },
      {
        pagePath: 'pages/outbound/index',
        text: '出库'
      },
      {
        pagePath: 'pages/quota/index',
        text: '额度'
      }
    ]
  }
})
