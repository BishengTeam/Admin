import type MockAdapter from 'axios-mock-adapter'
import type { Category, Question } from '@/types/quiz'

const categories: Category[] = [
  {
    id: 1, name: 'H3CNE', parent_id: null,
    children: [
      { id: 11, name: 'OSPF协议', parent_id: 1 },
      { id: 12, name: 'VLAN技术', parent_id: 1 },
      { id: 13, name: 'STP协议', parent_id: 1 },
      { id: 14, name: 'IP地址规划', parent_id: 1 },
    ],
  },
  {
    id: 2, name: '深信服安全', parent_id: null,
    children: [
      { id: 21, name: '防火墙', parent_id: 2 },
      { id: 22, name: 'VPN技术', parent_id: 2 },
      { id: 23, name: '上网行为管理', parent_id: 2 },
    ],
  },
  {
    id: 3, name: '竞赛题库', parent_id: null,
    children: [
      { id: 31, name: '初赛', parent_id: 3 },
      { id: 32, name: '复赛', parent_id: 3 },
      { id: 33, name: '决赛', parent_id: 3 },
    ],
  },
]

let questionIdCounter = 40
const questions: Question[] = [
  { id: 1, category_id: 11, category_name: 'OSPF协议', question_type: 'single', question_text: 'OSPF使用哪种算法计算最短路径？', options: { A: '距离矢量算法', B: '链路状态算法', C: '路径向量算法', D: '洪泛算法' }, correct_answer: 'B', explanation: 'OSPF使用Dijkstra链路状态算法计算最短路径。' },
  { id: 2, category_id: 11, category_name: 'OSPF协议', question_type: 'single', question_text: 'OSPF的默认Hello报文发送间隔是多少秒？', options: { A: '5秒', B: '10秒', C: '30秒', D: '40秒' }, correct_answer: 'B', explanation: '在广播和点对点网络上，OSPF Hello报文默认每10秒发送一次。' },
  { id: 3, category_id: 12, category_name: 'VLAN技术', question_type: 'single', question_text: 'IEEE 802.1Q标准定义的VLAN标记占用多少字节？', options: { A: '2字节', B: '4字节', C: '8字节', D: '12字节' }, correct_answer: 'B', explanation: '802.1Q标签占用4个字节，插入在源MAC地址和类型字段之间。' },
  { id: 4, category_id: 12, category_name: 'VLAN技术', question_type: 'single', question_text: 'Access端口接收不带VLAN标签的帧时，会如何处理？', options: { A: '丢弃该帧', B: '打上PVID标签后转发', C: '直接转发', D: '广播该帧' }, correct_answer: 'B', explanation: 'Access端口接收不带标签的帧时，会打上端口的PVID标签。' },
  { id: 5, category_id: 13, category_name: 'STP协议', question_type: 'single', question_text: 'STP中网桥ID由什么组成？', options: { A: '网桥优先级+端口号', B: '网桥优先级+MAC地址', C: '端口号+MAC地址', D: '网桥优先级+IP地址' }, correct_answer: 'B', explanation: '网桥ID = 网桥优先级（2字节）+ MAC地址（6字节）。' },
  { id: 6, category_id: 21, category_name: '防火墙', question_type: 'multi', question_text: '以下哪些是防火墙的主要功能？（多选）', options: { A: '包过滤', B: 'NAT转换', C: 'ARP代理', D: '应用代理' }, correct_answer: 'ABD', explanation: '防火墙主要功能包括包过滤、NAT转换、应用代理。ARP代理不是防火墙的基本功能。' },
  { id: 7, category_id: 21, category_name: '防火墙', question_type: 'single', question_text: '包过滤防火墙在OSI模型哪一层工作？', options: { A: '应用层', B: '传输层', C: '网络层', D: '数据链路层' }, correct_answer: 'C', explanation: '包过滤防火墙主要工作在网络层，基于IP地址和端口号进行过滤。' },
]

