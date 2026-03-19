import { useId } from "react"
import { Switch } from "../ui/switch"
import { cn } from "../../lib/utils"

interface ToggleCardProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  title: string
  description?: string
  checkedLabel?: string
  uncheckedLabel?: string
  className?: string
}

export default function ToggleCard({
  checked,
  onCheckedChange,
  title,
  description,
  checkedLabel = "已启用",
  uncheckedLabel = "未启用",
  className,
}: ToggleCardProps) {
  const id = useId()

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition-colors",
        checked ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className={cn("text-sm font-semibold", checked ? "text-green-700" : "text-gray-700")}>
          {checked ? checkedLabel : uncheckedLabel}
        </span>
        <span className="text-sm text-gray-900">{title}</span>
        {description && <span className="text-[11px] text-gray-500">{description}</span>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}
