# Discord DetailPage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Create a two-column Tab-based Discord channel configuration UI supporting multiple bot accounts with global settings.

**Architecture:**
- DiscordDetailPage.tsx component with Accounts and Settings tabs
- Left sidebar for bot list (showing friendly Bot Name), right panel for bot details
- Global settings in Settings tab covering DM policy, guild policy, user/guild allowlists
- Type-safe React component with real-time form updates, consistent with Feishu/Telegram patterns

**Tech Stack:** React 18, TypeScript, shadcn/ui (Tabs, Input, Select, Switch), Tailwind CSS, Lucide icons

---

## Task 1: Add Discord Type Definitions

**Files:**
- Modify: `src/types.ts` (after FeishuChannelConfig)

**Step 1: Add Discord type interfaces to types.ts**

After the FeishuChannelConfig interface, add:

```typescript
export interface DiscordAccountConfig {
  botName?: string
  botToken: string
  enabled?: boolean
}

export interface DiscordChannelConfig {
  enabled?: boolean
  accounts?: Record<string, DiscordAccountConfig>
  // Global settings
  dmPolicy?: "pairing" | "allowlist" | "open" | "disabled"
  allowFrom?: string[] // Discord user ID list
  groupPolicy?: "open" | "allowlist" | "disabled"
  allowFromGuilds?: string[] // Discord guild ID list
}
```

**Step 2: Update OpenclawConfig interface**

In the OpenclawConfig interface's channels section, add:
```typescript
channels?: {
  telegram?: TelegramChannelConfig
  feishu?: FeishuChannelConfig
  discord?: DiscordChannelConfig
}
```

**Step 3: Verify types compile**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types.ts
git commit -m "types: add DiscordAccountConfig and DiscordChannelConfig interfaces"
```

---

## Task 2: Create DiscordDetailPage Component - Basic Structure

**Files:**
- Create: `src/components/editor/DiscordDetailPage.tsx`

**Step 1: Create base component with imports and Props interface**

```typescript
import { useState } from "react"
import { Eye, EyeOff, Plus, Trash2, ChevronLeft } from "lucide-react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import type { OpenclawConfig, DiscordChannelConfig, DiscordAccountConfig } from "../../types"

interface Props {
  config: Partial<OpenclawConfig>
  onChange: (config: Partial<OpenclawConfig>) => void
  onBack: () => void
}

const DM_POLICIES = ["pairing", "allowlist", "open", "disabled"] as const
const GROUP_POLICIES = ["open", "allowlist", "disabled"] as const

function patchDiscord(
  config: Partial<OpenclawConfig>,
  patch: Partial<DiscordChannelConfig>,
  onChange: (c: Partial<OpenclawConfig>) => void
) {
  onChange({
    ...config,
    channels: {
      ...config.channels,
      discord: { ...config.channels?.discord, ...patch },
    },
  })
}

export default function DiscordDetailPage({ config, onChange, onBack }: Props) {
  const dc = config.channels?.discord ?? {}
  const accounts = dc.accounts ?? {}
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [visibleTokens, setVisibleTokens] = useState<Record<string, boolean>>({})
  const [allowFromInput, setAllowFromInput] = useState("")
  const [guildAllowFromInput, setGuildAllowFromInput] = useState("")

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">Discord</h2>
          </div>
          <button
            onClick={() => { /* addAccount */ }}
            className="p-2 hover:bg-gray-100 rounded"
            title="Add new bot"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Placeholder for tabs */}
      <div className="flex-1 overflow-y-auto">
        <p className="p-4 text-gray-500">Tabs will be implemented in next task</p>
      </div>
    </div>
  )
}
```

**Step 2: Verify component can be imported (no TypeScript errors)**

Run: `pnpm tsc --noEmit src/components/editor/DiscordDetailPage.tsx`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/editor/DiscordDetailPage.tsx
git commit -m "feat: create DiscordDetailPage base component structure"
```

---

## Task 3: Implement Account Management Functions

**Files:**
- Modify: `src/components/editor/DiscordDetailPage.tsx` (add functions after state declarations)

**Step 1: Add account management functions**

Insert after state declarations (after `setGuildAllowFromInput` line):

