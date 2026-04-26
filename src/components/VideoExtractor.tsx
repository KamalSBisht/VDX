import React, { useState } from 'react';
import { Download, Video as VideoIcon, AlertCircle, ExternalLink, Youtube, Search, Globe } from 'lucide-react';

export default function VideoExtractor({ videos }: { videos: any[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [activeManualUrl, setActiveManualUrl] = useState('');

  const handleDownload = async (url: string, filename: string) => {
    setDownloading(url);
    try {
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
      alert('Failed to download video.');
    } finally {
      setDownloading(null);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      setActiveManualUrl(manualUrl.trim());
    }
  };

  const renderExternalOptions = (url: string) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <a 
        href={`https://en.savefrom.net/1-youtube-video-downloader-360/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-4 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 transition-colors shadow-sm"
        title="Open in SaveFrom.net"
      >
        <span className="font-semibold text-zinc-900 mb-1">SaveFrom.net</span>
        <span className="text-xs text-zinc-500 text-center">Video & Audio Download (Fast)</span>
      </a>
      <a 
        href={`https://ssyoutube.com/en175/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-4 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 transition-colors shadow-sm"
        title="Open in SSYouTube"
      >
        <span className="font-semibold text-zinc-900 mb-1">SSYouTube</span>
        <span className="text-xs text-zinc-500 text-center">Video & Audio Download (HD)</span>
      </a>
      <a 
        href={`https://www.dirpy.com/studio?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-4 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 transition-colors shadow-sm"
        title="Open in Dirpy"
      >
        <span className="font-semibold text-zinc-900 mb-1">Dirpy Studio</span>
        <span className="text-xs text-zinc-500 text-center">Advanced Audio/Video Converter</span>
      </a>
      <a 
        href={`https://cobalt.tools`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center p-4 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 transition-colors shadow-sm"
        title="Open in Cobalt"
      >
        <span className="font-semibold text-zinc-900 mb-1">Cobalt.tools</span>
        <span className="text-xs text-zinc-500 text-center">No-Ads Secure Downloader</span>
      </a>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Manual Video Downloader Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
            <Search className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Search & Download Any Video</h3>
            <p className="text-sm text-zinc-500">Paste a link from YouTube, Vimeo, TikTok, Twitter, Facebook, Instagram, and more</p>
          </div>
        </div>
        
        <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Globe className="w-5 h-5 text-zinc-400" />
            </div>
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-zinc-50"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </form>

        {activeManualUrl && (
          <div className="mt-6 bg-zinc-50 p-6 border border-zinc-100 rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <h4 className="text-sm font-medium text-zinc-700 mb-4 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Options for {(() => {
                try { return new URL(activeManualUrl).hostname.replace('www.', ''); }
                catch { return 'this link'; }
              })()}
            </h4>
            
            {renderExternalOptions(activeManualUrl)}
          </div>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 bg-white border border-zinc-200 rounded-2xl border-dashed">
          <VideoIcon className="w-12 h-12 mb-4 text-zinc-300" />
          <p className="text-lg font-medium text-zinc-900">No videos extracted from page</p>
          <p className="text-sm text-center max-w-md mt-1">We couldn't detect any direct video links on the extracted page. Use the search bar above to download videos manually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video, idx) => {
            if (video.isYouTube && !video.isYouTubeDirect) {
              return (
                <div key={idx} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
                  <div className="p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Youtube className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-zinc-900">YouTube Video Detected</h3>
                      <p className="text-zinc-600 mt-1 text-sm">
                        Direct extraction is restricted by YouTube. You can download this video using our integrated third-party downloaders below.
                      </p>
                    </div>
                  </div>
                  <div className="bg-zinc-50 p-6 border-t border-zinc-100">
                    <h4 className="text-sm font-medium text-zinc-700 mb-4">Quick Download Options</h4>
                    {renderExternalOptions(video.url)}
                  </div>
                </div>
              );
            }

            const filename = video.url.split('/').pop()?.split('?')[0] || `video-${idx}.${video.type}`;
            const isYouTubeDirect = video.isYouTubeDirect;
            const displayTitle = isYouTubeDirect ? `YouTube Video Stream (${video.resolution || 'Unknown'})` : filename;
            
            return (
              <div key={idx} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="aspect-video bg-zinc-900 relative group">
                  <video
                    src={video.url}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="mb-4">
                    <h3 className="font-semibold text-zinc-900 truncate" title={displayTitle}>
                      {displayTitle}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-md uppercase tracking-wider font-medium">
                        {video.type}
                      </span>
                      {video.resolution && video.resolution !== 'audio only' && video.resolution !== 'Unknown' && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-medium">
                          {video.resolution}
                        </span>
                      )}
                      {video.fps && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-medium">
                          {video.fps}fps
                        </span>
                      )}
                      {video.formatNote && (
                        <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-medium">
                          {video.formatNote}
                        </span>
                      )}
                      {video.filesize && (
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-medium">
                          {(video.filesize / 1024 / 1024).toFixed(1)} MB
                        </span>
                      )}
                      {video.vcodec && video.vcodec !== 'none' && (
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-md font-medium truncate max-w-[100px]" title={video.vcodec}>
                          {video.vcodec}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(video.url, `video-${idx}.${video.type}`)}
                    disabled={downloading === video.url}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading === video.url ? (
                      <span className="animate-pulse">Downloading...</span>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download Video
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
