<template>
  <div class="settings">
    <h1 class="settings__title">Settings</h1>
    
    <section class="settings__section">
      <h2 class="settings__section-title">Data Sources</h2>
      
      <!-- Fitbit Settings -->
      <BaseCard
        title="Fitbit"
        :loading="isLoading"
      >
        <template #actions>
          <span :class="['status-badge', { 'status-badge--connected': fitbitConnected }]">
            {{ fitbitConnected ? 'Connected' : 'Not Connected' }}
          </span>
        </template>

        <div class="connection-info">
          <template v-if="!fitbitConnected">
            <p>Connect your Fitbit account to sync health data including:</p>
            <ul class="feature-list">
              <li>Heart rate and HRV</li>
              <li>Sleep stages and duration</li>
              <li>Steps and activity</li>
              <li>SpO₂ and breathing rate</li>
            </ul>
          </template>
          <template v-else>
            <p class="text-secondary">Last synced: {{ lastSyncedDisplay }}</p>
            <div class="fitbit-backfill-range">
              <label class="fitbit-backfill-range__label" for="fitbitBackfillStart">Backfill Date Range</label>
              <div class="fitbit-backfill-range__inputs">
                <input
                  type="date"
                  id="fitbitBackfillStart"
                  v-model="backfillStartDate"
                  :max="today"
                  class="input"
                />
                <span class="fitbit-backfill-range__separator">to</span>
                <input
                  type="date"
                  id="fitbitBackfillEnd"
                  v-model="backfillEndDate"
                  :max="today"
                  class="input"
                />
              </div>
              <div class="button-group" style="margin-top: var(--space-4);">
                <button class="button button--primary" @click="syncFitbit" :disabled="isSyncing || isBackfilling">
                  {{ isSyncing ? 'Syncing...' : 'Sync Recent Data' }}
                </button>
                <button class="button button--secondary" @click="runBackfill" :disabled="isSyncing || isBackfilling">
                  {{ isBackfilling ? 'Running Backfill...' : 'Run Full Backfill' }}
                </button>
                <button v-if="hasFailedEndpoints" class="button button--warning" @click="retryFailedEndpoints" :disabled="isSyncing || isBackfilling">
                  Retry Failed Endpoints
                </button>
              </div>
            </div>
            <div class="backfill-progress-modal">
              <h3>Fitbit Data Sync Status</h3>
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Status</th>
                    <th>Last Synced</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in backfillProgress" :key="p.endpoint">
                    <td>{{ p.endpoint }}</td>
                    <td>{{ p.status }}</td>
                    <td>{{ formatDateOnly(p.last_synced_date) }}</td>
                    <td>{{ p.error || '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>

        <div class="settings-actions">
          <button 
            v-if="!fitbitConnected" 
            @click="connectFitbit" 
            :disabled="isConnecting"
            class="button button--success"
          >
            {{ isConnecting ? 'Connecting...' : 'Connect Fitbit' }}
          </button>
          <button 
            v-else 
            @click="disconnectFitbit" 
            :disabled="isConnecting"
            class="button button--error"
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
      </BaseCard>

      <!-- Awair Settings -->
      <BaseCard
        title="Awair"
        :loading="isLoading"
      >
        <template #actions>
          <span :class="['status-badge', { 'status-badge--connected': awairConnected }]">
            {{ awairConnected ? 'Connected' : 'Not Connected' }}
          </span>
        </template>

        <div class="connection-info">
          <template v-if="!awairConnected">
            <p>Connect your Awair device to track indoor air quality metrics:</p>
            <ul class="feature-list">
              <li>Air quality score</li>
              <li>PM2.5 and PM10 levels</li>
              <li>CO₂ and VOC levels</li>
              <li>Temperature and humidity</li>
            </ul>
          </template>

          <div class="form-group">
            <label for="awairToken">Access Token</label>
            <div class="input-group">
              <input 
                type="password" 
                id="awairToken" 
                v-model="awairToken"
                class="input"
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
            <h4 class="text-lg font-medium">Connected Devices</h4>
            <ul class="devices-grid">
              <li v-for="device in awairDevices" :key="device.id" class="device-item">
                {{ device.name }} ({{ device.id }})
              </li>
            </ul>
          </div>
        </div>

        <div class="settings-actions">
          <button class="button button--primary" @click="saveAwairSettings" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </BaseCard>

      <!-- Weather Settings -->
      <BaseCard
        title="Weather"
        :loading="isLoading"
      >
        <template #actions>
          <span :class="['status-badge', { 'status-badge--connected': weatherConnected }]">
            {{ weatherConnected ? 'Connected' : 'Not Connected' }}
          </span>
        </template>

        <div class="connection-info">
          <template v-if="!weatherConnected">
            <p>Add weather data to correlate with your health metrics:</p>
            <ul class="feature-list">
              <li>Temperature (high, low, average)</li>
              <li>Humidity and air pressure</li>
              <li>Wind speed</li>
              <li>Air Quality Index (AQI)</li>
            </ul>
          </template>
          <template v-else>
            <div class="sync-status">
              <h4 class="text-lg font-medium">Last Sync</h4>
              <ul class="status-list">
                <li>
                  Open-Meteo: 
                  {{ formatDate(weatherSyncStatus?.openmeteo?.lastSync) }}
                  <span v-if="weatherSyncStatus?.openmeteo?.error" class="error-text">
                    ({{ weatherSyncStatus.openmeteo.error }})
                  </span>
                </li>
                <li>
                  OpenWeatherMap: 
                  {{ formatDate(weatherSyncStatus?.openweathermap?.lastSync) }}
                  <span v-if="weatherSyncStatus?.openweathermap?.error" class="error-text">
                    ({{ weatherSyncStatus.openweathermap.error }})
                  </span>
                </li>
              </ul>
            </div>
            <div class="button-group">
              <button class="button button--primary" @click="syncWeather" :disabled="isSyncing">
                {{ isSyncing ? 'Syncing...' : 'Sync Weather Data' }}
              </button>
              <button class="button button--secondary" @click="runWeatherBackfill" :disabled="isSyncing">
                {{ isSyncing ? 'Running Backfill...' : 'Run Full Backfill' }}
              </button>
            </div>
          </template>

          <div class="form-group">
            <label for="zipCode">ZIP Code</label>
            <input 
              type="text" 
              id="zipCode" 
              v-model="zipCode"
              class="input"
              placeholder="Enter your ZIP code"
            />
          </div>

          <div class="form-group">
            <label for="weatherApiKey">OpenWeatherMap API Key (for AQI data)</label>
            <div class="input-group">
              <input 
                type="password" 
                id="weatherApiKey" 
                v-model="weatherApiKey"
                class="input"
                placeholder="Enter your OpenWeatherMap API key"
              />
              <a href="https://openweathermap.org/api" 
                 target="_blank" 
                 class="help-link">
                Get an API key
              </a>
            </div>
            <p class="help-text">
              Note: OpenWeatherMap API key is only needed for Air Quality Index (AQI) data.
              Temperature and other weather data is provided by Open-Meteo for free.
            </p>
          </div>
        </div>

        <div class="settings-actions">
          <button class="button button--primary" @click="saveWeatherSettings" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </BaseCard>
    </section>

    <section class="settings__section">
      <h2 class="settings__section-title">Data Management</h2>
      <BaseCard>
        <div class="connection-info">
          <p>Export your health data for backup or analysis:</p>
          <ul class="feature-list">
            <li>JSON format for programmatic analysis</li>
            <li>CSV format for spreadsheet applications</li>
            <li>Includes all health metrics and annotations</li>
            <li>Selectable date range for export</li>
          </ul>
        </div>
        <div class="button-group">
          <button class="button button--primary" @click="exportData('json')">Export as JSON</button>
          <button class="button button--secondary" @click="exportData('csv')">Export as CSV</button>
        </div>
      </BaseCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { format } from 'date-fns';
import api from '../api/axios';
import BaseCard from '../components/BaseCard.vue';

const fitbitConnected = ref(false);
const fitbitLastSync = ref('');
const awairConnected = ref(false);
const awairToken = ref('');
const awairDevices = ref<Array<{ id: string; name: string }>>([]);
const zipCode = ref('');
const weatherApiKey = ref('');
const weatherConnected = ref(false);
const isSyncing = ref(false);
const isBackfilling = ref(false);
const isSaving = ref(false);
const isConnecting = ref(false);
const isLoading = ref(true);

const today = format(new Date(), 'yyyy-MM-dd');
const defaultBackfillStart = format(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
const backfillStartDate = ref(defaultBackfillStart);
const backfillEndDate = ref('');
const backfillProgress = ref<Array<any>>([]);

const hasFailedEndpoints = computed(() => backfillProgress.value.some(p => p.status === 'failed'));
const failedEndpoints = computed(() => backfillProgress.value.filter(p => p.status === 'failed').map(p => p.endpoint));

interface WeatherSyncStatus {
  [provider: string]: {
    lastSync: string;
    error: string | null;
  };
}

const weatherSyncStatus = ref<WeatherSyncStatus>();

const lastSyncedDisplay = computed(() => {
  if (!backfillProgress.value.length) return 'Never';
  const maxDate = backfillProgress.value
    .map(p => p.last_synced_date)
    .filter(Boolean)
    .sort()
    .reverse()[0];
  return maxDate ? formatDateOnly(maxDate) : 'Never';
});

function formatDate(dateString: string | undefined) {
  if (!dateString) return 'Never';
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
}

function formatDateOnly(dateString: string | undefined) {
  if (!dateString) return 'Never';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Never';
  return format(d, 'MMM d, yyyy');
}

async function connectFitbit() {
  window.location.href = '/api/fitbit/auth';
}

async function disconnectFitbit() {
  try {
    await api.post('/fitbit/disconnect');
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
    const response = await api.get('/fitbit/sync', {
      params: { startDate, endDate }
    });
    if (response.data.needsBackfill) {
      console.log('Note: Historical data not found. Consider running backfill for complete history.');
    }
    fitbitLastSync.value = new Date().toISOString();
  } catch (error) {
    console.error('Failed to sync Fitbit data:', error);
    alert('Failed to sync Fitbit data. Please try again.');
  } finally {
    isSyncing.value = false;
  }
}

async function runBackfill() {
  isBackfilling.value = true;
  backfillProgress.value = [];
  try {
    const startDate = backfillStartDate.value;
    const customEndDate = backfillEndDate.value || undefined;
    await api.post('/fitbit/backfill', { startDate, customEndDate });
    // Poll for backfill status
    const checkStatus = async () => {
      const response = await api.get('/fitbit/backfill-status');
      const { progress } = response.data;
      backfillProgress.value = progress;
      const isComplete = progress.every((p: any) => 
        p.status === 'completed' || p.status === 'failed'
      );
      if (isComplete) {
        isBackfilling.value = false;
        fitbitLastSync.value = new Date().toISOString();
      } else {
        setTimeout(checkStatus, 5000);
      }
    };
    setTimeout(checkStatus, 5000);
  } catch (error) {
    console.error('Failed to run backfill:', error);
    alert('Failed to run backfill. Please try again.');
    isBackfilling.value = false;
  }
}

async function retryFailedEndpoints() {
  isBackfilling.value = true;
  try {
    const startDate = backfillStartDate.value;
    const customEndDate = backfillEndDate.value || undefined;
    await api.post('/fitbit/backfill', { startDate, customEndDate, endpoints: failedEndpoints.value });
    // Poll for backfill status
    const checkStatus = async () => {
      const response = await api.get('/fitbit/backfill-status');
      const { progress } = response.data;
      backfillProgress.value = progress;
      const isComplete = progress.every((p: any) => 
        p.status === 'completed' || p.status === 'failed'
      );
      if (isComplete) {
        isBackfilling.value = false;
        fitbitLastSync.value = new Date().toISOString();
      } else {
        setTimeout(checkStatus, 5000);
      }
    };
    setTimeout(checkStatus, 5000);
  } catch (error) {
    console.error('Failed to retry endpoints:', error);
    alert('Failed to retry endpoints. Please try again.');
    isBackfilling.value = false;
  }
}

async function syncWeather() {
  isSyncing.value = true;
  try {
    // Sync last 7 days by default
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    await api.post('/weather/sync', {
      startDate,
      endDate
    });
    // Refresh status
    const response = await api.get('/weather/status');
    weatherSyncStatus.value = response.data.syncStatus;
  } catch (error) {
    console.error('Failed to sync weather data:', error);
    alert('Failed to sync weather data. Please try again.');
  } finally {
    isSyncing.value = false;
  }
}

async function runWeatherBackfill() {
  isSyncing.value = true;
  try {
    // Start backfill from 1 year ago by default
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    await api.post('/weather/sync', {
      startDate,
      endDate
    });
    // Refresh status
    const response = await api.get('/weather/status');
    weatherSyncStatus.value = response.data.syncStatus;
  } catch (error) {
    console.error('Failed to run weather backfill:', error);
    alert('Failed to run weather backfill. Please try again.');
  } finally {
    isSyncing.value = false;
  }
}

// Check Fitbit connection status and handle OAuth callback
onMounted(async () => {
  isLoading.value = true;
  try {
    const [fitbitResponse, awairResponse, weatherResponse, backfillStatusResponse] = await Promise.all([
      api.get('/fitbit/status'),
      api.get('/awair/status'),
      api.get('/weather/status'),
      api.get('/fitbit/backfill-status')
    ]);
    fitbitConnected.value = fitbitResponse.data.connected;
    backfillProgress.value = backfillStatusResponse.data.progress || [];
    if (fitbitResponse.data.lastSync) {
      fitbitLastSync.value = fitbitResponse.data.lastSync;
    }
    awairConnected.value = awairResponse.data.connected;
    if (awairResponse.data.token) {
      awairToken.value = awairResponse.data.token;
    }
    if (awairResponse.data.devices) {
      awairDevices.value = awairResponse.data.devices;
    }
    weatherConnected.value = weatherResponse.data.connected;
    if (weatherResponse.data.zipCode) {
      zipCode.value = weatherResponse.data.zipCode;
    }
    if (weatherResponse.data.apiKey) {
      weatherApiKey.value = weatherResponse.data.apiKey;
    }
    if (weatherResponse.data.syncStatus) {
      weatherSyncStatus.value = weatherResponse.data.syncStatus;
    }
    // Handle Fitbit OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    if (code) {
      isConnecting.value = true;
      try {
        const response = await api.get('/fitbit/callback', { params: { code } });
        if (response.data.success) {
          fitbitConnected.value = true;
          localStorage.setItem('userId', response.data.userId);
          await syncFitbit();
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
    console.error('Failed to load settings:', error);
  } finally {
    isLoading.value = false;
  }
});

async function saveAwairSettings() {
  isSaving.value = true;
  try {
    const response = await api.post('/awair/settings', {
      token: awairToken.value
    });
    if (response.data.success) {
      awairConnected.value = true;
      const statusResponse = await api.get('/awair/status');
      awairDevices.value = statusResponse.data.devices || [];
    }
  } catch (error) {
    console.error('Failed to save Awair settings:', error);
    alert('Failed to save Awair settings. Please check your token and try again.');
    awairConnected.value = false;
  } finally {
    isSaving.value = false;
  }
}

async function saveWeatherSettings() {
  isSaving.value = true;
  try {
    const response = await api.post('/weather/settings', {
      zipCode: zipCode.value,
      apiKey: weatherApiKey.value
    });
    if (response.data.success) {
      weatherConnected.value = true;
    }
  } catch (error) {
    console.error('Failed to save weather settings:', error);
    alert('Failed to save weather settings. Please check your API key and ZIP code and try again.');
    weatherConnected.value = false;
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
  max-width: var(--container-md);
  margin: 0 auto;
}

.settings__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-8);
}

.settings__section {
  margin-bottom: var(--space-12);
}

.settings__section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-6);
}

.status-badge {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  background-color: var(--error-500);
  color: white;
}

.status-badge--connected {
  background-color: var(--success-500);
}

.connection-info {
  color: var(--text-primary);
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: var(--space-4) 0;
}

.feature-list li {
  display: flex;
  align-items: center;
  padding: var(--space-1) 0;
  color: var(--text-secondary);
}

.feature-list li::before {
  content: "•";
  color: var(--primary-500);
  margin-right: var(--space-2);
}

.form-group {
  margin: var(--space-6) 0;
}

.form-group label {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--text-primary);
  font-weight: var(--font-medium);
}

.input-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.help-link {
  color: var(--primary-500);
  text-decoration: none;
  font-size: var(--text-sm);
  white-space: nowrap;
}

.help-link:hover {
  text-decoration: underline;
}

.help-text {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-top: var(--space-2);
}

.devices-list {
  margin: var(--space-6) 0;
  padding: var(--space-4);
  background-color: var(--surface-secondary);
  border-radius: var(--radius-lg);
}

.devices-grid {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.device-item {
  padding: var(--space-2) var(--space-3);
  background-color: white;
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.button-group {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.settings-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-light);
}

.sync-status {
  padding: var(--space-4);
  background-color: var(--surface-secondary);
  border-radius: var(--radius-lg);
  margin: var(--space-4) 0;
}

.status-list {
  list-style: none;
  padding: 0;
  margin: var(--space-3) 0 0;
}

.status-list li {
  padding: var(--space-2) 0;
  color: var(--text-secondary);
}

.error-text {
  color: var(--error-500);
  font-size: var(--text-sm);
  margin-left: var(--space-2);
}

.backfill-progress-modal {
  margin-top: var(--space-6);
  padding: var(--space-4);
  background-color: var(--surface-secondary);
  border-radius: var(--radius-lg);
}

.backfill-progress-modal h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.backfill-progress-modal table {
  width: 100%;
  border-collapse: collapse;
}

.backfill-progress-modal th,
.backfill-progress-modal td {
  padding: var(--space-2);
  text-align: left;
}

.backfill-progress-modal th {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.backfill-progress-modal td {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.fitbit-backfill-range {
  margin: var(--space-6) 0;
}
.fitbit-backfill-range__label {
  display: block;
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}
.fitbit-backfill-range__inputs {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.fitbit-backfill-range__separator {
  color: var(--text-secondary);
}
</style> 