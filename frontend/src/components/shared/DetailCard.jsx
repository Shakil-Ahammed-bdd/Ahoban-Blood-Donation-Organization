function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-800 p-4">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  )
}

export default DetailCard
