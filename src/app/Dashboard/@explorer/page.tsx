"use client";

import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  Database,
  Loader2,
  LineChart,
  ShieldAlert,
} from "lucide-react";
import {
  Form,
  FormField,
} from "@/components/ui/form";
import { uploadAndVectorize, type UploadResult } from "@/lib/vector-action";
import { useMetaPronostic } from "@/contexts/metapronostic-context";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPT = ".pdf,.xlsx,.xls";
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const dataCollections = [
  "fixtures",
  "standings",
  "odds",
  "injuries",
  "lineups",
  "players",
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

export default function ExplorerSlotPage() {
  const { activeDocument, isThinking } = useMetaPronostic();
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentDocuments, setRecentDocuments] = useState<UploadResult[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(fileSchema),
    defaultValues: { files: undefined as unknown as FileList },
  });

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsSubmitting(true);
    setUploadResults([]);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    try {
      const results = await uploadAndVectorize(formData);
      setUploadResults(results);
      const successful = results.filter((r) => r.success);
      setRecentDocuments((prev) => [...successful, ...prev].slice(0, 5));
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  async function onSubmit(values: FormValues) {
    if (!values.files || values.files.length === 0) return;
    await handleFiles(values.files);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Minimalist Header */}
      <div className="border-b border-white/10 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Football Data Room</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                MongoDB collections, reports, odds files and model notes
              </p>
            </div>
          </div>
          {/* Status Badge */}
          <div className="flex items-center gap-2 rounded-full bg-lime-400/10 px-3 py-1.5 border border-lime-300/20">
            <div className="h-2 w-2 rounded-full bg-lime-300 animate-pulse" />
            <span className="text-xs font-bold text-lime-300">Synced</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {dataCollections.map((collection) => (
              <div
                key={collection}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
              >
                <LineChart className="mb-2 h-4 w-4 text-lime-300" />
                <p className="text-xs font-black uppercase text-white">
                  {collection}
                </p>
              </div>
            ))}
          </section>

          {/* Drag & Drop Zone */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
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
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-all ${
                      isDragging
                        ? "border-lime-300/60 bg-lime-300/10"
                        : "border-white/20 bg-white/5 hover:border-lime-300/40 hover:bg-white/10"
                    } p-12 text-center cursor-pointer`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={(e) => {
                        if (typeof ref === "function") ref(e);
                        fileInputRef.current = e;
                      }}
                      name={name}
                      onBlur={onBlur}
                      type="file"
                      accept={ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files ?? undefined;
                        onChange(files);
                        if (files) {
                          handleFiles(files);
                        }
                      }}
                    />
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-cyan-400/10">
                        {isSubmitting ? (
                          <Loader2 className="h-10 w-10 animate-spin text-cyan-300" />
                        ) : (
                          <UploadCloud className="h-10 w-10 text-cyan-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-base font-black text-white">
                          {isSubmitting
                            ? "Indexation du rapport en cours..."
                            : "Importer rapports PDF, Excel ou exports d'analyse"}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          PDF, Excel (.xlsx, .xls) jusqu'a 10 MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              />
            </form>
          </Form>

          {/* Upload Results */}
          {uploadResults.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-black text-white">Indexation</h3>
              <div className="space-y-2">
                {uploadResults.map((r, i) => (
                  <div
                    key={`${r.fileName}-${i}`}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      r.success
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    {r.success ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {r.fileName}
                      </p>
                      <p
                        className={`text-xs ${
                          r.success ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {r.message}
                        {r.recordCount != null && ` • ${r.recordCount} chunk(s)`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recently Indexed Documents */}
          {recentDocuments.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-white">
                Rapports indexes
              </h3>
              <div className="space-y-2">
                {recentDocuments.map((doc, i) => (
                  <div
                    key={`recent-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-white">{doc.fileName}</p>
                      {doc.recordCount != null && (
                        <p className="text-xs text-slate-400">
                          {doc.recordCount} chunk(s) indexed
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Document Info */}
          {activeDocument && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-black text-white mb-2">
                Source active
              </h3>
              <p className="text-xs text-slate-400">Source: {activeDocument.source}</p>
              {activeDocument.chunkIndex !== undefined && (
                <p className="text-xs text-slate-400">Chunk: {activeDocument.chunkIndex}</p>
              )}
              <p className="mt-2 text-sm text-slate-300 line-clamp-3">
                {activeDocument.text}
              </p>
            </div>
          )}

          {isThinking && (
            <div className="rounded-lg border border-lime-300/20 bg-lime-300/10 p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-lime-300" />
                <p className="text-sm text-lime-100">
                  Analyse IA en cours sur les donnees match...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
