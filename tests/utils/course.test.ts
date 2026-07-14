import { describe, expect, it } from 'vitest'
import { canRevokeCourseEnrollment } from '@/utils/course'
import type { CourseEnrollment, CourseEnrollmentStatus } from '@/types/content'

function enrollment(status: CourseEnrollmentStatus, learningAccess: boolean): CourseEnrollment {
  return {
    id: 1,
    user_id: 2,
    course_id: 3,
    course_title: '测试课程',
    order_id: 4,
    order_status: 'completed',
    order_price: 100,
    batch_selected: null,
    status,
    learning_access: learningAccess,
    access_granted_at: null,
    access_revoked_at: null,
    created_at: '2026-07-14T00:00:00+08:00',
  }
}

describe('canRevokeCourseEnrollment', () => {
  it.each(['enrolled', 'completed'] as CourseEnrollmentStatus[])('%s 且有权限时允许撤权', (status) => {
    expect(canRevokeCourseEnrollment(enrollment(status, true))).toBe(true)
  })

  it.each(['pending_payment', 'refunded', 'cancelled', 'expired'] as CourseEnrollmentStatus[])(
    '%s 不允许撤权',
    (status) => {
      expect(canRevokeCourseEnrollment(enrollment(status, true))).toBe(false)
    },
  )

  it('已经无学习权限时不允许撤权', () => {
    expect(canRevokeCourseEnrollment(enrollment('enrolled', false))).toBe(false)
  })
})
