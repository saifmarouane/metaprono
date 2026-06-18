"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { uploadAndVectorize, type UploadResult } from "@/lib/vector-action";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPT = ".pdf,.xlsx,.xls";
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const fileSchema = z.object({
  files: z
    .custom<FileList | undefined>()
    .refine((files) => files != null && files.length > 0, "Select at least one file")
    .refine(
      (files) =>
        files != null &&
        Array.from(files).every((f) => f.size <= MAX_SIZE),
      "Each file must be under 10 MB"
    )
    .refine(
      (files) =>
        files != null &&
        Array.from(files).every((f) => ALLOWED_TYPES.includes(f.type)),
      "Only PDF and Excel (.pdf, .xlsx, .xls) are allowed"
    ),
});

type FormValues = z.infer<typeof fileSchema>;

export default function UploadPage() {
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(fileSchema),
    defaultValues: { files: undefined as unknown as FileList },
  });

  async function onSubmit(values: FormValues) {
    if (!values.files || values.files.length === 0) return;
    setIsSubmitting(true);
    setUploadResults([]);
    const formData = new FormData();
    const files = values.files;
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    try {
      const results = await uploadAndVectorize(formData);
      setUploadResults(results);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-white/70 hover:text-white"
        >
          ← Home
        </Link>
        <Link
          href="/Dashboard"
          className="text-sm font-medium text-white/70 hover:text-white"
        >
          Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-white">
          Upload documents
        </h1>
        <p className="mt-1 text-sm text-white/70">
          PDF and Excel files are parsed and stored in Pinecone for search.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 rounded-2xl border border-white/10 bg-[var(--color-dashboard-card)] p-6"
        >
          <FormField<FormValues, "files">
            control={form.control}
            name="files"
            render={({
              field: { value: _value, onChange, onBlur, ref, name },
            }: {
              field: {
                value: FileList | undefined;
                onChange: (v: FileList | undefined) => void;
                onBlur: () => void;
                ref: React.Ref<HTMLInputElement>;
                name: string;
              };
            }) => (
              <FormItem>
                <FormLabel>Files (PDF, .xlsx, .xls)</FormLabel>
                <FormControl>
                  <input
                    ref={ref}
                    name={name}
                    onBlur={onBlur}
                    type="file"
                    accept={ACCEPT}
                    multiple
                    className="block w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--color-ramadan-gold)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--color-night-blue)] file:hover:opacity-90"
                    onChange={(e) => onChange(e.target.files ?? undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Uploading…" : "Upload and store in Pinecone"}
          </Button>
        </form>
      </Form>

      {uploadResults.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Upload results
          </h2>
          <ul className="space-y-2">
            {uploadResults.map((r, i) => (
              <li
                key={`${r.fileName}-${i}`}
                className={`flex flex-col gap-1 rounded-xl border px-4 py-3 ${
                  r.success
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-white">
                    {r.fileName}
                  </span>
                  {r.recordCount != null && (
                    <span className="shrink-0 text-xs text-white/70">
                      {r.recordCount} chunk(s)
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    r.success ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {r.message}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
