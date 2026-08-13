import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Button, Card, Modal, Space, Tag, Tree, Tooltip } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, FolderOutlined, PlusOutlined, StopOutlined, SwapOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import type { Category } from '@/types/quiz'

interface CategoryTreeProps {
  categories: Category[]
  selectedKey?: number
  canWrite: boolean
  onSelect: (id?: number) => void
  onCreate: (parent?: Category) => void
  onEdit: (category: Category) => void
  onMove: (category: Category) => void
  onStatus: (category: Category) => void
  onDelete: (category: Category) => void
}

export function buildCategoryTree(categories: Category[]): Category[] {
  const nodes = new Map<number, Category>()
  categories.forEach((category) => nodes.set(category.id, { ...category, children: [] }))
  const roots: Category[] = []
  nodes.forEach((category) => {
    if (category.parent_id && nodes.has(category.parent_id)) {
      nodes.get(category.parent_id)!.children!.push(category)
    } else {
      roots.push(category)
    }
  })
  const sort = (items: Category[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    items.forEach((item) => item.children && sort(item.children))
    return items
  }
  return sort(roots)
}

export function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...(category.children ? flattenCategories(category.children) : [])])
}

export function findCategory(categories: Category[], id: number): Category | undefined {
  return flattenCategories(categories).find((category) => category.id === id)
}

export function getCategoryPath(categories: Category[], id: number): Category[] {
  const byId = new Map(flattenCategories(categories).map((category) => [category.id, category]))
  const path: Category[] = []
  let current = byId.get(id)
  while (current) {
    path.unshift(current)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return path
}

export function isCategoryEffectivelyDisabled(categories: Category[], id: number): boolean {
  return getCategoryPath(categories, id).some((category) => category.status === 'disabled')
}

function toNodes(categories: Category[], all: Category[], canWrite: boolean, actions: {
  onCreate: (parent?: Category) => void
  onEdit: (category: Category) => void
  onMove: (category: Category) => void
  onStatus: (category: Category) => void
  onDelete: (category: Category) => void
}): DataNode[] {
  return categories.map((category) => {
    const inherited = isCategoryEffectivelyDisabled(all, category.id) && category.status !== 'disabled'
    const actionButtons: ReactNode = canWrite ? (
      <Space size={0} onClick={(event) => event.stopPropagation()}>
        <Tooltip title={category.depth >= 3 ? '已达到三级，不能继续添加' : '添加子分类'}><Button aria-label={`为${category.name}添加子分类`} type="text" size="small" disabled={category.depth >= 3} icon={<PlusOutlined />} onClick={() => actions.onCreate(category)} /></Tooltip>
        <Tooltip title="编辑分类"><Button aria-label={`编辑分类${category.name}`} type="text" size="small" icon={<EditOutlined />} onClick={() => actions.onEdit(category)} /></Tooltip>
        <Tooltip title="移动/排序分类"><Button aria-label={`移动分类${category.name}`} type="text" size="small" icon={<SwapOutlined />} onClick={() => actions.onMove(category)} /></Tooltip>
        <Tooltip title={category.status === 'active' ? '停用分类' : '启用分类'}><Button aria-label={`${category.status === 'active' ? '停用' : '启用'}分类${category.name}`} type="text" size="small" icon={category.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />} onClick={() => actions.onStatus(category)} /></Tooltip>
        <Tooltip title="预览删除影响"><Button aria-label={`删除分类${category.name}`} type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => actions.onDelete(category)} /></Tooltip>
      </Space>
    ) : null
    return {
      key: category.id,
      icon: <FolderOutlined />,
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{category.name}</span>
          {category.status === 'disabled' && <Tag color="default">停用</Tag>}
          {inherited && <Tag color="warning">继承停用</Tag>}
          {actionButtons}
        </div>
      ),
      children: category.children?.length ? toNodes(category.children, all, canWrite, actions) : undefined,
    }
  })
}

export default function CategoryTree({ categories, selectedKey, canWrite, onSelect, onCreate, onEdit, onMove, onStatus, onDelete }: CategoryTreeProps) {
  const tree = useMemo(() => buildCategoryTree(categories), [categories])

  const treeData: DataNode[] = [
    { title: '全部题目', key: 'all', icon: <FolderOutlined /> },
    ...toNodes(tree, tree, canWrite, { onCreate, onEdit, onMove, onStatus, onDelete }),
  ]

  return (
    <Card
      size="small"
      title="题目分类"
      extra={canWrite && <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => onCreate()}>新增分类</Button>}
      style={{ height: '100%' }}
    >
      <Tree
        showLine
        blockNode
        defaultExpandAll
        treeData={treeData}
        selectedKeys={selectedKey == null ? ['all'] : [selectedKey]}
        onSelect={(keys) => onSelect(keys[0] && keys[0] !== 'all' ? Number(keys[0]) : undefined)}
        style={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}
      />
    </Card>
  )
}
