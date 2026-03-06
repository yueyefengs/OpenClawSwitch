import { describe, it, expect, vi } from "vitest"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}))

import { invoke } from "@tauri-apps/api/core"
import { profileApi } from "../profile"

describe("profileApi", () => {
  it("list calls list_profiles command", async () => {
    await profileApi.list()
    expect(invoke).toHaveBeenCalledWith("list_profiles")
  })

  it("activate calls activate_profile with id", async () => {
    await profileApi.activate("test-id")
    expect(invoke).toHaveBeenCalledWith("activate_profile", { id: "test-id" })
  })
})
