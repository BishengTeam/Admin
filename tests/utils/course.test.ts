import { describe, expect, it } from 'vitest'
import {
  canRevokeCourseEnrollment,
  courseBatchesToScheduleList,
  courseScheduleListToBatches,
  courseScheduleListToMutationBatches,
} from '@/utils/course'
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

describe('course schedule conversion', () => {
  const schedule = {
    class_date: '2026-09-01',
    start_time: '09:00',
    end_time: '12:00',
    location: '线上',
  }

  it('converts API batches into editable schedule rows', () => {
    expect(courseBatchesToScheduleList({ 'schedule-1': schedule })).toEqual([
      { id: 'schedule-1', ...schedule },
    ])
  })

  it('converts editable schedule rows into API batches', () => {
    expect(courseScheduleListToBatches([{ id: 'schedule-1', ...schedule }])).toEqual({
      'schedule-1': schedule,
    })
  })

  it('keeps an empty schedule collection as an empty object', () => {
    expect(courseBatchesToScheduleList(null)).toEqual([])
    expect(courseScheduleListToBatches([])).toEqual({})
  })

  it('omits empty schedules on create but clears them on edit', () => {
    expect(courseScheduleListToMutationBatches([], false)).toBeUndefined()
    expect(courseScheduleListToMutationBatches([], true)).toEqual({})
  })
})
