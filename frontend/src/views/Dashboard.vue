<template>
  <div class="dashboard">
    <h1>Health Dashboard</h1>
    
    <div class="date-range">
      <input
        type="date"
        v-model="startDate"
        @change="fetchData"
      >
      <span>to</span>
      <input
        type="date"
        v-model="endDate"
        @change="fetchData"
      >
    </div>

    <!-- Primary Graph Configuration -->
    <div class="graph-config">
      <div class="config-section">
        <h3>Primary Metrics</h3>
        <div class="metric-selectors">
          <div class="metric-selector">
            <label>Y-Axis 1</label>
            <select v-model="primaryMetric1">
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
            <label>Y-Axis 2</label>
            <select v-model="primaryMetric2">
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

      <div class="config-section">
        <h3>Annotations</h3>
        <div class="annotation-toggles">
          <label class="toggle">
            <input type="checkbox" v-model="showMedications">
            <span>Medication Changes</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="showSymptoms">
            <span>Symptoms</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="showAllChanges">
            <span>All Changes</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Primary Graph -->
    <div class="primary-graph">
      <apexchart
        type="line"
        height="400"
        :options="primaryChartOptions"
        :series="primaryChartSeries"
      />
    </div>

    <!-- Trend Graphs -->
    <div class="trends-section">
      <h2>Trend Overview</h2>
      <div class="trends-grid">
        <div class="trend-card">
          <h3>Sleep Quality</h3>
          <apexchart
            type="bar"
            height="200"
            :options="sleepTrendOptions"
            :series="sleepTrendSeries"
          />
        </div>
        
        <div class="trend-card">
          <h3>Activity</h3>
          <apexchart
            type="bar"
            height="200"
            :options="activityTrendOptions"
            :series="activityTrendSeries"
          />
        </div>
        
        <div class="trend-card">
          <h3>Air Quality</h3>
          <apexchart
            type="line"
            height="200"
            :options="airQualityTrendOptions"
            :series="airQualityTrendSeries"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, subDays } from 'date-fns'

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
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.date-range input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.graph-config {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.config-section {
  margin-bottom: 1.5rem;
}

.config-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.metric-selectors {
  display: flex;
  gap: 2rem;
}

.metric-selector {
  flex: 1;
}

.metric-selector label {
  display: block;
  margin-bottom: 0.5rem;
  color: #34495e;
}

.metric-selector select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.annotation-toggles {
  display: flex;
  gap: 2rem;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.primary-graph {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.trends-section {
  margin-top: 2rem;
}

.trends-section h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.trends-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.trend-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.trend-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #2c3e50;
}
</style> 