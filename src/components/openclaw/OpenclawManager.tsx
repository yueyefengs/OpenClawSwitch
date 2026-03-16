import { useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { openclawApi, type OpenclawStatus } from "../../lib/api/profile"
import { cn } from "../../lib/utils"

// ── Custom SVG icons ─────────────────────────────────────────────────────────

function InstallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M786.432 563.9168a180.3264 180.3264 0 0 1 180.0704 180.0704c0 38.2976-12.288 75.6224-35.1232 106.3936l84.6336 84.6336a27.2896 27.2896 0 0 1-38.6048 38.5024l-84.6336-84.5824c-29.8496 21.9648-66.56 35.1232-106.3936 35.1232a180.2752 180.2752 0 0 1-180.0704-180.0704 180.224 180.224 0 0 1 180.0704-180.0704zM701.44 0c47.872 0 92.0576 25.4464 115.712 66.6624l4.1984 7.936 61.44 126.1568a43.4688 43.4688 0 0 1 4.352 19.0976l0.4608 344.7296a207.36 207.36 0 0 0-82.944-25.3952V338.7904a51.2 51.2 0 0 0-51.2-51.2H131.1232a51.2 51.2 0 0 0-51.2 51.2v422.2464a51.2 51.2 0 0 0 51.2 51.2h456.7552c9.2672 28.2624 24.4224 53.8624 43.9808 75.4176l-543.0784-0.0512c-23.552 0-46.08-9.216-62.7712-25.7536A87.552 87.552 0 0 1 0 799.744V219.8528c0.3072-4.1984 0.9728-8.3968 2.2528-12.5952l2.4576-6.144 59.392-125.3376A133.12 133.12 0 0 1 175.616 0.3072L184.6272 0H701.44z m84.992 617.8304a130.6624 130.6624 0 0 0-130.56 130.56 130.6112 130.6112 0 0 0 130.56 130.56 130.6624 130.6624 0 0 0 130.5088-130.56 130.6624 130.6624 0 0 0-130.56-130.56zM445.1328 364.8512c22.4256 0 32.768 17.152 32.768 31.9488v241.152l61.7984-55.2448a30.208 30.208 0 0 1 40.6016 0c3.3792 3.328 5.4784 9.8816 6.2976 19.712-2.1504 8.7552-4.9664 14.848-8.3456 18.1248L471.04 720.384l-1.1776 1.2288c-10.752 10.4448-38.912 10.24-49.664-0.256l-111.7696-100.864a26.368 26.368 0 0 1 0-37.7856 27.648 27.648 0 0 1 38.5536 0l65.3312 55.296V396.4928c0-14.848 12.7488-31.744 32.768-31.744z m260.4032-299.1104H181.248c-14.6432 0-28.3648 9.0624-36.2496 24.1152l-2.6624 5.888-35.9936 84.5824a20.48 20.48 0 0 0 18.8416 28.5184h638.9248a20.48 20.48 0 0 0 18.6368-28.928l-38.5024-84.6848c-6.3488-15.872-18.8928-26.8288-33.28-29.0816l-5.4272-0.4096z" />
    </svg>
  )
}

function UninstallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M258.844444 161.28c-51.029333 0-92.387556 42.951111-92.387555 95.971556h739.555555c0-53.020444-41.415111-95.971556-92.444444-95.971556H258.844444z m406.812445 36.977778h-258.844445l13.539556-100.977778h231.708444l13.653334 100.977778zM413.013333 33.28c-25.429333 0-49.095111 16.042667-52.622222 35.726222l-18.033778 100.693334c-3.527111 19.626667 14.449778 35.669333 39.822223 35.669333h308.167111c25.429333 0 43.349333-16.042667 39.822222-35.726222l-18.033778-100.693334c-3.527111-19.626667-27.192889-35.669333-52.622222-35.669333H413.013333zM243.484444 296.391111c-33.848889 0-59.050667 28.672-56.035555 63.715556l50.517333 576.512c3.072 35.100444 33.336889 63.715556 67.185778 63.715555h462.222222c33.905778 0 64.170667-28.672 67.242667-63.715555l50.460444-576.512c3.072-35.043556-22.186667-63.715556-56.035555-63.715556H243.484444z m77.084445 630.044445L287.402667 376.035556h125.553777v550.343111H320.512z m277.333333 0H474.567111V377.400889h123.278222v548.977778z m61.610667 0V376.832h133.688889l-41.244445 549.546667h-92.444444z" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = "idle" | "running" | "done-ok" | "done-err"

