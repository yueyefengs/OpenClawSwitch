import { describe, expect, it } from "vitest"
import { normalizeConfig } from "./config"

describe("normalizeConfig", () => {
  it("migrates legacy Discord account fields to the current schema", () => {
    const legacyConfig = {
      channels: {
        discord: {
          accounts: {
            main: {
              botName: "My Bot",
              botToken: "discord-token",
              enabled: true,
            },
          },
        },
      },
    } as const

    const normalized = normalizeConfig(legacyConfig as unknown as Parameters<typeof normalizeConfig>[0])

    expect(normalized.channels?.discord?.accounts?.main).toEqual({
      token: "discord-token",
      enabled: true,
    })
  })

  it("fills missing provider model names from ids", () => {
    const normalized = normalizeConfig({
      models: {
        providers: {
          openai: {
            models: [
              { id: "gpt-5" },
              { id: "gpt-5-mini", name: "GPT 5 Mini" },
            ],
          },
        },
      },
    })

    expect(normalized.models?.providers?.openai?.models).toEqual([
      { id: "gpt-5", name: "gpt-5" },
      { id: "gpt-5-mini", name: "GPT 5 Mini" },
    ])
  })
})
