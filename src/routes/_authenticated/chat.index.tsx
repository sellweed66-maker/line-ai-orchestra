import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { ThreadList } from "./chat";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: () => (
    <div className="h-full">
      <ThreadList className="md:hidden" />
      <div className="hidden h-full flex-col items-center justify-center gap-3 text-muted-foreground md:flex">
        <MessageSquare className="size-8" />
        <p>เลือกห้องแชต หรือกด "แชตใหม่" เพื่อเริ่มสั่งงาน AI</p>
      </div>
    </div>
  ),
});
