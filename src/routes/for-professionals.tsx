import { CmsHtmlPage } from "@/components/CmsHtmlPage";
import { FOR_PROFESSIONALS_DEFAULT_HTML } from "@/lib/cms-page-defaults";

export default async function ForPros({
  searchParams,
}: {
  searchParams: Promise<{ cmsPreview?: string }>;
}) {
  return (
    <CmsHtmlPage
      slug="for-professionals"
      searchParams={searchParams}
      defaultHtml={FOR_PROFESSIONALS_DEFAULT_HTML}
    />
  );
}
