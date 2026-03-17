import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import ChannelsListPage from "./ChannelsListPage"
import type { OpenclawConfig } from "../../types"

describe("ChannelsListPage", () => {
  it("renders page title and description", () => {
    const config: Partial<OpenclawConfig> = {}
    const mockSelectChannel = vi.fn()

    render(
      <ChannelsListPage
        config={config}
        onSelectChannel={mockSelectChannel}
      />
    )

    expect(screen.getByText("选择接入渠道")).toBeInTheDocument()
    expect(screen.getByText(/支持 23 种官方可接入软件/)).toBeInTheDocument()
  })

  it("renders all 5 channels", () => {
    const config: Partial<OpenclawConfig> = {}
    const mockSelectChannel = vi.fn()

    render(
      <ChannelsListPage
        config={config}
        onSelectChannel={mockSelectChannel}
      />
    )

    expect(screen.getByText("Telegram")).toBeInTheDocument()
    expect(screen.getByText("Discord")).toBeInTheDocument()
    expect(screen.getByText("飞书")).toBeInTheDocument()
    expect(screen.getByText("钉钉")).toBeInTheDocument()
    expect(screen.getByText("企业微信")).toBeInTheDocument()
  })

  it("shows enabled status for telegram when config.channels.telegram.enabled is true", () => {
    const config: Partial<OpenclawConfig> = {
      channels: {
        telegram: {
          enabled: true,
        },
      },
    }
    const mockSelectChannel = vi.fn()

    render(
      <ChannelsListPage
        config={config}
        onSelectChannel={mockSelectChannel}
      />
    )

    const enabledLabels = screen.getAllByText("已启用")
    expect(enabledLabels.length).toBeGreaterThan(0)
    expect(enabledLabels[0]).toHaveClass("bg-green-100")
  })

  it("shows disabled status for telegram when config.channels.telegram.enabled is false", () => {
    const config: Partial<OpenclawConfig> = {
      channels: {
        telegram: {
          enabled: false,
        },
      },
    }
    const mockSelectChannel = vi.fn()

    render(
      <ChannelsListPage
        config={config}
        onSelectChannel={mockSelectChannel}
      />
    )

    const disabledLabels = screen.getAllByText("未启用")
    expect(disabledLabels.length).toBeGreaterThan(0)
  })

  it("shows disabled status for all other channels", () => {
    const config: Partial<OpenclawConfig> = {}
    const mockSelectChannel = vi.fn()

    render(
      <ChannelsListPage
        config={config}
        onSelectChannel={mockSelectChannel}
      />
    )

    const disabledLabels = screen.getAllByText("未启用")
    // 5 channels, all showing disabled status
    expect(disabledLabels.length).toBe(5)
  })

  it("calls onSelectChannel when a channel is clicked", () => {
    const config: Partial<OpenclawConfig> = {}
    const mockSelectChannel = vi.fn()

    render(
      <ChannelsListPage
        config={config}
        onSelectChannel={mockSelectChannel}
      />
    )

    const telegramButton = screen.getByText("Telegram").closest("button")
    if (telegramButton) {
      fireEvent.click(telegramButton)
      expect(mockSelectChannel).toHaveBeenCalledWith("telegram")
    }
  })

  it("calls onSelectChannel with correct channel id for each channel", () => {
    const config: Partial<OpenclawConfig> = {}
    const mockSelectChannel = vi.fn()

    render(
      <ChannelsListPage
        config={config}
        onSelectChannel={mockSelectChannel}
      />
    )

    const discordButton = screen.getByText("Discord").closest("button")
    if (discordButton) {
      fireEvent.click(discordButton)
      expect(mockSelectChannel).toHaveBeenCalledWith("discord")
    }

    mockSelectChannel.mockClear()

    const feishuButton = screen.getByText("飞书").closest("button")
    if (feishuButton) {
      fireEvent.click(feishuButton)
      expect(mockSelectChannel).toHaveBeenCalledWith("feishu")
    }
  })
})
