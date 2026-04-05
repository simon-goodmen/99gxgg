module.exports = {
  "generatedAt": "2026-04-04T15:22:44.280Z",
  "factories": [
    {
      "id": 1,
      "name": "郑州二七厂",
      "tags": [
        "180亩重型厂区",
        "4万㎡标准车间",
        "10万吨年产出"
      ],
      "status": "在产正常",
      "status_color": "#81C784",
      "orders": "27个",
      "weekly_capacity": "1,850吨",
      "condition_text": "二班倒抢工",
      "condition_color": "#FFB74D",
      "month_total": "3,000",
      "month_remain": "2,500",
      "percentage": 58.7,
      "timeline_status": "充裕",
      "timelineBlocks": [
        {
          "id": 1,
          "factory_id": 1,
          "name": "上旬 (满载)",
          "theme": "full"
        },
        {
          "id": 2,
          "factory_id": 1,
          "name": "中旬 (紧张)",
          "theme": "warning"
        },
        {
          "id": 3,
          "factory_id": 1,
          "name": "下旬 (可订)",
          "theme": "available"
        }
      ]
    },
    {
      "id": 2,
      "name": "许昌建安厂",
      "tags": [
        "120亩智能化库区",
        "3万㎡现代化车间",
        "6万吨年产出"
      ],
      "status": "接单通畅",
      "status_color": "#81C784",
      "orders": "12个",
      "weekly_capacity": "850吨",
      "condition_text": "正常满载生产",
      "condition_color": "#4CAF50",
      "month_total": "3,000",
      "month_remain": "2,150",
      "percentage": 28.3,
      "timeline_status": "轻载",
      "timelineBlocks": [
        {
          "id": 4,
          "factory_id": 2,
          "name": "上旬 (排程)",
          "theme": "warning"
        },
        {
          "id": 5,
          "factory_id": 2,
          "name": "中旬 (可订)",
          "theme": "available"
        },
        {
          "id": 6,
          "factory_id": 2,
          "name": "下旬 (空闲)",
          "theme": "available"
        }
      ]
    }
  ]
};
