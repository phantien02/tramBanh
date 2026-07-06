export default function StatBar({ data }: { data: { nhan: string; giaTri: number; hienThi?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.giaTri))
  return (
    <div className="space-y-1">
      {data.map((d) => (
        <div key={d.nhan} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 text-right text-gray-600">{d.nhan}</span>
          <div className="flex-1 bg-gray-100 rounded h-6 relative">
            <div className="bg-pink-500 h-6 rounded" style={{ width: `${(d.giaTri / max) * 100}%` }} />
            <span className="absolute inset-y-0 left-2 flex items-center font-medium">{d.hienThi ?? d.giaTri}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
