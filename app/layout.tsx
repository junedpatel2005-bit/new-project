import type { Metadata } from "next";
import "../src/styles.css";
import "react-loading-skeleton/dist/skeleton.css";
import { Providers } from "@/components/providers";
import { CmsLiveEditor } from "@/components/CmsLiveEditor";

export const metadata: Metadata = {
  title: { default: "Servio — Hire trusted professionals near you", template: "%s | Servio" },
  description: "Post jobs, hire experts, track work, and manage Projects in one platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers><CmsLiveEditor />{children}</Providers>
      </body>
    </html>
  );
}
