import { CmsHtmlPage } from "@/components/CmsHtmlPage";
import { FOR_CLIENTS_DEFAULT_HTML } from "@/lib/cms-page-defaults";

export default async function ForClients({
  searchParams,
}: {
  searchParams: Promise<{ cmsPreview?: string }>;
}) {
  return (
    <CmsHtmlPage slug="for-clients" searchParams={searchParams} defaultHtml={FOR_CLIENTS_DEFAULT_HTML} />
  );
}
