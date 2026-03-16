import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, ChevronDown, ChevronRight, Search, RefreshCw, Download, Trash2, Star, X, Package } from "lucide-react"
import { skillsApi, clawhubApi } from "../../lib/api/profile"
import type { Skill, ClawhubSkill } from "../../types"
import { toast } from "sonner"
import { cn } from "../../lib/utils"

interface Props {
  onBack: () => void
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}

// Derive the clawhub slug from a skill's source_url ("clawhub:<slug>")
function clawhubSlug(skill: Skill): string | null {
  return skill.source_url?.startsWith("clawhub:") ? skill.source_url.slice(8) : null
}

// ── Skill icon: colored circle with first letter ──────────────────────────────
const ICON_COLORS = [
  { bg: "#EEF2FF", text: "#4F63FF" },
  { bg: "#FFF7ED", text: "#EA580C" },
  { bg: "#F0FDF4", text: "#16A34A" },
  { bg: "#FEF3C7", text: "#D97706" },
  { bg: "#FCE7F3", text: "#DB2777" },
  { bg: "#F0F9FF", text: "#0284C7" },
]

function SkillIcon({ name, size = 32 }: { name: string; size?: number }) {
  const idx = (name.charCodeAt(0) || 0) % ICON_COLORS.length
  const { bg, text } = ICON_COLORS[idx]
  return (
    <div
      style={{ width: size, height: size, background: bg, borderRadius: 8, flexShrink: 0 }}
      className="flex items-center justify-center text-sm font-bold"
    >
      <span style={{ color: text, fontSize: size * 0.44 }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

// ── Uninstall confirmation dialog ─────────────────────────────────────────────
function UninstallDialog({
  skill,
  onConfirm,
  onCancel,
  loading,
}: {
  skill: Skill
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[300px] rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] flex items-center justify-center">
            <Trash2 size={18} className="text-[#EF4444]" />
          </div>
          <p className="text-[15px] font-bold text-[#111827] leading-tight">确认卸载</p>
          <p className="text-[12px] text-[#6B7280] leading-relaxed">
            确认卸载 <span className="font-semibold text-[#374151]">{skill.name}</span>？该技能将从本地删除，可随时重新安装。
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#F3F4F6]">
          <button
            onClick={onCancel}
            disabled={loading}
            className="h-8 px-4 rounded-lg border border-[#E5E7EB] text-[12px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="h-8 px-4 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-[12px] font-semibold text-white transition-colors disabled:opacity-50"
          >
            {loading ? "卸载中..." : "确认卸载"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Installed skill row ───────────────────────────────────────────────────────
function InstalledRow({
  skill,
  onUninstall,
}: {
  skill: Skill
  onUninstall: (skill: Skill) => void
}) {
  const slug = clawhubSlug(skill)

  return (
    <div className="flex items-center justify-between px-4 h-[52px] border-b border-[#F3F4F6] last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <SkillIcon name={skill.name} size={32} />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#111827] truncate">{skill.name}</p>
          <p className="text-[11px] text-[#9CA3AF]">
            {slug ? `clawhub · ${slug}` : skill.source_url ?? "本地"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 h-[22px] px-2.5 rounded-md bg-[#F0FDF4]">
          <span className="text-[11px] font-semibold text-[#16A34A]">✓ 已安装</span>
        </div>
        <button
          onClick={() => onUninstall(skill)}
          className="w-[22px] h-[22px] rounded-md bg-[#FEE2E2] flex items-center justify-center hover:bg-[#FECACA] transition-colors"
          title="卸载"
        >
          <Trash2 size={11} className="text-[#EF4444]" />
        </button>
      </div>
    </div>
  )
}

// ── Clawhub skill row ─────────────────────────────────────────────────────────
function ClawhubRow({
  skill,
  installing,
  onInstall,
}: {
  skill: ClawhubSkill
  installing: boolean
  onInstall: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 h-[60px] border-b border-[#F3F4F6] last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <SkillIcon name={skill.displayName} size={32} />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#111827] truncate">{skill.displayName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[#9CA3AF]">{skill.slug}</span>
            {skill.stars > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-[#9CA3AF]">
                <Star size={10} className="text-[#F59E0B]" />
                {formatCount(skill.stars)}
              </span>
            )}
            {skill.downloads > 0 && (
              <span className="text-[11px] text-[#9CA3AF]">↓ {formatCount(skill.downloads)}</span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onInstall}
        disabled={installing}
        className="flex items-center gap-1.5 h-[26px] px-3 rounded-lg bg-[#4F63FF] hover:bg-[#3D50E0] text-white text-[11px] font-semibold transition-colors disabled:opacity-50 shrink-0"
      >
        <Download size={11} />
        {installing ? "安装中" : "安装"}
      </button>
    </div>
  )
}

// ── Section header (collapsible) ──────────────────────────────────────────────
function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
}: {
  title: string
  count: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 h-11 border-b border-[#F3F4F6] hover:bg-[#FAFAFA] transition-colors"
    >
      <span className="text-[11px] font-bold text-[#374151] tracking-wide">{title}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-[#6B7280]">{count}</span>
        {expanded ? (
          <ChevronDown size={14} className="text-[#9CA3AF]" />
        ) : (
          <ChevronRight size={14} className="text-[#9CA3AF]" />
        )}
      </div>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SkillsPage({ onBack }: Props) {
  const qc = useQueryClient()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [expandInstalled, setExpandInstalled] = useState(true)
  const [expandClawhub, setExpandClawhub] = useState(true)
  const [confirmSkill, setConfirmSkill] = useState<Skill | null>(null)
  const [installingSlug, setInstallingSlug] = useState<string | null>(null)

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(t)
  }, [query])

  const { data: installedSkills = [] } = useQuery({
    queryKey: ["skills"],
    queryFn: skillsApi.list,
  })

  const {
    data: clawhubSkills = [],
    isLoading: clawhubLoading,
    isError: clawhubError,
  } = useQuery({
    queryKey: ["clawhub", debouncedQuery],
    queryFn: () => clawhubApi.search(debouncedQuery),
    retry: 1,
  })

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => clawhubApi.uninstall(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] })
      setConfirmSkill(null)
      toast.success("已卸载")
    },
    onError: (e) => toast.error(`卸载失败: ${e}`),
  })

  const installMutation = useMutation({
    mutationFn: ({ slug, displayName, version }: { slug: string; displayName: string; version: string }) =>
      clawhubApi.install(slug, displayName, version),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["skills"] })
      setInstallingSlug(null)
      toast.success(`${vars.displayName} 安装成功`)
    },
    onError: (e) => {
      setInstallingSlug(null)
      toast.error(`安装失败: ${e}`)
    },
  })

  // Slugs already installed (from clawhub)
  const installedSlugs = new Set(
    installedSkills.map(clawhubSlug).filter(Boolean) as string[]
  )

  // Filter installed skills by query
  const filteredInstalled = installedSkills.filter((s) =>
    debouncedQuery
      ? s.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        (clawhubSlug(s) ?? "").includes(debouncedQuery.toLowerCase())
      : true
  )

  // Clawhub results excluding already installed; sorted by stars (backend handles this for empty query)
  const filteredClawhub = clawhubSkills.filter((s) => !installedSlugs.has(s.slug))

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ["skills"] })
    qc.invalidateQueries({ queryKey: ["clawhub"] })
  }

  function handleInstall(skill: ClawhubSkill) {
    setInstallingSlug(skill.slug)
    installMutation.mutate({
      slug: skill.slug,
      displayName: skill.displayName,
      version: skill.version,
    })
  }

  return (
    <>
      {/* Main page */}
      <div className="flex flex-col h-full bg-[#F5F7FA]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 h-[52px] bg-white border-b border-[#EAECF0] shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-[13px] text-[#111827]">Skills</span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            title="刷新"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Search / filter */}
        <div className="bg-white border-b border-[#EAECF0] px-4 py-2.5 shrink-0">
          <p className="text-[11px] font-semibold text-[#9CA3AF] mb-1.5">Filter</p>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex-1 flex items-center gap-2 h-9 px-3 rounded-lg border transition-colors",
              query ? "border-[#4F63FF] bg-white" : "border-[#E5E7EB] bg-[#F9FAFB]"
            )}>
              <Search size={13} className="text-[#9CA3AF] shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索 Clawhub 技能..."
                className="flex-1 text-[12px] bg-transparent outline-none text-[#111827] placeholder:text-[#9CA3AF]"
              />
              {query && (
                <button onClick={() => setQuery("")}>
                  <X size={13} className="text-[#9CA3AF] hover:text-[#374151]" />
                </button>
              )}
            </div>
            <div className="flex items-center h-[22px] px-2.5 rounded-md bg-[#F3F4F6] shrink-0">
              <span className="text-[11px] font-semibold text-[#6B7280]">
                已安装 {installedSkills.length}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-3 space-y-2">

          {/* INSTALLED SKILLS */}
          <div className="rounded-xl bg-white border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <SectionHeader
              title="INSTALLED SKILLS"
              count={filteredInstalled.length}
              expanded={expandInstalled}
              onToggle={() => setExpandInstalled((v) => !v)}
            />
            {expandInstalled && (
              <>
                {filteredInstalled.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-1.5">
                    <Package size={24} className="text-[#D1D5DB]" />
                    <p className="text-[12px] text-[#9CA3AF]">
                      {query ? "没有匹配的已安装技能" : "还没有安装任何技能"}
                    </p>
                  </div>
                ) : (
                  filteredInstalled.map((skill) => (
                    <InstalledRow
                      key={skill.id}
                      skill={skill}
                      onUninstall={(s) => setConfirmSkill(s)}
                    />
                  ))
                )}
              </>
            )}
          </div>

          {/* CLAWHUB SKILLS */}
          <div className="rounded-xl bg-white border border-[#E5E7EB] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <SectionHeader
              title="CLAWHUB SKILLS"
              count={clawhubLoading ? 0 : filteredClawhub.length}
              expanded={expandClawhub}
              onToggle={() => setExpandClawhub((v) => !v)}
            />
            {expandClawhub && (
              <>
                {clawhubLoading && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw size={16} className="animate-spin text-[#9CA3AF]" />
                    <span className="ml-2 text-[12px] text-[#9CA3AF]">加载中...</span>
                  </div>
                )}
                {clawhubError && !clawhubLoading && (
                  <div className="flex flex-col items-center justify-center py-8 gap-1.5">
                    <p className="text-[12px] text-[#EF4444]">无法连接 Clawhub</p>
                    <button
                      onClick={() => qc.invalidateQueries({ queryKey: ["clawhub"] })}
                      className="text-[11px] text-[#4F63FF] hover:underline"
                    >
                      重试
                    </button>
                  </div>
                )}
                {!clawhubLoading && !clawhubError && filteredClawhub.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 gap-1.5">
                    <p className="text-[12px] text-[#9CA3AF]">
                      {query ? "没有找到匹配的技能" : "暂无可用技能"}
                    </p>
                  </div>
                )}
                {!clawhubLoading && !clawhubError &&
                  filteredClawhub.map((skill) => (
                    <ClawhubRow
                      key={skill.slug}
                      skill={skill}
                      installing={installingSlug === skill.slug}
                      onInstall={() => handleInstall(skill)}
                    />
                  ))
                }
              </>
            )}
          </div>
        </div>
      </div>

      {/* Uninstall confirmation dialog */}
      {confirmSkill && (
        <UninstallDialog
          skill={confirmSkill}
          loading={uninstallMutation.isPending}
          onConfirm={() => uninstallMutation.mutate(confirmSkill.id)}
          onCancel={() => setConfirmSkill(null)}
        />
      )}
    </>
  )
}
