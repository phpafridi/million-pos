import EditSupplier from '@/components/ManagePurchase/EditSupplier';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ✅ Await params before destructuring

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <EditSupplier id={id} />
    </div>
  )
}
