import { ConvictionListDetailPage } from './ConvictionListDetailContent'

export const dynamic = 'force-dynamic'

export default async function ConvictionListDetail(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return <ConvictionListDetailPage id={id} />
}
