import { useState } from "react"
import { Toaster } from "sonner"
import ProfileListPage from "./components/profiles/ProfileListPage"
import ProfileEditor from "./components/editor/ProfileEditor"
import McpServersPage from "./components/mcp/McpServersPage"
import SkillsPage from "./components/skills/SkillsPage"

type View = "list" | "detail" | "mcp" | "skills"

export default function App() {
  const [view, setView] = useState<View>("list")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function handleEdit(id: string) {
    setSelectedId(id)
    setView("detail")
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground select-none">
      {view === "list" && (
        <ProfileListPage
          onEdit={handleEdit}
          onMcp={() => setView("mcp")}
          onSkills={() => setView("skills")}
        />
      )}
      {view === "detail" && selectedId && (
        <ProfileEditor profileId={selectedId} onBack={() => setView("list")} />
      )}
      {view === "mcp" && (
        <McpServersPage onBack={() => setView("list")} />
      )}
      {view === "skills" && (
        <SkillsPage onBack={() => setView("list")} />
      )}
      <Toaster position="bottom-right" />
    </div>
  )
}
