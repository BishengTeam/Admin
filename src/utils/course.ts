import type { CourseEnrollment, CourseSchedule, CourseSchedules } from '@/types/content'

export interface IdentifiedCourseSchedule extends CourseSchedule {
  id: string
}

export function courseBatchesToScheduleList(
  batches: CourseSchedules | null | undefined,
): IdentifiedCourseSchedule[] {
  return Object.entries(batches ?? {}).map(([id, schedule]) => ({
    ...schedule,
    id,
  }))
}

export function courseScheduleListToBatches(
  schedules: IdentifiedCourseSchedule[],
): CourseSchedules {
  return Object.fromEntries(
    schedules.map(({ id, ...schedule }) => [id, schedule]),
  )
}

export function courseScheduleListToMutationBatches(
  schedules: IdentifiedCourseSchedule[],
  isEdit: boolean,
): CourseSchedules | undefined {
  const batches = courseScheduleListToBatches(schedules)
  return Object.keys(batches).length > 0 || isEdit ? batches : undefined
}

export function canRevokeCourseEnrollment(enrollment: CourseEnrollment): boolean {
  return (
    (enrollment.status === 'enrolled' || enrollment.status === 'completed') &&
    enrollment.learning_access
  )
}
