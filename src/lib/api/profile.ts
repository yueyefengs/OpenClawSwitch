import { invoke } from "@tauri-apps/api/core"
import type { Profile, OpenclawConfig, McpServer, McpServerConfig, Skill } from "../../types"

export const profileApi = {
  list: () => invoke<Profile[]>("list_profiles"),
  create: (name: string, description: string | null, config: OpenclawConfig) =>
    invoke<Profile>("create_profile", { name, description, config }),
  updateConfig: (id: string, config: OpenclawConfig) =>
    invoke<void>("update_profile_config", { id, config }),
  saveAndRestart: (id: string, config: OpenclawConfig) =>
    invoke<string>("save_and_restart", { id, config }),
  rename: (id: string, name: string) =>
    invoke<void>("rename_profile", { id, name }),
  delete: (id: string) => invoke<void>("delete_profile", { id }),
  activate: (id: string) => invoke<void>("activate_profile", { id }),
  getConfig: (id: string) => invoke<OpenclawConfig>("get_profile_config", { id }),
  clone: (id: string) => invoke<Profile>("clone_profile", { id }),
}

export const mcpApi = {
  list: () => invoke<McpServer[]>("list_mcp_servers"),
  upsert: (id: string, name: string, config: McpServerConfig) =>
    invoke<McpServer>("upsert_mcp_server", { id, name, config }),
  delete: (id: string) => invoke<void>("delete_mcp_server", { id }),
}

export const skillsApi = {
  list: () => invoke<Skill[]>("list_skills"),
  upsert: (id: string, name: string, sourceUrl: string | null, installPath: string | null) =>
    invoke<Skill>("upsert_skill", { id, name, sourceUrl, installPath }),
  delete: (id: string) => invoke<void>("delete_skill", { id }),
}

export const fileApi = {
  write: (path: string, content: string) => invoke<void>("write_file", { path, content }),
  read: (path: string) => invoke<string>("read_file", { path }),
}
