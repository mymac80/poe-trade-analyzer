// Popup script for POE Stash Pricer extension
console.log('[POE Pricer] Popup loaded');

// Elements
const leagueSelect = document.getElementById('league-select') as HTMLInputElement;
const minValueInput = document.getElementById('min-value') as HTMLInputElement;
const saveButton = document.getElementById('save-settings') as HTMLButtonElement;
const refreshButton = document.getElementById('refresh-data') as HTMLButtonElement;
const statusMessage = document.getElementById('status-message') as HTMLDivElement;

// Load current settings
async function loadSettings(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });

    if (response.success) {
      const { league, minValueChaos } = response.settings;
      leagueSelect.value = league;
      minValueInput.value = minValueChaos.toString();
      console.log('[POE Pricer] Settings loaded:', response.settings);
    }
  } catch (error) {
    console.error('[POE Pricer] Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

// Save settings
async function saveSettings(): Promise<void> {
  const league = leagueSelect.value;
  const minValueChaos = parseInt(minValueInput.value) || 5;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: {
        league,
        minValueChaos
      }
    });

    if (response.success) {
      showStatus('Settings saved successfully!', 'success');
      console.log('[POE Pricer] Settings saved');
    } else {
      showStatus('Error saving settings', 'error');
    }
  } catch (error) {
    console.error('[POE Pricer] Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

// Refresh market data
async function refreshMarketData(): Promise<void> {
  try {
    showStatus('Refreshing market data...', 'success');
    refreshButton.disabled = true;
    refreshButton.textContent = 'Refreshing...';

    const response = await chrome.runtime.sendMessage({
      type: 'REFRESH_MARKET_DATA'
    });

    if (response.success) {
      showStatus('Market data refreshed successfully!', 'success');
    } else {
      showStatus(`Error: ${response.error}`, 'error');
    }
  } catch (error) {
    console.error('[POE Pricer] Error refreshing market data:', error);
    showStatus('Error refreshing market data', 'error');
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Refresh Market Data';
  }
}

// Show status message
function showStatus(message: string, type: 'success' | 'error'): void {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  // Clear after 3 seconds
  setTimeout(() => {
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
  }, 3000);
}

// Event listeners
saveButton.addEventListener('click', saveSettings);
refreshButton.addEventListener('click', refreshMarketData);

// Load settings on popup open
loadSettings();
