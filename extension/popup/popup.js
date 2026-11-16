const DEFAULTS = { enabled: true, mode: 'dim' };
const RULESET_ID = 'block_bookmarks';

const enabledEl = document.getElementById('enabled');
const modeGroup = document.getElementById('mode-group');
const statusEl = document.getElementById('status');

function render(state) {
  enabledEl.checked = state.enabled;
  modeGroup.disabled = !state.enabled;
  const radio = document.querySelector(`input[name="mode"][value="${state.mode}"]`);
  if (radio) radio.checked = true;
  statusEl.textContent = state.enabled
    ? 'Bookmarks are blocked on x.com.'
    : 'Blocking is turned off.';
}

// Keeps the network redirect rule in sync with the popup state
async function syncRuleset(enabled) {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets(
      enabled ? { enableRulesetIds: [RULESET_ID] } : { disableRulesetIds: [RULESET_ID] }
    );
  } catch (err) {
    console.error('Bookmark Guard: could not update the ruleset', err);
  }
}

async function init() {
  const state = { ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) };
  render(state);
  await syncRuleset(state.enabled);

  enabledEl.addEventListener('change', async () => {
    state.enabled = enabledEl.checked;
    await chrome.storage.local.set({ enabled: state.enabled });
    await syncRuleset(state.enabled);
    render(state);
  });

  document.querySelectorAll('input[name="mode"]').forEach((el) =>
    el.addEventListener('change', async () => {
      state.mode = el.value;
      await chrome.storage.local.set({ mode: state.mode });
      render(state);
    })
  );
}

init();