```typescript
  function updateAccount(id: string, patch: Partial<DiscordAccountConfig>) {
    patchDiscord(config, {
      accounts: { ...accounts, [id]: { ...accounts[id], ...patch } },
    }, onChange)
  }

  function addAccount() {
    const id = `account_${Date.now()}`
    patchDiscord(config, {
      accounts: { ...accounts, [id]: { botToken: "" } },
    }, onChange)
    setSelectedAccountId(id)
  }

  function removeAccount(id: string) {
    const next = { ...accounts }
    delete next[id]
    patchDiscord(config, { accounts: next }, onChange)

    // Auto-select next account or clear selection
    const accountIds = Object.keys(next)
    if (accountIds.length > 0) {
      setSelectedAccountId(accountIds[0])
    } else {
      setSelectedAccountId("")
    }
  }

  function addAllowFrom() {
    const userId = allowFromInput.trim()
    if (!userId) return
    const current = dc.allowFrom ?? []
    if (current.includes(userId)) return
    patchDiscord(config, { allowFrom: [...current, userId] }, onChange)
    setAllowFromInput("")
  }

  function removeAllowFrom(userId: string) {
    const current = dc.allowFrom ?? []
    patchDiscord(config, { allowFrom: current.filter(u => u !== userId) }, onChange)
  }

  function addGuildAllowFrom() {
    const guildId = guildAllowFromInput.trim()
    if (!guildId) return
    const current = dc.allowFromGuilds ?? []
    if (current.includes(guildId)) return
    patchDiscord(config, { allowFromGuilds: [...current, guildId] }, onChange)
    setGuildAllowFromInput("")
  }

  function removeGuildAllowFrom(guildId: string) {
    const current = dc.allowFromGuilds ?? []
    patchDiscord(config, { allowFromGuilds: current.filter(g => g !== guildId) }, onChange)
  }

  const needsAllowFrom = dc.dmPolicy === "allowlist" && (dc.allowFrom ?? []).length === 0
  const needsGuildAllowFrom = dc.groupPolicy === "allowlist" && (dc.allowFromGuilds ?? []).length === 0
```

