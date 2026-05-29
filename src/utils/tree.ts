export interface TreeNode {
  id: number
  parent_id: number | null
  children?: TreeNode[]
  [key: string]: unknown
}

export function arrayToTree<T extends TreeNode>(items: T[]): T[] {
  const map = new Map<number, T>()
  const roots: T[] = []

  for (const item of items) {
    map.set(item.id, { ...item, children: [] })
  }

  for (const item of map.values()) {
    const parentId = item.parent_id
    if (parentId != null && map.has(parentId)) {
      const parent = map.get(parentId)!
      parent.children = parent.children || []
      parent.children.push(item)
    } else {
      roots.push(item)
    }
  }

  return roots
}

export function findTreeNode<T extends TreeNode>(tree: T[], id: number): T | null {
  for (const node of tree) {
    if (node.id === id) return node
    if (node.children) {
      const found = findTreeNode(node.children as T[], id)
      if (found) return found
    }
  }
  return null
}
