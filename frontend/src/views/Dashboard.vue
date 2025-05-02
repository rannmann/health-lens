<template>
  <div class="dashboard">
    <h1 class="dashboard__title">Health Dashboard</h1>
    
    <BaseCard class="dashboard__controls">
      <div class="date-range">
        <label class="date-range__label">Date Range</label>
        <div class="date-range__inputs">
          <input
            type="date"
            v-model="startDate"
            @change="fetchData"
            class="input"
          >
          <span class="date-range__separator">to</span>
          <input
            type="date"
            v-model="endDate"
            @change="fetchData"
            class="input"
          >
        </div>
      </div>

      <div class="metric-controls">
        <div class="metric-controls__section">
          <h3 class="metric-controls__title">Primary Metrics</h3>
          <div class="metric-selectors">
            <div class="metric-selector">
              <label class="metric-selector__label">Y-Axis 1</label>
              <select v-model="primaryMetric1" class="input">
                <option value="hrv">HRV (ms)</option>
                <option value="heartRate">Resting Heart Rate (bpm)</option>
                <option value="steps">Steps</option>
                <option value="sleep">Sleep Duration (hrs)</option>
                <option value="airQuality">Air Quality Score</option>
                <option value="temperature">Temperature (°F)</option>
                <option value="humidity">Humidity (%)</option>
                <option value="co2">CO₂ (ppm)</option>
                <option value="voc">VOC (ppb)</option>
                <option value="pm25">PM2.5 (µg/m³)</option>
              </select>
            </div>
            <div class="metric-selector">
              <label class="metric-selector__label">Y-Axis 2</label>
              <select v-model="primaryMetric2" class="input">
                <option value="">None</option>
                <option value="hrv">HRV (ms)</option>
                <option value="heartRate">Resting Heart Rate (bpm)</option>
                <option value="steps">Steps</option>
                <option value="sleep">Sleep Duration (hrs)</option>
                <option value="airQuality">Air Quality Score</option>
                <option value="temperature">Temperature (°F)</option>
                <option value="humidity">Humidity (%)</option>
                <option value="co2">CO₂ (ppm)</option>
                <option value="voc">VOC (ppb)</option>
                <option value="pm25">PM2.5 (µg/m³)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="metric-controls__section">
          <h3 class="metric-controls__title">Annotations</h3>
          <div class="annotation-toggles">
            <label class="toggle">
              <input type="checkbox" v-model="showMedications">
              <span class="toggle__label">Medication Changes</span>
            </label>
            <label class="toggle">
              <input type="checkbox" v-model="showSymptoms">
              <span class="toggle__label">Symptoms</span>
            </label>
            <label class="toggle">
              <input type="checkbox" v-model="showAllChanges">
              <span class="toggle__label">All Changes</span>
            </label>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Primary Graph -->
    <BaseCard class="dashboard__primary-chart">
      <template #title>Health Metrics Comparison</template>
      <div class="chart-container">
        <apexchart
          type="line"
          height="400"
          :options="primaryChartOptions"
          :series="primaryChartSeries"
        />
      </div>
    </BaseCard>

    <!-- Trend Graphs -->
    <section class="dashboard__trends">
      <h2 class="dashboard__section-title">Trend Overview</h2>
      <div class="trends-grid">
        <BaseCard>
          <template #title>Sleep Quality</template>
          <div class="chart-container">
            <apexchart
              type="bar"
              height="200"
              :options="sleepTrendOptions"
              :series="sleepTrendSeries"
            />
          </div>
        </BaseCard>
        
        <BaseCard>
          <template #title>Activity</template>
          <div class="chart-container">
            <apexchart
              type="bar"
              height="200"
              :options="activityTrendOptions"
              :series="activityTrendSeries"
            />
          </div>
        </BaseCard>
        
        <BaseCard>
          <template #title>Air Quality</template>
          <div class="chart-container">
            <apexchart
              type="line"
              height="200"
              :options="airQualityTrendOptions"
              :series="airQualityTrendSeries"
            />
          </div>
        </BaseCard>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, subDays } from 'date-fns'
import BaseCard from '../components/BaseCard.vue'

