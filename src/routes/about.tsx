import { CmsHtmlPage } from "@/components/CmsHtmlPage";
import { ABOUT_DEFAULT_HTML } from "@/lib/cms-page-defaults";

export default async function About({
  searchParams,
}: {
  searchParams: Promise<{ cmsPreview?: string }>;
}) {
  return <CmsHtmlPage slug="about" searchParams={searchParams} defaultHtml={ABOUT_DEFAULT_HTML} />;
}
