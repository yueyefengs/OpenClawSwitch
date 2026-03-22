import { useState, useEffect, useRef } from "react"
import { Loader2, X, Folder, PackageCheck, PackageX, Trash2, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "../ui/dialog"
import { openclawApi, profileApi, type OpenclawStatus } from "../../lib/api/profile"
import { cn } from "../../lib/utils"

// ── Custom SVG icons ─────────────────────────────────────────────────────────

function InstallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M786.432 563.9168a180.3264 180.3264 0 0 1 180.0704 180.0704c0 38.2976-12.288 75.6224-35.1232 106.3936l84.6336 84.6336a27.2896 27.2896 0 0 1-38.6048 38.5024l-84.6336-84.5824c-29.8496 21.9648-66.56 35.1232-106.3936 35.1232a180.2752 180.2752 0 0 1-180.0704-180.0704 180.224 180.224 0 0 1 180.0704-180.0704zM701.44 0c47.872 0 92.0576 25.4464 115.712 66.6624l4.1984 7.936 61.44 126.1568a43.4688 43.4688 0 0 1 4.352 19.0976l0.4608 344.7296a207.36 207.36 0 0 0-82.944-25.3952V338.7904a51.2 51.2 0 0 0-51.2-51.2H131.1232a51.2 51.2 0 0 0-51.2 51.2v422.2464a51.2 51.2 0 0 0 51.2 51.2h456.7552c9.2672 28.2624 24.4224 53.8624 43.9808 75.4176l-543.0784-0.0512c-23.552 0-46.08-9.216-62.7712-25.7536A87.552 87.552 0 0 1 0 799.744V219.8528c0.3072-4.1984 0.9728-8.3968 2.2528-12.5952l2.4576-6.144 59.392-125.3376A133.12 133.12 0 0 1 175.616 0.3072L184.6272 0H701.44z m84.992 617.8304a130.6624 130.6624 0 0 0-130.56 130.56 130.6112 130.6112 0 0 0 130.56 130.56 130.6624 130.6624 0 0 0 130.5088-130.56 130.6624 130.6624 0 0 0-130.56-130.56zM445.1328 364.8512c22.4256 0 32.768 17.152 32.768 31.9488v241.152l61.7984-55.2448a30.208 30.208 0 0 1 40.6016 0c3.3792 3.328 5.4784 9.8816 6.2976 19.712-2.1504 8.7552-4.9664 14.848-8.3456 18.1248L471.04 720.384l-1.1776 1.2288c-10.752 10.4448-38.912 10.24-49.664-0.256l-111.7696-100.864a26.368 26.368 0 0 1 0-37.7856 27.648 27.648 0 0 1 38.5536 0l65.3312 55.296V396.4928c0-14.848 12.7488-31.744 32.768-31.744z m260.4032-299.1104H181.248c-14.6432 0-28.3648 9.0624-36.2496 24.1152l-2.6624 5.888-35.9936 84.5824a20.48 20.48 0 0 0 18.8416 28.5184h638.9248a20.48 20.48 0 0 0 18.6368-28.928l-38.5024-84.6848c-6.3488-15.872-18.8928-26.8288-33.28-29.0816l-5.4272-0.4096z" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = "idle" | "running" | "finalizing" | "done-ok" | "done-err"

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

  function appendLogs(message: string) {
    const lines = message
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter(Boolean)

    if (lines.length === 0) return
    setLogs((prev) => [...prev, ...lines])
  }

  async function refreshStatus(expectedInstalled?: boolean) {
    const attempts = expectedInstalled === undefined ? 1 : 8

    for (let index = 0; index < attempts; index += 1) {
      const nextStatus = await openclawApi.check()
      setStatus(nextStatus)

      if (expectedInstalled === undefined || nextStatus.installed === expectedInstalled) {
        return nextStatus
      }

      await new Promise(resolve => window.setTimeout(resolve, 400))
    }

    const finalStatus = await openclawApi.check()
    setStatus(finalStatus)
    return finalStatus
  }

  async function initializeDefaultGatewayConfig() {
    try {
      const profiles = await profileApi.list()
      const activeProfile = profiles.find(profile => profile.is_active) ?? profiles[0]
      if (!activeProfile) {
        setLogs((prev) => [...prev, "[初始化] 未找到可激活的配置，跳过默认 gateway 生成"])
        return
      }

      const config = await profileApi.getConfig(activeProfile.id)
      setLogs((prev) => [...prev, "[初始化] 正在写入默认配置到 ~/.openclaw/openclaw.json"])
      await profileApi.activate(activeProfile.id)

      setLogs((prev) => [...prev, "[初始化] 正在安装并启动 gateway service"])
      appendLogs(await openclawApi.installGatewayService())
      appendLogs(await openclawApi.repairGatewayService())

      setLogs((prev) => [...prev, "[初始化] 正在重启 gateway 以应用当前配置"])
      const restartOutput = await profileApi.saveAndRestart(activeProfile.id, config)
      appendLogs(restartOutput)

      if (/Gateway service not loaded/i.test(restartOutput)) {
        setLogs((prev) => [...prev, "[初始化] 检测到 gateway service 未加载，正在执行修复并重试"])
        appendLogs(await openclawApi.repairGatewayService())
        appendLogs(await profileApi.saveAndRestart(activeProfile.id, config))
      }

      const gatewayStatus = await openclawApi.gatewayStatus()
      appendLogs(gatewayStatus)
      setLogs((prev) => [
        ...prev,
        "[初始化] 已生成默认 gateway 配置并启动本地服务",
        "[提示] Dashboard 默认地址: http://127.0.0.1:18789/",
        "[提示] 如果页面提示 unauthorized，请在控制台中使用 gateway.auth.token 认证",
      ])
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setLogs((prev) => [...prev, `[警告] OpenClaw 已安装，但初始化默认 gateway 配置失败: ${msg}`])
      return false
    }
  }

  async function startOperation(op: "install" | "uninstall") {
    setLogs([])
    setPhase("running")
    setConfirmUninstall(false)

    unlistenRef.current?.()
    const unlisten = await openclawApi.onOutput((line) => {
      if (line.startsWith("\x00EXIT:")) {
        const ok = line === "\x00EXIT:0"
        unlistenRef.current?.()
        unlistenRef.current = null

        void (async () => {
          if (!ok) {
            setPhase("done-err")
            await refreshStatus(undefined)
            return
          }

          if (op === "install") {
            setPhase("finalizing")
            const nextStatus = await refreshStatus(true)
            if (!nextStatus.installed) {
              setLogs((prev) => [...prev, "[警告] 安装脚本已完成，但系统暂未检测到 openclaw CLI"])
              setPhase("done-err")
              return
            }

            const initialized = await initializeDefaultGatewayConfig()
            await refreshStatus(true)
            setPhase(initialized ? "done-ok" : "done-err")
            return
          }

          setPhase("done-ok")
          setStatus({ installed: false, path: null })
          const nextStatus = await refreshStatus(false)
          if (nextStatus.installed) {
            setLogs((prev) => [...prev, "[警告] 卸载命令已完成，但系统仍检测到 openclaw 可执行文件，界面已按未安装处理"])
            setStatus({ installed: false, path: null })
          }
        })()
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
            ? "text-[#10B981] hover:text-[#059669] hover:bg-[#F0FDF4]"
            : "text-[#F87171] hover:text-[#EF4444] hover:bg-[#FFF5F5]"
        )}
      >
        <InstallIcon className="w-[15px] h-[15px]" />
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (phase !== "running") setOpen(v) }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-[0_20px_60px_rgba(0,0,0,0.4)] bg-transparent">

          {/* ── Top: colored header ── */}
          <div className={cn(
            "relative px-6 pt-6 pb-7",
            installed ? "bg-[#ECFDF5]" : "bg-[#FFF7ED]"
          )}>
            {/* Close button */}
            <button
              onClick={closeDialog}
              disabled={phase === "running"}
              className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-black/8 transition-colors disabled:opacity-40"
            >
              <X size={15} />
            </button>

            {/* Icon + title */}
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center justify-center w-14 h-14 rounded-2xl",
                installed ? "bg-[#D1FAE5]" : "bg-[#FEE2CC]"
              )}>
                {installed
                  ? <PackageCheck size={28} className="text-[#16A34A]" strokeWidth={1.5} />
                  : <PackageX size={28} className="text-[#EA580C]" strokeWidth={1.5} />
                }
              </div>
              <div>
                <p className="text-[18px] font-bold text-[#111827] leading-tight">OpenClaw</p>
                <p className={cn(
                  "text-[13px] font-semibold mt-0.5",
                  installed ? "text-[#16A34A]" : "text-[#EA580C]"
                )}>
                  {installed ? "已安装" : "未安装"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Bottom: light body ── */}
          <div className="bg-white px-5 py-5 space-y-4 rounded-b-2xl">

            {/* Install path */}
            {installed && status?.path && phase === "idle" && (
              <div className="flex items-center gap-3 bg-[#F3F4F6] rounded-xl px-4 py-3">
                <Folder size={15} className="text-[#9CA3AF] shrink-0" />
                <span className="text-[12px] text-[#374151] font-mono break-all leading-relaxed flex-1">
                  {status.path}
                </span>
              </div>
            )}

            {/* Not installed hint */}
            {!installed && phase === "idle" && (
              <div className="flex items-start gap-3 bg-[#F3F4F6] rounded-xl px-4 py-3">
                <Download size={15} className="text-[#9CA3AF] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#6B7280] leading-relaxed">
                  OpenClaw 尚未安装。点击下方按钮自动下载并安装，安装过程需要网络连接。
                </p>
              </div>
            )}

            {/* Log terminal */}
            {(phase !== "idle" || logs.length > 0) && (
              <div className="rounded-xl overflow-hidden border border-[#2D3448]">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#111827]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]/70" />
                  <span className="ml-2 text-[#4B5563] text-[11px] font-mono">
                    {phase === "running"
                      ? (logs.length === 0 ? "正在启动..." : "执行中...")
                      : phase === "finalizing" ? "安装后初始化中..."
                      : phase === "done-ok" ? "完成"
                      : "失败"}
                  </span>
                  {(phase === "running" || phase === "finalizing") && (
                    <Loader2 size={10} className="animate-spin text-[#4B5563] ml-auto" />
                  )}
                </div>
                <div className="bg-[#0D1117] text-[#E6EDF3] p-3 h-40 overflow-y-auto font-mono text-[11px] leading-relaxed">
                  {logs.map((l, i) => (
                    <div key={i} className="text-[#8B949E]">{l}</div>
                  ))}
                  {phase === "done-ok" && (
                    <div className="text-[#3FB950] mt-1 font-semibold">✓ 操作完成</div>
                  )}
                  {phase === "done-err" && (
                    <div className="text-[#F85149] mt-1 font-semibold">✗ 操作失败</div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            {/* Uninstall confirm warning */}
            {confirmUninstall && phase === "idle" && (
              <div className="flex items-start gap-3 bg-[#FFF5F5] border border-[#FECACA] rounded-xl px-4 py-3">
                <Trash2 size={14} className="text-[#EF4444] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#B91C1C] leading-relaxed">
                  确认卸载 OpenClaw？这将删除 gateway 服务，操作不可恢复。
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">

              {phase === "idle" && !installed && (
                <button
                  onClick={() => startOperation("install")}
                  className="flex items-center gap-2 rounded-xl border border-[#EA580C]/50 bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#EA580C] text-[12px] font-semibold px-4 h-9 transition-colors"
                >
                  <Download size={14} />
                  一键安装
                </button>
              )}

              {phase === "idle" && installed && !confirmUninstall && (
                <button
                  onClick={() => setConfirmUninstall(true)}
                  className="flex items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FFF5F5] hover:bg-[#FEE2E2] text-[#EF4444] text-[12px] font-semibold px-4 h-9 transition-colors"
                >
                  <Trash2 size={14} />
                  卸载
                </button>
              )}

              {phase === "idle" && installed && confirmUninstall && (
                <>
                  <button
                    onClick={() => setConfirmUninstall(false)}
                    className="rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:text-[#374151] hover:border-[#D1D5DB] text-[12px] font-medium px-4 h-9 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => startOperation("uninstall")}
                    className="flex items-center gap-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12px] font-semibold px-4 h-9 transition-colors"
                  >
                    <Trash2 size={14} />
                    确认卸载
                  </button>
                </>
              )}

              {phase === "finalizing" && (
                <>
                  <button
                    onClick={closeDialog}
                    className="rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:text-[#374151] hover:border-[#D1D5DB] text-[12px] font-medium px-4 h-9 transition-colors"
                  >
                    关闭
                  </button>
                  <div className="text-[11px] text-[#9CA3AF]">
                    正在安装 gateway service 并启动本地 Dashboard...
                  </div>
                </>
              )}

              {(phase === "done-ok" || phase === "done-err") && (
                <>
                  <div className="text-[11px] text-[#9CA3AF] mr-auto">
                    {installed
                      ? "如本地页面仍无法访问，请查看日志中的 gateway status 输出。"
                      : "已完成操作。"}
                  </div>
                  <button
                    onClick={closeDialog}
                    className="rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:text-[#374151] hover:border-[#D1D5DB] text-[12px] font-medium px-4 h-9 transition-colors"
                  >
                    关闭
                  </button>
                </>
              )}
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  )
}
