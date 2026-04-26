import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import * as cheerio from 'cheerio';
import archiver from 'archiver';
import { URL } from 'url';
import puppeteer from 'puppeteer';
import youtubedl from 'youtube-dl-exec';
import ytdl from '@distube/ytdl-core';
import { parseSrcset } from 'srcset';
import { Font, woff2 } from 'fonteditor-core';

// Init woff2 for font conversions
woff2.init().catch(console.error);

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
  },
});
app.use('/api/', limiter);

// Helper to resolve URLs
const resolveUrl = (base: string, relative: string) => {
  try {
    const url = new URL(relative, base);
    url.hash = ''; // Strip hash to prevent 404s on some servers
    return url.href;
  } catch (e) {
    return null;
  }
};

// Helper to extract fonts from CSS
const extractFontsFromCss = (cssText: string, baseUrl: string) => {
  const fonts: any[] = [];
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
  let match;

  while ((match = fontFaceRegex.exec(cssText)) !== null) {
    const block = match[1];
    const fontFamilyMatch = block.match(/font-family\s*:\s*['"]?([^'";]+)['"]?/);
    const srcMatch = block.match(/src\s*:\s*([^;]+)/);

    if (fontFamilyMatch && srcMatch) {
      const fontFamily = fontFamilyMatch[1].trim();
      const srcUrls = srcMatch[1].match(/url\(['"]?([^'")]+)['"]?\)/g);

      if (srcUrls) {
        srcUrls.forEach((urlMatch) => {
          const urlStr = urlMatch.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];
          if (urlStr) {
            const absoluteUrl = resolveUrl(baseUrl, urlStr);
            if (absoluteUrl && !absoluteUrl.startsWith('data:')) {
              let format = 'unknown';
              if (absoluteUrl.endsWith('.woff2')) format = 'woff2';
              else if (absoluteUrl.endsWith('.woff')) format = 'woff';
              else if (absoluteUrl.endsWith('.ttf')) format = 'ttf';
              else if (absoluteUrl.endsWith('.otf')) format = 'otf';
              else if (absoluteUrl.endsWith('.eot')) format = 'eot';

              fonts.push({
                family: fontFamily,
                url: absoluteUrl,
                format,
              });
            }
          }
        });
      }
    }
  }
  return fonts;
};

// Helper to extract colors from CSS
const extractColorsFromCss = (cssText: string) => {
  const colors: string[] = [];
  const hexRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b|#(?:[0-9a-fA-F]{4}){1,2}\b/g;
  const rgbRegex = /(?:rgb|rgba)\([^)]+\)/gi;
  const hslRegex = /(?:hsl|hsla)\([^)]+\)/gi;

  let match;
  while ((match = hexRegex.exec(cssText)) !== null) {
    colors.push(match[0].toLowerCase());
  }
  while ((match = rgbRegex.exec(cssText)) !== null) {
    colors.push(match[0].toLowerCase().replace(/\s+/g, ''));
  }
  while ((match = hslRegex.exec(cssText)) !== null) {
    colors.push(match[0].toLowerCase().replace(/\s+/g, ''));
  }
  return colors;
};

// Helper to extract images from CSS
const extractImagesFromCss = (cssText: string, baseUrl: string) => {
  const images: any[] = [];
  const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
  let match;

  while ((match = urlRegex.exec(cssText)) !== null) {
    const urlStr = match[1];
    if (urlStr && !urlStr.startsWith('data:')) {
      const absoluteUrl = resolveUrl(baseUrl, urlStr);
      if (absoluteUrl) {
        let type = absoluteUrl.split('.').pop()?.split('?')[0].toLowerCase() || 'unknown';
        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'].includes(type)) {
          images.push({
            url: absoluteUrl,
            type: type,
          });
        }
      }
    }
  }
  return images;
};

