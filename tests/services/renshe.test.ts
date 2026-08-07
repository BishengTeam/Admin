import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/core/request', () => ({ http }))

describe('renshe admin services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    http.get.mockResolvedValue({})
    http.post.mockResolvedValue({})
    http.put.mockResolvedValue({})
  })

  it('uses dedicated application review and signed material endpoints', async () => {
    const { rensheService } = await import('@/services/renshe')

    await rensheService.listApplications({ plan_id: 12, status: 'pending_initial_review', page: 1, page_size: 20 })
    expect(http.get).toHaveBeenCalledWith('/admin/renshe/applications', {
      params: { plan_id: 12, status: 'pending_initial_review', page: 1, page_size: 20 },
    })

    await rensheService.reviewApplication(101, 'initial', {
      decision: 'rejected',
      reason: '学生证不清晰',
      required_changes: ['student_card'],
    })
    expect(http.post).toHaveBeenCalledWith('/admin/renshe/applications/101/initial-review', {
      decision: 'rejected',
      reason: '学生证不清晰',
      required_changes: ['student_card'],
    })

    await rensheService.getVerificationMaterialSignedUrl(8, 'id_card_front', false)
    expect(http.get).toHaveBeenCalledWith('/admin/renshe/users/8/verification-materials/id_card_front/signed-url', {
      params: { download: false },
    })

    await rensheService.getMaterialSignedUrl(33, true)
    expect(http.get).toHaveBeenCalledWith('/admin/renshe/materials/33/signed-url', {
      params: { download: true },
    })
  })

  it('uses batch export, refund, and cleanup endpoints', async () => {
    const { rensheService } = await import('@/services/renshe')

    await rensheService.createExportJob(12)
    expect(http.post).toHaveBeenCalledWith('/admin/renshe/plans/12/exports')

    await rensheService.retryExportJob(51)
    expect(http.post).toHaveBeenCalledWith('/admin/renshe/exports/51/retry')

    await rensheService.decideRefund(61, { decision: 'approved' })
    expect(http.post).toHaveBeenCalledWith('/admin/renshe/refunds/61/decision', { decision: 'approved' })

    await rensheService.retryCleanupRun(71)
    expect(http.post).toHaveBeenCalledWith('/admin/renshe/cleanup-runs/71/retry')
  })

  it('uses dedicated user verification review endpoints', async () => {
    const { userService } = await import('@/services/users')

    await userService.reviewRealname(8, { status: 'verified' })
    expect(http.put).toHaveBeenCalledWith('/admin/users/8/identity/review', { status: 'verified' })

    await userService.reviewStudent(8, { status: 'rejected', comment: '材料不清晰' })
    expect(http.put).toHaveBeenCalledWith('/admin/users/8/student/review', {
      status: 'rejected',
      comment: '材料不清晰',
    })
  })

  it('uses RS-ZY batch lifecycle endpoints', async () => {
    const { certificationService } = await import('@/services/certification')

    await certificationService.closeRegistration('RS-ZY', 12)
    expect(http.put).toHaveBeenCalledWith('/admin/certifications/RS-ZY/plans/12/close-registration')

    await certificationService.finalizePlan('RS-ZY', 12)
    expect(http.put).toHaveBeenCalledWith('/admin/certifications/RS-ZY/plans/12/finalize')
  })
})
