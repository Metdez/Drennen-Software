export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}
