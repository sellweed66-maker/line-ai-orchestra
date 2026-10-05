// Single source of navigation. Add a page: create the route file, then add it here.
import { MessageSquare, Satellite, ScrollText, MessageCircle, Cpu, Palette, type LucideIcon } from "lucide-react";

export type NavItem = { to: "/chat" | "/apps" | "/logs" | "/line" | "/ai-settings" | "/appearance"; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { to: "/chat", label: "แชต", icon: MessageSquare },
  { to: "/apps", label: "แอพ", icon: Satellite },
  { to: "/logs", label: "ประวัติ", icon: ScrollText },
  { to: "/line", label: "LINE", icon: MessageCircle },
  { to: "/ai-settings", label: "AI", icon: Cpu },
  { to: "/appearance", label: "หน้าตา", icon: Palette },
];
