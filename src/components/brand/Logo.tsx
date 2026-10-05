import { getIcon } from "@/lib/icon-registry";
import { cn } from "@/lib/utils";

export function Logo({
  type,
  icon,
  url,
  className,
}: {
  type?: string;
  icon?: string;
  url?: string | null;
  className?: string;
}) {
  if (type === "image" && url) {
    return <img src={url} alt="โลโก้ร้าน" className={cn("size-9 rounded-xl object-cover", className)} />;
  }
  const Icon = getIcon(icon);
  return (
    <span className={cn("grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground", className)}>
      <Icon className="size-[55%]" />
    </span>
  );
}
