import type { RensheCombination, RensheProjectConfig, RensheAdmissionRequirements, RensheExportInstructions } from '@/types/rensheProject'

// Recorded server capabilities. Share identical policy payloads across trades.
const configs: Record<string, Partial<RensheProjectConfig>> = {
  "工龄型5": {
    "occupation_name": "互联网信息审核员",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-互联网信息审核员-初级工",
    "skill_level": "初级工",
    "export_skill_level": "五级",
    "qualification_rule": "level_five_employment_v1",
    "exam_types": [
      "新考"
    ],
    "application_types": [
      "工龄型"
    ],
    "education_levels": [
      "primary",
      "junior_high",
      "senior_high",
      "secondary_vocational",
      "technical_school",
      "vocational_high",
      "higher_vocational",
      "associate",
      "bachelor",
      "master",
      "doctorate",
      "other"
    ],
    "form_fields": [
      "contact_phone",
      "mailing_address",
      "email"
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      }
    ],
    "export_template": "renshe_employment_v1",
    "field_mapping": {},
    "attachment_layout": "flat",
    "selection_id": "internet_review:5:工龄型",
    "rule_profile": {
      "selection_id": "internet_review:5:工龄型",
      "occupation_key": "internet_review",
      "occupation_title": "网络与信息安全管理员",
      "occupation_name": "互联网信息审核员",
      "official_code": "4-04-04-02",
      "grade": 5,
      "skill_level": "初级工",
      "export_skill_level": "五级",
      "level_label": "五级／初级工",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-互联网信息审核员-初级工",
      "application_type": "工龄型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "年满16周岁，从事本职业或相关职业工作。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页",
        "四川省职业技能等级认定个人申报表.docx填表说明与解答PDF第2页分类存在差异；业务已确认五级统一按工龄型报名及导出"
      ],
      "related_majors": "含网络与信息安全专业，以及传播学、法学、社会学等扩展专业；完整范围见申报条件PDF第3页，须逐项人工核对。",
      "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
      "project_limits": [
        "年满16周岁，按北京时间首次正式提交日期核算；补正沿用首次提交基准",
        "工龄型须提供相关职业工作经历、工龄证明及社保证明；不设置最低工作年数，不要求前置证书或毕业学历材料",
        "五级统一按工龄型报名及导出，申报条件为年满16周岁、从事本职业或相关职业工作"
      ]
    },
    "institution_types": [],
    "reporting_policy": {
      "contract_version": 2
    }
  },
  "工龄型": {
    "occupation_name": "工业机器人系统操作员",
    "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "qualification_rule": "documented_employment_v1",
    "exam_types": [
      "新考"
    ],
    "application_types": [
      "工龄型"
    ],
    "education_levels": [
      "primary",
      "junior_high",
      "senior_high",
      "secondary_vocational",
      "technical_school",
      "vocational_high",
      "higher_vocational",
      "associate",
      "bachelor",
      "master",
      "doctorate",
      "other"
    ],
    "form_fields": [
      "contact_phone",
      "mailing_address",
      "email"
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      }
    ],
    "export_template": "renshe_employment_v1",
    "field_mapping": {},
    "attachment_layout": "flat",
    "selection_id": "robot_operator:4:工龄型",
    "rule_profile": {
      "selection_id": "robot_operator:4:工龄型",
      "occupation_key": "robot_operator",
      "occupation_title": "工业机器人系统操作员",
      "occupation_name": "工业机器人系统操作员",
      "official_code": "6-30-99-00",
      "grade": 4,
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "level_label": "四级／中级工",
      "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
      "application_type": "工龄型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "累计从事本职业或相关职业工作满5年。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "加工制造类、机电设备类、机械类、电气类、自动化类、电子信息类、计算机类、通信类等。",
      "related_occupations": "焊工、机械设备维修人员、机械冷加工人员、金属加工机械制造人员、信息通信网络运行管理人员、计算机制造人员等。",
      "project_limits": [
        "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
        "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
        "累计相关职业工作满5年，工龄及社保须逐项初审核验"
      ]
    },
    "institution_types": [],
    "reporting_policy": {
      "contract_version": 2
    }
  },
  "复合型": {
    "occupation_name": "工业机器人系统操作员",
    "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "qualification_rule": "documented_employment_v1",
    "exam_types": [
      "新考"
    ],
    "application_types": [
      "复合型"
    ],
    "education_levels": [
      "primary",
      "junior_high",
      "senior_high",
      "secondary_vocational",
      "technical_school",
      "vocational_high",
      "higher_vocational",
      "associate",
      "bachelor",
      "master",
      "doctorate",
      "other"
    ],
    "form_fields": [
      "contact_phone",
      "mailing_address",
      "email"
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "vocational_qualification_certificate",
        "name": "职业资格证书及网查截图（合并为同一份JPEG材料）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      }
    ],
    "export_template": "renshe_employment_v1",
    "field_mapping": {},
    "attachment_layout": "flat",
    "selection_id": "robot_operator:4:复合型",
    "rule_profile": {
      "selection_id": "robot_operator:4:复合型",
      "occupation_key": "robot_operator",
      "occupation_title": "工业机器人系统操作员",
      "occupation_name": "工业机器人系统操作员",
      "official_code": "6-30-99-00",
      "grade": 4,
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "level_label": "四级／中级工",
      "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
      "application_type": "复合型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "取得本职业或相关职业五级/初级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满3年。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "加工制造类、机电设备类、机械类、电气类、自动化类、电子信息类、计算机类、通信类等。",
      "related_occupations": "焊工、机械设备维修人员、机械冷加工人员、金属加工机械制造人员、信息通信网络运行管理人员、计算机制造人员等。",
      "project_limits": [
        "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
        "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
        "复合型仅开放取得五级证书后累计相关工作满3年路径"
      ]
    },
    "institution_types": [],
    "reporting_policy": {
      "contract_version": 2
    }
  },
  "学历型": {
    "occupation_name": "工业机器人系统操作员",
    "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "qualification_rule": "related_major_graduated_degree_v1",
    "exam_types": [
      "新考"
    ],
    "application_types": [
      "学历型"
    ],
    "education_levels": [
      "primary",
      "junior_high",
      "senior_high",
      "secondary_vocational",
      "technical_school",
      "vocational_high",
      "higher_vocational",
      "associate",
      "bachelor",
      "master",
      "doctorate",
      "other"
    ],
    "form_fields": [
      "contact_phone",
      "mailing_address",
      "email"
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "graduation_certificate",
        "name": "毕业证",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "education_report",
        "name": "学信网学历备案表（在线验证有效期设置为6个月）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      }
    ],
    "export_template": "renshe_graduated_v1",
    "field_mapping": {},
    "attachment_layout": "flat",
    "selection_id": "robot_operator:4:学历型",
    "rule_profile": {
      "selection_id": "robot_operator:4:学历型",
      "occupation_key": "robot_operator",
      "occupation_title": "工业机器人系统操作员",
      "occupation_name": "工业机器人系统操作员",
      "official_code": "6-30-99-00",
      "grade": 4,
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "level_label": "四级／中级工",
      "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
      "application_type": "学历型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [
        "technical",
        "vocational",
        "general_higher"
      ],
      "source_conditions": [
        "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "加工制造类、机电设备类、机械类、电气类、自动化类、电子信息类、计算机类、通信类等。",
      "related_occupations": "焊工、机械设备维修人员、机械冷加工人员、金属加工机械制造人员、信息通信网络运行管理人员、计算机制造人员等。",
      "project_limits": [
        "本期只接受已取得毕业证，不开放在读应届替代证明",
        "不能提供既定学历报告时联系管理员，不开放替代材料线上报名"
      ]
    },
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "reporting_policy": {
      "contract_version": 2
    }
  },
  "工龄型3": {
    "occupation_name": "信息安全管理员",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
    "skill_level": "高级工",
    "export_skill_level": "三级",
    "qualification_rule": "level_three_v1",
    "exam_types": [
      "新考"
    ],
    "application_types": [
      "工龄型"
    ],
    "education_levels": [
      "primary",
      "junior_high",
      "senior_high",
      "secondary_vocational",
      "technical_school",
      "vocational_high",
      "higher_vocational",
      "associate",
      "bachelor",
      "master",
      "doctorate",
      "other"
    ],
    "form_fields": [
      "contact_phone",
      "mailing_address",
      "email"
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1
      }
    ],
    "export_template": "renshe_employment_v1",
    "field_mapping": {},
    "attachment_layout": "flat",
    "selection_id": "information_security:3:工龄型",
    "rule_profile": {
      "selection_id": "information_security:3:工龄型",
      "occupation_key": "information_security",
      "occupation_title": "网络与信息安全管理员",
      "occupation_name": "信息安全管理员",
      "official_code": "4-04-04-02",
      "grade": 3,
      "skill_level": "高级工",
      "export_skill_level": "三级",
      "level_label": "三级／高级工",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
      "application_type": "工龄型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "累计从事本职业或相关职业工作满10年。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
      "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
      "project_limits": [
        "须选择具体三级申报路径，按路径匹配必填字段、材料、初审核验及导出条件，不套用四级规则",
        "学历及证书加学历路径仅接受已取得毕业证，不开放在读应届替代证明",
        "技工院校须高级工班及以上；经评估论证院校由初审核验其备案等级认定评价机构资格",
        "证书与对应网查截图合并JPEG；学历网查截图整理为PDF，不伪装文件扩展名"
      ],
      "admission_paths": [
        {
          "id": "work_10",
          "type": "工龄型",
          "condition_index": 0,
          "years": 10,
          "work": true,
          "condition": "累计从事本职业或相关职业工作满10年。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "work_proof",
            "social_security_proof"
          ]
        }
      ],
      "review_checks": {
        "identity": "实名与全部证书、工作及社保材料属于同一人",
        "photo": "一寸白底近期证件照，不超过500 KB",
        "commitment": "承诺书完整、本人亲笔签名并按手印",
        "path": "核对所选三级申报路径与实际证书、职称、工作或毕业学历材料一致；不得借用其他路径条件",
        "occupation": "逐项核对本职业、相关职业或专业对应关系，不仅核验附件存在",
        "qualification": "工龄型满10年；复合型分别核验四级证书后满4年、初级职称后满1年或四级证书加对应毕业学历；仅核验当前所选分支",
        "proof": "当前路径要求的工作证明、社保、技能或初级职称证书与网查一致；单位、时间、验证码及经办人有效"
      }
    },
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "reporting_policy": {
      "contract_version": 2
    }
  },
  "复合型3": {
    "occupation_name": "信息安全管理员",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
    "skill_level": "高级工",
    "export_skill_level": "三级",
    "qualification_rule": "level_three_v1",
    "exam_types": [
      "新考"
    ],
    "application_types": [
      "复合型"
    ],
    "education_levels": [
      "primary",
      "junior_high",
      "senior_high",
      "secondary_vocational",
      "technical_school",
      "vocational_high",
      "higher_vocational",
      "associate",
      "bachelor",
      "master",
      "doctorate",
      "other"
    ],
    "form_fields": [
      "contact_phone",
      "mailing_address",
      "email"
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": false,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": false,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "vocational_qualification_certificate",
        "name": "职业资格证书及网查截图（合并为同一份JPEG材料）",
        "required": false,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "professional_title_certificate",
        "name": "初级职称证书及网查截图（合并为同一份JPEG材料）",
        "required": false,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "graduation_certificate",
        "name": "毕业证书",
        "required": false,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "education_report",
        "name": "学历核验材料（证书与学历路径为学信网备案表，其他学历路径为学历网查截图PDF）",
        "required": false,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1
      }
    ],
    "export_template": "renshe_employment_v1",
    "field_mapping": {},
    "attachment_layout": "flat",
    "selection_id": "information_security:3:复合型",
    "rule_profile": {
      "selection_id": "information_security:3:复合型",
      "occupation_key": "information_security",
      "occupation_title": "网络与信息安全管理员",
      "occupation_name": "信息安全管理员",
      "official_code": "4-04-04-02",
      "grade": 3,
      "skill_level": "高级工",
      "export_skill_level": "三级",
      "level_label": "三级／高级工",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
      "application_type": "复合型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满4年。",
        "取得符合专业对应关系的初级职称（专业技术人员职业资格）后，累计从事本职业或相关职业工作满1年。",
        "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书，并取得高等职业学校、专科及以上普通高等学校本专业或相关专业毕业证书（含在读应届毕业生）。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
      "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
      "project_limits": [
        "须选择具体三级申报路径，按路径匹配必填字段、材料、初审核验及导出条件，不套用四级规则",
        "学历及证书加学历路径仅接受已取得毕业证，不开放在读应届替代证明",
        "技工院校须高级工班及以上；经评估论证院校由初审核验其备案等级认定评价机构资格",
        "证书与对应网查截图合并JPEG；学历网查截图整理为PDF，不伪装文件扩展名"
      ],
      "admission_paths": [
        {
          "id": "skill_4_work_4",
          "type": "复合型",
          "condition_index": 0,
          "years": 4,
          "work": true,
          "skill": true,
          "condition": "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满4年。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "work_proof",
            "social_security_proof",
            "vocational_qualification_certificate"
          ]
        },
        {
          "id": "title_work_1",
          "type": "复合型",
          "condition_index": 1,
          "years": 1,
          "work": true,
          "title": true,
          "condition": "取得符合专业对应关系的初级职称（专业技术人员职业资格）后，累计从事本职业或相关职业工作满1年。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "work_proof",
            "social_security_proof",
            "professional_title_certificate"
          ]
        },
        {
          "id": "skill_4_degree",
          "type": "复合型",
          "condition_index": 2,
          "years": 0,
          "skill": true,
          "education": true,
          "condition": "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书，并取得高等职业学校、专科及以上普通高等学校本专业或相关专业毕业证书（含在读应届毕业生）。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "vocational_qualification_certificate",
            "graduation_certificate",
            "education_report"
          ]
        }
      ],
      "review_checks": {
        "identity": "实名与全部证书、工作及社保材料属于同一人",
        "photo": "一寸白底近期证件照，不超过500 KB",
        "commitment": "承诺书完整、本人亲笔签名并按手印",
        "path": "核对所选三级申报路径与实际证书、职称、工作或毕业学历材料一致；不得借用其他路径条件",
        "occupation": "逐项核对本职业、相关职业或专业对应关系，不仅核验附件存在",
        "qualification": "工龄型满10年；复合型分别核验四级证书后满4年、初级职称后满1年或四级证书加对应毕业学历；仅核验当前所选分支",
        "proof": "当前路径要求的工作证明、社保、技能或初级职称证书与网查一致；单位、时间、验证码及经办人有效",
        "education": "涉及学历时核对已取得毕业证、相关专业及学历报告；技工院校须高级工班及以上；评估院校须核验其备案等级认定评价机构资格；证书加学历路径须高职或专科以上，备案表有效期6个月"
      }
    },
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "reporting_policy": {
      "contract_version": 2
    }
  },
  "学历型3": {
    "occupation_name": "信息安全管理员",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
    "skill_level": "高级工",
    "export_skill_level": "三级",
    "qualification_rule": "level_three_v1",
    "exam_types": [
      "新考"
    ],
    "application_types": [
      "学历型"
    ],
    "education_levels": [
      "primary",
      "junior_high",
      "senior_high",
      "secondary_vocational",
      "technical_school",
      "vocational_high",
      "higher_vocational",
      "associate",
      "bachelor",
      "master",
      "doctorate",
      "other"
    ],
    "form_fields": [
      "contact_phone",
      "mailing_address",
      "email"
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "graduation_certificate",
        "name": "毕业证书",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1
      },
      {
        "kind": "education_report",
        "name": "学历核验材料（证书与学历路径为学信网备案表，其他学历路径为学历网查截图PDF）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1
      }
    ],
    "export_template": "renshe_employment_v1",
    "field_mapping": {},
    "attachment_layout": "flat",
    "selection_id": "information_security:3:学历型",
    "rule_profile": {
      "selection_id": "information_security:3:学历型",
      "occupation_key": "information_security",
      "occupation_title": "网络与信息安全管理员",
      "occupation_name": "信息安全管理员",
      "official_code": "4-04-04-02",
      "grade": 3,
      "skill_level": "高级工",
      "export_skill_level": "三级",
      "level_label": "三级／高级工",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
      "application_type": "学历型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [
        "technical",
        "vocational",
        "general_higher"
      ],
      "source_conditions": [
        "取得本专业或相关专业的技工院校高级工班及以上毕业证书（含在读应届毕业生）。",
        "取得经评估论证的高等职业学校、专科及以上普通高等学校本专业或相关专业的毕业证书（含在读应届毕业生）。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
      "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
      "project_limits": [
        "须选择具体三级申报路径，按路径匹配必填字段、材料、初审核验及导出条件，不套用四级规则",
        "学历及证书加学历路径仅接受已取得毕业证，不开放在读应届替代证明",
        "技工院校须高级工班及以上；经评估论证院校由初审核验其备案等级认定评价机构资格",
        "证书与对应网查截图合并JPEG；学历网查截图整理为PDF，不伪装文件扩展名"
      ],
      "admission_paths": [
        {
          "id": "technical_senior",
          "type": "学历型",
          "condition_index": 0,
          "years": 0,
          "education": true,
          "condition": "取得本专业或相关专业的技工院校高级工班及以上毕业证书（含在读应届毕业生）。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "graduation_certificate",
            "education_report"
          ]
        },
        {
          "id": "evaluated_college",
          "type": "学历型",
          "condition_index": 1,
          "years": 0,
          "education": true,
          "condition": "取得经评估论证的高等职业学校、专科及以上普通高等学校本专业或相关专业的毕业证书（含在读应届毕业生）。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "graduation_certificate",
            "education_report"
          ]
        }
      ],
      "review_checks": {
        "identity": "实名与全部证书、工作及社保材料属于同一人",
        "photo": "一寸白底近期证件照，不超过500 KB",
        "commitment": "承诺书完整、本人亲笔签名并按手印",
        "path": "核对所选三级申报路径与实际证书、职称、工作或毕业学历材料一致；不得借用其他路径条件",
        "occupation": "逐项核对本职业、相关职业或专业对应关系，不仅核验附件存在",
        "education": "涉及学历时核对已取得毕业证、相关专业及学历报告；技工院校须高级工班及以上；评估院校须核验其备案等级认定评价机构资格；证书加学历路径须高职或专科以上，备案表有效期6个月"
      }
    },
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "reporting_policy": {
      "contract_version": 2
    }
  },
  "pending": {
    "occupation_name": "商务数据分析师",
    "occupation_code": "4-07-02-05-商务数据分析师-中级工",
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "exam_types": [
      "新考"
    ],
    "application_types": [
      "学历型"
    ],
    "qualification_rule": "unadapted",
    "education_levels": [],
    "form_fields": [],
    "materials": [],
    "export_template": "",
    "field_mapping": {},
    "attachment_layout": "flat",
    "institution_types": [],
    "reporting_policy": {},
    "commitment_template": null,
    "selection_id": "business_data:4:学历型",
    "rule_profile": {
      "selection_id": "business_data:4:学历型",
      "occupation_key": "business_data",
      "occupation_title": "商务数据分析师",
      "occupation_name": "商务数据分析师",
      "official_code": "4-07-02-05",
      "grade": 4,
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "level_label": "四级／中级工",
      "occupation_code": "4-07-02-05-商务数据分析师-中级工",
      "application_type": "学历型",
      "adapted": false,
      "implementation_ready": false,
      "reporting_confirmed": false,
      "status": "待适配",
      "adaptation_status": "待业务确认",
      "missing": [
        "尚未实现该申报路径的专项字段、材料、初审核验及导出联调",
        "相关职业、专业及院校细则待补齐"
      ],
      "institution_types": [],
      "source_conditions": [
        "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "注意.txt；报名信息.xlsx／申报条件工作表"
      ],
      "related_majors": "现有模板提供四级、三级职业代码及条件，相关专业与院校细则待补齐。",
      "related_occupations": "相关职业细则待补齐，不套用其他职业。",
      "project_limits": [
        "仅可保存草稿，禁止启用、发布及新报名"
      ]
    }
  }
}

