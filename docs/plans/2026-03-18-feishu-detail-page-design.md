# Feishu DetailPage UI Design

**Date**: 2026-03-18
**Status**: Approved
**Priority**: High

---

## Overview

Implement a Feishu channel detail page following the same two-column Tab design pattern as Telegram DetailPage, supporting multiple accounts and global configuration settings.

---

## Key Design Decisions

1. **Layout Pattern**: Two-column Tab-based (consistent with Telegram DetailPage)
2. **Account Support**: Multiple accounts (AppId + AppSecret pairs)
3. **Configuration Scope**: Global settings only (no per-group granular configuration)
4. **UI Consistency**: Match Telegram DetailPage styling and interaction patterns

---

## Page Structure

### Header
```
┌─────────────────────────────────────────────┐
│ ← Feishu                      [+ 添加账户]  │
└─────────────────────────────────────────────┘
```
- Back button (ChevronLeft icon)
- Channel title ("Feishu")
- Add account button (Plus icon, clickable)

### Tabs
```
┌─────────────────────────────────────────────┐
│  Accounts │ Settings                        │
└─────────────────────────────────────────────┘
```

Two tabs: **Accounts** and **Settings**

---

## Tab 1: Accounts

### Layout
```
┌──────────────┬──────────────────────────────┐
│              │                              │
│ Account List │  Account Details             │
│ (1/3 width)  │  (2/3 width)                 │
│              │                              │
└──────────────┴──────────────────────────────┘
```

### Left Column: Account List
- **Header**: "Feishu Accounts" label
- **List Items**: Each account shows:
  - Avatar circle (first letter, e.g., "M" for "main")
  - Account ID (e.g., "main", "backup")
  - Truncated App ID preview (optional)
- **Selection**: Click to select account, highlight with blue background and blue border
- **Empty State**: "No accounts yet" when list is empty
- **Scrollable**: If many accounts

### Right Column: Account Details
Shows configuration for selected account:

**Fields**:
1. **Account Title** - Display as heading, e.g., "main"
2. **Delete Button** - Positioned next to title, deletes account
3. **App ID** - Text input, with copy button
4. **App Secret** - Password input (hidden by default), toggle visibility with eye icon, copy button
5. **Bot Name** (optional) - Text input for friendly name/description
6. **Enabled** - Toggle switch (grayed out if disabled)

**Interactions**:
- All fields support real-time editing
- Changes auto-save to config
- Delete removes account from accounts list
- After delete: auto-select next account in list, or show "Select an account" if no accounts left

**Empty State**:
When no account selected, show: "Select an account to view details"

---

## Tab 2: Settings

Global Feishu channel configuration:

**Field Groups**:

### Basic Settings
- **Enable Feishu** - Toggle switch
- **Domain** - Dropdown: `feishu` or `lark`
- **Default Account** - Dropdown (select from accounts list)

### DM (Direct Message) Policy
- **DM Policy** - Dropdown:
  - `pairing` (default, requires approval)
  - `allowlist` (whitelist mode)
  - `open` (allow all)
  - `disabled` (disable DMs)
- **Allow From** (DM Whitelist) - Multi-tag input
  - Shows when dmPolicy is not `disabled`
  - Input field + Add button
  - Display as deletable tags (open_id list)
  - Validation: If dmPolicy=`allowlist`, at least one open_id required

### Group Policy
- **Group Policy** - Dropdown:
  - `open` (allow all groups, default)
  - `allowlist` (whitelist specific groups)
  - `disabled` (disable group messages)
- **Group Allow From** (Group Whitelist) - Multi-tag input
  - Shows when groupPolicy=`allowlist`
  - Input field + Add button
  - Display as deletable tags (group_id list)

### Quota Optimization
- **Typing Indicator** - Toggle (default: true, controls typing reaction calls)
- **Resolve Sender Names** - Toggle (default: true, controls sender profile lookup)

### Streaming
- **Streaming** - Toggle (enable streaming card output, default: true)
- **Block Streaming** - Toggle (enable block-level streaming, default: true)

---

## Data Structure

```typescript
feishu: {
  enabled: boolean
  domain: "feishu" | "lark"
  defaultAccount: string

  accounts: {
    [accountId: string]: {
      appId: string
      appSecret: string
      botName?: string
      enabled?: boolean
    }
  }

  // Global settings
  dmPolicy: "pairing" | "allowlist" | "open" | "disabled"
  allowFrom?: string[] // open_id list
  groupPolicy: "open" | "allowlist" | "disabled"
  groupAllowFrom?: string[] // group_id list

  // Quota optimization
  typingIndicator?: boolean
  resolveSenderNames?: boolean

  // Streaming
  streaming?: boolean
  blockStreaming?: boolean
}
```

---

## React Component State

```typescript
const [selectedAccountId, setSelectedAccountId] = useState<string>("")
const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({})
const [allowFromInput, setAllowFromInput] = useState("")
const [groupAllowFromInput, setGroupAllowFromInput] = useState("")
```

---

## Key Functions

- **updateAccount(id, patch)** - Update account fields
- **removeAccount(id)** - Delete account, auto-select next
- **addAccount()** - Create new account (with empty appId/appSecret)
- **patchFeishu(config, updates)** - Helper to update feishu config

---

## Styling & UX Patterns

**Match Telegram DetailPage**:
- Two-column layout with 1:2 ratio
- Blue highlight for selected account
- Hover effects on selectable items
- Eye/EyeOff icons for password toggle
- Copy buttons for sensitive fields
- Tag-based UI for multi-value fields
- Validation messages for required fields

---

## Next Steps

1. Create `FeishuDetailPage.tsx` component
2. Implement Accounts tab with two-column layout
3. Implement Settings tab with all global options
4. Add to ChannelsTab navigation
5. Test account management and settings persistence
6. Ensure TypeScript compilation passes
7. Build and verify

---

## Acceptance Criteria

- ✅ Two-column layout on Accounts tab
- ✅ Account list with selection highlighting
- ✅ Account details form with all required fields
- ✅ Delete account functionality with auto-selection
- ✅ Settings tab with all global configuration options
- ✅ Validation for dmPolicy=allowlist (requires at least one open_id)
- ✅ Real-time form field updates
- ✅ Type-safe React component
- ✅ UI consistent with Telegram DetailPage
- ✅ TypeScript compilation without errors
- ✅ Production build successful
