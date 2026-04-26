import React, { useState } from 'react';
import { Download, Image as ImageIcon, Search, Filter } from 'lucide-react';

export default function ImageExtractor({ images }: { images: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownload = async (url: string, filename: string) => {
    setDownloading(url);
    try {
      if (url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloading(null);
        return;
      }

      const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download image.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    if (filteredImages.length === 0) return;
    setDownloadingZip(true);
    try {
      const urls = filteredImages.map(img => img.url);
      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      if (!response.ok) throw new Error('Zip download failed');
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error('Download all error:', error);
      alert('Failed to download images as ZIP.');
    } finally {
      setDownloadingZip(false);
    }
  };

  const filteredImages = images.filter(img => {
    const matchesSearch = img.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || img.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const uniqueTypes = Array.from(new Set(images.map(img => img.type.toLowerCase()))).filter(Boolean);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <ImageIcon className="w-12 h-12 mb-4 text-zinc-300" />
        <p className="text-lg font-medium text-zinc-900">No images found</p>
        <p className="text-sm">We couldn't detect any images on this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleDownloadAll}
          disabled={downloadingZip || filteredImages.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {downloadingZip ? (
            <span className="animate-pulse">Creating ZIP...</span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download All ({filteredImages.length})
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredImages.map((img, idx) => {
          const filename = img.url.split('/').pop()?.split('?')[0] || `image-${idx}.${img.type}`;
          return (
            <div key={idx} className="group relative bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="aspect-square bg-zinc-100 relative">
                <img
                  src={img.url}
                  alt={`Extracted ${idx}`}
                  className="w-full h-full object-contain p-2"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkNGRkZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgeD0iMyIgeT0iMyIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOSIgY3k9IjkiIHI9IjIiLz48cGF0aCBkPSJtMjEgMTUtMy4wODYtMy4wODZhMiAyIDAgMCAwLTIuODI4IDBMMCAyMSIvPjwvc3ZnPg==';
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDownload(img.url, filename)}
                    disabled={downloading === img.url}
                    className="bg-white text-zinc-900 p-2 rounded-full hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-3 border-t border-zinc-100">
                <p className="text-xs font-medium text-zinc-900 truncate" title={filename}>
                  {filename}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                  {img.type}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