const requirements: Record<string, RensheAdmissionRequirements> = {
  "工龄型5": {
    "rule_profile": {
      "selection_id": "internet_review:5:工龄型",
      "occupation_key": "internet_review",
      "occupation_title": "网络与信息安全管理员",
      "occupation_name": "互联网信息审核员",
      "official_code": "4-04-04-02",
      "grade": 5,
      "skill_level": "初级工",
      "export_skill_level": "五级",
      "level_label": "五级／初级工",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-互联网信息审核员-初级工",
      "application_type": "工龄型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "年满16周岁，从事本职业或相关职业工作。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页",
        "四川省职业技能等级认定个人申报表.docx填表说明与解答PDF第2页分类存在差异；业务已确认五级统一按工龄型报名及导出"
      ],
      "related_majors": "含网络与信息安全专业，以及传播学、法学、社会学等扩展专业；完整范围见申报条件PDF第3页，须逐项人工核对。",
      "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
      "project_limits": [
        "年满16周岁，按北京时间首次正式提交日期核算；补正沿用首次提交基准",
        "工龄型须提供相关职业工作经历、工龄证明及社保证明；不设置最低工作年数，不要求前置证书或毕业学历材料",
        "五级统一按工龄型报名及导出，申报条件为年满16周岁、从事本职业或相关职业工作"
      ]
    },
    "review_checks": {
      "identity": "实名与全部证书、工作及社保材料属于同一人",
      "occupation": "实际从事本职业或资料列明相关职业，结合工作单位与岗位核验",
      "employment": "五级工龄型：实际从事本职业或相关职业，不设最低工作年数，不套用四级满5年条件",
      "work_proof": "工龄证明单位鲜章及编号、手写内容、经办人及电话齐全，经办人不是考生本人",
      "social_security": "社保单位与工作单位一致，时间信息与申报经历相符，验证码完整、有效且可验证",
      "photo": "一寸白底近期证件照，不超过500 KB",
      "commitment": "承诺书完整、本人亲笔签名并按手印",
      "age": "以首次正式提交的北京时间日期核对本人实名出生日期，年满16周岁"
    },
    "scope": {
      "occupation_name": "互联网信息审核员",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-互联网信息审核员-初级工",
      "skill_level": "初级工",
      "export_skill_level": "五级",
      "application_types": [
        "工龄型"
      ],
      "exam_types": [
        "新考"
      ],
      "qualification_rule": "level_five_employment_v1"
    },
    "form_sections": [
      "本人实名信息",
      "文化程度、实际工作经历（无前置证书）",
      "联系信息",
      "报送模板要求的其他实际信息"
    ],
    "education_options": [
      {
        "value": "primary",
        "label": "小学"
      },
      {
        "value": "junior_high",
        "label": "初中"
      },
      {
        "value": "senior_high",
        "label": "高中"
      },
      {
        "value": "secondary_vocational",
        "label": "中专"
      },
      {
        "value": "technical_school",
        "label": "技校"
      },
      {
        "value": "vocational_high",
        "label": "职高"
      },
      {
        "value": "higher_vocational",
        "label": "高职"
      },
      {
        "value": "associate",
        "label": "大专"
      },
      {
        "value": "bachelor",
        "label": "大学本科"
      },
      {
        "value": "master",
        "label": "硕士"
      },
      {
        "value": "doctorate",
        "label": "博士"
      },
      {
        "value": "other",
        "label": "其他"
      }
    ],
    "institution_types": [],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 512000
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      }
    ],
    "notes": [
      "五级工龄型：年龄使用本人实名资料按首次正式提交日期核验；不设置最低工作年数或前置证书，报名及导出均使用工龄型。",
      "新批次使用当前代码规则；已发布批次继续使用创建时冻结的报名要求。",
      "材料格式、大小、数量和必填性由服务端强制校验。"
    ]
  },
  "工龄型": {
    "rule_profile": {
      "selection_id": "robot_operator:4:工龄型",
      "occupation_key": "robot_operator",
      "occupation_title": "工业机器人系统操作员",
      "occupation_name": "工业机器人系统操作员",
      "official_code": "6-30-99-00",
      "grade": 4,
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "level_label": "四级／中级工",
      "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
      "application_type": "工龄型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "累计从事本职业或相关职业工作满5年。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "加工制造类、机电设备类、机械类、电气类、自动化类、电子信息类、计算机类、通信类等。",
      "related_occupations": "焊工、机械设备维修人员、机械冷加工人员、金属加工机械制造人员、信息通信网络运行管理人员、计算机制造人员等。",
      "project_limits": [
        "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
        "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
        "累计相关职业工作满5年，工龄及社保须逐项初审核验"
      ]
    },
    "review_checks": {
      "identity": "实名与全部证书、工作及社保材料属于同一人",
      "occupation": "实际从事本职业或资料列明相关职业，结合工作单位与岗位核验",
      "employment": "四级工龄型：累计本职业或相关职业工作满5年；重叠时间不重复累计，不以学历或证书代替工龄",
      "work_proof": "工龄证明单位鲜章及编号、手写内容、经办人及电话齐全，经办人不是考生本人",
      "social_security": "社保单位与工作单位一致，累计时长符合要求，验证码完整且在有效期内可验证",
      "photo": "一寸白底近期证件照，不超过500 KB",
      "commitment": "承诺书完整、本人亲笔签名并按手印"
    },
    "scope": {
      "occupation_name": "工业机器人系统操作员",
      "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "application_types": [
        "工龄型"
      ],
      "exam_types": [
        "新考"
      ],
      "qualification_rule": "documented_employment_v1"
    },
    "form_sections": [
      "本人实名信息",
      "文化程度、工作经历及技能证书",
      "联系信息",
      "报送模板要求的其他实际信息"
    ],
    "education_options": [
      {
        "value": "primary",
        "label": "小学"
      },
      {
        "value": "junior_high",
        "label": "初中"
      },
      {
        "value": "senior_high",
        "label": "高中"
      },
      {
        "value": "secondary_vocational",
        "label": "中专"
      },
      {
        "value": "technical_school",
        "label": "技校"
      },
      {
        "value": "vocational_high",
        "label": "职高"
      },
      {
        "value": "higher_vocational",
        "label": "高职"
      },
      {
        "value": "associate",
        "label": "大专"
      },
      {
        "value": "bachelor",
        "label": "大学本科"
      },
      {
        "value": "master",
        "label": "硕士"
      },
      {
        "value": "doctorate",
        "label": "博士"
      },
      {
        "value": "other",
        "label": "其他"
      }
    ],
    "institution_types": [],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 512000
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      }
    ],
    "notes": [
      "按实际工作经历及证书提交，职业关联、证明和社保由初审逐项核验。",
      "新批次使用当前代码规则；已发布批次继续使用创建时冻结的报名要求。",
      "材料格式、大小、数量和必填性由服务端强制校验。"
    ]
  },
  "复合型": {
    "rule_profile": {
      "selection_id": "robot_operator:4:复合型",
      "occupation_key": "robot_operator",
      "occupation_title": "工业机器人系统操作员",
      "occupation_name": "工业机器人系统操作员",
      "official_code": "6-30-99-00",
      "grade": 4,
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "level_label": "四级／中级工",
      "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
      "application_type": "复合型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "取得本职业或相关职业五级/初级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满3年。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "加工制造类、机电设备类、机械类、电气类、自动化类、电子信息类、计算机类、通信类等。",
      "related_occupations": "焊工、机械设备维修人员、机械冷加工人员、金属加工机械制造人员、信息通信网络运行管理人员、计算机制造人员等。",
      "project_limits": [
        "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
        "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
        "复合型仅开放取得五级证书后累计相关工作满3年路径"
      ]
    },
    "review_checks": {
      "identity": "实名与全部证书、工作及社保材料属于同一人",
      "occupation": "实际从事本职业或资料列明相关职业，结合工作单位与岗位核验",
      "employment": "四级复合型：取得本职业或相关职业五级证书后累计相关工作满3年；证前经历不计入、重叠时间不重复累计",
      "work_proof": "工龄证明单位鲜章及编号、手写内容、经办人及电话齐全，经办人不是考生本人",
      "social_security": "社保单位与工作单位一致，累计时长符合要求，验证码完整且在有效期内可验证",
      "photo": "一寸白底近期证件照，不超过500 KB",
      "commitment": "承诺书完整、本人亲笔签名并按手印",
      "certificate": "五级本职业或相关职业证书与同一材料内网查截图一致、可验证；证书取得后相关工作满3年"
    },
    "scope": {
      "occupation_name": "工业机器人系统操作员",
      "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "application_types": [
        "复合型"
      ],
      "exam_types": [
        "新考"
      ],
      "qualification_rule": "documented_employment_v1"
    },
    "form_sections": [
      "本人实名信息",
      "文化程度、工作经历及技能证书",
      "联系信息",
      "报送模板要求的其他实际信息"
    ],
    "education_options": [
      {
        "value": "primary",
        "label": "小学"
      },
      {
        "value": "junior_high",
        "label": "初中"
      },
      {
        "value": "senior_high",
        "label": "高中"
      },
      {
        "value": "secondary_vocational",
        "label": "中专"
      },
      {
        "value": "technical_school",
        "label": "技校"
      },
      {
        "value": "vocational_high",
        "label": "职高"
      },
      {
        "value": "higher_vocational",
        "label": "高职"
      },
      {
        "value": "associate",
        "label": "大专"
      },
      {
        "value": "bachelor",
        "label": "大学本科"
      },
      {
        "value": "master",
        "label": "硕士"
      },
      {
        "value": "doctorate",
        "label": "博士"
      },
      {
        "value": "other",
        "label": "其他"
      }
    ],
    "institution_types": [],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 512000
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "vocational_qualification_certificate",
        "name": "职业资格证书及网查截图（合并为同一份JPEG材料）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      }
    ],
    "notes": [
      "按实际工作经历及证书提交，职业关联、证明和社保由初审逐项核验。",
      "新批次使用当前代码规则；已发布批次继续使用创建时冻结的报名要求。",
      "材料格式、大小、数量和必填性由服务端强制校验。"
    ]
  },
  "学历型": {
    "rule_profile": {
      "selection_id": "robot_operator:4:学历型",
      "occupation_key": "robot_operator",
      "occupation_title": "工业机器人系统操作员",
      "occupation_name": "工业机器人系统操作员",
      "official_code": "6-30-99-00",
      "grade": 4,
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "level_label": "四级／中级工",
      "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
      "application_type": "学历型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [
        "technical",
        "vocational",
        "general_higher"
      ],
      "source_conditions": [
        "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "加工制造类、机电设备类、机械类、电气类、自动化类、电子信息类、计算机类、通信类等。",
      "related_occupations": "焊工、机械设备维修人员、机械冷加工人员、金属加工机械制造人员、信息通信网络运行管理人员、计算机制造人员等。",
      "project_limits": [
        "本期只接受已取得毕业证，不开放在读应届替代证明",
        "不能提供既定学历报告时联系管理员，不开放替代材料线上报名"
      ]
    },
    "review_checks": {
      "identity": "实名、毕业证及学历报告属于同一人",
      "graduated": "已取得毕业证，不接受在读替代证明",
      "education": "院校类型及学历符合本期学历型条件",
      "major": "本专业或资料列明相关专业，别名及不明确匹配人工核验",
      "report": "学历备案表对应、可验证，验证有效期设置为6个月",
      "photo": "一寸白底近期证件照，不超过500 KB",
      "commitment": "承诺书完整、本人亲笔签名并按手印"
    },
    "scope": {
      "occupation_name": "工业机器人系统操作员",
      "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "application_types": [
        "学历型"
      ],
      "exam_types": [
        "新考"
      ],
      "qualification_rule": "related_major_graduated_degree_v1"
    },
    "form_sections": [
      "本人实名信息",
      "毕业学历信息",
      "联系信息",
      "报送模板要求的其他实际信息"
    ],
    "education_options": [
      {
        "value": "primary",
        "label": "小学"
      },
      {
        "value": "junior_high",
        "label": "初中"
      },
      {
        "value": "senior_high",
        "label": "高中"
      },
      {
        "value": "secondary_vocational",
        "label": "中专"
      },
      {
        "value": "technical_school",
        "label": "技校"
      },
      {
        "value": "vocational_high",
        "label": "职高"
      },
      {
        "value": "higher_vocational",
        "label": "高职"
      },
      {
        "value": "associate",
        "label": "大专"
      },
      {
        "value": "bachelor",
        "label": "大学本科"
      },
      {
        "value": "master",
        "label": "硕士"
      },
      {
        "value": "doctorate",
        "label": "博士"
      },
      {
        "value": "other",
        "label": "其他"
      }
    ],
    "institution_types": [
      {
        "value": "technical",
        "label": "技工院校"
      },
      {
        "value": "vocational",
        "label": "中等及以上职业院校"
      },
      {
        "value": "general_higher",
        "label": "普通高等学校（专科及以上）"
      }
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 512000
      },
      {
        "kind": "graduation_certificate",
        "name": "毕业证",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "education_report",
        "name": "学信网学历备案表（在线验证有效期设置为6个月）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      }
    ],
    "notes": [
      "文化程度选项用于考生如实填报；资格由毕业证、院校类型、专业和初审共同判断。",
      "新批次使用当前代码规则；已发布批次继续使用创建时冻结的报名要求。",
      "材料格式、大小、数量和必填性由服务端强制校验。"
    ]
  },
  "工龄型3": {
    "rule_profile": {
      "selection_id": "information_security:3:工龄型",
      "occupation_key": "information_security",
      "occupation_title": "网络与信息安全管理员",
      "occupation_name": "信息安全管理员",
      "official_code": "4-04-04-02",
      "grade": 3,
      "skill_level": "高级工",
      "export_skill_level": "三级",
      "level_label": "三级／高级工",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
      "application_type": "工龄型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "累计从事本职业或相关职业工作满10年。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
      "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
      "project_limits": [
        "须选择具体三级申报路径，按路径匹配必填字段、材料、初审核验及导出条件，不套用四级规则",
        "学历及证书加学历路径仅接受已取得毕业证，不开放在读应届替代证明",
        "技工院校须高级工班及以上；经评估论证院校由初审核验其备案等级认定评价机构资格",
        "证书与对应网查截图合并JPEG；学历网查截图整理为PDF，不伪装文件扩展名"
      ],
      "admission_paths": [
        {
          "id": "work_10",
          "type": "工龄型",
          "condition_index": 0,
          "years": 10,
          "work": true,
          "condition": "累计从事本职业或相关职业工作满10年。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "work_proof",
            "social_security_proof"
          ]
        }
      ],
      "review_checks": {
        "identity": "实名与全部证书、工作及社保材料属于同一人",
        "photo": "一寸白底近期证件照，不超过500 KB",
        "commitment": "承诺书完整、本人亲笔签名并按手印",
        "path": "核对所选三级申报路径与实际证书、职称、工作或毕业学历材料一致；不得借用其他路径条件",
        "occupation": "逐项核对本职业、相关职业或专业对应关系，不仅核验附件存在",
        "qualification": "工龄型满10年；复合型分别核验四级证书后满4年、初级职称后满1年或四级证书加对应毕业学历；仅核验当前所选分支",
        "proof": "当前路径要求的工作证明、社保、技能或初级职称证书与网查一致；单位、时间、验证码及经办人有效"
      }
    },
    "review_checks": {
      "identity": "实名与全部证书、工作及社保材料属于同一人",
      "photo": "一寸白底近期证件照，不超过500 KB",
      "commitment": "承诺书完整、本人亲笔签名并按手印",
      "path": "核对所选三级申报路径与实际证书、职称、工作或毕业学历材料一致；不得借用其他路径条件",
      "occupation": "逐项核对本职业、相关职业或专业对应关系，不仅核验附件存在",
      "qualification": "工龄型满10年；复合型分别核验四级证书后满4年、初级职称后满1年或四级证书加对应毕业学历；仅核验当前所选分支",
      "proof": "当前路径要求的工作证明、社保、技能或初级职称证书与网查一致；单位、时间、验证码及经办人有效"
    },
    "scope": {
      "occupation_name": "信息安全管理员",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
      "skill_level": "高级工",
      "export_skill_level": "三级",
      "application_types": [
        "工龄型"
      ],
      "exam_types": [
        "新考"
      ],
      "qualification_rule": "level_three_v1"
    },
    "form_sections": [
      "本人实名信息",
      "三级具体申报路径、对应的证书、职称或毕业学历及工作经历",
      "联系信息",
      "报送模板要求的其他实际信息"
    ],
    "education_options": [
      {
        "value": "primary",
        "label": "小学"
      },
      {
        "value": "junior_high",
        "label": "初中"
      },
      {
        "value": "senior_high",
        "label": "高中"
      },
      {
        "value": "secondary_vocational",
        "label": "中专"
      },
      {
        "value": "technical_school",
        "label": "技校"
      },
      {
        "value": "vocational_high",
        "label": "职高"
      },
      {
        "value": "higher_vocational",
        "label": "高职"
      },
      {
        "value": "associate",
        "label": "大专"
      },
      {
        "value": "bachelor",
        "label": "大学本科"
      },
      {
        "value": "master",
        "label": "硕士"
      },
      {
        "value": "doctorate",
        "label": "博士"
      },
      {
        "value": "other",
        "label": "其他"
      }
    ],
    "institution_types": [
      {
        "value": "technical",
        "label": "技工院校"
      },
      {
        "value": "vocational",
        "label": "中等及以上职业院校"
      },
      {
        "value": "general_higher",
        "label": "普通高等学校（专科及以上）"
      }
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 512000
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      }
    ],
    "notes": [
      "三级须按具体申报路径核验资格、材料及导出条件；涉及学历只接受已取得毕业证，技工院校培养层次及评估论证情况逐项初审核验。",
      "新批次使用当前代码规则；已发布批次继续使用创建时冻结的报名要求。",
      "材料格式、大小、数量和必填性由服务端强制校验。"
    ]
  },
  "复合型3": {
    "rule_profile": {
      "selection_id": "information_security:3:复合型",
      "occupation_key": "information_security",
      "occupation_title": "网络与信息安全管理员",
      "occupation_name": "信息安全管理员",
      "official_code": "4-04-04-02",
      "grade": 3,
      "skill_level": "高级工",
      "export_skill_level": "三级",
      "level_label": "三级／高级工",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
      "application_type": "复合型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [],
      "source_conditions": [
        "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满4年。",
        "取得符合专业对应关系的初级职称（专业技术人员职业资格）后，累计从事本职业或相关职业工作满1年。",
        "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书，并取得高等职业学校、专科及以上普通高等学校本专业或相关专业毕业证书（含在读应届毕业生）。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
      "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
      "project_limits": [
        "须选择具体三级申报路径，按路径匹配必填字段、材料、初审核验及导出条件，不套用四级规则",
        "学历及证书加学历路径仅接受已取得毕业证，不开放在读应届替代证明",
        "技工院校须高级工班及以上；经评估论证院校由初审核验其备案等级认定评价机构资格",
        "证书与对应网查截图合并JPEG；学历网查截图整理为PDF，不伪装文件扩展名"
      ],
      "admission_paths": [
        {
          "id": "skill_4_work_4",
          "type": "复合型",
          "condition_index": 0,
          "years": 4,
          "work": true,
          "skill": true,
          "condition": "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满4年。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "work_proof",
            "social_security_proof",
            "vocational_qualification_certificate"
          ]
        },
        {
          "id": "title_work_1",
          "type": "复合型",
          "condition_index": 1,
          "years": 1,
          "work": true,
          "title": true,
          "condition": "取得符合专业对应关系的初级职称（专业技术人员职业资格）后，累计从事本职业或相关职业工作满1年。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "work_proof",
            "social_security_proof",
            "professional_title_certificate"
          ]
        },
        {
          "id": "skill_4_degree",
          "type": "复合型",
          "condition_index": 2,
          "years": 0,
          "skill": true,
          "education": true,
          "condition": "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书，并取得高等职业学校、专科及以上普通高等学校本专业或相关专业毕业证书（含在读应届毕业生）。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "vocational_qualification_certificate",
            "graduation_certificate",
            "education_report"
          ]
        }
      ],
      "review_checks": {
        "identity": "实名与全部证书、工作及社保材料属于同一人",
        "photo": "一寸白底近期证件照，不超过500 KB",
        "commitment": "承诺书完整、本人亲笔签名并按手印",
        "path": "核对所选三级申报路径与实际证书、职称、工作或毕业学历材料一致；不得借用其他路径条件",
        "occupation": "逐项核对本职业、相关职业或专业对应关系，不仅核验附件存在",
        "qualification": "工龄型满10年；复合型分别核验四级证书后满4年、初级职称后满1年或四级证书加对应毕业学历；仅核验当前所选分支",
        "proof": "当前路径要求的工作证明、社保、技能或初级职称证书与网查一致；单位、时间、验证码及经办人有效",
        "education": "涉及学历时核对已取得毕业证、相关专业及学历报告；技工院校须高级工班及以上；评估院校须核验其备案等级认定评价机构资格；证书加学历路径须高职或专科以上，备案表有效期6个月"
      }
    },
    "review_checks": {
      "identity": "实名与全部证书、工作及社保材料属于同一人",
      "photo": "一寸白底近期证件照，不超过500 KB",
      "commitment": "承诺书完整、本人亲笔签名并按手印",
      "path": "核对所选三级申报路径与实际证书、职称、工作或毕业学历材料一致；不得借用其他路径条件",
      "occupation": "逐项核对本职业、相关职业或专业对应关系，不仅核验附件存在",
      "qualification": "工龄型满10年；复合型分别核验四级证书后满4年、初级职称后满1年或四级证书加对应毕业学历；仅核验当前所选分支",
      "proof": "当前路径要求的工作证明、社保、技能或初级职称证书与网查一致；单位、时间、验证码及经办人有效",
      "education": "涉及学历时核对已取得毕业证、相关专业及学历报告；技工院校须高级工班及以上；评估院校须核验其备案等级认定评价机构资格；证书加学历路径须高职或专科以上，备案表有效期6个月"
    },
    "scope": {
      "occupation_name": "信息安全管理员",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
      "skill_level": "高级工",
      "export_skill_level": "三级",
      "application_types": [
        "复合型"
      ],
      "exam_types": [
        "新考"
      ],
      "qualification_rule": "level_three_v1"
    },
    "form_sections": [
      "本人实名信息",
      "三级具体申报路径、对应的证书、职称或毕业学历及工作经历",
      "联系信息",
      "报送模板要求的其他实际信息"
    ],
    "education_options": [
      {
        "value": "primary",
        "label": "小学"
      },
      {
        "value": "junior_high",
        "label": "初中"
      },
      {
        "value": "senior_high",
        "label": "高中"
      },
      {
        "value": "secondary_vocational",
        "label": "中专"
      },
      {
        "value": "technical_school",
        "label": "技校"
      },
      {
        "value": "vocational_high",
        "label": "职高"
      },
      {
        "value": "higher_vocational",
        "label": "高职"
      },
      {
        "value": "associate",
        "label": "大专"
      },
      {
        "value": "bachelor",
        "label": "大学本科"
      },
      {
        "value": "master",
        "label": "硕士"
      },
      {
        "value": "doctorate",
        "label": "博士"
      },
      {
        "value": "other",
        "label": "其他"
      }
    ],
    "institution_types": [
      {
        "value": "technical",
        "label": "技工院校"
      },
      {
        "value": "vocational",
        "label": "中等及以上职业院校"
      },
      {
        "value": "general_higher",
        "label": "普通高等学校（专科及以上）"
      }
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 512000
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "work_proof",
        "name": "工龄证明（单位鲜章、编号、手写内容及经办人信息）",
        "required": false,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "social_security_proof",
        "name": "社保缴费证明（单位一致、验证码完整且有效）",
        "required": false,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "vocational_qualification_certificate",
        "name": "职业资格证书及网查截图（合并为同一份JPEG材料）",
        "required": false,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "professional_title_certificate",
        "name": "初级职称证书及网查截图（合并为同一份JPEG材料）",
        "required": false,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "graduation_certificate",
        "name": "毕业证书",
        "required": false,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "education_report",
        "name": "学历核验材料（证书与学历路径为学信网备案表，其他学历路径为学历网查截图PDF）",
        "required": false,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      }
    ],
    "notes": [
      "三级须按具体申报路径核验资格、材料及导出条件；涉及学历只接受已取得毕业证，技工院校培养层次及评估论证情况逐项初审核验。",
      "新批次使用当前代码规则；已发布批次继续使用创建时冻结的报名要求。",
      "材料格式、大小、数量和必填性由服务端强制校验。"
    ]
  },
  "学历型3": {
    "rule_profile": {
      "selection_id": "information_security:3:学历型",
      "occupation_key": "information_security",
      "occupation_title": "网络与信息安全管理员",
      "occupation_name": "信息安全管理员",
      "official_code": "4-04-04-02",
      "grade": 3,
      "skill_level": "高级工",
      "export_skill_level": "三级",
      "level_label": "三级／高级工",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
      "application_type": "学历型",
      "adapted": true,
      "implementation_ready": true,
      "reporting_confirmed": true,
      "status": "已适配",
      "adaptation_status": "已适配",
      "missing": [],
      "institution_types": [
        "technical",
        "vocational",
        "general_higher"
      ],
      "source_conditions": [
        "取得本专业或相关专业的技工院校高级工班及以上毕业证书（含在读应届毕业生）。",
        "取得经评估论证的高等职业学校、专科及以上普通高等学校本专业或相关专业的毕业证书（含在读应届毕业生）。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "职业技能等级认定申报条件相关解答.pdf，第10—12页"
      ],
      "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
      "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
      "project_limits": [
        "须选择具体三级申报路径，按路径匹配必填字段、材料、初审核验及导出条件，不套用四级规则",
        "学历及证书加学历路径仅接受已取得毕业证，不开放在读应届替代证明",
        "技工院校须高级工班及以上；经评估论证院校由初审核验其备案等级认定评价机构资格",
        "证书与对应网查截图合并JPEG；学历网查截图整理为PDF，不伪装文件扩展名"
      ],
      "admission_paths": [
        {
          "id": "technical_senior",
          "type": "学历型",
          "condition_index": 0,
          "years": 0,
          "education": true,
          "condition": "取得本专业或相关专业的技工院校高级工班及以上毕业证书（含在读应届毕业生）。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "graduation_certificate",
            "education_report"
          ]
        },
        {
          "id": "evaluated_college",
          "type": "学历型",
          "condition_index": 1,
          "years": 0,
          "education": true,
          "condition": "取得经评估论证的高等职业学校、专科及以上普通高等学校本专业或相关专业的毕业证书（含在读应届毕业生）。",
          "material_kinds": [
            "id_card_front",
            "id_card_back",
            "registration_portrait",
            "commitment_letter",
            "graduation_certificate",
            "education_report"
          ]
        }
      ],
      "review_checks": {
        "identity": "实名与全部证书、工作及社保材料属于同一人",
        "photo": "一寸白底近期证件照，不超过500 KB",
        "commitment": "承诺书完整、本人亲笔签名并按手印",
        "path": "核对所选三级申报路径与实际证书、职称、工作或毕业学历材料一致；不得借用其他路径条件",
        "occupation": "逐项核对本职业、相关职业或专业对应关系，不仅核验附件存在",
        "education": "涉及学历时核对已取得毕业证、相关专业及学历报告；技工院校须高级工班及以上；评估院校须核验其备案等级认定评价机构资格；证书加学历路径须高职或专科以上，备案表有效期6个月"
      }
    },
    "review_checks": {
      "identity": "实名与全部证书、工作及社保材料属于同一人",
      "photo": "一寸白底近期证件照，不超过500 KB",
      "commitment": "承诺书完整、本人亲笔签名并按手印",
      "path": "核对所选三级申报路径与实际证书、职称、工作或毕业学历材料一致；不得借用其他路径条件",
      "occupation": "逐项核对本职业、相关职业或专业对应关系，不仅核验附件存在",
      "education": "涉及学历时核对已取得毕业证、相关专业及学历报告；技工院校须高级工班及以上；评估院校须核验其备案等级认定评价机构资格；证书加学历路径须高职或专科以上，备案表有效期6个月"
    },
    "scope": {
      "occupation_name": "信息安全管理员",
      "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
      "skill_level": "高级工",
      "export_skill_level": "三级",
      "application_types": [
        "学历型"
      ],
      "exam_types": [
        "新考"
      ],
      "qualification_rule": "level_three_v1"
    },
    "form_sections": [
      "本人实名信息",
      "三级具体申报路径、对应的证书、职称或毕业学历及工作经历",
      "联系信息",
      "报送模板要求的其他实际信息"
    ],
    "education_options": [
      {
        "value": "primary",
        "label": "小学"
      },
      {
        "value": "junior_high",
        "label": "初中"
      },
      {
        "value": "senior_high",
        "label": "高中"
      },
      {
        "value": "secondary_vocational",
        "label": "中专"
      },
      {
        "value": "technical_school",
        "label": "技校"
      },
      {
        "value": "vocational_high",
        "label": "职高"
      },
      {
        "value": "higher_vocational",
        "label": "高职"
      },
      {
        "value": "associate",
        "label": "大专"
      },
      {
        "value": "bachelor",
        "label": "大学本科"
      },
      {
        "value": "master",
        "label": "硕士"
      },
      {
        "value": "doctorate",
        "label": "博士"
      },
      {
        "value": "other",
        "label": "其他"
      }
    ],
    "institution_types": [
      {
        "value": "technical",
        "label": "技工院校"
      },
      {
        "value": "vocational",
        "label": "中等及以上职业院校"
      },
      {
        "value": "general_higher",
        "label": "普通高等学校（专科及以上）"
      }
    ],
    "materials": [
      {
        "kind": "id_card_front",
        "name": "身份证正面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "id_card_back",
        "name": "身份证背面",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 10485760
      },
      {
        "kind": "registration_portrait",
        "name": "一寸白底近期证件照（≤500 KB）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg"
        ],
        "max_count": 1,
        "max_size_bytes": 512000
      },
      {
        "kind": "commitment_letter",
        "name": "承诺书（本人亲笔签名并按手印）",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "graduation_certificate",
        "name": "毕业证书",
        "required": true,
        "extensions": [
          ".jpeg",
          ".jpg",
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      },
      {
        "kind": "education_report",
        "name": "学历核验材料（证书与学历路径为学信网备案表，其他学历路径为学历网查截图PDF）",
        "required": true,
        "extensions": [
          ".pdf"
        ],
        "max_count": 1,
        "max_size_bytes": 20971520
      }
    ],
    "notes": [
      "三级须按具体申报路径核验资格、材料及导出条件；涉及学历只接受已取得毕业证，技工院校培养层次及评估论证情况逐项初审核验。",
      "新批次使用当前代码规则；已发布批次继续使用创建时冻结的报名要求。",
      "材料格式、大小、数量和必填性由服务端强制校验。"
    ]
  },
  "pending": {
    "rule_profile": {
      "selection_id": "business_data:4:学历型",
      "occupation_key": "business_data",
      "occupation_title": "商务数据分析师",
      "occupation_name": "商务数据分析师",
      "official_code": "4-07-02-05",
      "grade": 4,
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "level_label": "四级／中级工",
      "occupation_code": "4-07-02-05-商务数据分析师-中级工",
      "application_type": "学历型",
      "adapted": false,
      "implementation_ready": false,
      "reporting_confirmed": false,
      "status": "待适配",
      "adaptation_status": "待业务确认",
      "missing": [
        "尚未实现该申报路径的专项字段、材料、初审核验及导出联调",
        "相关职业、专业及院校细则待补齐"
      ],
      "institution_types": [],
      "source_conditions": [
        "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
      ],
      "sources": [
        "职业技能等级认定职业工种申报条件.pdf，第1页",
        "职业技能等级认定申报条件相关解答.pdf，第1—9页",
        "注意.txt；报名信息.xlsx／申报条件工作表"
      ],
      "related_majors": "现有模板提供四级、三级职业代码及条件，相关专业与院校细则待补齐。",
      "related_occupations": "相关职业细则待补齐，不套用其他职业。",
      "project_limits": [
        "仅可保存草稿，禁止启用、发布及新报名"
      ]
    },
    "review_checks": {},
    "scope": {
      "occupation_name": "商务数据分析师",
      "occupation_code": "4-07-02-05-商务数据分析师-中级工",
      "skill_level": "中级工",
      "export_skill_level": "四级",
      "application_types": [
        "学历型"
      ],
      "exam_types": [
        "新考"
      ],
      "qualification_rule": "unadapted"
    },
    "form_sections": [],
    "education_options": [],
    "institution_types": [],
    "materials": [],
    "notes": [
      "该组合尚未适配，所需字段与材料不得借用其他组合。",
      "新批次使用当前代码规则；已发布批次继续使用创建时冻结的报名要求。",
      "材料格式、大小、数量和必填性由服务端强制校验。"
    ]
  }
}

