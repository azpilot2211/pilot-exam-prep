"use client";

interface Item {
  url: string;
  filename: string;
}

export function DownloadAllButton({ items }: { items: Item[] }) {
  const handleClick = async () => {
    for (const item of items) {
      const href = `/api/download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(item.filename)}`;
      const a = document.createElement("a");
      a.href = href;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // small gap so the browser queues each download
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  return (
    <button
      onClick={handleClick}
      className="bg-sky-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-sky-700 transition-colors"
    >
      Download all ({items.length})
    </button>
  );
}
