import { useEffect, useState } from 'react'
import { Button, Modal, Form, Input, InputNumber, Upload, Row, Col, Card, Checkbox, Space, Spin, Typography, message } from 'antd'
import { DeleteOutlined, PlayCircleOutlined, PlusOutlined, UploadOutlined, VideoCameraOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { classroomService } from '@/services/classroom'
import { readVideoDuration } from '@/services/courseManagement'
import { formatDate } from '@/utils/format'
import type { Classroom, ClassroomVideo } from '@/types/classroom'

const { Text } = Typography

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

function fmtSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)}GB`
  return `${Math.round(bytes / 1048576)}MB`
}

export default function VideosTab({ classroom }: { classroom: Classroom }) {
  const [videos, setVideos] = useState<ClassroomVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [playUrl, setPlayUrl] = useState<string | null>(null)
  const [playTitle, setPlayTitle] = useState('')
  const [form] = Form.useForm<{ title: string }>()

  const load = () => {
    classroomService.listVideos(classroom.id)
      .then(setVideos)
      .finally(() => setLoading(false))
  }

  useEffect(load, [classroom.id])

  const handleSelect = async (f: File) => {
    setFile(f)
    form.setFieldsValue({ title: f.name.replace(/\.[^.]+$/, '') })
    try {
      setDuration(await readVideoDuration(f))
    } catch {
      setDuration(0)
      message.warning('无法自动读取视频时长，请手动填写')
    }
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
      const response = await fetch(upload_url, {
        method: 'PUT',
        body: file.slice(0, file.size, ''),
      })
      if (!response.ok) throw new Error(`视频直传失败（${response.status}）`)
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

  const preview = async (video: ClassroomVideo) => {
    try {
      const url = await classroomService.videoPlayUrl(classroom.id, video.id)
      setPlayUrl(url)
      setPlayTitle(video.title)
    } catch { /* request 层 toast */ }
  }

  const removeSelected = async () => {
    for (const id of selected) {
      await classroomService.deleteVideo(classroom.id, id)
    }
    message.success(`已删除 ${selected.length} 个视频`)
    setSelected([])
    load()
  }

  const toggle = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button type='primary' icon={<PlusOutlined />} onClick={() => { setFile(null); form.resetFields(); setModalOpen(true) }}>
          上传视频
        </Button>
        {selected.length > 0 && (
          <ConfirmButton
            title='删除视频'
            description={`确认删除选中的 ${selected.length} 个视频？此操作不可撤销。`}
            danger
            icon={<DeleteOutlined />}
            onConfirm={removeSelected}
          >
            删除（{selected.length}）
          </ConfirmButton>
        )}
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {videos.map((v) => (
            <Col key={v.id} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                onClick={() => preview(v)}
                style={{ height: '100%', position: 'relative', borderColor: selected.includes(v.id) ? '#1677ff' : undefined }}
              >
                <div
                  onClick={(e) => { e.stopPropagation(); toggle(v.id) }}
                  style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}
                >
                  <Checkbox checked={selected.includes(v.id)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <PlayCircleOutlined style={{ fontSize: 40, color: '#1677ff' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong ellipsis style={{ display: 'block', fontSize: 15 }}>{v.title}</Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {fmtDuration(v.duration_seconds)} · {fmtSize(v.size_bytes)}
                    </Text>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    <VideoCameraOutlined /> {formatDate(v.created_at)}
                  </Text>
                  <Text type='secondary' style={{ fontSize: 12 }}>点击预览</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
        {!loading && videos.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            暂无视频，点击「上传视频」添加课堂内容
          </div>
        )}
      </Spin>

      {/* 视频预览弹窗 */}
      <Modal
        title={playTitle}
        open={Boolean(playUrl)}
        onCancel={() => setPlayUrl(null)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {playUrl && (
          <video src={playUrl} controls autoPlay style={{ width: '100%', aspectRatio: '16 / 9', maxHeight: '70vh', borderRadius: 8, background: '#000' }} />
        )}
      </Modal>

      {/* 上传弹窗 */}
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
