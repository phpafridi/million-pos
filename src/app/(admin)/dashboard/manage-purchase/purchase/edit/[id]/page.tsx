import EditPurchase from '@/components/ManagePurchase/EditPurchase';

export default async function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <EditPurchase id={id} />
    </div>
  )
}
