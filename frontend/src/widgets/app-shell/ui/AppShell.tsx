import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/shared/ui/sidebar";
import { Separator } from "@/shared/ui/separator";
import { AppSidebar } from "@/widgets/app-sidebar";

export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="font-semibold">Acme Corp.</span>
        </header>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
