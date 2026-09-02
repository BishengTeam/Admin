import { useEffect, useRef, useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Upload, message } from 'antd'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { classroomService } from '@/services/classroom'
import { formatDate, formatPrice } from '@/utils/format'
import type { Classroom, ClassroomVideo } from '@/types/classroom'

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve(Math.max(0, Math.round(video.duration)))
      URL.revokeObjectURL(url)
    }
    video.onerror = () => { resolve(0); URL.revokeObjectURL(url) }
    video.src = url
  })
}

export default function VideosTab({ classroom }: { classroom: Classroom }) {
  const [videos, setVideos] = useState<ClassroomVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [form] = Form.useForm<{ title: string }>()
  const durationTimer = useRef<number>()

  const load = () => {
    classroomService.listVideos(classroom.id)
      .then(setVideos)
      .finally(() => setLoading(false))
  }

  useEffect(load, [classroom.id])

  const handleSelect = async (f: File) => {
    setFile(f)
    form.setFieldsValue({ title: f.name.replace(/\.[^.]+$/, '') })
    setDuration(await readVideoDuration(f))
  }

  const handleUpload = async () => {
    if (!file) return message.warning('请先选择视频文件')
    const { title } = await form.validateFields()
    setUploading(true)
    try {
      const { storage_key, upload_url } = await classroomService.videoUploadUrl(
        classroom.id, {
          filename: file.name, content_type: file.type || 'video/mp4', size_bytes: file.size,
        })
      await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'video/mp4' } })
      await classroomService.createVideo(classroom.id, {
        title, storage_key, duration_seconds: duration, size_bytes: file.size,
      })
      message.success('视频已上传')
      setModalOpen(false)
      setFile(null)
      load()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (videoId: number) => {
    await classroomService.deleteVideo(classroom.id, videoId)
    message.success('已删除')
    load()
  }

  const columns: ColumnsType<ClassroomVideo> = [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '时长', dataIndex: 'duration_seconds', width: 100, render: (v: number) => `${Math.floor(v / 60)}分${v % 60}秒` },
    { title: '大小', dataIndex: 'size_bytes', width: 100, render: (v: number) => `${Math.round(v / 1048576)}MB` },
    { title: '上传时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
    {
      title: '操作', width: 80,
      render: (_, r) => (
        <Button type='link' size='small' danger onClick={() => remove(r.id)}>删除</Button>
      ),
    },
  ]

  return (
    <>
      <Button type='primary' icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { setFile(null); form.resetFields(); setModalOpen(true) }}>
        上传视频
      </Button>
      <Table rowKey='id' columns={columns} dataSource={videos} loading={loading} pagination={false} />

      <Modal
        title='上传课堂视频' open={modalOpen} onOk={handleUpload}
        onCancel={() => setModalOpen(false)} okText='上传' confirmLoading={uploading}
        destroyOnClose
      >
        <Form form={form} layout='vertical' style={{ marginTop: 16 }}>
          <Form.Item label='视频文件（MP4/MOV/MKV，最大 5GB）' required>
            <Upload
              maxCount={1}
              beforeUpload={(f) => { handleSelect(f); return false }}
              onRemove={() => setFile(null)}
              fileList={file ? [{ uid: '-1', name: file.name } as UploadFile] : []}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
          {file && (
            <Form.Item label='时长（秒，自动读取，可修改）'>
              <InputNumber min={0} value={duration} onChange={(v) => setDuration(v ?? 0)} style={{ width: 200 }} />
            </Form.Item>
          )}
          <Form.Item name='title' label='标题' rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder='视频标题' maxLength={128} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
