import { useState } from "react"
import type { OpenclawConfig } from "../../types"
import ChannelsListPage from "./ChannelsListPage"
import TelegramDetailPage from "./TelegramDetailPage"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
}


export default function ChannelsTab(props: Props) {
  // Navigation state management
  const [view, setView] = useState<"list" | "detail">("list")
  const [selectedChannel, setSelectedChannel] = useState<string>("")

  const nav = {
    view,
    selectedChannel,
    setView,
    setSelectedChannel,
    back: () => {
      setView("list")
      setSelectedChannel("")
    },
  }

  // Show Telegram detail page
  if (nav.view === "detail" && nav.selectedChannel === "telegram") {
    return (
      <TelegramDetailPage
        config={props.config}
        onChange={props.onChange}
        onBack={nav.back}
      />
    )
  }

  // Show channels list by default
  return (
    <ChannelsListPage
      config={props.config}
      onChange={props.onChange}
      onSelectChannel={(channel) => {
        nav.setSelectedChannel(channel)
        nav.setView("detail")
      }}
    />
  )
}