// API Endpoint to extract assets
app.post('/api/extract', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const targetUrl = new URL(url).href;
    
    const images: any[] = [];
    const videos: any[] = [];
    let fonts: any[] = [];
    let colors: string[] = [];

    const isYouTube = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be');

    if (isYouTube) {
      try {
        const info = await ytdl.getInfo(targetUrl);
        
        const thumbnail = info.videoDetails.thumbnails.pop()?.url;
        if (thumbnail) {
          images.push({ url: thumbnail, type: 'jpg' });
        }
        
        if (info.formats) {
          info.formats.forEach((format: any) => {
            if (format.url && format.hasVideo) {
              videos.push({
                url: format.url,
                type: format.container || 'mp4',
                resolution: format.qualityLabel || 'Unknown',
                formatNote: format.quality,
                fps: format.fps,
                vcodec: format.videoCodec,
                acodec: format.audioCodec,
                filesize: format.contentLength,
                isYouTubeDirect: true
              });
            }
          });
        }
        
        // Return early for YouTube to bypass browser
        const uniqueImages = Array.from(new Set(images.map(i => i.url))).map(url => images.find(i => i.url === url));
        const uniqueVideos = Array.from(new Set(videos.map(v => v.url))).map(url => videos.find(v => v.url === url));
        
        return res.json({
          images: uniqueImages,
          videos: uniqueVideos.length > 0 ? uniqueVideos : [{ url: targetUrl, type: 'youtube', isYouTube: true }],
          fonts: [],
          colors: [],
        });
      } catch (err: any) {
        console.error('ytdl-core error:', err.message);
        // Fallback to SaveFrom.net / third-party integration if blocked
        return res.json({
          images: [],
          videos: [{ url: targetUrl, type: 'youtube', isYouTube: true }],
          fonts: [],
          colors: [],
        });
      }
    }

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Intercept network requests
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      request.continue();
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      const resourceType = response.request().resourceType();
      const status = response.status();
      
      if (status >= 200 && status < 300) {
        if (resourceType === 'image') {
          let type = url.split('.').pop()?.split('?')[0].toLowerCase() || 'unknown';
          if (type.length > 5 || !/^[a-z0-9]+$/.test(type)) type = 'unknown';
          images.push({ url, type });
        } else if (resourceType === 'media') {
          let type = url.split('.').pop()?.split('?')[0].toLowerCase() || 'unknown';
          if (type.length > 5 || !/^[a-z0-9]+$/.test(type)) type = 'unknown';
          videos.push({ url, type });
        } else if (resourceType === 'font') {
          let format = 'unknown';
          if (url.endsWith('.woff2')) format = 'woff2';
          else if (url.endsWith('.woff')) format = 'woff';
          else if (url.endsWith('.ttf')) format = 'ttf';
          else if (url.endsWith('.otf')) format = 'otf';
          else if (url.endsWith('.eot')) format = 'eot';
          
          fonts.push({
            family: url.split('/').pop()?.split('.')[0] || 'Unknown',
            url: url,
            format,
          });
        }
      }
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.log('Goto timeout, continuing...'));
    
    // Scroll down to trigger lazy loading for the entire page
    await page.evaluate(`
      (async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 400;
          
          let lastScrollHeight = document.body ? document.body.scrollHeight : (document.documentElement ? document.documentElement.scrollHeight : 0);
          let unchangedCount = 0;
          
          const timer = setInterval(() => {
            const scrollHeight = document.body ? document.body.scrollHeight : (document.documentElement ? document.documentElement.scrollHeight : 0);
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (scrollHeight === lastScrollHeight) {
              unchangedCount++;
            } else {
              unchangedCount = 0;
              lastScrollHeight = scrollHeight;
            }

            if ((totalHeight >= scrollHeight && unchangedCount > 10) || totalHeight > 50000 || scrollHeight === 0) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      })()
    `);

    // Wait a bit for the last batch of lazy loaded images
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract primary colors directly from DOM computed styles
    const domColors = await page.evaluate(`
      (() => {
        const colorSet = new Set();
        const rgbToHex = (rgb) => {
          const result = /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/.exec(rgb);
          if (!result) return rgb;
          return "#" + (1 << 24 | parseInt(result[1]) << 16 | parseInt(result[2]) << 8 | parseInt(result[3])).toString(16).slice(1);
        };

        const elementsToInspect = document.querySelectorAll('button, a, header, footer, h1, h2, h3, nav, .btn, .cta, .primary, [role="button"], section');
        elementsToInspect.forEach(el => {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          const color = style.color;
          const border = style.borderColor;
          
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
             colorSet.add(rgbToHex(bg));
          }
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
             colorSet.add(rgbToHex(color));
          }
          if (style.borderWidth !== '0px' && style.borderStyle !== 'none' && border && border !== 'rgba(0, 0, 0, 0)' && border !== 'transparent' && !border.includes('rgba(0, 0, 0, 0)')) {
             colorSet.add(rgbToHex(border));
          }
        });
        
        if (document.body) {
          const bodyStyle = window.getComputedStyle(document.body);
          if (bodyStyle.backgroundColor && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && bodyStyle.backgroundColor !== 'transparent') {
             colorSet.add(rgbToHex(bodyStyle.backgroundColor));
          }
          if (bodyStyle.color && bodyStyle.color !== 'rgba(0, 0, 0, 0)' && bodyStyle.color !== 'transparent') {
             colorSet.add(rgbToHex(bodyStyle.color));
          }
        }
        return Array.from(colorSet);
      })()
    `);
    
    // Assign gathered primary colors
    colors = domColors;

    // Also extract from DOM just in case (like inline SVGs, colors)
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const addImage = (urlStr: string | undefined) => {
      if (!urlStr) return;
      const absoluteUrl = resolveUrl(targetUrl, urlStr);
      if (absoluteUrl && !absoluteUrl.startsWith('data:')) {
        let type = absoluteUrl.split('.').pop()?.split('?')[0].toLowerCase() || 'unknown';
        if (type.length > 5 || !/^[a-z0-9]+$/.test(type)) type = 'unknown';
        images.push({
          url: absoluteUrl,
          type: type,
        });
      }
    };

    const addSrcset = (srcset: string | undefined) => {
      if (!srcset) return;
      try {
        const parsed = parseSrcset(srcset);
        parsed.forEach(part => {
          addImage(part.url);
        });
      } catch (e) {
        // Fallback to simple split if parsing fails
        const parts = srcset.split(/,\s+/);
        parts.forEach(part => {
          const urlStr = part.trim().split(/\s+/)[0];
          addImage(urlStr);
        });
      }
    };

    // Extract Images from img tags
    $('img').each((_, el) => {
      addImage($(el).attr('src'));
      addImage($(el).attr('data-src'));
      addSrcset($(el).attr('srcset'));
      addSrcset($(el).attr('data-srcset'));
    });

    // Extract Images from svg image tags
    $('svg image').each((_, el) => {
      addImage($(el).attr('href'));
      addImage($(el).attr('xlink:href'));
    });

    // Extract Images from svg use tags
    $('svg use').each((_, el) => {
      const href = $(el).attr('href') || $(el).attr('xlink:href');
      if (href && !href.startsWith('#')) {
        addImage(href);
      }
    });

    // Extract Images from picture source tags
    $('picture source').each((_, el) => {
      addSrcset($(el).attr('srcset'));
      addSrcset($(el).attr('data-srcset'));
    });

    // Extract Images from meta tags
    $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) => {
      addImage($(el).attr('content'));
    });

    // Extract Images from link tags (icons)
    $('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="shortcut icon"]').each((_, el) => {
      addImage($(el).attr('href'));
    });

    // Extract Images from inline styles
    $('[style*="background-image"]').each((_, el) => {
      const style = $(el).attr('style');
      if (style) {
        const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (match && match[1]) {
          addImage(match[1]);
        }
      }
    });

    // Extract inline SVGs
    $('svg').each((idx, el) => {
      // Ensure it has xmlns
      if (!$(el).attr('xmlns')) {
        $(el).attr('xmlns', 'http://www.w3.org/2000/svg');
      }
      const svgString = $.html(el);
      const base64 = Buffer.from(svgString).toString('base64');
      const dataUri = `data:image/svg+xml;base64,${base64}`;
      images.push({
        url: dataUri,
        type: 'svg',
        isInlineSvg: true,
      });
    });

    // Extract Videos
    $('video source').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        const absoluteUrl = resolveUrl(targetUrl, src);
        if (absoluteUrl && !absoluteUrl.startsWith('data:')) {
          videos.push({
            url: absoluteUrl,
            type: absoluteUrl.split('.').pop()?.split('?')[0] || 'mp4',
          });
        }
      }
    });
    $('video').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        const absoluteUrl = resolveUrl(targetUrl, src);
        if (absoluteUrl && !absoluteUrl.startsWith('data:')) {
          videos.push({
            url: absoluteUrl,
            type: absoluteUrl.split('.').pop()?.split('?')[0] || 'mp4',
          });
        }
      }
    });

    // Extract Fonts, Colors, and Images from inline styles
    $('style').each((_, el) => {
      const cssText = $(el).html();
      if (cssText) {
        fonts = fonts.concat(extractFontsFromCss(cssText, targetUrl));
        images.push(...extractImagesFromCss(cssText, targetUrl));
      }
    });

    // Extract colors and images from inline style attributes
    $('[style]').each((_, el) => {
      const style = $(el).attr('style');
      if (style) {
        images.push(...extractImagesFromCss(style, targetUrl));
      }
    });

    // Extract colors from svg fill and stroke
    $('[fill], [stroke], [color], [bgcolor]').each((_, el) => {
      const fill = $(el).attr('fill');
      const stroke = $(el).attr('stroke');
      const color = $(el).attr('color');
      const bgcolor = $(el).attr('bgcolor');
      
      const addColor = (c: string | undefined) => {
        if (c && c !== 'none' && c !== 'transparent' && !c.startsWith('url(') && !c.startsWith('var(')) {
          if (c.startsWith('#') || c.startsWith('rgb') || c.startsWith('hsl') || /^[a-zA-Z]+$/.test(c)) {
            colors.push(c.toLowerCase().replace(/\s+/g, ''));
          }
        }
      };
      
      addColor(fill);
      addColor(stroke);
      addColor(color);
      addColor(bgcolor);
    });

    // Extract Fonts from external stylesheets
    const cssLinks: string[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const absoluteUrl = resolveUrl(targetUrl, href);
        if (absoluteUrl) {
          cssLinks.push(absoluteUrl);
        }
      }
    });

    // Fetch external CSS (limit to 5 to avoid timeouts)
    for (const cssUrl of cssLinks.slice(0, 5)) {
      try {
        const cssResponse = await axios.get(cssUrl, { 
          timeout: 5000,
          validateStatus: (status) => status === 200,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          }
        });
        if (cssResponse.data) {
          fonts = fonts.concat(extractFontsFromCss(cssResponse.data, cssUrl));
          images.push(...extractImagesFromCss(cssResponse.data, cssUrl));
        }
      } catch (e: any) {
        // Only log non-4xx errors to avoid cluttering the console with expected missing/forbidden files
        if (e.response && e.response.status >= 400 && e.response.status < 500) {
          console.warn(`CSS file could not be fetched (${e.response.status}): ${cssUrl}`);
        } else {
          console.error(`Failed to fetch CSS: ${cssUrl}`, e.message || e);
        }
      }
    }

    await browser.close();

    // Deduplicate
    const uniqueImages = Array.from(new Set(images.map(i => i.url))).map(url => images.find(i => i.url === url));
    const uniqueVideos = Array.from(new Set(videos.map(v => v.url))).map(url => videos.find(v => v.url === url));
    const uniqueFonts = Array.from(new Set(fonts.map(f => f.url))).map(url => fonts.find(f => f.url === url));
    const uniqueColors = Array.from(new Set(colors)).filter(c => c.length > 0);

    res.json({
      images: uniqueImages,
      videos: uniqueVideos,
      fonts: uniqueFonts,
      colors: uniqueColors,
    });

  } catch (error: any) {
    console.error('Extraction error:', error.message);
    res.status(500).json({ error: 'Failed to extract assets. The site might be blocking requests or is unreachable.' });
  }
});

