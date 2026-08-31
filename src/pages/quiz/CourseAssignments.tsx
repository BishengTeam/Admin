import { useEffect, useState } from 'react'
import { Alert, Spin } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { quizService } from '@/services/quiz'
import CourseAssignmentPanel from '@/pages/courses/CourseAssignmentPanel'
import type { CourseQuizBinding } from '@/types/course'

function toCourseBinding(
  binding: Awaited<ReturnType<typeof quizService.listCourseBindings>>[number],
  libraryName: string | undefined,
  libraryCode: string | undefined,
): CourseQuizBinding {
  return {
    id: binding.id,
    course_id: binding.course_id,
    library_id: binding.library_id,
    library_name: libraryName ?? `题库 ${binding.library_id}`,
    library_code: libraryCode ?? '',
    status: binding.status,
    created_at: binding.created_at,
    updated_at: binding.updated_at,
  }
}

export default function QuizCourseAssignmentsPage() {
  const canBindCourse = usePermission('course_quiz_bind')
  const [bindings, setBindings] = useState<CourseQuizBinding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!canBindCourse) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    void (async () => {
      try {
        const libraries = (await quizService.listLibraries({
          access_mode: 'course_entitlement',
          include_deleted: false,
        })).filter(library => library.status === 'published' && library.v2_enabled)
        const libraryById = new Map(libraries.map(library => [library.id, library]))
        const groups = await Promise.all(libraries.map(async library => {
          try {
            return await quizService.listCourseBindings(library.id)
          } catch {
            return []
          }
        }))
        const active = groups.flat()
          .filter(binding => binding.status === 'active')
          .map(binding => toCourseBinding(
            binding,
            libraryById.get(binding.library_id)?.name,
            libraryById.get(binding.library_id)?.library_code,
          ))
        if (!cancelled) setBindings(active)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '课程作业候选项加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [canBindCourse])

  return (
    <PageContainer title="课程作业配置">
      {loading ? <Spin /> : error ? <Alert type="error" showIcon message={error} /> : (
        <CourseAssignmentPanel bindings={bindings} />
      )}
    </PageContainer>
  )
}
