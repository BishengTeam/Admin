/**
 * 富文本编辑器 — 基于 wangEditor
 * 支持从 Word 粘贴保留格式（标题/加粗/列表/编号/表格）
 */
import { useEffect, useRef, useState } from 'react'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'

interface RichEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  height?: number
}

export default function RichEditor({
  value,
  onChange,
  placeholder = '在此粘贴或输入协议内容，支持从 Word 直接粘贴',
  height = 400,
}: RichEditorProps) {
  const [editor, setEditor] = useState<IDomEditor | null>(null)

  const toolbarConfig: Partial<IToolbarConfig> = {
    excludeKeys: [
      'groupImage',
      'groupVideo',
      'insertLink',
      'codeBlock',
      'todo',
      'fullScreen',
    ],
  }

  const editorConfig: Partial<IEditorConfig> = {
    placeholder,
  }

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy()
        setEditor(null)
      }
    }
  }, [editor])

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, zIndex: 100 }}>
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="default"
        style={{ borderBottom: '1px solid #e8e8e8' }}
      />
      <Editor
        defaultConfig={editorConfig}
        defaultContent={undefined}
        defaultHtml={value}
        onCreated={setEditor}
        onChange={(ed) => {
          onChange?.(ed.getHtml())
        }}
        mode="html"
        style={{ height, overflowY: 'auto' }}
      />
    </div>
  )
}