// API Endpoint to convert font formats
app.get('/api/convert-font', async (req, res) => {
  const { url, toFormat, originalFormat } = req.query;
  if (!url || typeof url !== 'string' || !toFormat || typeof toFormat !== 'string') {
    return res.status(400).json({ error: 'URL and toFormat are required' });
  }

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const buffer = Buffer.from(response.data);
    
    let fromFormat = (originalFormat as string)?.toLowerCase() || url.split('.').pop()?.split('?')[0].toLowerCase() || '';
    if (fromFormat === 'truetype') fromFormat = 'ttf';
    if (fromFormat === 'opentype') fromFormat = 'otf';
    
    if (fromFormat === 'unknown') {
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('woff2')) fromFormat = 'woff2';
      else if (contentType.includes('woff')) fromFormat = 'woff';
      else if (contentType.includes('ttf') || contentType.includes('truetype')) fromFormat = 'ttf';
      else if (contentType.includes('otf') || contentType.includes('opentype')) fromFormat = 'otf';
      else if (contentType.includes('svg')) fromFormat = 'svg';
      else if (contentType.includes('eot')) fromFormat = 'eot';
    }

    if (!['ttf', 'woff', 'woff2', 'eot', 'otf', 'svg'].includes(fromFormat)) {
      // If we still can't determine it, we just send it as is if it's the requested type or fail
      return res.status(400).json({ error: 'Unsupported or undetectable original font format: ' + fromFormat });
    }

    if (fromFormat === toFormat) {
      const filename = url.split('/').pop()?.split('?')[0] || `font.${toFormat}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    const font = Font.create(buffer, {
      type: fromFormat as any,
    });

    const outputBuffer = font.write({
      type: toFormat as any,
    });

    const filename = url.split('/').pop()?.split('?')[0] || 'font';
    const newFilename = filename.replace(/\.[^/.]+$/, "") + '.' + toFormat;
    
    let contentType = 'application/octet-stream';
    if (toFormat === 'woff2') contentType = 'font/woff2';
    else if (toFormat === 'woff') contentType = 'font/woff';
    else if (toFormat === 'ttf') contentType = 'font/ttf';
    else if (toFormat === 'eot') contentType = 'application/vnd.ms-fontobject';
    else if (toFormat === 'svg') contentType = 'image/svg+xml';
    
    res.setHeader('Content-Disposition', `attachment; filename="${newFilename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(outputBuffer));

  } catch (error: any) {
    console.error('Font conversion error:', error.message || error);
    res.status(500).json({ error: 'Failed to convert font: ' + error.message });
  }
});

