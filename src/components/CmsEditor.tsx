"use client";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
export function CmsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="cms-editor rounded-xl bg-white text-slate-900">
      <CKEditor
        editor={ClassicEditor as never}
        data={value}
        config={{
          // CKEditor 5 v44+ requires an explicit license configuration.
          // This project uses the GPL-compatible open-source build.
          licenseKey: "GPL",
        }}
        onChange={(_, editor) => onChange(editor.getData())}
      />
    </div>
  );
}
