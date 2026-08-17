import { FolderClosed, LogOut, Star, Trash2, Users } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { authClient } from "@/shared/api/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/sidebar";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const navItems = [
  { to: "/datarooms", label: "Data Rooms", icon: FolderClosed },
  { to: "/shared-with-me", label: "Shared with me", icon: Users },
  { to: "/starred", label: "Starred", icon: Star },
  { to: "/trash", label: "Trash", icon: Trash2 },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

function UserMenu() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  if (!session) return null;
  const { name, email } = session.user;

  async function handleLogout() {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
          <Avatar size="sm">
            <AvatarFallback>{initials(name) || email[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </div>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="grid text-left text-sm leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img src="/logo.png" alt="Logo" className="h-8 w-8 shrink-0" />
          <span className="truncate font-semibold tracking-tight group-data-[collapsible=icon]:hidden uppercase">
            Acme Corp.
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname.startsWith(to);
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={label}
                    >
                      <NavLink to={to}>
                        <Icon />
                        <span>{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
