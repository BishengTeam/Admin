import type { RensheExportInstructions } from '@/types/rensheProject'

export const exportInstructions: RensheExportInstructions = {
  "registration_template": "报名信息.xlsx",
  "work_template": "工作经历.xlsx",
  "work_description": "原样附带甲方工作经历模板，目前不会按考生自动填写经历；后续按报送要求补充。",
  "directory_note": "目录示例，实际内容以报名材料为准；文件保留真实扩展名。",
  "portrait_note": "本期报名照片为一寸白底近期证件照、≤500 KB；文件名沿用甲方既定的二寸免冠照片，不改变真实格式。历史批次保留原材料要求。",
  "example_paths": [
    "报名信息.xlsx",
    "工作经历.xlsx",
    "110101********123X_证件正面.jpg",
    "110101********123X_证件背面.jpeg",
    "110101********123X_二寸免冠照片.jpg",
    "110101********123X_学历证明.pdf",
    "110101********123X_学信网电子注册表.pdf",
    "110101********123X_承诺书.pdf"
  ],
  "file_tree": "人社报名_批次编号_第1卷.zip\n├─ 报名信息.xlsx\n├─ 工作经历.xlsx\n├─ 110101********123X_证件正面.jpg\n├─ 110101********123X_证件背面.jpeg\n├─ 110101********123X_二寸免冠照片.jpg\n├─ 110101********123X_学历证明.pdf\n├─ 110101********123X_学信网电子注册表.pdf\n└─ 110101********123X_承诺书.pdf",
  "columns": [
    {
      "column": 1,
      "header": "姓名",
      "source": "本人实名姓名"
    },
    {
      "column": 2,
      "header": "性别",
      "source": "本人实名性别"
    },
    {
      "column": 3,
      "header": "出生日期",
      "source": "本人实名出生日期"
    },
    {
      "column": 4,
      "header": "证件类型",
      "source": "居民身份证"
    },
    {
      "column": 5,
      "header": "证件号码",
      "source": "本人实名身份证号"
    },
    {
      "column": 6,
      "header": "考生来源",
      "source": "社会人员"
    },
    {
      "column": 7,
      "header": "文化程度",
      "source": "本次报名学历（按模板文化程度转换）"
    },
    {
      "column": 8,
      "header": "民族",
      "source": "本次填报民族"
    },
    {
      "column": 9,
      "header": "政治面貌",
      "source": "本次填报政治面貌"
    },
    {
      "column": 10,
      "header": "联系电话",
      "source": "本次联系电话"
    },
    {
      "column": 11,
      "header": "通讯地址",
      "source": "本次通讯地址"
    },
    {
      "column": 12,
      "header": "工作单位",
      "source": "本次工作单位（选填）"
    },
    {
      "column": 13,
      "header": "从事职业",
      "source": "本人实际从事职业"
    },
    {
      "column": 14,
      "header": "职业（工种）名称",
      "source": "批次所选职业／工种"
    },
    {
      "column": 15,
      "header": "职业（工种）等级",
      "source": "批次所选技能等级的导出值"
    },
    {
      "column": 16,
      "header": "职称专业名称",
      "source": "学历型不填写职称专业"
    },
    {
      "column": 17,
      "header": "职称等级",
      "source": "学历型不填写职称等级"
    },
    {
      "column": 18,
      "header": "参加工作日期（入学日期）",
      "source": "真实参加工作日期，格式如2022-9-21；不使用入学或毕业日期"
    },
    {
      "column": 19,
      "header": "职业年限",
      "source": "实际职业年限，必填，允许0"
    },
    {
      "column": 20,
      "header": "职业",
      "source": "批次匹配的职业代码"
    },
    {
      "column": 21,
      "header": "申报条件",
      "source": "批次组合匹配的模板申报条件原文"
    },
    {
      "column": 22,
      "header": "申报类型",
      "source": "批次所选申报类型"
    },
    {
      "column": 23,
      "header": "考试类型",
      "source": "批次考试类型（新考／补考）"
    },
    {
      "column": 24,
      "header": "社保参保单位",
      "source": "实际社保参保单位（选填）"
    },
    {
      "column": 25,
      "header": "电子邮箱",
      "source": "本次电子邮箱"
    }
  ]
}
