# OpenClaw Install Manager Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a status icon in the top bar that shows whether openclaw is installed, with one-click install and uninstall (with confirm dialog) and live log streaming.

**Architecture:** Three new Tauri commands (`check_openclaw`, `install_openclaw`, `uninstall_openclaw`) in the existing `commands/profile.rs`. Install/uninstall spawn background threads and stream output line-by-line via `window.emit`. Frontend adds a `PackageCheck` icon to the top bar that opens a Dialog with status, install/uninstall, and a scrolling log pane.

**Tech Stack:** Rust (std::process, std::io::BufReader), Tauri v2 (window events), React, shadcn/ui Dialog, lucide-react, @tauri-apps/api/event

---

### Task 1: Rust — `check_openclaw` command

**Files:**
- Modify: `src-tauri/src/commands/profile.rs` (append after existing commands)
- Modify: `src-tauri/src/lib.rs` (register command)

**Step 1: Add the command**

Append to the bottom of `src-tauri/src/commands/profile.rs` (before the last `}`):

```rust
#[derive(serde::Serialize)]
pub struct OpenclawStatus {
    pub installed: bool,
    pub path: Option<String>,
}

#[tauri::command]
pub fn check_openclaw() -> OpenclawStatus {
    match find_openclaw() {
        Some(p) => OpenclawStatus {
            installed: true,
            path: Some(p.to_string_lossy().into_owned()),
        },
        None => OpenclawStatus {
            installed: false,
            path: None,
        },
    }
}
```

**Step 2: Register in `src-tauri/src/lib.rs`**

Add `commands::profile::check_openclaw,` to the `invoke_handler!` list.

**Step 3: Verify compilation**

```bash
cd src-tauri && cargo check
```
Expected: `Finished` with no errors.

**Step 4: Commit**

```bash
git add src-tauri/src/commands/profile.rs src-tauri/src/lib.rs
git commit -m "feat: add check_openclaw command"
```

---

### Task 2: Rust — `install_openclaw` command

**Files:**
- Modify: `src-tauri/src/commands/profile.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add the command**

Append to `src-tauri/src/commands/profile.rs`:

```rust
/// Stream a command's stdout+stderr line-by-line via window events.
/// Emits `event_name` with each line as payload, then `event_name`
/// with payload `\x00EXIT:0` or `\x00EXIT:1` when done.
fn stream_command(
    mut cmd: std::process::Command,
    window: tauri::WebviewWindow,
    event_name: &'static str,
) {
    use std::io::{BufRead, BufReader};

    cmd.stdout(std::process::Stdio::piped())
       .stderr(std::process::Stdio::piped());

    std::thread::spawn(move || {
        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = window.emit(event_name, format!("[错误] 启动失败: {}", e));
                let _ = window.emit(event_name, "\x00EXIT:1");
                return;
            }
        };

        // Merge stdout and stderr into one stream via threads
        let stdout = child.stdout.take().map(|s| BufReader::new(s));
        let stderr = child.stderr.take().map(|s| BufReader::new(s));

        let win2 = window.clone();
        let ev2 = event_name;

        // Read stderr in a separate thread
        let stderr_thread = stderr.map(|r| {
            let w = win2.clone();
            std::thread::spawn(move || {
                for line in r.lines().flatten() {
                    let _ = w.emit(ev2, line);
                }
            })
        });

        // Read stdout in this thread
        if let Some(r) = stdout {
            for line in r.lines().flatten() {
                let _ = window.emit(event_name, line);
            }
        }

        if let Some(t) = stderr_thread {
            let _ = t.join();
        }

        let code = child.wait().map(|s| s.success()).unwrap_or(false);
        let _ = window.emit(event_name, if code { "\x00EXIT:0" } else { "\x00EXIT:1" });
    });
}

