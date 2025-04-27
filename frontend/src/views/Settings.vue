<template>
  <div class="settings">
    <h1>Settings</h1>
    
    <div class="settings-section">
      <h2>Data Sources</h2>
      
      <!-- Fitbit Settings -->
      <div class="settings-card">
        <div class="settings-header">
          <h3>Fitbit</h3>
          <span :class="['status', { 'connected': fitbitConnected }]">
            {{ fitbitConnected ? 'Connected' : 'Not Connected' }}
          </span>
        </div>
        <div class="settings-content">
          <div class="connection-info">
            <p v-if="!fitbitConnected">
              Connect your Fitbit account to sync health data including:
            </p>
            <ul v-if="!fitbitConnected" class="feature-list">
              <li>Heart rate and HRV</li>
              <li>Sleep stages and duration</li>
              <li>Steps and activity</li>
              <li>SpO₂ and breathing rate</li>
            </ul>
            <div v-else>
              <p>Last synced: {{ formatDate(fitbitLastSync) }}</p>
              <button @click="syncFitbit" :disabled="isSyncing || isConnecting">
                {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
              </button>
            </div>
          </div>
          <div class="settings-actions">
            <button 
              v-if="!fitbitConnected" 
              @click="connectFitbit" 
              :disabled="isConnecting"
              class="connect-button"
            >
              {{ isConnecting ? 'Connecting...' : 'Connect Fitbit' }}
            </button>
            <button 
              v-else 
              @click="disconnectFitbit" 
              :disabled="isConnecting"
              class="disconnect-button"
            >
              Disconnect
            </button>
            <a v-if="!fitbitConnected" 
               href="https://dev.fitbit.com/apps" 
               target="_blank" 
               class="help-link">
              How to get Fitbit API access
            </a>
          </div>
        </div>
      </div>

      <!-- Awair Settings -->
      <div class="settings-card">
        <div class="settings-header">
          <h3>Awair</h3>
          <span :class="['status', { 'connected': awairConnected }]">
            {{ awairConnected ? 'Connected' : 'Not Connected' }}
          </span>
        </div>
        <div class="settings-content">
          <div class="connection-info">
            <p v-if="!awairConnected">
              Connect your Awair device to track indoor air quality metrics:
            </p>
            <ul v-if="!awairConnected" class="feature-list">
              <li>Air quality score</li>
              <li>PM2.5 and PM10 levels</li>
              <li>CO₂ and VOC levels</li>
              <li>Temperature and humidity</li>
            </ul>
            <div class="form-group">
              <label for="awairToken">Access Token</label>
              <div class="input-with-help">
                <input 
                  type="password" 
                  id="awairToken" 
                  v-model="awairToken"
                  placeholder="Enter your Awair API token"
                />
                <a href="https://developer.getawair.com/console/access-token" 
                   target="_blank" 
                   class="help-link">
                  Get your token
                </a>
              </div>
            </div>
            <div v-if="awairDevices.length > 0" class="devices-list">
              <h4>Connected Devices</h4>
              <ul>
                <li v-for="device in awairDevices" :key="device.id">
                  {{ device.name }} ({{ device.id }})
                </li>
              </ul>
            </div>
          </div>
          <div class="settings-actions">
            <button @click="saveAwairSettings" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Weather Settings -->
      <div class="settings-card">
        <div class="settings-header">
          <h3>Weather</h3>
          <span :class="['status', { 'connected': weatherConnected }]">
            {{ weatherConnected ? 'Connected' : 'Not Connected' }}
          </span>
        </div>
        <div class="settings-content">
          <div class="connection-info">
            <p v-if="!weatherConnected">
              Add weather data to correlate with your health metrics:
            </p>
            <ul v-if="!weatherConnected" class="feature-list">
              <li>Temperature and humidity</li>
              <li>Air quality index (AQI)</li>
              <li>Pollen and allergen levels</li>
              <li>UV index and pressure</li>
            </ul>
            <div class="form-group">
              <label for="zipCode">ZIP Code</label>
              <input 
                type="text" 
                id="zipCode" 
                v-model="zipCode"
                placeholder="Enter your ZIP code"
              />
            </div>
            <div class="form-group">
              <label for="weatherApiKey">OpenWeatherMap API Key</label>
              <div class="input-with-help">
                <input 
                  type="password" 
                  id="weatherApiKey" 
                  v-model="weatherApiKey"
                  placeholder="Enter your OpenWeatherMap API key"
                />
                <a href="https://openweathermap.org/api" 
                   target="_blank" 
                   class="help-link">
                  Get an API key
                </a>
              </div>
            </div>
          </div>
          <div class="settings-actions">
            <button @click="saveWeatherSettings" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h2>Data Management</h2>
      <div class="settings-card">
        <div class="settings-content">
          <div class="connection-info">
            <p>Export your health data for backup or analysis:</p>
            <ul class="feature-list">
              <li>JSON format for programmatic analysis</li>
              <li>CSV format for spreadsheet applications</li>
              <li>Includes all health metrics and annotations</li>
              <li>Selectable date range for export</li>
            </ul>
          </div>
          <div class="export-options">
            <button @click="exportData('json')">Export as JSON</button>
            <button @click="exportData('csv')">Export as CSV</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { format } from 'date-fns';
import axios from 'axios';

const fitbitConnected = ref(false);
const fitbitLastSync = ref('');
const awairConnected = ref(false);
const awairToken = ref('');
const awairDevices = ref<Array<{ id: string; name: string }>>([]);
const zipCode = ref('');
const weatherApiKey = ref('');
const weatherConnected = ref(false);
const isSyncing = ref(false);
const isSaving = ref(false);
const isConnecting = ref(false);

function formatDate(dateString: string) {
  if (!dateString) return 'Never';
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
}

async function connectFitbit() {
  window.location.href = '/api/fitbit/auth';
}

async function disconnectFitbit() {
  try {
    const userId = localStorage.getItem('userId');
    await axios.post('/api/fitbit/disconnect', { userId });
    fitbitConnected.value = false;
    fitbitLastSync.value = '';
    localStorage.removeItem('userId');
  } catch (error) {
    console.error('Failed to disconnect Fitbit:', error);
    alert('Failed to disconnect Fitbit. Please try again.');
  }
}

async function syncFitbit() {
  isSyncing.value = true;
  try {
    // Get last 30 days of data by default
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const userId = localStorage.getItem('userId');
    await axios.get(`/api/fitbit/sync/${userId}`, {
      params: { startDate, endDate }
    });
    
    fitbitLastSync.value = new Date().toISOString();
  } catch (error) {
    console.error('Failed to sync Fitbit data:', error);
    alert('Failed to sync Fitbit data. Please try again.');
  } finally {
    isSyncing.value = false;
  }
}

// Check Fitbit connection status and handle OAuth callback
onMounted(async () => {
  try {
    // Check if we have a userId stored
    const userId = localStorage.getItem('userId');
    if (userId) {
      // Check if we have valid tokens for this user
      const response = await axios.get(`/api/fitbit/status/${userId}`);
      fitbitConnected.value = response.data.connected;
      if (response.data.lastSync) {
        fitbitLastSync.value = response.data.lastSync;
      }
    }
    
    // Check URL for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (code) {
      isConnecting.value = true;
      try {
        // Exchange code for tokens
        const response = await axios.get('/api/fitbit/callback', { params: { code } });
        if (response.data.success) {
          fitbitConnected.value = true;
          // Store our local user ID, not the Fitbit user ID
          localStorage.setItem('userId', response.data.userId);
          
          // Start initial sync
          await syncFitbit();
          
          // Clean up URL
          window.history.replaceState({}, document.title, '/settings');
        }
      } catch (error) {
        console.error('Failed to complete Fitbit connection:', error);
        alert('Failed to connect to Fitbit. Please try again.');
      } finally {
        isConnecting.value = false;
      }
    } else if (error) {
      alert('Failed to connect to Fitbit. Please try again.');
      window.history.replaceState({}, document.title, '/settings');
    }
  } catch (error) {
    console.error('Failed to check Fitbit status:', error);
  }
});