// Generate more questions
for (let i = 8; i <= 35; i++) {
  const catId = [11, 12, 13, 14, 21, 22, 23, 31, 32, 33][i % 10]
  const cat = categories.flatMap(c => c.children || [c]).find(c => c.id === catId) || categories[0]
  questions.push({
    id: i,
    category_id: catId,
    category_name: cat.name,
    question_type: i % 4 === 0 ? 'multi' : 'single',
    question_text: `${cat.name}相关题目 #${i}：关于网络技术的选择题`,
    options: {
      A: `选项A内容-${i}`,
      B: `选项B内容-${i}`,
      C: `选项C内容-${i}`,
      D: `选项D内容-${i}`,
    },
    correct_answer: i % 4 === 0 ? 'AC' : 'B',
    explanation: `题目${i}的答案解析`,
  })
  questionIdCounter = i
}

function findCategoryById(tree: Category[], id: number): Category | undefined {
  for (const cat of tree) {
    if (cat.id === id) return cat
    if (cat.children) {
      const found = findCategoryById(cat.children, id)
      if (found) return found
    }
  }
}

function removeCategoryById(tree: Category[], id: number): boolean {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      tree.splice(i, 1)
      return true
    }
    if (tree[i].children && removeCategoryById(tree[i].children!, id)) {
      return true
    }
  }
  return false
}

export function registerQuizMock(mock: MockAdapter) {
  mock.onGet('/admin/quiz/categories').reply(() => {
    return [200, { code: 200, message: 'ok', data: categories }]
  })

  mock.onPost('/admin/quiz/categories').reply((config) => {
    const data = JSON.parse(config.data)
    const newCat: Category = { id: Date.now(), name: data.name, parent_id: data.parent_id || null }
    return [200, { code: 200, message: 'ok', data: newCat }]
  })

  mock.onPut(/\/admin\/quiz\/categories\/\d+/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/quiz\/categories\/(\d+)/)![1])
    const data = JSON.parse(config.data)
    const cat = findCategoryById(categories, id)
    if (cat) {
      if (data.name !== undefined) cat.name = data.name
      if (data.parent_id !== undefined) cat.parent_id = data.parent_id
    }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onDelete(/\/admin\/quiz\/categories\/\d+/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/quiz\/categories\/(\d+)/)![1])
    removeCategoryById(categories, id)
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onGet('/admin/quiz/questions').reply((config) => {
    const params = config.params || {}
    let filtered = [...questions]

    if (params.keyword) {
      filtered = filtered.filter((q) => q.question_text.includes(params.keyword))
    }
    if (params.category_id) {
      const catId = Number(params.category_id)
      filtered = filtered.filter((q) => q.category_id === catId)
    }

    const page = Number(params.page) || 1
    const pageSize = Number(params.page_size) || 20
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    return [200, {
      code: 200,
      message: 'ok',
      data: { items, total: filtered.length, page, page_size: pageSize },
    }]
  })

  mock.onPost('/admin/quiz/questions').reply((config) => {
    const data = JSON.parse(config.data)
    const newQ: Question = { id: ++questionIdCounter, ...data }
    questions.unshift(newQ)
    return [200, { code: 200, message: 'ok', data: newQ }]
  })

  mock.onPut(/\/admin\/quiz\/questions\/\d+/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/quiz\/questions\/(\d+)/)![1])
    const data = JSON.parse(config.data)
    const idx = questions.findIndex((q) => q.id === id)
    if (idx >= 0) {
      questions[idx] = { ...questions[idx], ...data }
    }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onDelete(/\/admin\/quiz\/questions\/\d+/).reply((config) => {
    const id = Number(config.url!.match(/\/admin\/quiz\/questions\/(\d+)/)![1])
    const idx = questions.findIndex((q) => q.id === id)
    if (idx >= 0) {
      questions.splice(idx, 1)
    }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  mock.onPost('/admin/quiz/questions/batch-delete').reply((config) => {
    const { ids } = JSON.parse(config.data) as { ids: number[] }
    for (const id of ids) {
      const idx = questions.findIndex((q) => q.id === id)
      if (idx >= 0) questions.splice(idx, 1)
    }
    return [200, { code: 200, message: 'ok', data: null }]
  })

  // TXT import
  mock.onPost('/admin/quiz/import').reply((config) => {
    const { category_id, questions: newQuestions } = JSON.parse(config.data)
    let imported = 0
    for (const q of newQuestions) {
      const cat = findCategoryById(categories, category_id)
      questions.unshift({
        id: ++questionIdCounter,
        category_id,
        category_name: cat?.name || '未知分类',
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.answer,
        explanation: '',
      })
      imported++
    }
    return [200, { code: 200, message: 'ok', data: { count: imported } }]
  })
}
