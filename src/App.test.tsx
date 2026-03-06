import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { QueryClient } from "@tanstack/react-query"
import App from "./App"

describe("App", () => {
  it("renders", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>
    )
    expect(screen.getByText("OpenclawSwitch")).toBeInTheDocument()
  })
})
