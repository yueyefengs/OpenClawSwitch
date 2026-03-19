import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import type { Profile, OpenclawConfig, McpServer, McpServerConfig, Skill, ClawhubSkill } from "../../types"

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

export const clawhubApi = {
  search: (q: string) => invoke<ClawhubSkill[]>("search_clawhub", { q }),
  install: (slug: string, displayName: string, version: string) =>
    invoke<Skill>("install_skill_from_clawhub", { slug, displayName, version }),
  uninstall: (id: string) => invoke<void>("uninstall_skill", { id }),
}

export const agentApi = {
  create: (agentId: string, workspace: string, agentDir: string) =>
    invoke<string>("create_agent_via_cli", { agentId, workspace, agentDir }),
  readLiveConfig: () =>
    invoke<OpenclawConfig>("read_live_config"),
}

export const fileApi = {
  write: (path: string, content: string) => invoke<void>("write_file", { path, content }),
  read: (path: string) => invoke<string>("read_file", { path }),
}

export interface OpenclawStatus {
  installed: boolean
  path: string | null
}

export const openclawApi = {
  check: () => invoke<OpenclawStatus>("check_openclaw"),
  install: () => invoke<void>("install_openclaw"),
  uninstall: () => invoke<void>("uninstall_openclaw"),
  onOutput: (cb: (line: string) => void) =>
    listen<string>("openclaw-output", (e) => cb(e.payload)),
}
