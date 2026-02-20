// Inject a floating usage bar on claude.ai pages

function barColor(pct) {
  if (pct < 50) return '#22aa44';
  if (pct < 75) return '#cc9900';
  if (pct < 90) return '#dd6600';
  return '#cc0000';
}

function createBar() {
  const bar = document.createElement('div');
  bar.id = 'claude-usage-bar';
  bar.style.cssText = `
    position: fixed;
    bottom: 12px;
    right: 12px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 6px 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    color: #aaa;
    z-index: 999999;
    display: flex;
    gap: 10px;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: default;
    user-select: none;
    transition: opacity 0.2s;
    opacity: 0.7;
  `;
  bar.addEventListener('mouseenter', () => bar.style.opacity = '1');
  bar.addEventListener('mouseleave', () => bar.style.opacity = '0.7');
  document.body.appendChild(bar);
  return bar;
}

function renderBar(bar, data) {
  if (!data) {
    bar.innerHTML = '<span style="color:#666">No usage data</span>';
    return;
  }

  const items = [
    { key: 'seven_day', label: 'W' },
    { key: 'seven_day_sonnet', label: 'S' },
    { key: 'five_hour', label: 'Sess' },
  ];

  bar.innerHTML = items
    .filter(i => data[i.key] != null)
    .map(i => {
      const pct = Math.round(data[i.key].utilization);
      const color = barColor(pct);
      return `<span style="color:#666">${i.label}:</span><span style="color:${color};font-weight:600">${pct}%</span>`;
    })
    .join('<span style="color:#333">│</span>');
}

function update(bar) {
  chrome.storage.local.get(['data'], ({ data }) => {
    renderBar(bar, data);
  });
}

const bar = createBar();
update(bar);

// Update when storage changes (new fetch from background)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.data) renderBar(bar, changes.data.newValue);
});
