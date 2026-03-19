import type { DiscordAccountConfig, OpenclawConfig } from "../types"

type LegacyDiscordAccountConfig = DiscordAccountConfig & {
  botName?: string
  botToken?: string
} & Record<string, unknown>

function normalizeDiscordAccounts(config: Partial<OpenclawConfig>): Partial<OpenclawConfig> {
  const discord = config.channels?.discord
  if (!discord?.accounts) return config

  const accounts = Object.fromEntries(
    Object.entries(discord.accounts).map(([id, account]) => {
      const legacyAccount = account as LegacyDiscordAccountConfig
      const { botName: _botName, botToken, ...rest } = legacyAccount

      return [
        id,
        {
          ...rest,
          token: legacyAccount.token ?? botToken ?? "",
        },
      ]
    })
  )

  return {
    ...config,
    channels: {
      ...config.channels,
      discord: {
        ...discord,
        accounts,
      },
    },
  }
}

function normalizeProviders(config: Partial<OpenclawConfig>): Partial<OpenclawConfig> {
  const providers = config.models?.providers
  if (!providers) return config

  const normalizedProviders = Object.fromEntries(
    Object.entries(providers).map(([name, prov]) => {
      const models = (prov.models ?? []).map(m => ({
        ...m,
        name: m.name ?? m.id,
      }))
      return [name, { ...prov, models }]
    })
  )

  return {
    ...config,
    models: { ...config.models, providers: normalizedProviders },
  }
}

export function normalizeConfig(config: Partial<OpenclawConfig>): Partial<OpenclawConfig> {
  return normalizeDiscordAccounts(normalizeProviders(config))
}
