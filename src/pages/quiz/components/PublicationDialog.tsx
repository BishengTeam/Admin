import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Descriptions, Modal, Space, Table, message } from 'antd'
import { usePermission } from '@/hooks/usePermission'
import { quizPublication, type PublicationOperation, type PublicationPreflight } from '@/services/quizPublication'

export function PublicationDialog({ libraryId, selectedIds = [], onClose, onChanged }: { libraryId: number; selectedIds?: number[]; onClose: () => void; onChanged: () => void }) {
  const canPublish = usePermission('quiz_content_publish')
  const canManage = usePermission('quiz_library_manage')
  const [check, setCheck] = useState<PublicationPreflight>()
  const [resumeCheck, setResumeCheck] = useState<PublicationPreflight>()
  const [history, setHistory] = useState<PublicationOperation[]>([])
  const [job, setJob] = useState<PublicationOperation>()
  const [selected, setSelected] = useState<React.Key[]>(selectedIds)
  const [publishLibrary, setPublishLibrary] = useState(false)
  const [openEntry, setOpenEntry] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [requestKey] = useState(() => crypto.randomUUID())
  useEffect(() => {
    const controller = new AbortController()
    void quizPublication.list(libraryId, controller.signal).then(setHistory).catch(() => {})
    void quizPublication.check(libraryId, controller.signal).then((result) => { setCheck(result); setSelected((previous) => previous.filter((id) => result.candidates.some((i) => i.question_id === id))) }).catch((e: Error) => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [libraryId])
  useEffect(() => {
    if (!job || job.status !== 'queued') return
    const controller = new AbortController()
    const timer = window.setInterval(() => {
      void quizPublication.get(job.id, controller.signal).then((latest) => {
        setJob(latest)
        if (latest.status !== 'queued') onChanged()
      }).catch((e: Error) => { if (!controller.signal.aborted) setError(e.message) })
    }, 1800)
    return () => { window.clearInterval(timer); controller.abort() }
  }, [job?.id, job?.status, onChanged])
  const blocked = Boolean(check && (publishLibrary || openEntry) && check.blockers.some((reason) => !(selected.length && reason.startsWith('没有有效'))))
  const execute = async () => {
    if (!check || busy) return
    setBusy(true); setError('')
    try {
      setJob(await quizPublication.start(libraryId, { request_key: requestKey, lock_version: check.lock_version, preflight_version: check.preflight_version,
        items: check.candidates.filter((i) => selected.includes(i.question_id)), publish_library: publishLibrary, open_entry: openEntry }))
    } catch (e) { setError(e instanceof Error ? e.message : '创建发布任务失败，请重试') }
    finally { setBusy(false) }
  }
  return <Modal title="检查并发布" open width={820} onCancel={onClose} footer={job ? <Button onClick={onClose}>关闭</Button> : <Space><Button onClick={onClose}>返回检查题目</Button><Button type="primary" loading={busy} disabled={!check || blocked || (!selected.length && !publishLibrary && !openEntry)} onClick={() => void execute()}>确认执行</Button></Space>}>
    {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
    {!job && history.length > 0 && <Table size="small" rowKey="id" dataSource={history} pagination={{ pageSize: 5 }} columns={[{ title: '发布任务', dataIndex: 'id' }, { title: '状态', dataIndex: 'status', render: (value: string) => ({ queued: '处理中', failed: '待处理', succeeded: '已完成' })[value] }, { title: '已发布题目', render: (_, record) => record.progress.questions }, { title: '操作', render: (_, record) => <Button type="link" onClick={() => setJob(record)}>查看阶段结果</Button> }]} />}
    {check && !job && <Space direction="vertical" style={{ width: '100%' }}>
      <Descriptions bordered size="small" column={3}><Descriptions.Item label="已发布">{check.counts.published}</Descriptions.Item><Descriptions.Item label="待审核">{check.counts.draft}</Descriptions.Item><Descriptions.Item label="内容异常">{check.counts.abnormal}</Descriptions.Item><Descriptions.Item label="访问方式">{{ access_mode_pending: '待确认', free: '免费', paid: '积分兑换', activation_code: '激活码解锁', course_entitlement: '课程权益' }[check.access_mode] ?? check.access_mode}</Descriptions.Item><Descriptions.Item label="系统补齐归属">{check.counts.default_ownership}</Descriptions.Item><Descriptions.Item label="待确认导入">{check.waiting_import_count}</Descriptions.Item></Descriptions>
      {check.blockers.map((text) => <Alert key={text} type="warning" showIcon message={text} />)}
      {check.repairable.map((text) => <Alert key={text} type="warning" message={text} />)}
      {check.warnings.map((text) => <div key={text} style={{ color: '#666' }}>{text}</div>)}
      <div>仅勾选已人工审核的题目；未选择的草稿保留。题目通过检查不代表内容已审核。</div>
      <Table size="small" rowKey="question_id" dataSource={check.candidates} pagination={{ pageSize: 20 }} rowSelection={canPublish ? { selectedRowKeys: selected, onChange: setSelected } : undefined} columns={[{ title: '题目', dataIndex: 'question_id', width: 80 }, { title: '题干摘要', render: (_, row) => check.question_previews?.[String(row.question_id)] ?? '请在题目列表核对内容' }, { title: '待发布修订', dataIndex: 'revision_id' }, { title: '版本', dataIndex: 'lock_version' }]} />
      <Checkbox disabled={!canManage} checked={publishLibrary} onChange={(e) => setPublishLibrary(e.target.checked)}>发布题库</Checkbox>
      <Checkbox disabled={!canManage} checked={openEntry} onChange={(e) => setOpenEntry(e.target.checked)}>同时开放小程序入口（继续按现有访问权限解锁）</Checkbox>
    </Space>}
    {job && <Space direction="vertical" style={{ width: '100%' }}>
      <div>任务 #{job.id}：{job.status === 'queued' ? '处理中，可关闭后继续处理' : job.status === 'succeeded' ? '已完成全部选定操作' : '部分阶段未完成'}</div>
      <div>题目发布：已完成 {job.progress.questions} 题</div><div>题库发布：{job.progress.library ? '已完成' : '未执行或未选择'}</div><div>用户入口：{job.progress.entry ? '已开启' : '未执行或未选择'}</div>
      {job.error_message && <Alert type="error" message={job.error_message} />}
      {resumeCheck && <Space direction="vertical"><div>已重新检查当前题库：已发布 {resumeCheck.counts.published} 题、待审核 {resumeCheck.counts.draft} 题；访问方式 {resumeCheck.access_mode}。原选定修订保持不变。</div>{resumeCheck.blockers.map((reason) => <Alert key={reason} type="warning" message={reason} />)}</Space>}
      {job.status === 'failed' && <Button loading={busy} onClick={async () => { setBusy(true); try { if (!resumeCheck) { setResumeCheck(await quizPublication.check(libraryId)); return }; setJob(await quizPublication.resume(job.id, resumeCheck.preflight_version)); setResumeCheck(undefined); message.info('已重新排队，继续执行未完成阶段') } catch (e) { setError(e instanceof Error ? e.message : '继续失败') } finally { setBusy(false) } }}>{resumeCheck ? '确认继续未完成阶段' : '重新检查并继续'}</Button>}
    </Space>}
  </Modal>
}