export default function OpenclawManager() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<OpenclawStatus | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [logs, setLogs] = useState<string[]>([])
  const [confirmUninstall, setConfirmUninstall] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)
  const unlistenRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    openclawApi.check().then(setStatus)
  }, [])

  useEffect(() => {
    if (open && phase === "idle") {
      openclawApi.check().then(setStatus)
    }
  }, [open])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  useEffect(() => {
    return () => { unlistenRef.current?.() }
  }, [])

  async function startOperation(op: "install" | "uninstall") {
    setLogs([])
    setPhase("running")
    setConfirmUninstall(false)

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

  function closeDialog() {
    setOpen(false)
    setPhase("idle")
    setLogs([])
    setConfirmUninstall(false)
  }

  const installed = status?.installed ?? false

  return (
    <>
      {/* Top-bar icon */}
      <button
        title={installed ? `openclaw 已安装: ${status?.path}` : "openclaw 未安装 — 点击安装"}
        onClick={() => { setOpen(true); setPhase("idle"); setConfirmUninstall(false) }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          installed
            ? "text-green-500 hover:text-green-600 hover:bg-green-50"
            : "text-red-400 hover:text-red-500 hover:bg-red-50"
        )}
      >
        <InstallIcon className="w-[15px] h-[15px]" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (phase !== "running") setOpen(v) }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-xl border-0 shadow-2xl">

          {/* Header band */}
          <div className={cn(
            "px-5 pt-5 pb-4",
            installed ? "bg-green-50" : "bg-orange-50"
          )}>
            <DialogHeader className="space-y-0">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl",
                  installed ? "bg-green-100" : "bg-orange-100"
                )}>
                  <InstallIcon className={cn(
                    "w-5 h-5",
                    installed ? "text-green-600" : "text-orange-500"
                  )} />
                </div>
                <div>
                  <DialogTitle className="text-sm font-semibold text-gray-800 leading-tight">
                    OpenClaw
                  </DialogTitle>
                  <p className={cn(
                    "text-xs mt-0.5 font-medium",
                    installed ? "text-green-600" : "text-orange-500"
                  )}>
                    {installed ? "已安装" : "未安装"}
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Install path */}
            {installed && status?.path && phase === "idle" && (
              <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-xs mt-0.5 shrink-0">路径</span>
                <span className="text-gray-600 text-xs font-mono break-all leading-relaxed">
                  {status.path}
                </span>
              </div>
            )}

            {/* Not installed hint */}
            {!installed && phase === "idle" && (
              <p className="text-xs text-gray-500 leading-relaxed">
                OpenClaw 尚未安装。点击下方按钮自动下载并安装，安装过程需要网络连接。
              </p>
            )}

            {/* Log terminal */}
            {(phase !== "idle" || logs.length > 0) && (
              <div className="relative rounded-lg overflow-hidden border border-gray-800">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 border-b border-gray-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-1 text-gray-500 text-xs">
                    {phase === "running"
                      ? (logs.length === 0 ? "正在启动..." : "执行中...")
                      : phase === "done-ok" ? "完成"
                      : "失败"}
                  </span>
                  {phase === "running" && (
                    <Loader2 size={10} className="animate-spin text-gray-500 ml-auto" />
                  )}
                </div>
                <div className="bg-gray-950 text-gray-200 p-3 h-44 overflow-y-auto font-mono text-[11px] leading-relaxed">
                  {logs.map((l, i) => (
                    <div key={i} className="text-gray-300">{l}</div>
                  ))}
                  {phase === "done-ok" && (
                    <div className="text-green-400 mt-1 font-semibold">✓ 安装完成</div>
                  )}
                  {phase === "done-err" && (
                    <div className="text-red-400 mt-1 font-semibold">✗ 操作失败</div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            {/* Uninstall confirm warning */}
            {confirmUninstall && phase === "idle" && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <UninstallIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-relaxed">
                  确认卸载 OpenClaw？这将删除 gateway 服务和本地数据，操作不可恢复。
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {phase === "idle" && !installed && (
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 h-8"
                  onClick={() => startOperation("install")}
                >
                  <InstallIcon className="w-3.5 h-3.5" />
                  一键安装
                </Button>
              )}

              {phase === "idle" && installed && !confirmUninstall && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 gap-1.5 h-8"
                    onClick={() => setConfirmUninstall(true)}
                  >
                    <UninstallIcon className="w-3.5 h-3.5" />
                    卸载
                  </Button>
                </>
              )}

              {phase === "idle" && installed && confirmUninstall && (
                <>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setConfirmUninstall(false)}>
                    取消
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5 h-8"
                    onClick={() => startOperation("uninstall")}
                  >
                    <UninstallIcon className="w-3.5 h-3.5" />
                    确认卸载
                  </Button>
                </>
              )}

              {(phase === "done-ok" || phase === "done-err") && (
                <Button size="sm" variant="outline" className="h-8" onClick={closeDialog}>
                  关闭
                </Button>
              )}
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  )
}
