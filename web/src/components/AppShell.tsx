import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from './AppSidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="[--header-height:3.5rem]">
      <SidebarProvider defaultOpen={false} className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-50 flex h-[--header-height] shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            Aéroclub ACPH
          </p>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset>
            <main className="flex min-h-[calc(100vh-var(--header-height))] flex-1 flex-col overflow-hidden p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