// API Endpoint to proxy download (avoids CORS)
app.get('/api/download', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const filename = url.split('/').pop()?.split('?')[0] || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    
    response.data.pipe(res);
  } catch (error: any) {
    console.error('Download error:', error.message || error);
    res.status(error.response?.status || 500).json({ error: 'Failed to download file' });
  }
});

// API Endpoint to download multiple files as ZIP
app.post('/api/download-zip', async (req, res) => {
  const { urls, items } = req.body;
  const list = items || urls;
  
  if (!list || !Array.isArray(list)) {
    return res.status(400).json({ error: 'Array of items or urls is required' });
  }

  try {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    res.setHeader('Content-Disposition', 'attachment; filename="assets.zip"');
    res.setHeader('Content-Type', 'application/zip');

    archive.pipe(res);

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const url = typeof item === 'string' ? item : item.url;
      const isFontConversion = typeof item === 'object' && item.toFormat;
      
      try {
        if (url.startsWith('data:')) {
          const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const buffer = Buffer.from(matches[2], 'base64');
            let ext = matches[1].split('/')[1]?.split('+')[0] || 'bin';
            if (ext === 'svg') ext = 'svg'; // handle svg+xml
            archive.append(buffer, { name: `inline-image-${i}.${ext}` });
          }
        } else if (isFontConversion) {
          // Fetch and convert font
          const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          });
          
          let fromFormat = (item.originalFormat as string)?.toLowerCase() || url.split('.').pop()?.split('?')[0].toLowerCase() || '';
          if (fromFormat === 'truetype') fromFormat = 'ttf';
          if (fromFormat === 'opentype') fromFormat = 'otf';
          
          let buffer = Buffer.from(response.data);
          let toFormat = item.toFormat;
          let filename = url.split('/').pop()?.split('?')[0] || `font.${toFormat}`;
          
          if (fromFormat !== 'unknown' && fromFormat !== toFormat && ['ttf', 'woff', 'woff2', 'eot', 'otf', 'svg'].includes(fromFormat)) {
             try {
                const font = Font.create(buffer, { type: fromFormat as any });
                buffer = font.write({ type: toFormat as any });
                filename = filename.replace(/\.[^/.]+$/, "") + '.' + toFormat;
             } catch(e) {
                console.error("Zip font conversion failed for " + url, e);
             }
          }
          
          archive.append(buffer, { name: filename });

        } else {
          const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          });
          const filename = url.split('/').pop()?.split('?')[0] || `file-${i}`;
          archive.append(response.data, { name: filename });
        }
      } catch (e: any) {
        console.error(`Failed to add ${url} to zip:`, e.message || e);
      }
    }

    await archive.finalize();
  } catch (error: any) {
    console.error('ZIP error:', error.message || error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create ZIP file' });
    }
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
