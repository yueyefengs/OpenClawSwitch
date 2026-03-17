import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import ProvidersPage from "./ProvidersPage"
import type { OpenclawConfig } from "../../types"

describe("ProvidersPage", () => {
  const defaultConfig: Partial<OpenclawConfig> = {
    models: {
      providers: {
        openai: {
          apiKey: "sk-test",
          models: [
            { id: "gpt-4", name: "GPT-4" },
            { id: "gpt-4o", name: "GPT-4o" },
          ],
        },
        anthropic: {
          apiKey: "",
          models: [],
        },
        google: {
          models: [{ id: "gemini-pro", name: "Gemini Pro" }],
        },
      },
    },
  }

  it("renders provider list with header and tabs", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    expect(screen.getByText("AI 模型提供商")).toBeInTheDocument()
    expect(screen.getByText(/Connected \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Available \(9\)/)).toBeInTheDocument()
  })

  it("shows only connected providers when Connected tab is active", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    // Connected tab is active by default
    expect(screen.getByText("OpenAI")).toBeInTheDocument()
    // Anthropic has no apiKey, so it shouldn't be visible
    expect(screen.queryByText("Anthropic")).not.toBeInTheDocument()
  })

  it("switches to Available tab and shows unconnected providers", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    // Click on Available tab
    const availableTab = screen.getByText(/Available \(9\)/)
    fireEvent.click(availableTab)

    // Should show unconnected providers
    expect(screen.getByText("Anthropic")).toBeInTheDocument()
    expect(screen.getByText("DeepSeek")).toBeInTheDocument()
    // Connected providers should not be visible
    expect(screen.queryByText("OpenAI")).not.toBeInTheDocument()
  })

  it("filters providers by search query", () => {
    render(
      <ProvidersPage
        config={{
          models: {
            providers: {
              openai: { apiKey: "sk-test", models: [] },
              google: { apiKey: "key", models: [] },
              anthropic: { apiKey: "", models: [] },
            },
          },
        }}
        onChange={() => {}}
      />
    )

    const searchInput = screen.getByPlaceholderText("Search providers...")
    fireEvent.change(searchInput, { target: { value: "open" } })

    expect(screen.getByText("OpenAI")).toBeInTheDocument()
    expect(screen.queryByText("Anthropic")).not.toBeInTheDocument()
  })

  it("displays model count correctly", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    // OpenAI has 2 models
    expect(screen.getByText("2 models configured")).toBeInTheDocument()
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

    const openaiButton = screen.getByText("OpenAI")
    fireEvent.click(openaiButton)

    expect(handleSelectProvider).toHaveBeenCalledWith("openai")
  })

  it("shows Connected/Not Connected status correctly", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    expect(screen.getByText("Connected")).toBeInTheDocument()
  })

  it("shows message when no providers match search", () => {
    render(
      <ProvidersPage
        config={defaultConfig}
        onChange={() => {}}
      />
    )

    const searchInput = screen.getByPlaceholderText("Search providers...")
    fireEvent.change(searchInput, { target: { value: "nonexistent" } })

    expect(
      screen.getByText("No providers found matching your search")
    ).toBeInTheDocument()
  })

  it("handles empty config gracefully", () => {
    render(
      <ProvidersPage
        config={{}}
        onChange={() => {}}
      />
    )

    expect(screen.getByText("AI 模型提供商")).toBeInTheDocument()
    // All providers should be in Available tab
    expect(screen.getByText(/Available \(10\)/)).toBeInTheDocument()
  })
})
