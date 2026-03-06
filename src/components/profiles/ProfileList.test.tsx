import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { QueryClientProvider, QueryClient } from "@tanstack/react-query"
import ProfileList from "./ProfileList"

vi.mock("../../hooks/useProfiles", () => ({
  useProfiles: () => ({
    data: [
      { id: "1", name: "工作", is_active: true, created_at: "", updated_at: "" },
      { id: "2", name: "测试", is_active: false, created_at: "", updated_at: "" },
    ],
    isLoading: false,
  }),
  useActivateProfile: () => ({ mutate: vi.fn() }),
  useDeleteProfile: () => ({ mutate: vi.fn() }),
  useCreateProfile: () => ({ mutate: vi.fn() }),
  useRenameProfile: () => ({ mutate: vi.fn() }),
}))

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe("ProfileList", () => {
  it("renders profile names", () => {
    renderWithQuery(<ProfileList selectedId={null} onSelect={() => {}} />)
    expect(screen.getByText("工作")).toBeInTheDocument()
    expect(screen.getByText("测试")).toBeInTheDocument()
  })

  it("shows active indicator on active profile", () => {
    renderWithQuery(<ProfileList selectedId={null} onSelect={() => {}} />)
    expect(screen.getByTestId("active-dot-1")).toBeInTheDocument()
    expect(screen.queryByTestId("active-dot-2")).not.toBeInTheDocument()
  })

  it("calls onSelect when profile clicked", () => {
    const onSelect = vi.fn()
    renderWithQuery(<ProfileList selectedId={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText("测试"))
    expect(onSelect).toHaveBeenCalledWith("2")
  })
})
