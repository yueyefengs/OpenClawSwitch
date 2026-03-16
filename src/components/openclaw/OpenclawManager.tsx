import { useState, useEffect, useRef } from "react"
import { PackageCheck, PackageX, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog"
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

  // Check status on mount
  useEffect(() => {
    openclawApi.check().then(setStatus)
  }, [])

  // Re-check when dialog opens (while idle)
  useEffect(() => {
    if (open && phase === "idle") {
      openclawApi.check().then(setStatus)
    }
  }, [open])

  // Auto-scroll logs to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  // Clean up event listener on unmount
  useEffect(() => {
    return () => {
      unlistenRef.current?.()
    }
  }, [])

  async function startOperation(op: "install" | "uninstall") {
    setLogs([])
    setPhase("running")
    setConfirmUninstall(false)

    // Subscribe to output stream before invoking
    unlistenRef.current?.()
    const unlisten = await openclawApi.onOutput((line) => {
      if (line.startsWith("\x00EXIT:")) {
        const ok = line === "\x00EXIT:0"
        setPhase(ok ? "done-ok" : "done-err")
        unlistenRef.current?.()
        unlistenRef.current = null
        openclawApi.check().then(setStatus)
      } else {
        setLogs((prev) => [...prev, line])
      }
    })
    unlistenRef.current = unlisten

    try {
      if (op === "install") await openclawApi.install()
      else await openclawApi.uninstall()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setLogs((prev) => [...prev, `[错误] ${msg}`])
      setPhase("done-err")
      unlisten()
      unlistenRef.current = null
    }
  }

  const installed = status?.installed ?? false

  return (
    <>
      {/* Top-bar status icon */}
      <button
        title={
          installed
            ? `openclaw 已安装: ${status?.path}`
            : "openclaw 未安装 — 点击管理"
        }
        onClick={() => {
          setOpen(true)
          setPhase("idle")
          setConfirmUninstall(false)
        }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          installed
            ? "text-green-500 hover:text-green-600 hover:bg-green-50"
            : "text-red-400 hover:text-red-500 hover:bg-red-50"
        )}
      >
        {installed ? <PackageCheck size={15} /> : <PackageX size={15} />}
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (phase !== "running") setOpen(v)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>OpenClaw 管理</DialogTitle>
          </DialogHeader>

          {/* Status row */}
          <div className="flex items-center gap-2 text-sm">
            {installed ? (
              <>
                <PackageCheck size={14} className="text-green-500 shrink-0" />
                <span className="text-green-600 font-medium">已安装</span>
                <span className="text-gray-400 truncate text-xs ml-1">
                  {status?.path}
                </span>
              </>
            ) : (
              <>
                <PackageX size={14} className="text-red-400 shrink-0" />
                <span className="text-red-500">未安装</span>
              </>
            )}
          </div>

          {/* Log pane — visible while running or after operation */}
          {(phase !== "idle" || logs.length > 0) && (
            <div className="bg-gray-950 text-gray-200 rounded-md p-3 h-52 overflow-y-auto font-mono text-xs leading-relaxed">
              {logs.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
              {phase === "running" && (
                <div className="flex items-center gap-1 text-gray-400 mt-1">
                  <Loader2 size={10} className="animate-spin" />
                  <span>执行中...</span>
                </div>
              )}
              {phase === "done-ok" && (
                <div className="text-green-400 mt-1">✓ 完成</div>
              )}
              {phase === "done-err" && (
                <div className="text-red-400 mt-1">✗ 失败</div>
              )}
              <div ref={logEndRef} />
            </div>
          )}

          {/* Uninstall confirmation prompt */}
          {confirmUninstall && phase === "idle" && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              确认卸载 openclaw？这将删除 gateway 服务和本地数据。
            </p>
          )}

          <DialogFooter className="gap-2">
            {phase === "idle" && !installed && (
              <Button onClick={() => startOperation("install")}>
                一键安装
              </Button>
            )}
            {phase === "idle" && installed && !confirmUninstall && (
              <Button
                variant="destructive"
                onClick={() => setConfirmUninstall(true)}
              >
                卸载
              </Button>
            )}
            {phase === "idle" && installed && confirmUninstall && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setConfirmUninstall(false)}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => startOperation("uninstall")}
                >
                  确认卸载
                </Button>
              </>
            )}
            {(phase === "done-ok" || phase === "done-err") && (
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  setPhase("idle")
                  setLogs([])
                }}
              >
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
