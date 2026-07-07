export default function StatBar({ data }: { data: { nhan: string; giaTri: number; hienThi?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.giaTri))
  return (
    <div className="space-y-1">
      {data.map((d) => (
        <div key={d.nhan} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 text-right text-[var(--color-xam)]">{d.nhan}</span>
          <div className="flex-1 bg-[var(--color-surface-2)] rounded h-6 relative">
            <div className="bg-[var(--color-caramel)] h-6 rounded" style={{ width: `${(d.giaTri / max) * 100}%` }} />
            <span className="absolute inset-y-0 left-2 flex items-center num text-[var(--color-caphe)]">{d.hienThi ?? d.giaTri}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
