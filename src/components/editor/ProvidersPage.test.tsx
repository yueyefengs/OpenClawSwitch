import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import ProvidersPage from "./ProvidersPage"
import type { OpenclawConfig } from "../../types"

describe("ProvidersPage", () => {
  const defaultConfig: Partial<OpenclawConfig> = {
    models: {
      providers: {
        openai: {
          api: "openai-responses",
          apiKey: "sk-test",
          models: [
            { id: "gpt-4", name: "GPT-4" },
            { id: "gpt-4o", name: "GPT-4o" },
          ],
        },
        anthropic: {
          api: "anthropic-messages",
          apiKey: "",
          models: [],
        },
        google: {
          api: "google-generative-ai",
          models: [{ id: "gemini-pro", name: "Gemini Pro" }],
        },
        provider_custom: {
          api: "openai-completions",
          baseUrl: "",
          models: [{ id: "custom-model", name: "Custom Model" }],
        },
      },
    },
  }

  it("renders configured providers list", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    expect(screen.getByText("已配置模型列表")).toBeInTheDocument()
    expect(screen.getByText("OpenAI (GPT)")).toBeInTheDocument()
    expect(screen.getByText("Anthropic (Claude)")).toBeInTheDocument()
    expect(screen.getByText("provider_custom")).toBeInTheDocument()
  })

  it("marks configured providers without api key as pending", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    expect(screen.getAllByText("待配置").length).toBeGreaterThan(0)
  })

  it("filters configured providers by search query", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    const searchInput = screen.getByPlaceholderText("搜索已配置的 Provider")
    fireEvent.change(searchInput, { target: { value: "open" } })

    expect(screen.getByText("OpenAI (GPT)")).toBeInTheDocument()
    expect(screen.queryByText("Anthropic (Claude)")).not.toBeInTheDocument()
  })

  it("calls onSelectProvider callback when a provider is clicked", () => {
    const handleSelectProvider = vi.fn()
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
        onSelectProvider={handleSelectProvider}
      />
    )

    const openaiButton = screen.getByText("OpenAI (GPT)")
    fireEvent.click(openaiButton)

    expect(handleSelectProvider).toHaveBeenCalledWith("openai")
  })

  it("shows available providers when add mode is enabled", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    fireEvent.click(screen.getByText("+ 添加模型"))

    expect(screen.getByText("添加模型提供商")).toBeInTheDocument()
    expect(screen.getByText("DeepSeek")).toBeInTheDocument()
    expect(screen.getByText("自定义 Provider")).toBeInTheDocument()
  })

  it("adds a preset provider and opens it", () => {
    const handleSelectProvider = vi.fn()
    const handleChange = vi.fn()
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={handleChange}
        onSelectProvider={handleSelectProvider}
      />
    )

    fireEvent.click(screen.getByText("+ 添加模型"))
    fireEvent.click(screen.getByText("DeepSeek"))

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      models: expect.objectContaining({
        providers: expect.objectContaining({
          deepseek: expect.objectContaining({
            api: "openai-completions",
            baseUrl: "https://api.deepseek.com/v1",
            models: [],
          }),
        }),
      }),
    }))
    expect(handleSelectProvider).toHaveBeenCalledWith("deepseek")
  })

  it("adds a custom provider and opens it", () => {
    vi.spyOn(Date, "now").mockReturnValue(123456)
    const handleSelectProvider = vi.fn()
    const handleChange = vi.fn()

    render(
      <ProvidersPage
        config={{}}
        onChange={handleChange}
        onSelectProvider={handleSelectProvider}
      />
    )

    fireEvent.click(screen.getByText("+ 添加模型"))
    fireEvent.click(screen.getByText("自定义 Provider"))

    expect(
      handleChange
    ).toHaveBeenCalledWith(expect.objectContaining({
      models: expect.objectContaining({
        providers: expect.objectContaining({
          provider_123456: expect.objectContaining({
            api: "openai-completions",
            baseUrl: "",
            models: [],
          }),
        }),
      }),
    }))
    expect(handleSelectProvider).toHaveBeenCalledWith("provider_123456")
    vi.restoreAllMocks()
  })

  it("handles empty configured list gracefully", () => {
    render(
      <ProvidersPage
        config={{}}
        onChange={() => {}}
      />
    )

    expect(screen.getByText("还没有配置任何 Provider，点击右上角“添加模型”开始")).toBeInTheDocument()
  })
})
