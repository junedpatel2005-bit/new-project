import { PortalShell, PortalTitleProvider } from "@/components/PortalShell";

export default function ClientProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalTitleProvider>
      <PortalShell>{children}</PortalShell>
    </PortalTitleProvider>
  );
}
