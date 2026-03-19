import { useState } from "react"
import type { OpenclawConfig } from "../../types"
import ChannelsListPage from "./ChannelsListPage"
import TelegramDetailPage from "./TelegramDetailPage"
import FeishuDetailPage from "./FeishuDetailPage"
import DiscordDetailPage from "./DiscordDetailPage"
import DingdingDetailPage from "./DingdingDetailPage"
import WecomDetailPage from "./WecomDetailPage"

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

  // Show Feishu detail page
  if (nav.view === "detail" && nav.selectedChannel === "feishu") {
    return (
      <FeishuDetailPage
        config={props.config}
        onChange={props.onChange}
        onBack={nav.back}
      />
    )
  }

  if (nav.view === "detail" && nav.selectedChannel === "discord") {
    return (
      <DiscordDetailPage
        config={props.config}
        onChange={props.onChange}
        onBack={nav.back}
      />
    )
  }

  if (nav.view === "detail" && nav.selectedChannel === "dingding") {
    return (
      <DingdingDetailPage
        config={props.config}
        onChange={props.onChange}
        onBack={nav.back}
      />
    )
  }

  if (nav.view === "detail" && nav.selectedChannel === "wecom") {
    return (
      <WecomDetailPage
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
