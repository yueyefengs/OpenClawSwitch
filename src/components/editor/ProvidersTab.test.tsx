import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import ProvidersTab from "./ProvidersTab"

const mockConfig = {
  models: {
    providers: {
      anthropic: { apiKey: "sk-ant-test", baseUrl: "https://api.anthropic.com/v1" },
    },
  },
}

describe("ProvidersTab", () => {
  it("renders existing providers", () => {
    render(<ProvidersTab config={mockConfig} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue("anthropic")).toBeInTheDocument()
  })

  it("masks API key by default", () => {
    render(<ProvidersTab config={mockConfig} onChange={vi.fn()} />)
    const keyInput = screen.getByTestId("apikey-anthropic")
    expect(keyInput).toHaveAttribute("type", "password")
  })

  it("calls onChange when API key edited", () => {
    const onChange = vi.fn()
    render(<ProvidersTab config={mockConfig} onChange={onChange} />)
    const keyInput = screen.getByTestId("apikey-anthropic")
    fireEvent.change(keyInput, { target: { value: "new-key" } })
    expect(onChange).toHaveBeenCalled()
  })

  it("add provider button appears", () => {
    render(<ProvidersTab config={{}} onChange={vi.fn()} />)
    expect(screen.getByText("添加提供商")).toBeInTheDocument()
  })
})
