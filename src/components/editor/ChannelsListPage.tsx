import { ChevronDown } from "lucide-react"
import type { OpenclawConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange?: (config: Partial<OpenclawConfig>) => void
  onSelectChannel: (channel: string) => void
}

interface Channel {
  id: string
  name: string
}

const CHANNELS: Channel[] = [
  { id: "telegram", name: "Telegram" },
  { id: "discord", name: "Discord" },
  { id: "feishu", name: "飞书" },
  { id: "dingding", name: "钉钉" },
  { id: "wecom", name: "企业微信" },
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

      <div className="space-y-2">
        {CHANNELS.map((channel) => {
          const isEnabled = getChannelStatus(config, channel.id)
          const statusLabel = isEnabled ? "已启用" : "未启用"
          const statusColor = isEnabled
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"

          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
                    {channel.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{channel.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
                  >
                    {statusLabel}
                  </span>
                  <ChevronDown size={18} className="text-gray-400" />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