#[tauri::command]
pub fn install_openclaw(window: tauri::WebviewWindow) -> Result<(), CommandError> {
    let path_env = augmented_path();

    #[cfg(target_os = "windows")]
    let cmd = {
        let mut c = std::process::Command::new("powershell");
        c.args([
            "-NoProfile", "-NonInteractive", "-Command",
            "& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard",
        ]);
        c.env("PATH", &path_env);
        c
    };

    #[cfg(not(target_os = "windows"))]
    let cmd = {
        let mut c = std::process::Command::new("bash");
        c.args(["-c", "curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard"]);
        c.env("PATH", &path_env);
        c
    };

    stream_command(cmd, window, "openclaw-output");
    Ok(())
}
```

**Step 2: Register in `lib.rs`**

Add `commands::profile::install_openclaw,` to the `invoke_handler!` list.

**Step 3: Verify compilation**

```bash
cd src-tauri && cargo check
```

**Step 4: Commit**

```bash
git add src-tauri/src/commands/profile.rs src-tauri/src/lib.rs
git commit -m "feat: add install_openclaw command with output streaming"
```

---

### Task 3: Rust — `uninstall_openclaw` command

**Files:**
- Modify: `src-tauri/src/commands/profile.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add the command**

Append to `src-tauri/src/commands/profile.rs`:

```rust
#[tauri::command]
pub fn uninstall_openclaw(window: tauri::WebviewWindow) -> Result<(), CommandError> {
    let path_env = augmented_path();

    let bin = match find_openclaw() {
        Some(p) => p,
        None => {
            return Err(CommandError("openclaw 未安装".into()));
        }
    };

    let mut cmd = std::process::Command::new(bin);
    cmd.args(["uninstall", "--all", "--yes"]);
    cmd.env("PATH", &path_env);

    stream_command(cmd, window, "openclaw-output");
    Ok(())
}
```

**Step 2: Register in `lib.rs`**

Add `commands::profile::uninstall_openclaw,` to the `invoke_handler!` list.

**Step 3: Verify compilation**

```bash
cd src-tauri && cargo check
```

**Step 4: Commit**

```bash
git add src-tauri/src/commands/profile.rs src-tauri/src/lib.rs
git commit -m "feat: add uninstall_openclaw command"
```

---

### Task 4: Frontend API wiring

**Files:**
- Modify: `src/lib/api/profile.ts`

**Step 1: Add API calls**

Add to `src/lib/api/profile.ts`:

```ts
import { listen } from "@tauri-apps/api/event"

export interface OpenclawStatus {
  installed: boolean
  path: string | null
}

export const openclawApi = {
  check: () => invoke<OpenclawStatus>("check_openclaw"),
  install: (window: any) => invoke<void>("install_openclaw"),
  uninstall: (window: any) => invoke<void>("uninstall_openclaw"),
  onOutput: (cb: (line: string) => void) =>
    listen<string>("openclaw-output", (e) => cb(e.payload)),
}
```

Note: `listen` returns an `UnlistenFn` — callers must call it to clean up.

**Step 2: Commit**

```bash
git add src/lib/api/profile.ts
git commit -m "feat: add openclawApi frontend bindings"
```

---

### Task 5: Frontend — `OpenclawStatusIcon` component

**Files:**
- Create: `src/components/openclaw/OpenclawManager.tsx`

**Step 1: Create the component**

