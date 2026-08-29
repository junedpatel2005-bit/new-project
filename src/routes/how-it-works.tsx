import { CmsHtmlPage } from "@/components/CmsHtmlPage";
import { HOW_IT_WORKS_DEFAULT_HTML } from "@/lib/cms-page-defaults";

export default async function HowItWorks({
  searchParams,
}: {
  searchParams: Promise<{ cmsPreview?: string }>;
}) {
  return (
    <CmsHtmlPage
      slug="how-it-works"
      searchParams={searchParams}
      defaultHtml={HOW_IT_WORKS_DEFAULT_HTML}
    />
  );
}