const instructions: Record<string, RensheExportInstructions | null> = {
  "工龄型5": {
    "registration_template": "报名信息.xlsx",
    "work_template": "工作经历.xlsx",
    "work_description": "按本次报名版本的实际工作经历逐条生成；结束日期为空表示至今。证书及其网查截图合并为同一份JPEG材料，工龄证明独立导出。",
    "directory_note": "目录示例，实际内容以本次报名所选路径的必交材料为准；文件保留真实扩展名。",
    "portrait_note": "本期报名照片为一寸白底近期证件照、≤500 KB；文件名沿用甲方既定的二寸免冠照片，不改变真实格式。历史批次保留原材料要求。",
    "example_paths": [
      "报名信息.xlsx",
      "工作经历.xlsx",
      "110101********123X_证件正面.jpeg",
      "110101********123X_证件背面.jpeg",
      "110101********123X_二寸免冠照片.jpeg",
      "110101********123X_工龄证明.pdf",
      "110101********123X_社保证明.pdf",
      "110101********123X_承诺书.pdf"
    ],
    "file_tree": "人社报名_批次编号_第1卷.zip\n├─ 报名信息.xlsx\n├─ 工作经历.xlsx\n├─ 110101********123X_证件正面.jpeg\n├─ 110101********123X_证件背面.jpeg\n├─ 110101********123X_二寸免冠照片.jpeg\n├─ 110101********123X_工龄证明.pdf\n├─ 110101********123X_社保证明.pdf\n└─ 110101********123X_承诺书.pdf",
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
        "source": "本次实际填报文化程度（不以毕业学历作为本路径门槛）"
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
        "source": "本次实际工作单位（必填，与工龄证明核对）"
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
        "source": "本路径不填写职称专业"
      },
      {
        "column": 17,
        "header": "职称等级",
        "source": "本路径不填写职称等级"
      },
      {
        "column": 18,
        "header": "参加工作日期（入学日期）",
        "source": "真实参加工作日期，格式如2022-9-21；不使用入学或毕业日期"
      },
      {
        "column": 19,
        "header": "职业年限",
        "source": "实际职业年限，必填且允许0；五级不设最低工作年数"
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
        "source": "实际社保参保单位（必填，与社保证明核对）"
      },
      {
        "column": 25,
        "header": "电子邮箱",
        "source": "本次电子邮箱"
      }
    ]
  },
  "工龄型": {
    "registration_template": "报名信息.xlsx",
    "work_template": "工作经历.xlsx",
    "work_description": "按本次报名版本的实际工作经历逐条生成；结束日期为空表示至今。证书及其网查截图合并为同一份JPEG材料，工龄证明独立导出。",
    "directory_note": "目录示例，实际内容以本次报名所选路径的必交材料为准；文件保留真实扩展名。",
    "portrait_note": "本期报名照片为一寸白底近期证件照、≤500 KB；文件名沿用甲方既定的二寸免冠照片，不改变真实格式。历史批次保留原材料要求。",
    "example_paths": [
      "报名信息.xlsx",
      "工作经历.xlsx",
      "110101********123X_证件正面.jpeg",
      "110101********123X_证件背面.jpeg",
      "110101********123X_二寸免冠照片.jpeg",
      "110101********123X_工龄证明.pdf",
      "110101********123X_社保证明.pdf",
      "110101********123X_承诺书.pdf"
    ],
    "file_tree": "人社报名_批次编号_第1卷.zip\n├─ 报名信息.xlsx\n├─ 工作经历.xlsx\n├─ 110101********123X_证件正面.jpeg\n├─ 110101********123X_证件背面.jpeg\n├─ 110101********123X_二寸免冠照片.jpeg\n├─ 110101********123X_工龄证明.pdf\n├─ 110101********123X_社保证明.pdf\n└─ 110101********123X_承诺书.pdf",
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
        "source": "本次实际填报文化程度（不以毕业学历作为本路径门槛）"
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
        "source": "本次实际工作单位（必填，与工龄证明核对）"
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
        "source": "本路径不填写职称专业"
      },
      {
        "column": 17,
        "header": "职称等级",
        "source": "本路径不填写职称等级"
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
        "source": "实际社保参保单位（必填，与社保证明核对）"
      },
      {
        "column": 25,
        "header": "电子邮箱",
        "source": "本次电子邮箱"
      }
    ]
  },
  "复合型": {
    "registration_template": "报名信息.xlsx",
    "work_template": "工作经历.xlsx",
    "work_description": "按本次报名版本的实际工作经历逐条生成；结束日期为空表示至今。证书及其网查截图合并为同一份JPEG材料，工龄证明独立导出。",
    "directory_note": "目录示例，实际内容以本次报名所选路径的必交材料为准；文件保留真实扩展名。",
    "portrait_note": "本期报名照片为一寸白底近期证件照、≤500 KB；文件名沿用甲方既定的二寸免冠照片，不改变真实格式。历史批次保留原材料要求。",
    "example_paths": [
      "报名信息.xlsx",
      "工作经历.xlsx",
      "110101********123X_证件正面.jpeg",
      "110101********123X_证件背面.jpeg",
      "110101********123X_二寸免冠照片.jpeg",
      "110101********123X_工龄证明.pdf",
      "110101********123X_社保证明.pdf",
      "110101********123X_承诺书.pdf",
      "110101********123X_职业资格证书.jpeg"
    ],
    "file_tree": "人社报名_批次编号_第1卷.zip\n├─ 报名信息.xlsx\n├─ 工作经历.xlsx\n├─ 110101********123X_证件正面.jpeg\n├─ 110101********123X_证件背面.jpeg\n├─ 110101********123X_二寸免冠照片.jpeg\n├─ 110101********123X_工龄证明.pdf\n├─ 110101********123X_社保证明.pdf\n├─ 110101********123X_承诺书.pdf\n└─ 110101********123X_职业资格证书.jpeg",
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
        "source": "本次实际填报文化程度（不以毕业学历作为本路径门槛）"
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
        "source": "本次实际工作单位（必填，与工龄证明核对）"
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
        "source": "本路径不填写职称专业"
      },
      {
        "column": 17,
        "header": "职称等级",
        "source": "本路径不填写职称等级"
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
        "source": "实际社保参保单位（必填，与社保证明核对）"
      },
      {
        "column": 25,
        "header": "电子邮箱",
        "source": "本次电子邮箱"
      }
    ]
  },
  "学历型": {
    "registration_template": "报名信息.xlsx",
    "work_template": "工作经历.xlsx",
    "work_description": "原样附带甲方工作经历模板，目前不会按考生自动填写经历；后续按报送要求补充。",
    "directory_note": "目录示例，实际内容以本次报名所选路径的必交材料为准；文件保留真实扩展名。",
    "portrait_note": "本期报名照片为一寸白底近期证件照、≤500 KB；文件名沿用甲方既定的二寸免冠照片，不改变真实格式。历史批次保留原材料要求。",
    "example_paths": [
      "报名信息.xlsx",
      "工作经历.xlsx",
      "110101********123X_证件正面.jpeg",
      "110101********123X_证件背面.jpeg",
      "110101********123X_二寸免冠照片.jpeg",
      "110101********123X_学历证明.pdf",
      "110101********123X_学信网电子注册表.pdf",
      "110101********123X_承诺书.pdf"
    ],
    "file_tree": "人社报名_批次编号_第1卷.zip\n├─ 报名信息.xlsx\n├─ 工作经历.xlsx\n├─ 110101********123X_证件正面.jpeg\n├─ 110101********123X_证件背面.jpeg\n├─ 110101********123X_二寸免冠照片.jpeg\n├─ 110101********123X_学历证明.pdf\n├─ 110101********123X_学信网电子注册表.pdf\n└─ 110101********123X_承诺书.pdf",
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
  },
  "工龄型3": {
    "registration_template": "报名信息.xlsx",
    "work_template": "工作经历.xlsx",
    "work_description": "按本次报名版本的实际工作经历逐条生成；结束日期为空表示至今。证书及其网查截图合并为同一份JPEG材料，工龄证明独立导出。",
    "directory_note": "目录示例，实际内容以本次报名所选路径的必交材料为准；文件保留真实扩展名。",
    "portrait_note": "本期报名照片为一寸白底近期证件照、≤500 KB；文件名沿用甲方既定的二寸免冠照片，不改变真实格式。历史批次保留原材料要求。",
    "example_paths": [
      "报名信息.xlsx",
      "工作经历.xlsx",
      "110101********123X_证件正面.jpeg",
      "110101********123X_证件背面.jpeg",
      "110101********123X_二寸免冠照片.jpeg",
      "110101********123X_承诺书.pdf",
      "110101********123X_工龄证明.pdf",
      "110101********123X_社保证明.pdf"
    ],
    "file_tree": "人社报名_批次编号_第1卷.zip\n├─ 报名信息.xlsx\n├─ 工作经历.xlsx\n├─ 110101********123X_证件正面.jpeg\n├─ 110101********123X_证件背面.jpeg\n├─ 110101********123X_二寸免冠照片.jpeg\n├─ 110101********123X_承诺书.pdf\n├─ 110101********123X_工龄证明.pdf\n└─ 110101********123X_社保证明.pdf",
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
        "source": "本次实际填报文化程度（不以毕业学历作为本路径门槛）"
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
        "source": "实际工作单位；工龄或证书后工龄路径必填"
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
        "source": "初级职称路径读取实际职称专业，其他路径留空"
      },
      {
        "column": 17,
        "header": "职称等级",
        "source": "初级职称路径填写初级职称，其他路径留空"
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
        "source": "读取本次报名实际选择的三级申报路径对应条件，不统一取第一条"
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
        "source": "实际社保单位；工龄或证书后工龄路径必填"
      },
      {
        "column": 25,
        "header": "电子邮箱",
        "source": "本次电子邮箱"
      }
    ]
  },
  "复合型3": {
    "registration_template": "报名信息.xlsx",
    "work_template": "工作经历.xlsx",
    "work_description": "按本次报名版本的实际工作经历逐条生成；结束日期为空表示至今。证书及其网查截图合并为同一份JPEG材料，工龄证明独立导出。",
    "directory_note": "目录示例，实际内容以本次报名所选路径的必交材料为准；文件保留真实扩展名。",
    "portrait_note": "本期报名照片为一寸白底近期证件照、≤500 KB；文件名沿用甲方既定的二寸免冠照片，不改变真实格式。历史批次保留原材料要求。",
    "example_paths": [
      "报名信息.xlsx",
      "工作经历.xlsx",
      "110101********123X_证件正面.jpeg",
      "110101********123X_证件背面.jpeg",
      "110101********123X_二寸免冠照片.jpeg",
      "110101********123X_承诺书.pdf",
      "110101********123X_工龄证明.pdf",
      "110101********123X_社保证明.pdf",
      "110101********123X_职业资格证书.jpeg",
      "110101********123X_职称证书.jpeg",
      "110101********123X_学历证明.pdf",
      "110101********123X_学信网电子注册表.pdf"
    ],
    "file_tree": "人社报名_批次编号_第1卷.zip\n├─ 报名信息.xlsx\n├─ 工作经历.xlsx\n├─ 110101********123X_证件正面.jpeg\n├─ 110101********123X_证件背面.jpeg\n├─ 110101********123X_二寸免冠照片.jpeg\n├─ 110101********123X_承诺书.pdf\n├─ 110101********123X_工龄证明.pdf\n├─ 110101********123X_社保证明.pdf\n├─ 110101********123X_职业资格证书.jpeg\n├─ 110101********123X_职称证书.jpeg\n├─ 110101********123X_学历证明.pdf\n└─ 110101********123X_学信网电子注册表.pdf",
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
        "source": "本次实际填报文化程度（不以毕业学历作为本路径门槛）"
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
        "source": "实际工作单位；工龄或证书后工龄路径必填"
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
        "source": "初级职称路径读取实际职称专业，其他路径留空"
      },
      {
        "column": 17,
        "header": "职称等级",
        "source": "初级职称路径填写初级职称，其他路径留空"
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
        "source": "读取本次报名实际选择的三级申报路径对应条件，不统一取第一条"
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
        "source": "实际社保单位；工龄或证书后工龄路径必填"
      },
      {
        "column": 25,
        "header": "电子邮箱",
        "source": "本次电子邮箱"
      }
    ]
  },
  "学历型3": {
    "registration_template": "报名信息.xlsx",
    "work_template": "工作经历.xlsx",
    "work_description": "按本次报名版本的实际工作经历逐条生成；结束日期为空表示至今。证书及其网查截图合并为同一份JPEG材料，工龄证明独立导出。",
    "directory_note": "目录示例，实际内容以本次报名所选路径的必交材料为准；文件保留真实扩展名。",
    "portrait_note": "本期报名照片为一寸白底近期证件照、≤500 KB；文件名沿用甲方既定的二寸免冠照片，不改变真实格式。历史批次保留原材料要求。",
    "example_paths": [
      "报名信息.xlsx",
      "工作经历.xlsx",
      "110101********123X_证件正面.jpeg",
      "110101********123X_证件背面.jpeg",
      "110101********123X_二寸免冠照片.jpeg",
      "110101********123X_承诺书.pdf",
      "110101********123X_学历证明.pdf",
      "110101********123X_学信网电子注册表.pdf"
    ],
    "file_tree": "人社报名_批次编号_第1卷.zip\n├─ 报名信息.xlsx\n├─ 工作经历.xlsx\n├─ 110101********123X_证件正面.jpeg\n├─ 110101********123X_证件背面.jpeg\n├─ 110101********123X_二寸免冠照片.jpeg\n├─ 110101********123X_承诺书.pdf\n├─ 110101********123X_学历证明.pdf\n└─ 110101********123X_学信网电子注册表.pdf",
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
        "source": "本次实际填报文化程度（不以毕业学历作为本路径门槛）"
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
        "source": "实际工作单位；工龄或证书后工龄路径必填"
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
        "source": "初级职称路径读取实际职称专业，其他路径留空"
      },
      {
        "column": 17,
        "header": "职称等级",
        "source": "初级职称路径填写初级职称，其他路径留空"
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
        "source": "读取本次报名实际选择的三级申报路径对应条件，不统一取第一条"
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
        "source": "实际社保单位；工龄或证书后工龄路径必填"
      },
      {
        "column": 25,
        "header": "电子邮箱",
        "source": "本次电子邮箱"
      }
    ]
  },
  "pending": null
}

