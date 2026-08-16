import { PortalShell, PortalTitleProvider } from "@/components/PortalShell";

export default function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PortalTitleProvider>
      <PortalShell>{children}</PortalShell>
    </PortalTitleProvider>
  );
}
