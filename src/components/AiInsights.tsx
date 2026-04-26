import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Sparkles, Globe, AlertCircle } from 'lucide-react';
import Markdown from 'react-markdown';

export default function AiInsights({ url }: { url: string }) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    setInsights(null);
    setGroundingChunks([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide a comprehensive summary and insights about this URL: ${url}. What is this page about? Who is the author or organization? What are the key takeaways? Use Google Search to get the most up-to-date and accurate information.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      
      setInsights(response.text || 'No insights generated.');
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        setGroundingChunks(chunks);
      }
    } catch (err: any) {
      console.error('AI Insights Error:', err);
      setError(err.message || 'Failed to generate insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url) {
      fetchInsights();
    }
  }, [url]);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">AI Insights</h3>
          <p className="text-sm text-zinc-500">Powered by Gemini & Google Search</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
          <p className="font-medium">Analyzing page content and searching the web...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error generating insights</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchInsights}
              className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : insights ? (
        <div className="space-y-6">
          <div className="prose prose-zinc max-w-none">
            <div className="markdown-body">
              <Markdown>{insights}</Markdown>
            </div>
          </div>
          
          {groundingChunks.length > 0 && (
            <div className="mt-8 pt-6 border-t border-zinc-100">
              <h4 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-zinc-500" />
                Sources
              </h4>
              <ul className="space-y-2">
                {groundingChunks.map((chunk, idx) => {
                  if (chunk.web?.uri) {
                    return (
                      <li key={idx}>
                        <a 
                          href={chunk.web.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                        >
                          {chunk.web.title || chunk.web.uri}
                        </a>
                      </li>
                    );
                  }
                  return null;
                })}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
