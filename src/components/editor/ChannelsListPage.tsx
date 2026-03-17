import { ChevronUp } from "lucide-react"
import type { OpenclawConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange?: (config: Partial<OpenclawConfig>) => void
  onSelectChannel: (channel: string) => void
}

interface Channel {
  id: string
  name: string
  icon: string
  bgColor: string
  textColor: string
}

const CHANNELS: Channel[] = [
  { id: "telegram", name: "Telegram", icon: "✈️", bgColor: "bg-blue-100", textColor: "text-blue-700" },
  { id: "discord", name: "Discord", icon: "💬", bgColor: "bg-indigo-100", textColor: "text-indigo-700" },
  { id: "feishu", name: "飞书", icon: "🚀", bgColor: "bg-purple-100", textColor: "text-purple-700" },
  { id: "dingding", name: "钉钉", icon: "🔔", bgColor: "bg-orange-100", textColor: "text-orange-700" },
  { id: "wecom", name: "企业微信", icon: "🌿", bgColor: "bg-green-100", textColor: "text-green-700" },
]

function getChannelStatus(config: Partial<OpenclawConfig>, channelId: string): boolean {
  if (channelId === "telegram") {
    return config.channels?.telegram?.enabled ?? false
  }
  // Other channels are not enabled yet
  return false
}

export default function ChannelsListPage({ config, onSelectChannel }: Props) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">选择接入渠道</h2>
        <p className="text-sm text-muted-foreground">
          支持 23 种官方可接入软件（来源：docs.openclaw.ai/channels）
        </p>
      </div>

      <div className="space-y-2 border rounded-lg overflow-hidden divide-y">
        {CHANNELS.map((channel) => {
          const isEnabled = getChannelStatus(config, channel.id)
          const statusLabel = isEnabled ? "已启用" : "未启用"
          const statusColor = isEnabled
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-600"

          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className="w-full bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${channel.bgColor} ${channel.textColor} text-sm font-semibold flex-shrink-0`}>
                  {channel.icon}
                </div>
                <p className="font-medium text-gray-900">{channel.name}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusColor}`}
                >
                  {statusLabel}
                </span>
                <ChevronUp size={16} className="text-gray-400" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