// Date range state
const startDate = ref(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
const endDate = ref(format(new Date(), 'yyyy-MM-dd'))

// Primary graph configuration
const primaryMetric1 = ref('hrv')
const primaryMetric2 = ref('steps')
const showMedications = ref(true)
const showSymptoms = ref(false)
const showAllChanges = ref(false)

// Chart options
const chartCommonOptions = {
  chart: {
    toolbar: {
      show: true,
      tools: {
        download: true,
        selection: true,
        zoom: true,
        zoomin: true,
        zoomout: true,
        pan: true,
        reset: true
      }
    }
  },
  xaxis: {
    type: 'datetime'
  },
  stroke: {
    curve: 'smooth'
  },
  markers: {
    size: 4
  }
}

// Primary chart options
const primaryChartOptions = computed(() => ({
  ...chartCommonOptions,
  title: {
    text: 'Health Metrics Comparison'
  },
  yaxis: [
    {
      title: {
        text: getMetricLabel(primaryMetric1.value)
      }
    },
    primaryMetric2.value ? {
      opposite: true,
      title: {
        text: getMetricLabel(primaryMetric2.value)
      }
    } : undefined
  ].filter(Boolean),
  annotations: {
    xaxis: getAnnotations()
  }
}))

// Primary chart series
const primaryChartSeries = ref([
  {
    name: getMetricLabel(primaryMetric1.value),
    data: []
  },
  primaryMetric2.value ? {
    name: getMetricLabel(primaryMetric2.value),
    data: []
  } : undefined
].filter(Boolean))

// Trend chart options
const sleepTrendOptions = ref({
  ...chartCommonOptions,
  colors: ['#775DD0', '#00E396', '#FEB019'],
  title: {
    text: 'Sleep Stages (hours)'
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      endingShape: 'rounded'
    }
  }
})

const activityTrendOptions = ref({
  ...chartCommonOptions,
  colors: ['#008FFB'],
  title: {
    text: 'Daily Activity'
  }
})

const airQualityTrendOptions = ref({
  ...chartCommonOptions,
  colors: ['#00E396'],
  title: {
    text: 'Air Quality Score'
  },
  yaxis: {
    min: 0,
    max: 100
  }
})

// Trend chart series
const sleepTrendSeries = ref([
  { name: 'Deep Sleep', data: [] },
  { name: 'Light Sleep', data: [] },
  { name: 'REM', data: [] }
])

const activityTrendSeries = ref([{
  name: 'Steps',
  data: []
}])

const airQualityTrendSeries = ref([{
  name: 'Air Quality',
  data: []
}])

// Helper functions
function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    hrv: 'HRV (ms)',
    heartRate: 'Resting Heart Rate (bpm)',
    steps: 'Steps',
    sleep: 'Sleep Duration (hrs)',
    airQuality: 'Air Quality Score',
    temperature: 'Temperature (°F)',
    humidity: 'Humidity (%)',
    co2: 'CO₂ (ppm)',
    voc: 'VOC (ppb)',
    pm25: 'PM2.5 (µg/m³)'
  }
  return labels[metric] || metric
}

function getAnnotations() {
  const annotations: any[] = []
  
  if (showMedications.value) {
    // Add medication annotations
    // TODO: Fetch and add medication events
  }
  
  if (showSymptoms.value) {
    // Add symptom annotations
    // TODO: Fetch and add symptom events
  }
  
  if (showAllChanges.value) {
    // Add all change annotations
    // TODO: Fetch and add all change events
  }
  
  return annotations
}

