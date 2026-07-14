import type { CourseEnrollment } from '@/types/content'

export function canRevokeCourseEnrollment(enrollment: CourseEnrollment): boolean {
  return (
    (enrollment.status === 'enrolled' || enrollment.status === 'completed') &&
    enrollment.learning_access
  )
}
