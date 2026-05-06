async function load() {
  const { syncUrl, syncToken } = await chrome.storage.local.get(['syncUrl', 'syncToken']);
  if (syncUrl) document.getElementById('syncUrl').value = syncUrl;
  if (syncToken) document.getElementById('syncToken').value = syncToken;
}

document.getElementById('save').addEventListener('click', async () => {
  const syncUrl = document.getElementById('syncUrl').value.trim();
  const syncToken = document.getElementById('syncToken').value.trim();
  await chrome.storage.local.set({ syncUrl, syncToken });
  const status = document.getElementById('status');
  status.textContent = 'Saved.';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

load();
