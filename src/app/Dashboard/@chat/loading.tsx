export default function ChatSlotLoading() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <p className="text-sm text-white/70">Loading chat...</p>
    </div>
  );
}
