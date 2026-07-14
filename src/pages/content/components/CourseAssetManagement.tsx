import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Space, Switch, Table, Tag, Typography, Upload, message } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { RcFile, UploadFile } from 'antd/es/upload/interface'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePermission } from '@/hooks/usePermission'
import { contentService } from '@/services/content'
import { formatDate } from '@/utils/format'
import type { CourseAsset } from '@/types/content'

const { Text } = Typography

interface CourseAssetManagementProps {
  courseId: number
}

interface AssetFormValues {
  title: string
  asset_type: string
  sort_order: number
  is_preview: boolean
}

export default function CourseAssetManagement({ courseId }: CourseAssetManagementProps) {
  const [assets, setAssets] = useState<CourseAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm<AssetFormValues>()
  const canWrite = usePermission('course:write')

  const loadAssets = useCallback(async () => {
    setLoading(true)
    try {
      setAssets(await contentService.listCourseAssets(courseId))
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  const handleUpload = async (values: AssetFormValues) => {
    const file = fileList[0]?.originFileObj as RcFile | undefined
    if (!file) {
      message.error('请选择要上传的课程资源')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', values.title.trim())
    formData.append('asset_type', values.asset_type.trim())
    formData.append('sort_order', String(values.sort_order ?? 0))
    formData.append('is_preview', String(values.is_preview ?? false))

    setUploading(true)
    try {
      await contentService.uploadCourseAsset(courseId, formData)
      message.success('课程资源上传成功')
      form.resetFields()
      form.setFieldsValue({ sort_order: 0, is_preview: false })
      setFileList([])
      await loadAssets()
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (assetId: number) => {
    await contentService.deleteCourseAsset(courseId, assetId)
    message.success('课程资源已删除')
    await loadAssets()
  }

  const columns: ColumnsType<CourseAsset> = [
    { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
    { title: '类型', dataIndex: 'asset_type', width: 100, render: (value: string) => <Tag>{value}</Tag> },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    {
      title: '访问范围',
      dataIndex: 'is_preview',
      width: 90,
      render: (value: boolean) => value ? <Tag color="orange">试看</Tag> : <Tag>购买后</Tag>,
    },
    {
      title: '存储标识',
      dataIndex: 'storage_key',
      ellipsis: true,
      render: (value: string) => <Text code copyable={{ text: value }}>{value}</Text>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 160, render: (value: string) => formatDate(value) },
    {
      title: '操作',
      width: 80,
      render: (_, record) => canWrite ? (
        <ConfirmButton
          title="删除课程资源"
          description="删除会同时移除资源记录和私有文件，且不能撤销。确认删除？"
          danger
          type="link"
          size="small"
          icon={<DeleteOutlined />}
          onConfirm={() => handleDelete(record.id)}
        >
          删除
        </ConfirmButton>
      ) : null,
    },
  ]

  return (
    <div>
      {canWrite && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ sort_order: 0, is_preview: false }}
          onFinish={handleUpload}
          style={{ marginBottom: 20 }}
        >
          <Space align="start" wrap size={12}>
            <Form.Item name="title" label="资源标题" rules={[{ required: true, message: '请输入资源标题' }]}>
              <Input maxLength={256} placeholder="资源标题" style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="asset_type" label="资源类型" rules={[{ required: true, message: '请输入资源类型' }]}>
              <Input maxLength={32} placeholder="如 video / pdf" style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="sort_order" label="排序">
              <InputNumber min={0} precision={0} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="is_preview" label="允许试看" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="资源文件" required>
              <Upload
                beforeUpload={() => false}
                fileList={fileList}
                maxCount={1}
                onChange={({ fileList: next }) => setFileList(next.slice(-1))}
              >
                <Button icon={<UploadOutlined />}>选择文件</Button>
              </Upload>
            </Form.Item>
            <Form.Item label=" ">
              <Button type="primary" htmlType="submit" icon={<UploadOutlined />} loading={uploading} disabled={uploading}>
                上传资源
              </Button>
            </Form.Item>
          </Space>
        </Form>
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={assets}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
      />
    </div>
  )
}
