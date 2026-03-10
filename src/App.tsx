import { useState } from "react"
import { Toaster } from "sonner"
import ProfileListPage from "./components/profiles/ProfileListPage"
import ProfileEditor from "./components/editor/ProfileEditor"

export default function App() {
  const [view, setView] = useState<"list" | "detail">("list")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function handleEdit(id: string) {
    setSelectedId(id)
    setView("detail")
  }

  function handleBack() {
    setView("list")
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground select-none">
      {view === "list" && (
        <ProfileListPage onEdit={handleEdit} />
      )}
      {view === "detail" && selectedId && (
        <ProfileEditor profileId={selectedId} onBack={handleBack} />
      )}
      <Toaster position="bottom-right" />
    </div>
  )
}
