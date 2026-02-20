function barColor(pct) {
  if (pct < 50) return '#22aa44';
  if (pct < 75) return '#cc9900';
  if (pct < 90) return '#dd6600';
  return '#cc0000';
}

function pctColor(pct) {
  if (pct < 50) return '#44cc66';
  if (pct < 75) return '#ddaa00';
  if (pct < 90) return '#ee7700';
  return '#ee3333';
}

function formatReset(resetsAt) {
  if (!resetsAt) return '';
  try {
    const d = new Date(resetsAt);
    const now = new Date();
    const diffMs = d - now;
    if (diffMs < 0) return 'Resetting soon';
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    if (diffH > 24) {
      return `Resets ${d.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`;
    }
    if (diffH > 0) return `Resets in ${diffH}h ${diffM}m`;
    return `Resets in ${diffM}m`;
  } catch { return ''; }
}

function parseLimits(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const candidates = [
    { key: 'five_hour',        label: 'Current session' },
    { key: 'seven_day',        label: 'Weekly — all models' },
    { key: 'seven_day_sonnet', label: 'Weekly — Sonnet only' },
  ];
  return candidates
    .filter(c => raw[c.key] != null)
    .map(c => ({
      label: c.label,
      pct: raw[c.key].utilization ?? 0,
      resetsAt: raw[c.key].resets_at ?? null,
    }));
}

function renderLimits(limits) {
  return limits.map(l => {
    const pct = Math.round(l.pct);
    const reset = formatReset(l.resetsAt);
    return `
      <div class="limit">
        <div class="limit-header">
          <span class="limit-label">${l.label}</span>
          <span class="limit-pct" style="color:${pctColor(pct)}">${pct}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${barColor(pct)}"></div>
        </div>
        ${reset ? `<div class="reset-time">${reset}</div>` : ''}
      </div>`;
  }).join('');
}

async function render() {
  const el = document.getElementById('content');
  const { data, error, fetched } = await chrome.storage.local.get(['data', 'error', 'fetched']);

  if (error && !data) {
    el.innerHTML = `
      <div class="error">${error}</div>
      <div class="footer" style="justify-content:center;margin-top:12px">
        <button id="refresh">Refresh</button>
      </div>`;
  } else {
    const limits = parseLimits(data);
    const fetchedStr = fetched
      ? `Updated ${new Date(fetched).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      : 'Never updated';

    if (limits.length === 0) {
      // Unknown shape — show raw so we can debug
      el.innerHTML = `
        <div class="error">Unknown response format</div>
        <pre style="font-size:10px;color:#555;margin-top:8px;white-space:pre-wrap;word-break:break-all">${JSON.stringify(data, null, 2)}</pre>
        <div class="footer" style="margin-top:10px;justify-content:center">
          <button id="refresh">Refresh</button>
        </div>`;
    } else {
      el.innerHTML = `
        ${renderLimits(limits)}
        <hr class="divider">
        <div class="footer">
          <span class="fetched-time">${fetchedStr}</span>
          <button id="refresh">↻ Refresh</button>
        </div>`;
    }
  }

  document.getElementById('refresh')?.addEventListener('click', async () => {
    document.getElementById('refresh').textContent = '…';
    await chrome.runtime.sendMessage({ type: 'refresh' });
    await render();
  });
}

render();
