import { Tree, Card, Button, Space, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons'
import type { Category } from '@/types/quiz'
import type { DataNode } from 'antd/es/tree'

interface CategoryTreeProps {
  categories: Category[]
  selectedKey: number | undefined
  onSelect: (id: number | undefined) => void
  onCreate: () => void
  onRename: (category: Category) => void
  onDelete: (category: Category) => void
}

function toTreeNodes(categories: Category[]): DataNode[] {
  return categories.map((cat) => ({
    title: cat.name,
    key: cat.id,
    icon: <FolderOutlined />,
    children: cat.children ? toTreeNodes(cat.children) : undefined,
  }))
}

export default function CategoryTree({
  categories,
  selectedKey,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: CategoryTreeProps) {
  const treeData: DataNode[] = [
    { title: '全部题目', key: 'all', icon: <FolderOutlined /> },
    ...toTreeNodes(categories),
  ]

  const handleSelect = (keys: React.Key[]) => {
    if (keys.length === 0 || keys[0] === 'all') {
      onSelect(undefined)
    } else {
      onSelect(keys[0] as number)
    }
  }

  const titleRender = (nodeData: DataNode) => {
    const key = nodeData.key
    if (key === 'all') return <span>{nodeData.title as string}</span>

    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 }}
      >
        <span>{nodeData.title as string}</span>
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              const cat = findCategory(categories, key as number)
              if (cat) onRename(cat)
            }}
          />
          <Popconfirm
            title="删除此分类将同时删除其子分类和题目，确认？"
            onConfirm={(e) => {
              e?.stopPropagation()
              const cat = findCategory(categories, key as number)
              if (cat) onDelete(cat)
            }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      </div>
    )
  }

  return (
    <Card
      title="题目分类"
      size="small"
      extra={
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={onCreate}>
          新增
        </Button>
      }
      style={{ height: '100%' }}
    >
      <Tree
        showLine
        defaultExpandAll
        treeData={treeData}
        selectedKeys={selectedKey ? [selectedKey] : ['all']}
        onSelect={handleSelect}
        titleRender={titleRender}
        style={{ maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}
      />
    </Card>
  )
}

function findCategory(tree: Category[], id: number): Category | undefined {
  for (const cat of tree) {
    if (cat.id === id) return cat
    if (cat.children) {
      const found = findCategory(cat.children, id)
      if (found) return found
    }
  }
}