**Step 2: Verify component still compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/editor/DiscordDetailPage.tsx
git commit -m "feat: add account and allowlist management functions"
```

---

## Task 4: Implement Accounts Tab - Left Column (Bot List)

**Files:**
- Modify: `src/components/editor/DiscordDetailPage.tsx` (replace placeholder tabs section)

**Step 1: Add Tabs component and left column**

Replace the placeholder section (from `{/* Placeholder for tabs */}` onwards) with:

```typescript
      {/* Tabs for different sections */}
      <div className="bg-white border-b border-gray-200">
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="justify-start border-0 rounded-none bg-transparent px-6 gap-6 h-12">
            <TabsTrigger value="accounts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
              Accounts
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-3 gap-3 p-4 h-[calc(100%-56px)] overflow-hidden">
              {/* Left sidebar - Bot list */}
              <div className="border rounded-lg bg-white overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-3">
                  <p className="text-xs font-semibold text-gray-600">Discord Bots</p>
                </div>
                <div className="space-y-1 p-2">
                  {Object.entries(accounts).map(([id, acc]) => (
                    <button
                      key={id}
                      onClick={() => setSelectedAccountId(id)}
                      className={`w-full p-2 rounded text-left text-sm transition-colors ${
                        selectedAccountId === id
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 flex-shrink-0">
                          {(acc.botName || id).charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-mono">{acc.botName || id}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {Object.keys(accounts).length === 0 && (
                    <p className="text-xs text-gray-500 p-2">No bots yet</p>
                  )}
                </div>
              </div>

              {/* Right side - Bot details will be added in next task */}
              <div className="col-span-2 border rounded-lg bg-white">
                <p className="p-4 text-gray-500">Bot details will be shown here</p>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab - placeholder */}
          <TabsContent value="settings" className="p-4 overflow-y-auto">
            <p className="text-gray-500">Settings will be implemented in next task</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
```

**Step 2: Test component renders without errors**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/editor/DiscordDetailPage.tsx
git commit -m "feat: implement Accounts tab left column with bot list"
```

---

## Task 5: Implement Accounts Tab - Right Column (Bot Details)

**Files:**
- Modify: `src/components/editor/DiscordDetailPage.tsx` (replace "Bot details will be shown here")

**Step 1: Replace right column placeholder with bot details form**

In the right column section (col-span-2), replace the placeholder with:

```typescript
              {/* Right side - Selected bot details */}
              <div className="col-span-2 border rounded-lg bg-white overflow-y-auto">
                {selectedAccountId && accounts[selectedAccountId] ? (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b">
                      <h3 className="font-semibold">{accounts[selectedAccountId].botName || selectedAccountId}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAccount(selectedAccountId)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>

                    {/* Bot Name */}
                    <div className="space-y-2">
                      <Label className="text-xs">Bot Name (Friendly Name)</Label>
                      <Input
                        type="text"
                        value={accounts[selectedAccountId].botName ?? ""}
                        onChange={e => updateAccount(selectedAccountId, { botName: e.target.value })}
                        placeholder="My Bot, Test Bot, etc."
                        className="text-xs"
                      />
                    </div>

                    {/* Bot Token */}
                    <div className="space-y-2">
                      <Label className="text-xs">Bot Token</Label>
                      <div className="flex gap-2">
                        <Input
                          type={visibleTokens[selectedAccountId] ? "text" : "password"}
                          value={accounts[selectedAccountId].botToken ?? ""}
                          onChange={e => updateAccount(selectedAccountId, { botToken: e.target.value })}
                          placeholder="MTk4NjIyNDgzNDU4MTI4MzUy.Clwa7A..."
                          className="text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVisibleTokens(v => ({ ...v, [selectedAccountId]: !v[selectedAccountId] }))}
                        >
                          {visibleTokens[selectedAccountId] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const text = accounts[selectedAccountId].botToken ?? ""
                            navigator.clipboard.writeText(text)
                          }}
                          disabled={!accounts[selectedAccountId].botToken}
                        >
                          📋
                        </Button>
                      </div>
                    </div>

                    {/* Enabled toggle */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <Switch
                        checked={accounts[selectedAccountId].enabled ?? true}
                        onCheckedChange={v => updateAccount(selectedAccountId, { enabled: v })}
                      />
                      <Label className="text-xs">Enabled</Label>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p className="text-sm">Select a bot to view details</p>
                  </div>
                )}
              </div>
```

**Step 2: Verify TypeScript compilation**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/editor/DiscordDetailPage.tsx
git commit -m "feat: implement Accounts tab right column with bot details form"
```

---

## Task 6: Implement Settings Tab - Global Configuration

**Files:**
- Modify: `src/components/editor/DiscordDetailPage.tsx` (replace Settings tab placeholder)

**Step 1: Replace Settings tab placeholder**

Replace the Settings tab section with:

```typescript
          {/* Settings Tab */}
          <TabsContent value="settings" className="p-4 overflow-y-auto">
            <div className="max-w-2xl space-y-6">
              {/* Basic Settings */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">Basic Settings</h3>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={dc.enabled ?? false}
                    onCheckedChange={v => patchDiscord(config, { enabled: v }, onChange)}
                  />
                  <Label>Enable Discord</Label>
                </div>
              </div>

              {/* DM Policy */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">DM Policy</h3>
                <div className="space-y-2">
                  <Label>Policy</Label>
                  <Select
                    value={dc.dmPolicy ?? "pairing"}
                    onValueChange={v => patchDiscord(config, { dmPolicy: v as any }, onChange)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DM_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {dc.dmPolicy !== "disabled" && (
                  <div className="space-y-2">
                    <Label>Allow From (User IDs)</Label>
                    {needsAllowFrom && <p className="text-xs text-red-600">Allowlist policy requires at least one user</p>}
                    <div className="flex flex-wrap gap-1">
                      {(dc.allowFrom ?? []).map(uid => (
                        <span key={uid} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">
                          {uid}
                          <button type="button" className="text-gray-600 hover:text-red-600" onClick={() => removeAllowFrom(uid)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="h-8 text-xs"
                        value={allowFromInput}
                        onChange={e => setAllowFromInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addAllowFrom()}
                        onBlur={addAllowFrom}
                        placeholder="Discord user ID"
                      />
                      <Button variant="outline" size="sm" className="h-8 px-3 shrink-0" onClick={addAllowFrom} disabled={!allowFromInput.trim()}>
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Guild Policy */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-sm">Guild Policy</h3>
                <div className="space-y-2">
                  <Label>Policy</Label>
                  <Select
                    value={dc.groupPolicy ?? "open"}
                    onValueChange={v => patchDiscord(config, { groupPolicy: v as any }, onChange)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUP_POLICIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {dc.groupPolicy === "allowlist" && (
                  <div className="space-y-2">
                    <Label>Allow From (Guild IDs)</Label>
                    {needsGuildAllowFrom && <p className="text-xs text-red-600">Allowlist policy requires at least one guild</p>}
                    <div className="flex flex-wrap gap-1">
                      {(dc.allowFromGuilds ?? []).map(gid => (
                        <span key={gid} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">
                          {gid}
                          <button type="button" className="text-gray-600 hover:text-red-600" onClick={() => removeGuildAllowFrom(gid)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="h-8 text-xs"
                        value={guildAllowFromInput}
                        onChange={e => setGuildAllowFromInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addGuildAllowFrom()}
                        onBlur={addGuildAllowFrom}
                        placeholder="Discord guild ID"
                      />
                      <Button variant="outline" size="sm" className="h-8 px-3 shrink-0" onClick={addGuildAllowFrom} disabled={!guildAllowFromInput.trim()}>
                        <Plus size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
```

**Step 2: Verify compilation and update add button**

Update the add bot button onClick to call the `addAccount` function:

Replace `onClick={() => { /* addAccount */ }}` with `onClick={addAccount}`

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/editor/DiscordDetailPage.tsx
git commit -m "feat: implement Settings tab with global configuration options"
```

---

## Task 7: Integrate DiscordDetailPage into ChannelsTab

**Files:**
- Modify: `src/components/editor/ChannelsTab.tsx`

**Step 1: Add Discord import and navigation**

Add import at top:
```typescript
import DiscordDetailPage from "./DiscordDetailPage"
```

Find where FeishuDetailPage is conditionally rendered, and add a similar condition for Discord right after:

```typescript
{view === "detail" && selectedChannel === "discord" && (
  <DiscordDetailPage
    config={config}
    onChange={onChange}
    onBack={() => { setView("list"); setSelectedChannel(null) }}
  />
)}
```

**Step 2: Verify compilation**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/editor/ChannelsTab.tsx
git commit -m "feat: integrate DiscordDetailPage into ChannelsTab navigation"
```

---

## Task 8: Update ChannelsListPage to Enable Discord

**Files:**
- Modify: `src/components/editor/ChannelsListPage.tsx`

**Step 1: Update getChannelStatus function**

Find the `getChannelStatus` function and update it to handle Discord:

```typescript
function getChannelStatus(config: Partial<OpenclawConfig>, channelId: string): boolean {
  if (channelId === "telegram") {
    return config.channels?.telegram?.enabled ?? false
  }
  if (channelId === "feishu") {
    return config.channels?.feishu?.enabled ?? false
  }
  if (channelId === "discord") {
    return config.channels?.discord?.enabled ?? false
  }
  // Other channels are not enabled yet
  return false
}
```

**Step 2: Verify compilation**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/editor/ChannelsListPage.tsx
git commit -m "feat: enable Discord channel status in ChannelsListPage"
```

---

## Task 9: Full TypeScript Compilation Check

**Files:**
- Check: All modified and created files

**Step 1: Run full TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 2: Commit verification**

Run: `git status`
Expected: Clean working tree (all changes committed)

**Step 3: Summary**

All TypeScript compilation passes, ready for build verification.

---

## Task 10: Production Build Verification

**Files:**
- Check: Build output

**Step 1: Run production build**

Run: `pnpm build`
Expected: Build completes successfully with no errors

**Step 2: Verify output**

Look for:
- ✅ `vite v7.3.1 building...`
- ✅ `✓ built in X.XXs`
- ✅ No errors or warnings

**Step 3: Final verification**

Run: `git log --oneline -15`
Expected: Should see all commits from tasks above

---

## Acceptance Criteria Verification

After completing all tasks, verify:

- ✅ DiscordDetailPage.tsx created with full functionality
- ✅ Accounts tab with two-column layout (list + details)
- ✅ Bot list displaying friendly Bot Name (not account ID)
- ✅ Account add/remove/edit functionality working
- ✅ Settings tab with all global options
- ✅ DM policy with user ID allowlist validation
- ✅ Guild policy with guild ID allowlist
- ✅ DiscordDetailPage integrated into ChannelsTab
- ✅ Discord channel clickable from ChannelsListPage
- ✅ TypeScript compilation: ✅ PASS
- ✅ Production build: ✅ PASS
- ✅ All commits created successfully

---

## Testing Checklist (Manual)

After implementation:

1. Navigate to Channels tab
2. Click "Discord" in channel list
3. Should see Discord detail page with Accounts and Settings tabs
4. **Accounts tab:**
   - Click "+ 添加Bot" button → new bot appears in list showing "account_[timestamp]"
   - Edit Bot Name → list updates to show friendly name
   - Click bot in list → details show in right panel
   - Edit Bot Token, Bot Name → changes persist
   - Toggle Enabled → changes persist
   - Click trash icon → bot deleted, next bot auto-selected
5. **Settings tab:**
   - Toggle Enable Discord
   - Change DM Policy → allowlist shows when selected
   - Add user ID to allowlist → tag appears
   - Remove tag → tag disappears
   - Change Guild Policy → allowlist shows when selected
   - Toggle Enabled → changes persist
6. Click back button → returns to Channels list

---

## Success Criteria

✅ All tasks completed
✅ TypeScript: no errors
✅ Build: successful
✅ All commits created
✅ Manual testing: pass
