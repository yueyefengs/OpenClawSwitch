import { useState } from "react"
import { Toaster } from "sonner"
import ProfileList from "./components/profiles/ProfileList"
import ProfileEditor from "./components/editor/ProfileEditor"
import { Button } from "./components/ui/button"

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-screen bg-background text-foreground select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <span className="font-semibold text-sm">OpenclawSwitch</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled title="Coming soon">MCP</Button>
          <Button variant="ghost" size="sm" disabled title="Coming soon">Skills</Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r shrink-0 overflow-hidden flex flex-col">
          <ProfileList selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          {selectedId
            ? <ProfileEditor profileId={selectedId} />
            : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                选择左侧 Profile 开始编辑
              </div>
            )
          }
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  )
}