async function saveAwairSettings() {
  isSaving.value = true;
  try {
    // TODO: Implement Awair settings save
    awairConnected.value = true;
  } finally {
    isSaving.value = false;
  }
}

async function saveWeatherSettings() {
  isSaving.value = true;
  try {
    // TODO: Implement weather settings save
    weatherConnected.value = true;
  } finally {
    isSaving.value = false;
  }
}

async function exportData(format: 'json' | 'csv') {
  // TODO: Implement data export
  const data = {
    medications: [],
    symptoms: [],
    // Add other data as needed
  };

  const blob = new Blob(
    [format === 'json' ? JSON.stringify(data, null, 2) : convertToCSV(data)],
    { type: format === 'json' ? 'application/json' : 'text/csv' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `health-data.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convertToCSV(data: any) {
  // TODO: Implement CSV conversion
  return '';
}
</script>

<style scoped>
.settings {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.settings-section {
  margin-bottom: 3rem;
}

.settings-section h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.settings-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.settings-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.status {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: #e74c3c;
  color: white;
}

.status.connected {
  background-color: #2ecc71;
}

.settings-content {
  margin-top: 1rem;
}

.connection-info {
  margin-bottom: 1.5rem;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 1rem;
}

.feature-list li {
  padding: 0.25rem 0;
  color: #34495e;
}

.feature-list li::before {
  content: "•";
  color: #3498db;
  margin-right: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #34495e;
  font-weight: 500;
}

.input-with-help {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-with-help input {
  flex: 1;
}

.help-link {
  color: #3498db;
  text-decoration: none;
  font-size: 0.9rem;
  white-space: nowrap;
}

.help-link:hover {
  text-decoration: underline;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.devices-list {
  margin: 1rem 0;
}

.devices-list h4 {
  margin: 0 0 0.5rem 0;
  color: #34495e;
  font-size: 1rem;
}

.devices-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.devices-list li {
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.settings-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #3498db;
  color: white;
  font-size: 1rem;
}

button:hover {
  background-color: #2980b9;
}

button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.connect-button {
  background-color: #2ecc71;
}

.connect-button:hover {
  background-color: #27ae60;
}

.disconnect-button {
  background-color: #e74c3c;
}

.disconnect-button:hover {
  background-color: #c0392b;
}

.export-options {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.export-options button {
  flex: 1;
}
</style> 