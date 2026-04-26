import React, { useState } from 'react';
import { Download, Search, Type, Code, Filter } from 'lucide-react';

export default function FontExtractor({ fonts }: { fonts: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Record<string, string>>({});

  const handleFormatChange = (url: string, format: string) => {
    setSelectedFormats(prev => ({ ...prev, [url]: format }));
  };

  const handleDownload = async (url: string, filename: string, originalFormat: string) => {
    setDownloading(url);
    const toFormat = selectedFormats[url] || (['ttf', 'woff', 'woff2', 'eot', 'svg'].includes(originalFormat) ? originalFormat : 'ttf');
    
    try {
      let fetchUrl = `/api/download?url=${encodeURIComponent(url)}`;
      let finalFilename = filename;
      
      if (toFormat !== originalFormat || originalFormat === 'unknown') {
        fetchUrl = `/api/convert-font?url=${encodeURIComponent(url)}&toFormat=${toFormat}&originalFormat=${originalFormat}`;
        finalFilename = filename.replace(/\.[^/.]+$/, "") + '.' + toFormat;
      }
      
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Download or conversion failed');
      
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download or convert font.');
    } finally {
      setDownloading(null);
    }
  };

  const filteredFonts = fonts.filter(font => {
    const matchesSearch = font.family.toLowerCase().includes(searchTerm.toLowerCase());
    const currentFormat = selectedFormats[font.url] || (['ttf', 'woff', 'woff2', 'eot', 'svg'].includes(font.format) ? font.format : 'ttf');
    const matchesFilter = filterType === 'all' || currentFormat.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const uniqueTypes = ['ttf', 'woff', 'woff2', 'eot', 'svg'];

  const handleDownloadAll = async () => {
    if (filteredFonts.length === 0) return;
    setDownloadingZip(true);
    try {
      const items = filteredFonts.map(font => {
        const toFormat = selectedFormats[font.url] || (['ttf', 'woff', 'woff2', 'eot', 'svg'].includes(font.format) ? font.format : 'ttf');
        return {
          url: font.url,
          toFormat,
          originalFormat: font.format
        };
      });
      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!response.ok) throw new Error('Zip download failed');
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'fonts.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error('Download all error:', error);
      alert('Failed to download fonts as ZIP.');
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleSearch = (fontFamily: string) => {
    const query = encodeURIComponent(`${fontFamily} font download`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  if (fonts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <Type className="w-12 h-12 mb-4 text-zinc-300" />
        <p className="text-lg font-medium text-zinc-900">No fonts found</p>
        <p className="text-sm">We couldn't detect any web fonts on this page.</p>
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
              placeholder="Search fonts..."
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
          disabled={downloadingZip || filteredFonts.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {downloadingZip ? (
            <span className="animate-pulse">Creating ZIP...</span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download All ({filteredFonts.length})
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFonts.map((font, idx) => {
          const filename = font.url.split('/').pop()?.split('?')[0] || `font-${idx}.${font.format}`;
          return (
            <div key={idx} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 truncate max-w-[200px]" title={font.family}>
                    {font.family}
                  </h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{font.format}</p>
                </div>
                <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400">
                  <Type className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <div className="flex gap-2 w-full">
                  <select
                    className="flex-1 bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none"
                    value={selectedFormats[font.url] || (['ttf', 'woff', 'woff2', 'eot', 'svg'].includes(font.format) ? font.format : 'ttf')}
                    onChange={(e) => handleFormatChange(font.url, e.target.value)}
                  >
                    <option value="ttf">TTF</option>
                    <option value="woff">WOFF</option>
                    <option value="woff2">WOFF2</option>
                    <option value="eot">EOT</option>
                    <option value="svg">SVG</option>
                  </select>
                  <button
                    onClick={() => handleDownload(font.url, filename, font.format)}
                    disabled={downloading === font.url}
                    className="flex-2 flex items-center justify-center flex-grow gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading === font.url ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => handleSearch(font.family)}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-zinc-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-200 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Find on Web
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