```tsx
import { useState, useEffect, useRef } from "react"
import { PackageCheck, PackageX, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog"
import { Button } from "../ui/button"
import { openclawApi, type OpenclawStatus } from "../../lib/api/profile"
import { cn } from "../../lib/utils"

type Phase = "idle" | "running" | "done-ok" | "done-err"

export default function OpenclawManager() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<OpenclawStatus | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [logs, setLogs] = useState<string[]>([])
  const [confirmUninstall, setConfirmUninstall] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)
  const unlistenRef = useRef<(() => void) | null>(null)

  // Check status on mount and when dialog opens
  useEffect(() => {
    openclawApi.check().then(setStatus)
  }, [])

  useEffect(() => {
    if (open && phase === "idle") {
      openclawApi.check().then(setStatus)
    }
  }, [open])

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  // Clean up listener on unmount
  useEffect(() => {
    return () => { unlistenRef.current?.() }
  }, [])

  async function startOperation(op: "install" | "uninstall") {
    setLogs([])
    setPhase("running")

    // Subscribe to output stream
    unlistenRef.current?.()
    const unlisten = await openclawApi.onOutput((line) => {
      if (line.startsWith("\x00EXIT:")) {
        const ok = line === "\x00EXIT:0"
        setPhase(ok ? "done-ok" : "done-err")
        unlistenRef.current?.()
        unlistenRef.current = null
        // Refresh status
        openclawApi.check().then(setStatus)
      } else {
        setLogs((prev) => [...prev, line])
      }
    })
    unlistenRef.current = unlisten

    try {
      if (op === "install") await openclawApi.install()
      else await openclawApi.uninstall()
    } catch (e: any) {
      setLogs((prev) => [...prev, `[错误] ${e}`])
      setPhase("done-err")
      unlisten()
    }
  }

  const installed = status?.installed ?? false

  return (
    <>
      {/* Top-bar icon */}
      <button
        title={installed ? `openclaw 已安装: ${status?.path}` : "openclaw 未安装 — 点击管理"}
        onClick={() => { setOpen(true); setPhase("idle"); setConfirmUninstall(false) }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          installed
            ? "text-green-500 hover:text-green-600 hover:bg-green-50"
            : "text-red-400 hover:text-red-500 hover:bg-red-50"
        )}
      >
        {installed ? <PackageCheck size={15} /> : <PackageX size={15} />}
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (phase !== "running") setOpen(v) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>OpenClaw 管理</DialogTitle>
          </DialogHeader>

          {/* Status row */}
          <div className="flex items-center gap-2 text-sm">
            {installed
              ? <><PackageCheck size={14} className="text-green-500" /><span className="text-green-600">已安装</span><span className="text-gray-400 truncate ml-1 text-xs">{status?.path}</span></>
              : <><PackageX size={14} className="text-red-400" /><span className="text-red-500">未安装</span></>
            }
          </div>

          {/* Log pane — shown while running or after */}
          {(phase !== "idle" || logs.length > 0) && (
            <div className="bg-gray-950 text-gray-200 rounded-md p-3 h-52 overflow-y-auto font-mono text-xs leading-relaxed">
              {logs.map((l, i) => <div key={i}>{l}</div>)}
              {phase === "running" && (
                <div className="flex items-center gap-1 text-gray-400 mt-1">
                  <Loader2 size={10} className="animate-spin" />
                  <span>执行中...</span>
                </div>
              )}
              {phase === "done-ok" && <div className="text-green-400 mt-1">✓ 完成</div>}
              {phase === "done-err" && <div className="text-red-400 mt-1">✗ 失败</div>}
              <div ref={logEndRef} />
            </div>
          )}

          {/* Confirm uninstall prompt */}
          {confirmUninstall && phase === "idle" && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              确认卸载 openclaw？这将删除 gateway 服务和本地数据。
            </p>
          )}

          <DialogFooter className="gap-2">
            {phase === "idle" && !installed && (
              <Button onClick={() => startOperation("install")}>一键安装</Button>
            )}
            {phase === "idle" && installed && !confirmUninstall && (
              <Button variant="destructive" onClick={() => setConfirmUninstall(true)}>
                卸载
              </Button>
            )}
            {phase === "idle" && installed && confirmUninstall && (
              <>
                <Button variant="outline" onClick={() => setConfirmUninstall(false)}>取消</Button>
                <Button variant="destructive" onClick={() => startOperation("uninstall")}>
                  确认卸载
                </Button>
              </>
            )}
            {phase !== "idle" && phase !== "running" && (
              <Button variant="outline" onClick={() => { setOpen(false); setPhase("idle"); setLogs([]) }}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/openclaw/OpenclawManager.tsx
git commit -m "feat: add OpenclawManager component"
```

---

### Task 6: Wire into ProfileListPage top bar

**Files:**
- Modify: `src/components/profiles/ProfileListPage.tsx`

**Step 1: Import and place component**

In `ProfileListPage.tsx`, add the import at the top:
```ts
import OpenclawManager from "../openclaw/OpenclawManager"
```

In the top bar JSX, add `<OpenclawManager />` before the existing `<TopBtn>` buttons:
```tsx
<div className="flex items-center gap-1">
  <OpenclawManager />   {/* ← add this */}
  <TopBtn title="MCP Servers" onClick={onMcp}>
  ...
```

**Step 2: Verify the app builds**

```bash
pnpm build
```
Expected: build succeeds with no TypeScript errors.

**Step 3: Commit**

```bash
git add src/components/profiles/ProfileListPage.tsx
git commit -m "feat: add openclaw status icon to top bar"
```
