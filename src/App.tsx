import React, { useState } from 'react';
import { Search, Download, Image as ImageIcon, Video, Type, AlertCircle, Loader2, Palette, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import FontExtractor from './components/FontExtractor';
import ImageExtractor from './components/ImageExtractor';
import VideoExtractor from './components/VideoExtractor';
import ColorExtractor from './components/ColorExtractor';
import AiInsights from './components/AiInsights';

export default function App() {
  const [url, setUrl] = useState('');
  const [extractedUrl, setExtractedUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'fonts' | 'images' | 'videos' | 'colors' | 'insights'>('images');
  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<{
    fonts: any[];
    images: any[];
    videos: any[];
    colors: string[];
  } | null>(null);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setAssets(null);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to extract assets');
      }

      const data = await response.json();
      setAssets(data);
      setExtractedUrl(url);
      setActiveTab('images');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!assets) return;

    setDownloadingAll(true);
    try {
      const urls = [
        ...assets.images.map(img => img.url),
        ...assets.fonts.map(font => font.url),
        ...assets.videos.map(video => video.url)
      ];

      if (urls.length === 0) {
        alert("No assets found to download.");
        return;
      }

      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      if (!response.ok) throw new Error('Zip download failed');
      
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'all-assets.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error('Download all error:', error);
      alert('Failed to download assets as ZIP.');
    } finally {
      setDownloadingAll(false);
    }
  };

  const totalAssets = assets ? assets.images.length + assets.fonts.length + assets.videos.length : 0;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
                C
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Creative Asset Extractor</h1>
            </div>
            {assets && totalAssets > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {downloadingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloadingAll ? 'Creating ZIP...' : `Download All (${totalAssets})`}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto mb-12">
          <form onSubmit={handleExtract} className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-zinc-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., https://example.com)"
                className="w-full pl-12 pr-32 py-4 bg-white border border-zinc-200 rounded-2xl shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                required
              />
              <button
                type="submit"
                disabled={loading || !url}
                className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Extract'}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {assets && (
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-2 border-b border-zinc-200 pb-px mb-8">
              <TabButton
                active={activeTab === 'images'}
                onClick={() => setActiveTab('images')}
                icon={<ImageIcon className="w-4 h-4" />}
                label="Images"
                count={assets.images.length}
              />
              <TabButton
                active={activeTab === 'fonts'}
                onClick={() => setActiveTab('fonts')}
                icon={<Type className="w-4 h-4" />}
                label="Fonts"
                count={assets.fonts.length}
              />
              <TabButton
                active={activeTab === 'videos'}
                onClick={() => setActiveTab('videos')}
                icon={<Video className="w-4 h-4" />}
                label="Videos"
                count={assets.videos.length}
              />
              <TabButton
                active={activeTab === 'colors'}
                onClick={() => setActiveTab('colors')}
                icon={<Palette className="w-4 h-4" />}
                label="Colors"
                count={assets.colors.length}
              />
              <TabButton
                active={activeTab === 'insights'}
                onClick={() => setActiveTab('insights')}
                icon={<Sparkles className="w-4 h-4" />}
                label="Insights"
              />
            </div>

            <div className="min-h-[400px]">
              {activeTab === 'images' && <ImageExtractor images={assets.images} />}
              {activeTab === 'fonts' && <FontExtractor fonts={assets.fonts} />}
              {activeTab === 'videos' && <VideoExtractor videos={assets.videos} />}
              {activeTab === 'colors' && <ColorExtractor colors={assets.colors} />}
              {activeTab === 'insights' && <AiInsights url={extractedUrl} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
        active
          ? "border-indigo-600 text-indigo-600"
          : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={cn(
          "ml-1.5 py-0.5 px-2 rounded-full text-xs",
          active ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-600"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