// Data fetching
const fetchData = async () => {
  try {
    // Fetch primary metrics
    const [metric1Data, metric2Data] = await Promise.all([
      fetchMetricData(primaryMetric1.value),
      primaryMetric2.value ? fetchMetricData(primaryMetric2.value) : Promise.resolve([])
    ])

    primaryChartSeries.value = [
      {
        name: getMetricLabel(primaryMetric1.value),
        data: metric1Data
      },
      ...(metric2Data.length ? [{
        name: getMetricLabel(primaryMetric2.value),
        data: metric2Data
      }] : [])
    ]

    // Fetch trend data
    await fetchTrendData()
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

async function fetchMetricData(metric: string) {
  const endpoint = getMetricEndpoint(metric)
  const response = await fetch(`${endpoint}?start=${startDate.value}&end=${endDate.value}`)
  if (!response.ok) return []
  
  const data = await response.json()
  return data.map((d: any) => ({
    x: new Date(d.timestamp || d.date).getTime(),
    y: d.value || d[metric]
  }))
}

function getMetricEndpoint(metric: string): string {
  const endpoints: Record<string, string> = {
    hrv: '/api/fitbit/hrv',
    heartRate: '/api/fitbit/heart-rate',
    steps: '/api/fitbit/steps',
    sleep: '/api/fitbit/sleep',
    airQuality: '/api/awair/air-quality',
    temperature: '/api/awair/temperature',
    humidity: '/api/awair/humidity',
    co2: '/api/awair/co2',
    voc: '/api/awair/voc',
    pm25: '/api/awair/pm25'
  }
  return endpoints[metric] || ''
}

async function fetchTrendData() {
  // Fetch sleep data
  const sleepResponse = await fetch(`/api/fitbit/sleep?start=${startDate.value}&end=${endDate.value}`)
  if (sleepResponse.ok) {
    const sleepData = await sleepResponse.json()
    sleepTrendSeries.value = [
      { name: 'Deep Sleep', data: sleepData.map((d: any) => ({ x: new Date(d.date).getTime(), y: d.deepSleep / 3600 })) },
      { name: 'Light Sleep', data: sleepData.map((d: any) => ({ x: new Date(d.date).getTime(), y: d.lightSleep / 3600 })) },
      { name: 'REM', data: sleepData.map((d: any) => ({ x: new Date(d.date).getTime(), y: d.remSleep / 3600 })) }
    ]
  }

  // Fetch activity data
  const activityResponse = await fetch(`/api/fitbit/steps?start=${startDate.value}&end=${endDate.value}`)
  if (activityResponse.ok) {
    const activityData = await activityResponse.json()
    activityTrendSeries.value[0].data = activityData.map((d: any) => ({
      x: new Date(d.date).getTime(),
      y: d.steps
    }))
  }

  // Fetch air quality data
  const airQualityResponse = await fetch(`/api/awair/air-quality?start=${startDate.value}&end=${endDate.value}`)
  if (airQualityResponse.ok) {
    const airQualityData = await airQualityResponse.json()
    airQualityTrendSeries.value[0].data = airQualityData.map((d: any) => ({
      x: new Date(d.timestamp).getTime(),
      y: d.score
    }))
  }
}

// Watch for configuration changes
watch([primaryMetric1, primaryMetric2, showMedications, showSymptoms, showAllChanges], () => {
  fetchData()
})

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard {
  max-width: var(--container-lg);
  margin: 0 auto;
}

.dashboard__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-8);
}

.dashboard__section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-6);
}

.dashboard__controls {
  margin-bottom: var(--space-8);
}

.dashboard__primary-chart {
  margin-bottom: var(--space-8);
}

.dashboard__trends {
  margin-bottom: var(--space-8);
}

.date-range {
  margin-bottom: var(--space-6);
}

.date-range__label {
  display: block;
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.date-range__inputs {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.date-range__separator {
  color: var(--text-secondary);
}

.metric-controls {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.metric-controls__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.metric-controls__title {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.metric-selectors {
  display: grid;
  gap: var(--space-4);
}

.metric-selector__label {
  display: block;
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.annotation-toggles {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.toggle__label {
  color: var(--text-secondary);
}

.trends-grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.chart-container {
  margin: calc(var(--space-4) * -1);
}

/* Override ApexCharts styles to match our theme */
:deep(.apexcharts-title-text) {
  fill: var(--text-primary) !important;
  font-family: var(--font-sans) !important;
  font-size: var(--text-lg) !important;
  font-weight: var(--font-medium) !important;
}

:deep(.apexcharts-text) {
  fill: var(--text-secondary) !important;
  font-family: var(--font-sans) !important;
}

:deep(.apexcharts-grid-borders line) {
  stroke: var(--border-light) !important;
}

:deep(.apexcharts-tooltip) {
  background: white !important;
  border: 1px solid var(--border-medium) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--shadow-lg) !important;
}
</style> 