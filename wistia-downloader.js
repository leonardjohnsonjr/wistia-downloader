  // ─── Helpers ───────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  function switchMode(mode) {
    document.getElementById('tabUrl').classList.toggle('active', mode === 'url');
    document.getElementById('tabSrc').classList.toggle('active', mode === 'src');
    document.getElementById('panelUrl').classList.toggle('active', mode === 'url');
    document.getElementById('panelSrc').classList.toggle('active', mode === 'src');
  }

  function now() {
    return new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function log(msg, type='info') {
    const box = $('logBox');
    box.classList.add('visible');
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.innerHTML = `<span class="ts">[${now()}]</span><span class="msg" style="word-break:break-all;">${msg}</span>`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function setStep(n) {
    for(let i=1;i<=4;i++){
      const el = $(`step${i}`);
      el.className = i < n ? 'step done' : i === n ? 'step active' : 'step';
      if(i < n) el.querySelector('.step-num').textContent = '✓';
      else el.querySelector('.step-num').textContent = i;
    }
  }

  function setProgress(pct) {
    $('progressBar').classList.add('visible');
    $('progressFill').style.width = pct+'%';
  }

  function showError(title, body, showManual=false) {
    $('errorCard').classList.add('visible');
    $('errorTitle').textContent = title;
    $('errorBody').textContent = body;
    $('manualFallback').style.display = showManual ? 'block' : 'none';
  }

  function clearError() {
    $('errorCard').classList.remove('visible');
  }

  function humanSize(bytes) {
    if(!bytes) return '—';
    if(bytes > 1e9) return (bytes/1e9).toFixed(1)+' GB';
    if(bytes > 1e6) return (bytes/1e6).toFixed(1)+' MB';
    return (bytes/1e3).toFixed(0)+' KB';
  }

  function humanRes(w,h) {
    if(!w||!h) return '';
    if(h>=2160) return '4K';
    if(h>=1080) return '1080p';
    if(h>=720)  return '720p';
    if(h>=480)  return '480p';
    return `${w}×${h}`;
  }

  // ─── Video ID extraction ───────────────────────────────────────────────────
  function extractVideoId(url) {
    const patterns = [
      /wistia\.com\/embed\/iframe\/([a-zA-Z0-9]+)/,
      /wistia\.net\/embed\/iframe\/([a-zA-Z0-9]+)/,
      /wistia\.com\/medias\/([a-zA-Z0-9]+)/,
      /embed\/medias\/([a-zA-Z0-9]+)/,
      /[?&]wvideo=([a-zA-Z0-9]+)/,
      /[?&]hashedId=([a-zA-Z0-9]+)/,
      /wistia_([a-zA-Z0-9]+)/,
      /\/([a-zA-Z0-9]{10,12})(?:\.jsonp?)?$/,   // bare hash at end
    ];
    for(const re of patterns) {
      const m = url.match(re);
      if(m) return m[1];
    }
    return null;
  }

  // ─── CORS proxies (try in order) ──────────────────────────────────────────
  const PROXIES = [
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://cors.sh/${url}`,
  ];

  async function fetchWithFallback(targetUrl) {
    // Try direct first (works if Wistia allows CORS)
    try {
      const r = await fetch(targetUrl, {mode:'cors'});
      if(r.ok) return r.text();
    } catch(e) {}

    // Try proxies
    for(const proxy of PROXIES) {
      try {
        const r = await fetch(proxy(targetUrl));
        if(r.ok) return r.text();
      } catch(e) {}
    }
    throw new Error('All fetch attempts failed (CORS/network)');
  }

  // ─── Copy to clipboard ───────────────────────────────────────────────────
  function copyUrl(url, btn) {
    navigator.clipboard.writeText(url).then(() => {
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = '⧉ Copy URL'; btn.classList.remove('copied'); }, 2000);
    });
  }

  // ─── Build asset grid ─────────────────────────────────────────────────────
  function buildAssetGrid(assets, media) {
    const title   = media.name || 'Wistia Video';
    const dur     = media.duration
      ? `${Math.floor(media.duration/60)}m ${Math.floor(media.duration%60)}s` : '';
    const total   = assets.length;

    const wrap = document.createElement('div');

    // Header row above table
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap;';
    hdr.innerHTML = `
      <span class="grid-header">${title}${dur ? ` <span style="font-weight:400;color:var(--muted)">· ${dur}</span>` : ''}</span>
      <span class="grid-meta">${total} asset${total !== 1 ? 's' : ''} found</span>`;
    wrap.appendChild(hdr);

    // Table
    const tableWrap = document.createElement('div');
    tableWrap.className = 'asset-table-wrap';

    const table = document.createElement('table');
    table.className = 'asset-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Size</th>
          <th>Width</th>
          <th>Height</th>
          <th>URL</th>
          <th>Copy URL</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody id="assetTbody"></tbody>`;
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);

    const tbody = table.querySelector('#assetTbody');

    assets.forEach((asset, i) => {
      const rawUrl = asset.url || '';
      const dlUrl  = rawUrl.replace(/\.bin(\?.*)?$/, '.mp4');
      const name   = asset.type
        ? asset.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : `Asset ${i + 1}`;
      const size   = humanSize(asset.size);
      const width  = asset.width  ? asset.width  + 'px' : '—';
      const height = asset.height ? asset.height + 'px' : '—';

      const tr = document.createElement('tr');
      tr.style.animationDelay = `${i * 40}ms`;
      tr.innerHTML = `
        <td class="td-name">${name}</td>
        <td class="td-size">${size}</td>
        <td class="td-dim">${width}</td>
        <td class="td-dim">${height}</td>
        <td class="td-url" title="${dlUrl}">${dlUrl}</td>
        <td><button class="btn-sm btn-copy" onclick="copyUrl('${dlUrl.replace(/'/g,"\\'")}', this)">⧉ Copy URL</button></td>
        <td><a class="btn-sm btn-dl" href="${dlUrl}" target="_blank">↓ Download</a></td>`;
      tbody.appendChild(tr);
    });

    return wrap;
  }

  // ─── Main extraction flow ─────────────────────────────────────────────────
  async function startExtraction() {
    // url is read inside the mode branches below

    // Reset UI
    $('fetchBtn').disabled = true;
    $('fetchBtn').innerHTML = '<span class="spinner"></span> Working…';
    $('logBox').innerHTML = '';
    $('logBox').classList.remove('visible');
    $('results').innerHTML = '';
    $('results').classList.remove('visible');
    $('videoIdRow').classList.remove('visible');
    clearError();
    setStep(1);
    setProgress(0);

    try {
      // Step 1: Get page source (paste or fetch) and extract video ID
      setStep(2); setProgress(15);

      let videoId = null;
      const mode = document.getElementById('tabUrl').classList.contains('active') ? 'url' : 'src';

      // Helper: scan HTML source for Wistia video ID
      function scanSource(src) {
        const embedPatterns = [
          /fast\.wistia\.(?:com|net)\/embed\/medias\/([a-zA-Z0-9]+)/,
          /fast\.wistia\.(?:com|net)\/embed\/iframe\/([a-zA-Z0-9]+)/,
        ];
        for (const re of embedPatterns) {
          const m = src.match(re);
          if (m) { log(`Found embed URL in source — ID: <b>${m[1]}</b>`, 'ok'); return m[1]; }
        }
        const fallbackPatterns = [
          /hashedId['":,\s]+([a-zA-Z0-9]{8,})/,
          /_wq\.push[^;]+id:\s*['"]([a-zA-Z0-9]+)['"]/,
          /wvideo=([a-zA-Z0-9]+)/,
          /wistia_([a-zA-Z0-9]{8,})/,
        ];
        for (const re of fallbackPatterns) {
          const m = src.match(re);
          if (m) { log(`Found ID via fallback pattern — ID: <b>${m[1]}</b>`, 'ok'); return m[1]; }
        }
        return null;
      }

      if (mode === 'src') {
        // ── Paste mode: use the pasted HTML directly ──────────────────────
        const pasted = document.getElementById('srcInput').value.trim();
        if (!pasted) throw { title: 'No source pasted', body: 'Switch to "Page Source" mode and paste the page HTML first.', manual: false };
        log('Scanning pasted page source…', 'info');
        videoId = scanSource(pasted);
      } else {
        // ── URL mode: try to fetch the page ──────────────────────────────
        const url = $('urlInput').value.trim();
        log('Fetching page source…', 'info');
        try {
          const pageSource = await fetchWithFallback(url);
          log('Page retrieved — scanning for Wistia embed URL…', 'info');
          videoId = scanSource(pageSource);
          if (!videoId) log('No Wistia embed URL found in fetched source', 'warn');
        } catch(e) {
          log('Could not fetch page (likely auth-protected) — try "Page Source" mode instead', 'warn');
          videoId = extractVideoId(url);
        }
      }

      log(`Found video ID: ${videoId}`, 'ok');
      $('videoIdDisplay').textContent = videoId;
      $('videoIdRow').classList.add('visible');
      setStep(3); setProgress(40);

      // ── Step 2: Fetch Wistia media JSON ───────────────────────────────────
      const mediaUrl = `https://fast.wistia.net/embed/medias/${videoId}.json`;
      log(`Fetching: <a href="${mediaUrl}" target="_blank" style="color:var(--accent);text-decoration:underline;">${mediaUrl}</a>`, 'info');

      let raw;
      let rawText = null;
      try {
        const resp = await fetch(mediaUrl);
        if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
        rawText = await resp.text();
        raw = JSON.parse(rawText);
        log('Direct fetch succeeded', 'ok');
      } catch(e) {
        log(`Direct fetch failed (${e.message}) — trying proxy…`, 'warn');
        try {
          rawText = await fetchWithFallback(mediaUrl);
          raw = JSON.parse(rawText);
          log('Proxy fetch succeeded', 'ok');
        } catch(e2) {
          throw {
            title: 'Could not fetch video metadata',
            body: `Failed to reach Wistia API for video ID "${videoId}".\n\nPossible reasons: the video may be private, the ID may be wrong, or there's a network issue.`,
            manual: true
          };
        }
      }

      // Log raw JSON to on-screen console
      setProgress(70);
      log('Raw JSON response:', 'info');
      const jsonPreview = document.createElement('div');
      jsonPreview.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin:4px 0 6px;font-family:"Space Mono",monospace;font-size:10px;color:var(--muted);white-space:pre-wrap;word-break:break-all;max-height:180px;overflow-y:auto;line-height:1.5;';
      jsonPreview.textContent = JSON.stringify(raw, null, 2);
      $('logBox').appendChild(jsonPreview);
      $('logBox').scrollTop = $('logBox').scrollHeight;

      log('Scanning assets…', 'info');

      // ── Step 3: Parse assets ───────────────────────────────────────────────
      const media = raw.media || raw;
      const assets = media.assets || [];

      if(!assets.length) {
        throw {
          title: 'No downloadable assets found',
          body: `Wistia returned metadata but no downloadable video files were listed.\n\nThe video may be set to restrict downloads, or it may require authentication.`,
          manual: true
        };
      }

      setProgress(90);
      log(`Found ${assets.length} asset(s) — building grid…`, 'ok');

      // ── Step 4: Show results ───────────────────────────────────────────────
      setStep(4); setProgress(100);

      const resultsDiv = $('results');
      resultsDiv.classList.add('visible');
      resultsDiv.appendChild(buildAssetGrid(assets, media));
      log('Done! All assets listed below.', 'ok');

    } catch(err) {
      if(err.title) {
        log(err.title, 'err');
        showError(err.title, err.body, err.manual);
      } else {
        log('Unexpected error: ' + err.message, 'err');
        showError('Unexpected Error', err.message, true);
      }
      setProgress(0);
      $('progressBar').classList.remove('visible');
    } finally {
      $('fetchBtn').disabled = false;
      $('fetchBtn').textContent = 'Extract ↗';
    }
  }

  // Allow Enter key
  $('urlInput').addEventListener('keydown', e => {
    if(e.key === 'Enter') startExtraction();
  });

  // Paste & go
  $('urlInput').addEventListener('paste', () => {
    setTimeout(() => {
      const v = $('urlInput').value.trim();
      if(v.startsWith('http') && document.getElementById('tabUrl').classList.contains('active')) startExtraction();
    }, 80);
  });
