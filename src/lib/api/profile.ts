import { invoke } from "@tauri-apps/api/core"
import type { Profile, OpenclawConfig } from "../../types"

export const profileApi = {
  list: () => invoke<Profile[]>("list_profiles"),
  create: (name: string, description: string | null, config: OpenclawConfig) =>
    invoke<Profile>("create_profile", { name, description, config }),
  updateConfig: (id: string, config: OpenclawConfig) =>
    invoke<void>("update_profile_config", { id, config }),
  rename: (id: string, name: string) =>
    invoke<void>("rename_profile", { id, name }),
  delete: (id: string) => invoke<void>("delete_profile", { id }),
  activate: (id: string) => invoke<void>("activate_profile", { id }),
  getConfig: (id: string) => invoke<OpenclawConfig>("get_profile_config", { id }),
}
