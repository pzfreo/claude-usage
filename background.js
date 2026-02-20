const ALARM_NAME = 'fetch-usage';
const FETCH_INTERVAL_MINUTES = 1;

async function getCookies() {
  const [sessionKey, orgCookie] = await Promise.all([
    chrome.cookies.get({ url: 'https://claude.ai', name: 'sessionKey' }),
    chrome.cookies.get({ url: 'https://claude.ai', name: 'lastActiveOrg' }),
  ]);
  return {
    sessionKey: sessionKey?.value || null,
    orgId: orgCookie?.value || null,
  };
}

async function fetchUsage() {
  const { sessionKey, orgId } = await getCookies();

  if (!sessionKey || !orgId) {
    await chrome.storage.local.set({ error: 'Not logged in to claude.ai', data: null });
    chrome.action.setBadgeText({ text: '?' });
    chrome.action.setBadgeBackgroundColor({ color: '#888888' });
    return;
  }

  try {
    const res = await fetch(`https://claude.ai/api/organizations/${orgId}/usage`, {
      headers: {
        'accept': '*/*',
        'anthropic-client-platform': 'web_claude_ai',
        'anthropic-client-version': '1.0.0',
        'content-type': 'application/json',
        'cookie': `sessionKey=${sessionKey}`,
      },
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const raw = await res.json();
    await chrome.storage.local.set({ data: raw, error: null, fetched: Date.now() });
    updateBadge(raw);

    // Bridge to filesystem for Claude Code statusline
    try {
      chrome.runtime.sendNativeMessage('com.claude.usage', raw, () => {
        if (chrome.runtime.lastError) { /* native host not installed — ignore */ }
      });
    } catch (e) {}
  } catch (e) {
    await chrome.storage.local.set({ error: e.message, data: null });
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#cc0000' });
  }
}

function badgeColor(pct) {
  if (pct < 50) return '#22aa44';
  if (pct < 75) return '#cc9900';
  if (pct < 90) return '#dd6600';
  return '#cc0000';
}

function updateBadge(raw) {
  const limits = parseLimits(raw);
  const weekly = limits.find(l => l.key === 'weekly_all');
  if (weekly) {
    const pct = Math.round(weekly.pct);
    chrome.action.setBadgeText({ text: `${pct}%` });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor(pct) });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

function parseLimits(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const candidates = [
    { key: 'five_hour',     label: 'Current session' },
    { key: 'seven_day',     label: 'Weekly — all models' },
    { key: 'seven_day_sonnet', label: 'Weekly — Sonnet only' },
  ];
  return candidates
    .filter(c => raw[c.key] != null)
    .map(c => ({
      key: c.key,
      label: c.label,
      pct: raw[c.key].utilization ?? 0,
      resetsAt: raw[c.key].resets_at ?? null,
    }));
}

// Alarms
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) fetchUsage();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: FETCH_INTERVAL_MINUTES });
  fetchUsage();
});

chrome.runtime.onStartup.addListener(() => {
  fetchUsage();
});

// Allow popup to trigger a manual refresh
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'refresh') {
    fetchUsage().then(() => sendResponse({ ok: true }));
    return true; // async response
  }
});