const profiles: Omit<RensheCombination, "config" | "admission_requirements" | "export_instructions">[] = [
  {
    "selection_id": "information_security:5:工龄型",
    "occupation_key": "information_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "信息安全管理员",
    "official_code": "4-04-04-02",
    "grade": 5,
    "skill_level": "初级工",
    "export_skill_level": "五级",
    "level_label": "五级／初级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-初级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "年满16周岁，从事本职业或相关职业工作。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页",
      "四川省职业技能等级认定个人申报表.docx填表说明与解答PDF第2页分类存在差异；业务已确认五级统一按工龄型报名及导出"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "年满16周岁，按北京时间首次正式提交日期核算；补正沿用首次提交基准",
      "工龄型须提供相关职业工作经历、工龄证明及社保证明；不设置最低工作年数，不要求前置证书或毕业学历材料",
      "五级统一按工龄型报名及导出，申报条件为年满16周岁、从事本职业或相关职业工作"
    ]
  },
  {
    "selection_id": "information_security:4:工龄型",
    "occupation_key": "information_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "信息安全管理员",
    "official_code": "4-04-04-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-中级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "累计从事本职业或相关职业工作满5年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "累计相关职业工作满5年，工龄及社保须逐项初审核验"
    ]
  },
  {
    "selection_id": "information_security:4:复合型",
    "occupation_key": "information_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "信息安全管理员",
    "official_code": "4-04-04-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-中级工",
    "application_type": "复合型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "取得本职业或相关职业五级/初级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满3年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "复合型仅开放取得五级证书后累计相关工作满3年路径"
    ]
  },
  {
    "selection_id": "information_security:4:学历型",
    "occupation_key": "information_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "信息安全管理员",
    "official_code": "4-04-04-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-中级工",
    "application_type": "学历型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "source_conditions": [
      "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "本期只接受已取得毕业证，不开放在读应届替代证明",
      "不能提供既定学历报告时联系管理员，不开放替代材料线上报名"
    ]
  },
  {
    "selection_id": "information_security:3:工龄型",
    "occupation_key": "information_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "信息安全管理员",
    "official_code": "4-04-04-02",
    "grade": 3,
    "skill_level": "高级工",
    "export_skill_level": "三级",
    "level_label": "三级／高级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "累计从事本职业或相关职业工作满10年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "须选择具体三级申报路径，按路径匹配必填字段、材料、初审核验及导出条件，不套用四级规则",
      "学历及证书加学历路径仅接受已取得毕业证，不开放在读应届替代证明",
      "技工院校须高级工班及以上；经评估论证院校由初审核验其备案等级认定评价机构资格",
      "证书与对应网查截图合并JPEG；学历网查截图整理为PDF，不伪装文件扩展名"
    ],
    "admission_paths": [
      {
        "id": "work_10",
        "type": "工龄型",
        "condition_index": 0,
        "years": 10,
        "work": true,
        "condition": "累计从事本职业或相关职业工作满10年。",
        "material_kinds": [
          "id_card_front",
          "id_card_back",
          "registration_portrait",
          "commitment_letter",
          "work_proof",
          "social_security_proof"
        ]
      }
    ]
  },
  {
    "selection_id": "information_security:3:复合型",
    "occupation_key": "information_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "信息安全管理员",
    "official_code": "4-04-04-02",
    "grade": 3,
    "skill_level": "高级工",
    "export_skill_level": "三级",
    "level_label": "三级／高级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
    "application_type": "复合型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满4年。",
      "取得符合专业对应关系的初级职称（专业技术人员职业资格）后，累计从事本职业或相关职业工作满1年。",
      "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书，并取得高等职业学校、专科及以上普通高等学校本专业或相关专业毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "须选择具体三级申报路径，按路径匹配必填字段、材料、初审核验及导出条件，不套用四级规则",
      "学历及证书加学历路径仅接受已取得毕业证，不开放在读应届替代证明",
      "技工院校须高级工班及以上；经评估论证院校由初审核验其备案等级认定评价机构资格",
      "证书与对应网查截图合并JPEG；学历网查截图整理为PDF，不伪装文件扩展名"
    ],
    "admission_paths": [
      {
        "id": "skill_4_work_4",
        "type": "复合型",
        "condition_index": 0,
        "years": 4,
        "work": true,
        "skill": true,
        "condition": "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满4年。",
        "material_kinds": [
          "id_card_front",
          "id_card_back",
          "registration_portrait",
          "commitment_letter",
          "work_proof",
          "social_security_proof",
          "vocational_qualification_certificate"
        ]
      },
      {
        "id": "title_work_1",
        "type": "复合型",
        "condition_index": 1,
        "years": 1,
        "work": true,
        "title": true,
        "condition": "取得符合专业对应关系的初级职称（专业技术人员职业资格）后，累计从事本职业或相关职业工作满1年。",
        "material_kinds": [
          "id_card_front",
          "id_card_back",
          "registration_portrait",
          "commitment_letter",
          "work_proof",
          "social_security_proof",
          "professional_title_certificate"
        ]
      },
      {
        "id": "skill_4_degree",
        "type": "复合型",
        "condition_index": 2,
        "years": 0,
        "skill": true,
        "education": true,
        "condition": "取得本职业或相关职业四级/中级工职业资格（职业技能等级）证书，并取得高等职业学校、专科及以上普通高等学校本专业或相关专业毕业证书（含在读应届毕业生）。",
        "material_kinds": [
          "id_card_front",
          "id_card_back",
          "registration_portrait",
          "commitment_letter",
          "vocational_qualification_certificate",
          "graduation_certificate",
          "education_report"
        ]
      }
    ]
  },
  {
    "selection_id": "information_security:3:学历型",
    "occupation_key": "information_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "信息安全管理员",
    "official_code": "4-04-04-02",
    "grade": 3,
    "skill_level": "高级工",
    "export_skill_level": "三级",
    "level_label": "三级／高级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-高级工",
    "application_type": "学历型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "source_conditions": [
      "取得本专业或相关专业的技工院校高级工班及以上毕业证书（含在读应届毕业生）。",
      "取得经评估论证的高等职业学校、专科及以上普通高等学校本专业或相关专业的毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "须选择具体三级申报路径，按路径匹配必填字段、材料、初审核验及导出条件，不套用四级规则",
      "学历及证书加学历路径仅接受已取得毕业证，不开放在读应届替代证明",
      "技工院校须高级工班及以上；经评估论证院校由初审核验其备案等级认定评价机构资格",
      "证书与对应网查截图合并JPEG；学历网查截图整理为PDF，不伪装文件扩展名"
    ],
    "admission_paths": [
      {
        "id": "technical_senior",
        "type": "学历型",
        "condition_index": 0,
        "years": 0,
        "education": true,
        "condition": "取得本专业或相关专业的技工院校高级工班及以上毕业证书（含在读应届毕业生）。",
        "material_kinds": [
          "id_card_front",
          "id_card_back",
          "registration_portrait",
          "commitment_letter",
          "graduation_certificate",
          "education_report"
        ]
      },
      {
        "id": "evaluated_college",
        "type": "学历型",
        "condition_index": 1,
        "years": 0,
        "education": true,
        "condition": "取得经评估论证的高等职业学校、专科及以上普通高等学校本专业或相关专业的毕业证书（含在读应届毕业生）。",
        "material_kinds": [
          "id_card_front",
          "id_card_back",
          "registration_portrait",
          "commitment_letter",
          "graduation_certificate",
          "education_report"
        ]
      }
    ]
  },
  {
    "selection_id": "information_security:2:复合型",
    "occupation_key": "information_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "信息安全管理员",
    "official_code": "4-04-04-02",
    "grade": 2,
    "skill_level": "技师",
    "export_skill_level": "二级",
    "level_label": "二级／技师",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-信息安全管理员-技师",
    "application_type": "复合型",
    "adapted": false,
    "implementation_ready": false,
    "reporting_confirmed": false,
    "status": "待适配",
    "adaptation_status": "待开发",
    "missing": [
      "尚未实现该申报路径的专项字段、材料、初审核验及导出联调",
      "需适配工作经历、工龄与社保证明；涉及技能证书或职称时须校验证书取得日期及对应关系"
    ],
    "institution_types": [],
    "source_conditions": [
      "三级证书后累计从事本职业或相关职业工作满5年。",
      "初级职称后累计工作满5年，且三级证书后工作满1年。",
      "中级职称后累计工作满1年。",
      "具有三级证书的高级技校、技师学院毕业生累计工作满2年。",
      "取得三级证书满2年的技师学院预备技师班、技师班学生。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "仅可保存草稿，禁止启用、发布及新报名"
    ]
  },
  {
    "selection_id": "network_security:5:工龄型",
    "occupation_key": "network_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "网络安全管理员",
    "official_code": "4-04-04-02",
    "grade": 5,
    "skill_level": "初级工",
    "export_skill_level": "五级",
    "level_label": "五级／初级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-网络安全管理员-初级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "年满16周岁，从事本职业或相关职业工作。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页",
      "四川省职业技能等级认定个人申报表.docx填表说明与解答PDF第2页分类存在差异；业务已确认五级统一按工龄型报名及导出"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "年满16周岁，按北京时间首次正式提交日期核算；补正沿用首次提交基准",
      "工龄型须提供相关职业工作经历、工龄证明及社保证明；不设置最低工作年数，不要求前置证书或毕业学历材料",
      "五级统一按工龄型报名及导出，申报条件为年满16周岁、从事本职业或相关职业工作"
    ]
  },
  {
    "selection_id": "network_security:4:工龄型",
    "occupation_key": "network_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "网络安全管理员",
    "official_code": "4-04-04-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-网络安全管理员-中级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "累计从事本职业或相关职业工作满5年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "累计相关职业工作满5年，工龄及社保须逐项初审核验"
    ]
  },
  {
    "selection_id": "network_security:4:复合型",
    "occupation_key": "network_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "网络安全管理员",
    "official_code": "4-04-04-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-网络安全管理员-中级工",
    "application_type": "复合型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "取得本职业或相关职业五级/初级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满3年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "复合型仅开放取得五级证书后累计相关工作满3年路径"
    ]
  },
  {
    "selection_id": "network_security:4:学历型",
    "occupation_key": "network_security",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "网络安全管理员",
    "official_code": "4-04-04-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-网络安全管理员-中级工",
    "application_type": "学历型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "source_conditions": [
      "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "信息安全、网络空间安全、网络信息安全、网络与信息安全、信息安全与管理、网络安全与执法、保密技术、大数据技术与应用、电子技术应用、电子商务技术、电子与计算机工程、电子与信息技术、工业互联网技术应用、计算机程序设计、计算机科学与技术、计算机网络技术、计算机网络应用、网络工程、计算机系统与维护、计算机信息管理、计算机应用技术、计算机应用与维修、计算机与数码产品维修、空间信息与数字技术、区块链工程、人工智能技术服务、人工智能技术应用、软件工程、软件技术、软件与信息服务、数据科学与大数据技术、数字媒体技术、数字媒体技术应用、通信技术、通信网络应用、通信系统工程安装与维护、通信运营服务、网络安防系统安装与维护、网站建设与管理、物联网工程、物联网技术应用、物联网应用技术、新媒体技术、虚拟现实技术、虚拟现实技术应用、虚拟现实应用技术、移动应用技术与服务、移动应用开发、云计算技术应用、云计算技术与应用、智能科学与技术等。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "本期只接受已取得毕业证，不开放在读应届替代证明",
      "不能提供既定学历报告时联系管理员，不开放替代材料线上报名"
    ]
  },
  {
    "selection_id": "internet_review:5:工龄型",
    "occupation_key": "internet_review",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "互联网信息审核员",
    "official_code": "4-04-04-02",
    "grade": 5,
    "skill_level": "初级工",
    "export_skill_level": "五级",
    "level_label": "五级／初级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-互联网信息审核员-初级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "年满16周岁，从事本职业或相关职业工作。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页",
      "四川省职业技能等级认定个人申报表.docx填表说明与解答PDF第2页分类存在差异；业务已确认五级统一按工龄型报名及导出"
    ],
    "related_majors": "含网络与信息安全专业，以及传播学、法学、社会学等扩展专业；完整范围见申报条件PDF第3页，须逐项人工核对。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "年满16周岁，按北京时间首次正式提交日期核算；补正沿用首次提交基准",
      "工龄型须提供相关职业工作经历、工龄证明及社保证明；不设置最低工作年数，不要求前置证书或毕业学历材料",
      "五级统一按工龄型报名及导出，申报条件为年满16周岁、从事本职业或相关职业工作"
    ]
  },
  {
    "selection_id": "internet_review:4:工龄型",
    "occupation_key": "internet_review",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "互联网信息审核员",
    "official_code": "4-04-04-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-互联网信息审核员-中级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "累计从事本职业或相关职业工作满5年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "含网络与信息安全专业，以及传播学、法学、社会学等扩展专业；完整范围见申报条件PDF第3页，须逐项人工核对。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "累计相关职业工作满5年，工龄及社保须逐项初审核验"
    ]
  },
  {
    "selection_id": "internet_review:4:复合型",
    "occupation_key": "internet_review",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "互联网信息审核员",
    "official_code": "4-04-04-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-互联网信息审核员-中级工",
    "application_type": "复合型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "取得本职业或相关职业五级/初级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满3年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "含网络与信息安全专业，以及传播学、法学、社会学等扩展专业；完整范围见申报条件PDF第3页，须逐项人工核对。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "复合型仅开放取得五级证书后累计相关工作满3年路径"
    ]
  },
  {
    "selection_id": "internet_review:4:学历型",
    "occupation_key": "internet_review",
    "occupation_title": "网络与信息安全管理员",
    "occupation_name": "互联网信息审核员",
    "official_code": "4-04-04-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-04-02-网络与信息安全管理员-互联网信息审核员-中级工",
    "application_type": "学历型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "source_conditions": [
      "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "含网络与信息安全专业，以及传播学、法学、社会学等扩展专业；完整范围见申报条件PDF第3页，须逐项人工核对。",
    "related_occupations": "信息安全测试员、信息通信网络运行管理员、信息通信信息化系统管理员等。",
    "project_limits": [
      "本期只接受已取得毕业证，不开放在读应届替代证明",
      "不能提供既定学历报告时联系管理员，不开放替代材料线上报名"
    ]
  },
  {
    "selection_id": "human_resources:4:工龄型",
    "occupation_key": "human_resources",
    "occupation_title": "企业人力资源管理师",
    "occupation_name": "企业人力资源管理师",
    "official_code": "4-07-03-04",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-07-03-04-企业人力资源管理师-中级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "累计从事本职业或相关职业工作满5年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "工商企业管理、行政管理、管理科学、劳动与社会保障、劳动经济、劳动关系等。",
    "related_occupations": "企业管理、行政管理、管理咨询、管理研究等；相关资格包括劳动关系协调员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "累计相关职业工作满5年，工龄及社保须逐项初审核验"
    ]
  },
  {
    "selection_id": "human_resources:4:复合型",
    "occupation_key": "human_resources",
    "occupation_title": "企业人力资源管理师",
    "occupation_name": "企业人力资源管理师",
    "official_code": "4-07-03-04",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-07-03-04-企业人力资源管理师-中级工",
    "application_type": "复合型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "取得本职业或相关职业五级/初级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满3年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "工商企业管理、行政管理、管理科学、劳动与社会保障、劳动经济、劳动关系等。",
    "related_occupations": "企业管理、行政管理、管理咨询、管理研究等；相关资格包括劳动关系协调员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "复合型仅开放取得五级证书后累计相关工作满3年路径"
    ]
  },
  {
    "selection_id": "human_resources:4:学历型",
    "occupation_key": "human_resources",
    "occupation_title": "企业人力资源管理师",
    "occupation_name": "企业人力资源管理师",
    "official_code": "4-07-03-04",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-07-03-04-企业人力资源管理师-中级工",
    "application_type": "学历型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "source_conditions": [
      "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "工商企业管理、行政管理、管理科学、劳动与社会保障、劳动经济、劳动关系等。",
    "related_occupations": "企业管理、行政管理、管理咨询、管理研究等；相关资格包括劳动关系协调员等。",
    "project_limits": [
      "本期只接受已取得毕业证，不开放在读应届替代证明",
      "不能提供既定学历报告时联系管理员，不开放替代材料线上报名"
    ]
  },
  {
    "selection_id": "human_resources:2:复合型",
    "occupation_key": "human_resources",
    "occupation_title": "企业人力资源管理师",
    "occupation_name": "企业人力资源管理师",
    "official_code": "4-07-03-04",
    "grade": 2,
    "skill_level": "技师",
    "export_skill_level": "二级",
    "level_label": "二级／技师",
    "occupation_code": "4-07-03-04-企业人力资源管理师-技师",
    "application_type": "复合型",
    "adapted": false,
    "implementation_ready": false,
    "reporting_confirmed": false,
    "status": "待适配",
    "adaptation_status": "待开发",
    "missing": [
      "尚未实现该申报路径的专项字段、材料、初审核验及导出联调",
      "需适配工作经历、工龄与社保证明；涉及技能证书或职称时须校验证书取得日期及对应关系"
    ],
    "institution_types": [],
    "source_conditions": [
      "三级证书后累计从事本职业或相关职业工作满5年。",
      "初级职称后累计工作满5年，且三级证书后工作满1年。",
      "中级职称后累计工作满1年。",
      "具有三级证书的高级技校、技师学院毕业生累计工作满2年。",
      "取得三级证书满2年的技师学院预备技师班、技师班学生。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "工商企业管理、行政管理、管理科学、劳动与社会保障、劳动经济、劳动关系等。",
    "related_occupations": "企业管理、行政管理、管理咨询、管理研究等；相关资格包括劳动关系协调员等。",
    "project_limits": [
      "仅可保存草稿，禁止启用、发布及新报名"
    ]
  },
  {
    "selection_id": "labor_relations:4:工龄型",
    "occupation_key": "labor_relations",
    "occupation_title": "劳动关系协调员",
    "occupation_name": "劳动关系协调员",
    "official_code": "4-07-03-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-07-03-02-劳动关系协调员-中级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "累计从事本职业或相关职业工作满5年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "劳动与社会保障、劳动经济学、人力资源管理、工商企业管理、法学、社会学等。",
    "related_occupations": "人力资源管理、劳动保障事务处理、社会工作等；相关资格包括企业人力资源管理师、劳动保障协理员、劳动保障专理员、社会工作者等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "累计相关职业工作满5年，工龄及社保须逐项初审核验"
    ]
  },
  {
    "selection_id": "labor_relations:4:复合型",
    "occupation_key": "labor_relations",
    "occupation_title": "劳动关系协调员",
    "occupation_name": "劳动关系协调员",
    "official_code": "4-07-03-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-07-03-02-劳动关系协调员-中级工",
    "application_type": "复合型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "取得本职业或相关职业五级/初级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满3年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "劳动与社会保障、劳动经济学、人力资源管理、工商企业管理、法学、社会学等。",
    "related_occupations": "人力资源管理、劳动保障事务处理、社会工作等；相关资格包括企业人力资源管理师、劳动保障协理员、劳动保障专理员、社会工作者等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "复合型仅开放取得五级证书后累计相关工作满3年路径"
    ]
  },
  {
    "selection_id": "labor_relations:4:学历型",
    "occupation_key": "labor_relations",
    "occupation_title": "劳动关系协调员",
    "occupation_name": "劳动关系协调员",
    "official_code": "4-07-03-02",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-07-03-02-劳动关系协调员-中级工",
    "application_type": "学历型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "source_conditions": [
      "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "劳动与社会保障、劳动经济学、人力资源管理、工商企业管理、法学、社会学等。",
    "related_occupations": "人力资源管理、劳动保障事务处理、社会工作等；相关资格包括企业人力资源管理师、劳动保障协理员、劳动保障专理员、社会工作者等。",
    "project_limits": [
      "本期只接受已取得毕业证，不开放在读应届替代证明",
      "不能提供既定学历报告时联系管理员，不开放替代材料线上报名"
    ]
  },
  {
    "selection_id": "ai_trainer:4:工龄型",
    "occupation_key": "ai_trainer",
    "occupation_title": "人工智能训练师",
    "occupation_name": "人工智能训练师",
    "official_code": "4-04-05-05",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-05-05-人工智能训练师-中级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "累计从事本职业或相关职业工作满5年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "技工学校：电工电子类、信息类等；中等及以上职业学校：电子与信息大类、医学卫生大类、装备制造大类、教育与体育大类等。普通高等学校专业范围待核实。",
    "related_occupations": "人工智能工程技术人员、呼叫中心服务员、电子商务师等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "累计相关职业工作满5年，工龄及社保须逐项初审核验"
    ]
  },
  {
    "selection_id": "ai_trainer:4:复合型",
    "occupation_key": "ai_trainer",
    "occupation_title": "人工智能训练师",
    "occupation_name": "人工智能训练师",
    "official_code": "4-04-05-05",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-05-05-人工智能训练师-中级工",
    "application_type": "复合型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "取得本职业或相关职业五级/初级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满3年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "技工学校：电工电子类、信息类等；中等及以上职业学校：电子与信息大类、医学卫生大类、装备制造大类、教育与体育大类等。普通高等学校专业范围待核实。",
    "related_occupations": "人工智能工程技术人员、呼叫中心服务员、电子商务师等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "复合型仅开放取得五级证书后累计相关工作满3年路径"
    ]
  },
  {
    "selection_id": "ai_trainer:4:学历型",
    "occupation_key": "ai_trainer",
    "occupation_title": "人工智能训练师",
    "occupation_name": "人工智能训练师",
    "official_code": "4-04-05-05",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-04-05-05-人工智能训练师-中级工",
    "application_type": "学历型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [
      "technical",
      "vocational"
    ],
    "source_conditions": [
      "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "技工学校：电工电子类、信息类等；中等及以上职业学校：电子与信息大类、医学卫生大类、装备制造大类、教育与体育大类等。普通高等学校专业范围待核实。",
    "related_occupations": "人工智能工程技术人员、呼叫中心服务员、电子商务师等。",
    "project_limits": [
      "本期只接受已取得毕业证，不开放在读应届替代证明",
      "不能提供既定学历报告时联系管理员，不开放替代材料线上报名",
      "人工智能训练师仅开放资料明确的技工院校、中等及以上职业院校；普通高等学校专业范围待核实"
    ]
  },
  {
    "selection_id": "robot_operator:4:工龄型",
    "occupation_key": "robot_operator",
    "occupation_title": "工业机器人系统操作员",
    "occupation_name": "工业机器人系统操作员",
    "official_code": "6-30-99-00",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
    "application_type": "工龄型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "累计从事本职业或相关职业工作满5年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "加工制造类、机电设备类、机械类、电气类、自动化类、电子信息类、计算机类、通信类等。",
    "related_occupations": "焊工、机械设备维修人员、机械冷加工人员、金属加工机械制造人员、信息通信网络运行管理人员、计算机制造人员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "累计相关职业工作满5年，工龄及社保须逐项初审核验"
    ]
  },
  {
    "selection_id": "robot_operator:4:复合型",
    "occupation_key": "robot_operator",
    "occupation_title": "工业机器人系统操作员",
    "occupation_name": "工业机器人系统操作员",
    "official_code": "6-30-99-00",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
    "application_type": "复合型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [],
    "source_conditions": [
      "取得本职业或相关职业五级/初级工职业资格（职业技能等级）证书后，累计从事本职业或相关职业工作满3年。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "加工制造类、机电设备类、机械类、电气类、自动化类、电子信息类、计算机类、通信类等。",
    "related_occupations": "焊工、机械设备维修人员、机械冷加工人员、金属加工机械制造人员、信息通信网络运行管理人员、计算机制造人员等。",
    "project_limits": [
      "工作经历须为本职业或资料列明相关职业，重叠时间不重复累计",
      "工龄证明单独提交；证书与网查截图合并在同一份JPEG材料中",
      "复合型仅开放取得五级证书后累计相关工作满3年路径"
    ]
  },
  {
    "selection_id": "robot_operator:4:学历型",
    "occupation_key": "robot_operator",
    "occupation_title": "工业机器人系统操作员",
    "occupation_name": "工业机器人系统操作员",
    "official_code": "6-30-99-00",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "6-30-99-00-工业机器人系统操作员-中级工",
    "application_type": "学历型",
    "adapted": true,
    "implementation_ready": true,
    "reporting_confirmed": true,
    "status": "已适配",
    "adaptation_status": "已适配",
    "missing": [],
    "institution_types": [
      "technical",
      "vocational",
      "general_higher"
    ],
    "source_conditions": [
      "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "职业技能等级认定申报条件相关解答.pdf，第10—12页"
    ],
    "related_majors": "加工制造类、机电设备类、机械类、电气类、自动化类、电子信息类、计算机类、通信类等。",
    "related_occupations": "焊工、机械设备维修人员、机械冷加工人员、金属加工机械制造人员、信息通信网络运行管理人员、计算机制造人员等。",
    "project_limits": [
      "本期只接受已取得毕业证，不开放在读应届替代证明",
      "不能提供既定学历报告时联系管理员，不开放替代材料线上报名"
    ]
  },
  {
    "selection_id": "business_data:4:学历型",
    "occupation_key": "business_data",
    "occupation_title": "商务数据分析师",
    "occupation_name": "商务数据分析师",
    "official_code": "4-07-02-05",
    "grade": 4,
    "skill_level": "中级工",
    "export_skill_level": "四级",
    "level_label": "四级／中级工",
    "occupation_code": "4-07-02-05-商务数据分析师-中级工",
    "application_type": "学历型",
    "adapted": false,
    "implementation_ready": false,
    "reporting_confirmed": false,
    "status": "待适配",
    "adaptation_status": "待业务确认",
    "missing": [
      "尚未实现该申报路径的专项字段、材料、初审核验及导出联调",
      "相关职业、专业及院校细则待补齐"
    ],
    "institution_types": [],
    "source_conditions": [
      "取得本专业或相关专业的技工院校或中等及以上职业院校、专科及以上普通高等学校毕业证书（含在读应届毕业生）。"
    ],
    "sources": [
      "职业技能等级认定职业工种申报条件.pdf，第1页",
      "职业技能等级认定申报条件相关解答.pdf，第1—9页",
      "注意.txt；报名信息.xlsx／申报条件工作表"
    ],
    "related_majors": "现有模板提供四级、三级职业代码及条件，相关专业与院校细则待补齐。",
    "related_occupations": "相关职业细则待补齐，不套用其他职业。",
    "project_limits": [
      "仅可保存草稿，禁止启用、发布及新报名"
    ]
  }
]

const institutionLabels: Record<string, string> = { technical: '技工院校', vocational: '中等及以上职业院校', general_higher: '普通高等学校（专科及以上）' }
export const combinations: RensheCombination[] = profiles.map(profile => {
  const key = [3, 5].includes(profile.grade) ? profile.application_type + profile.grade : profile.adapted ? profile.application_type : 'pending'
  const selected = { occupation_name: profile.occupation_name, occupation_code: profile.occupation_code, skill_level: profile.skill_level, export_skill_level: profile.export_skill_level, application_types: [profile.application_type] }
  const config = { ...configs[key], ...selected, selection_id: profile.selection_id, rule_profile: { ...profile, review_checks: configs[key].rule_profile?.review_checks }, institution_types: profile.institution_types || [] } as RensheProjectConfig
  return { ...profile, config, export_instructions: instructions[key], admission_requirements: {
    ...requirements[key], rule_profile: profile,
    scope: { ...selected, exam_types: config.exam_types, qualification_rule: config.qualification_rule },
    institution_types: (profile.institution_types || []).map(value => ({ value, label: institutionLabels[value] })),
  } }
})
