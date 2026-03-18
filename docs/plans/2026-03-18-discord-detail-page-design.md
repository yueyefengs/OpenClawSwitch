# Discord DetailPage UI Design

**Date**: 2026-03-18
**Status**: Approved
**Priority**: High

---

## Overview

Implement a Discord channel detail page following the same two-column Tab design pattern as Telegram and Feishu DetailPages, supporting multiple bot accounts and global configuration settings.

---

## Key Design Decisions

1. **Layout Pattern**: Two-column Tab-based (consistent with Telegram/Feishu)
2. **Account Support**: Multiple bot accounts (each with unique Bot Token)
3. **Bot Naming**: Each bot can have a friendly name, displayed in left sidebar instead of account ID
4. **Configuration Scope**: Global settings only (no guild-level granular configuration)
5. **Action Gates**: Not exposed in UI (can be configured via JSON if needed)
6. **Advanced Features**: Not supported in initial version (Voice, Components, Slash Commands)
7. **UI Consistency**: Match Telegram/Feishu styling and interaction patterns

---

## Page Structure

### Header
```
┌─────────────────────────────────────────┐
│ ← Discord                  [+ 添加Bot]   │
└─────────────────────────────────────────┘
```
- Back button (ChevronLeft icon)
- Channel title ("Discord")
- Add bot button (Plus icon, clickable)

### Tabs
```
┌─────────────────────────────────────────┐
│  Accounts │ Settings                    │
└─────────────────────────────────────────┘
```

Two tabs: **Accounts** and **Settings**

---

## Tab 1: Accounts

### Layout
```
┌──────────────┬──────────────────────────┐
│              │                          │
│ Bot List     │  Bot Details             │
│ (1/3 width)  │  (2/3 width)             │
│              │                          │
└──────────────┴──────────────────────────┘
```

### Left Column: Bot List
- **Header**: "Discord Bots" label
- **List Items**: Each bot shows:
  - Avatar circle (first letter from Bot Name or account ID)
  - **Bot Name** (primary display) - user-friendly bot identification
  - Fallback to account ID if Bot Name is empty
- **Selection**: Click to select bot, highlight with blue background and blue border
- **Empty State**: "No bots yet" when list is empty
- **Scrollable**: If many bots

### Right Column: Bot Details
Shows configuration for selected bot:

**Fields**:
1. **Bot Name** - Text input, user-friendly name (e.g., "My Bot", "Test Bot")
2. **Bot Token** - Password input (hidden by default)
   - Toggle visibility with eye icon
   - Copy button for quick copying
3. **Enabled** - Toggle switch (grayed out if disabled)
4. **Delete Button** - Positioned next to title, deletes bot

**Interactions**:
- All fields support real-time editing
- Changes auto-save to config
- Delete removes bot from accounts list
- After delete: auto-select next bot in list, or show "Select a bot" if no bots left

**Empty State**:
When no bot selected, show: "Select a bot to view details"

---

## Tab 2: Settings

Global Discord channel configuration:

### Basic Settings
- **Enable Discord** - Toggle switch
- **DM Policy** - Dropdown:
  - `pairing` (default, requires approval)
  - `allowlist` (whitelist mode)
  - `open` (allow all)
  - `disabled` (disable DMs)

### DM Access Control
- **Allow From** (DM Whitelist) - Multi-tag input
  - Shows when dmPolicy is not `disabled`
  - Input field + Add button
  - Display as deletable tags (Discord user ID list)
  - Validation: If dmPolicy=`allowlist`, at least one user required

### Guild Policy
- **Guild Policy** - Dropdown:
  - `open` (allow all guilds, default)
  - `allowlist` (whitelist specific guilds)
  - `disabled` (disable guild messages)

### Guild Access Control
- **Allow From Guilds** (Guild Whitelist) - Multi-tag input
  - Shows when groupPolicy=`allowlist`
  - Input field + Add button
  - Display as deletable tags (Discord guild ID list)

---

## Data Structure

```typescript
discord: {
  enabled: boolean
  accounts: {
    [accountId: string]: {
      botName?: string
      botToken: string
      enabled?: boolean
    }
  }

  // Global settings
  dmPolicy: "pairing" | "allowlist" | "open" | "disabled"
  allowFrom?: string[] // Discord user ID list
  groupPolicy: "open" | "allowlist" | "disabled"
  allowFromGuilds?: string[] // Discord guild ID list
}
```

---

## React Component State

```typescript
const [selectedAccountId, setSelectedAccountId] = useState<string>("")
const [visibleTokens, setVisibleTokens] = useState<Record<string, boolean>>({})
const [allowFromInput, setAllowFromInput] = useState("")
const [guildAllowFromInput, setGuildAllowFromInput] = useState("")
```

---

## Key Functions

- **updateAccount(id, patch)** - Update account fields
- **removeAccount(id)** - Delete account, auto-select next
- **addAccount()** - Create new account (with empty botName/botToken)
- **patchDiscord(config, updates)** - Helper to update discord config
- **addAllowFrom() / removeAllowFrom()** - Manage DM user IDs
- **addGuildAllowFrom() / removeGuildAllowFrom()** - Manage guild IDs

---

## Styling & UX Patterns

**Match Telegram/Feishu DetailPage**:
- Two-column layout with 1:2 ratio
- Blue highlight for selected bot
- Hover effects on selectable items
- Eye/EyeOff icons for password toggle
- Copy buttons for sensitive fields
- Tag-based UI for multi-value fields
- Validation messages for required fields
- Bot name as primary identifier instead of account ID
- Avatar showing first letter of bot name

---

## Next Steps

1. Create `DiscordDetailPage.tsx` component
2. Implement Accounts tab with two-column layout
3. Implement Settings tab with all global options
4. Add to ChannelsTab navigation
5. Test account management and settings persistence
6. Ensure TypeScript compilation passes
7. Build and verify

---

## Acceptance Criteria

- ✅ Two-column layout on Accounts tab
- ✅ Bot list showing Bot Name (not account ID)
- ✅ Bot details form with all required fields
- ✅ Delete bot functionality with auto-selection
- ✅ Settings tab with all global configuration options
- ✅ Validation for dmPolicy=allowlist (requires at least one user ID)
- ✅ Validation for groupPolicy=allowlist (requires at least one guild ID)
- ✅ Real-time form field updates
- ✅ Type-safe React component
- ✅ UI consistent with Telegram/Feishu DetailPages
- ✅ TypeScript compilation without errors
- ✅ Production build successful
