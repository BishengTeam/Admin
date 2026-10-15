import { RefundWorkbench } from '@/components/RefundWorkbench'
import type { CertType } from '../type-registry'

export default function RefundTab(_props: { type: CertType }) {
  return <RefundWorkbench vendor='renshe' />
}
