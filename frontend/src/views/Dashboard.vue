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
                <option value="deepSleep">Deep Sleep (hrs)</option>
                <option value="lightSleep">Light Sleep (hrs)</option>
                <option value="remSleep">REM Sleep (hrs)</option>
                <option value="wakeTime">Wake Time (min)</option>
                <option value="azmTotal">Active Zone Minutes</option>
                <option value="spo2">SpO₂ (%)</option>
                <option value="breathingRate">Breathing Rate (br/min)</option>
                <option value="temperature">Skin Temp Variation (°C)</option>
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
                <option value="deepSleep">Deep Sleep (hrs)</option>
                <option value="lightSleep">Light Sleep (hrs)</option>
                <option value="remSleep">REM Sleep (hrs)</option>
                <option value="wakeTime">Wake Time (min)</option>
                <option value="azmTotal">Active Zone Minutes</option>
                <option value="spo2">SpO₂ (%)</option>
                <option value="breathingRate">Breathing Rate (br/min)</option>
                <option value="temperature">Skin Temp Variation (°C)</option>
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

        <!-- Trailing Average Controls -->
        <div class="metric-controls__section">
          <h3 class="metric-controls__title">Smoothing</h3>
          <div class="trailing-average-controls" style="display: flex; align-items: center; gap: 1rem;">
            <label class="toggle">
              <input type="checkbox" v-model="showTrailingAverage">
              <span class="toggle__label">Show Trailing Average</span>
            </label>
            <label v-if="showTrailingAverage" style="display: flex; align-items: center; gap: 0.5rem;">
              <span>Window:</span>
              <input type="number" min="2" max="60" v-model.number="trailingAverageWindow" class="input" style="width: 60px;">
              <span>days</span>
            </label>
            <label v-if="showTrailingAverage" class="toggle">
              <input type="checkbox" v-model="showFilterOutliers">
              <span class="toggle__label">Filter Outliers (±2σ)</span>
            </label>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Primary Graph -->
    <BaseCard class="dashboard__primary-chart" :title="'Health Metrics Comparison'">
      <template #actions>
        <button class="popout-btn" @click="showFullScreenChart = true" title="Full Screen">
          ⛶
        </button>
      </template>
      <div class="chart-container">
        <apexchart
          type="line"
          height="400"
          :options="primaryChartOptions"
          :series="primaryChartSeries"
        />
      </div>
    </BaseCard>

    <!-- Full-Screen Chart Modal -->
    <template v-if="showFullScreenChart">
      <div class="fullscreen-modal" @click.self="showFullScreenChart = false">
        <div class="fullscreen-modal__content">
          <button class="close-btn" @click="showFullScreenChart = false" title="Close">✕</button>
          <apexchart
            ref="fullscreenChartRef"
            type="line"
            height="100%"
            width="100%"
            :options="primaryChartOptions"
            :series="primaryChartSeries"
          />
        </div>
      </div>
    </template>

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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { format, subDays } from 'date-fns'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import BaseCard from '../components/BaseCard.vue'

// Get user store
const userStore = useUserStore()
const router = useRouter()

// Date range state
const startDate = ref(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
const endDate = ref(format(new Date(), 'yyyy-MM-dd'))

// Primary graph configuration
const primaryMetric1 = ref('hrv')
const primaryMetric2 = ref('sleep')
const showMedications = ref(true)
const showSymptoms = ref(false)
const showAllChanges = ref(false)
// Trailing average state
const showTrailingAverage = ref(false)
const trailingAverageWindow = ref(10)
const showFilterOutliers = ref(false)
const showFullScreenChart = ref(false)

// Add interfaces for our data types
interface MetricDataPoint {
  date: string;
  hrv_rmssd: number | null;
  total_sleep: number | null;
  resting_hr: number | null;
  steps: number | null;
  deep_sleep: number | null;
  light_sleep: number | null;
  rem_sleep: number | null;
  wake_minutes: number | null;
  azm_total: number | null;
  azm_fatburn: number | null;
  azm_cardio: number | null;
  azm_peak: number | null;
  spo2_avg: number | null;
  breathing_rate: number | null;
  skin_temp_delta: number | null;
}

interface ChartDataPoint {
  x: number;
  y: number | null;
}

// Add these interfaces after the existing interfaces
interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}

// Add this after the interfaces
const METRIC_MAPPINGS = {
  hrv: 'hrv_rmssd',
  sleep: 'total_sleep',
  heartRate: 'resting_hr',
  steps: 'steps',
  deepSleep: 'deep_sleep',
  lightSleep: 'light_sleep',
  remSleep: 'rem_sleep',
  wakeTime: 'wake_minutes',
  azmTotal: 'azm_total',
  azmFatBurn: 'azm_fatburn',
  azmCardio: 'azm_cardio',
  azmPeak: 'azm_peak',
  spo2: 'spo2_avg',
  breathingRate: 'breathing_rate',
  temperature: 'skin_temp_delta'
} as const;

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

const SERIES_COLORS = ['#008FFB', '#FEB019'];

// Add colors for trailing average lines
const TRAILING_AVG_COLORS = ['#006BB5', '#B25A14'];

// Primary chart options
const primaryChartOptions = computed(() => {
  // Dynamically build yaxis array based on selected metrics
  const yaxes: any[] = [];
  
  // Left axis (Y1)
  if (primaryMetric1.value) {
    // Build the list of series names for axis 0
    const axis0Series = [
      getMetricLabel(primaryMetric1.value),
      // include trailing‑avg name if enabled
      ...(showTrailingAverage.value
        ? [ `${getMetricLabel(primaryMetric1.value)} (${trailingAverageWindow.value}-day Avg)` ]
        : []
      )
    ];

    yaxes.push({
      title: { text: getMetricLabel(primaryMetric1.value) },
      labels: {
        formatter: (v: number) => (typeof v === 'number' && !isNaN(v) ? v.toFixed(1) : ''),
        style: { colors: [ SERIES_COLORS[0] ] }
      },
      // ← tie these exact series names to this axis
      seriesName: axis0Series
    });
  }

  // Right axis (Y2)
  if (primaryMetric2.value) {
    const axis1Series = [
      getMetricLabel(primaryMetric2.value),
      ...(showTrailingAverage.value
        ? [ `${getMetricLabel(primaryMetric2.value)} (${trailingAverageWindow.value}-day Avg)` ]
        : []
      )
    ];

    yaxes.push({
      opposite: true,
      title: { text: getMetricLabel(primaryMetric2.value) },
      labels: {
        formatter: (v: number) => (typeof v === 'number' && !isNaN(v) ? v.toFixed(1) : ''),
        style: { colors: [ SERIES_COLORS[1] ] }
      },
      seriesName: axis1Series
    });
  }
  
  return {
    ...chartCommonOptions,
    colors: [...SERIES_COLORS, ...TRAILING_AVG_COLORS],
    chart: {
      ...chartCommonOptions.chart,
      type: 'line',
      height: 400,
      animations: {
        enabled: true,
        easing: 'easeinout',
        dynamicAnimation: { speed: 1000 }
      }
    },
    title: {
      text: 'Health Metrics Comparison',
      align: 'left',
      style: { fontSize: '16px', fontWeight: 600 }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          year: 'yyyy',
          month: "MMM 'yy",
          day: 'dd MMM',
          hour: 'HH:mm'
        },
        datetimeUTC: false,
        style: { colors: '#666' }
      },
      tooltip: { enabled: false }
    },
    yaxis: yaxes,
    tooltip: {
      shared: true,
      x: { format: 'MMM dd, yyyy' }
    },
    stroke: {
      curve: 'smooth',
      width: [2, 2, 2, 2],
      dashArray: [0, 0, 6, 6]
    },
    markers: {
      size: dateRangeDays.value > 31 ? 0 : 3,
      strokeWidth: 0,
      hover: { size: 6 }
    },
    grid: {
      show: true,
      borderColor: '#f1f1f1',
      strokeDashArray: 0,
      position: 'back'
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right'
    }
  };
})

// Primary chart series
const primaryChartSeries = ref<ChartSeries[]>([])

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
    sleep: 'Sleep Duration (hrs)',
    heartRate: 'Resting Heart Rate (bpm)',
    steps: 'Steps',
    deepSleep: 'Deep Sleep (hrs)',
    lightSleep: 'Light Sleep (hrs)',
    remSleep: 'REM Sleep (hrs)',
    wakeTime: 'Wake Time (min)',
    azmTotal: 'Active Zone Minutes',
    azmFatBurn: 'Fat Burn Minutes',
    azmCardio: 'Cardio Minutes',
    azmPeak: 'Peak Minutes',
    spo2: 'SpO₂ (%)',
    breathingRate: 'Breathing Rate (br/min)',
    temperature: 'Skin Temp Variation (°C)'
  };
  return labels[metric] || metric;
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

// Trailing average helper
function computeTrailingAverage(data: ChartDataPoint[], window: number): ChartDataPoint[] {
  const n = data.length;
  // if no data or invalid window, return all nulls
  if (n === 0 || window < 2) {
    return data.map(d => ({ x: d.x, y: null }));
  }
  return data.map((point, idx) => {
    // only start averaging after we've seen 'window' days
    if (idx < window - 1) {
      return { x: point.x, y: null };
    }
    // take the last 'window' days
    const slice = data.slice(idx - window + 1, idx + 1);
    // filter out nulls (including filtered outliers)
    const vals = slice.map(d => d.y).filter((y): y is number => y != null);
    if (vals.length === 0) {
      return { x: point.x, y: null };
    }
    const sum = vals.reduce((acc, y) => acc + y, 0);
    const avg = sum / vals.length;
    return { x: point.x, y: +avg.toFixed(2) };
  });
}

// Outlier filtering helper: null out any points beyond ±2 standard deviations
function filterOutliers(data: ChartDataPoint[], numStd: number = 2): ChartDataPoint[] {
  const validYs = data.map(d => d.y).filter((y): y is number => y != null);
  if (!validYs.length) {
    return data.map(d => ({ x: d.x, y: null }));
  }
  const mean = validYs.reduce((sum, y) => sum + y, 0) / validYs.length;
  const variance = validYs.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0) / validYs.length;
  const std = Math.sqrt(variance);
  return data.map(d => {
    if (d.y == null) return { x: d.x, y: null };
    return Math.abs(d.y - mean) > numStd * std ? { x: d.x, y: null } : d;
  });
}

// Data fetching
const fetchData = async () => {
  await fetchMetricsData();
}

async function fetchMetricsData() {
  console.log('Fetching metrics data with userId:', userStore.userId);
  
  if (!userStore.userId) {
    console.error('No user ID available, redirecting to settings');
    router.push('/settings');
    return;
  }

  try {
    // Get the actual metric names from our mappings
    const metric1 = METRIC_MAPPINGS[primaryMetric1.value as keyof typeof METRIC_MAPPINGS];
    const metric2 = primaryMetric2.value ? METRIC_MAPPINGS[primaryMetric2.value as keyof typeof METRIC_MAPPINGS] : null;

    if (!metric1) {
      console.error('Invalid primary metric selection:', primaryMetric1.value);
      return;
    }

    // Construct metrics parameter
    const metricsParam = metric2 ? `${metric1},${metric2}` : metric1;
    const url = `/api/health/${userStore.userId}/metrics`;
    const params = new URLSearchParams({
      startDate: startDate.value,
      endDate: endDate.value,
      metrics: metricsParam
    });

    console.log('Fetching metrics from URL:', `${url}?${params}`);

    const response = await fetch(`${url}?${params}`);
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'No error details available' }));
      console.error('Error response:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const { data } = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No data available for the selected date range');
      primaryChartSeries.value = [];
      return;
    }

    // Transform data for ApexCharts
    const seriesArr: ChartSeries[] = [];
    // Metric 1
    if (primaryMetric1.value) {
      const metric1 = METRIC_MAPPINGS[primaryMetric1.value as keyof typeof METRIC_MAPPINGS];
      const series1 = {
        name: getMetricLabel(primaryMetric1.value),
        data: data.map((d: MetricDataPoint): ChartDataPoint => ({
          x: new Date(d.date).getTime(),
          y: typeof d[metric1 as keyof MetricDataPoint] === 'number' ? d[metric1 as keyof MetricDataPoint] as number : null
        })).filter((d: ChartDataPoint) => d.y != null)
      };
      seriesArr.push(series1);
      if (showTrailingAverage.value) {
        seriesArr.push({
          name: getMetricLabel(primaryMetric1.value) + ` (${trailingAverageWindow.value}-day Avg)`,
          data: computeTrailingAverage(
            showFilterOutliers.value ? filterOutliers(series1.data) : series1.data,
            trailingAverageWindow.value
          )
        });
      }
    }
    // Metric 2
    if (primaryMetric2.value) {
      const metric2 = METRIC_MAPPINGS[primaryMetric2.value as keyof typeof METRIC_MAPPINGS];
      const series2 = {
        name: getMetricLabel(primaryMetric2.value),
        data: data.map((d: MetricDataPoint): ChartDataPoint => ({
          x: new Date(d.date).getTime(),
          y: metric2 === 'total_sleep' && typeof d[metric2] === 'number' ? (d[metric2] as number) / 60 : typeof d[metric2 as keyof MetricDataPoint] === 'number' ? d[metric2 as keyof MetricDataPoint] as number : null
        })).filter((d: ChartDataPoint) => d.y != null)
      };
      seriesArr.push(series2);
      if (showTrailingAverage.value) {
        seriesArr.push({
          name: getMetricLabel(primaryMetric2.value) + ` (${trailingAverageWindow.value}-day Avg)`,
          data: computeTrailingAverage(
            showFilterOutliers.value ? filterOutliers(series2.data) : series2.data,
            trailingAverageWindow.value
          )
        });
      }
    }
    primaryChartSeries.value = seriesArr;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    primaryChartSeries.value = [];
  }
}

// Watch for configuration changes
watch([
  primaryMetric1, primaryMetric2, showMedications, showSymptoms, showAllChanges, showTrailingAverage, trailingAverageWindow, showFilterOutliers
], () => {
  fetchData()
})

onMounted(() => {
  // Set initial metrics
  primaryMetric1.value = 'hrv';
  primaryMetric2.value = 'sleep';
  
  fetchData();
})

const dateRangeDays = computed(() => {
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  // +1 to include both start and end dates
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
});

const fullscreenChartRef = ref()

watch(showFullScreenChart, async (val) => {
  if (val) {
    await nextTick()
    fullscreenChartRef.value?.chart?.resize()
  }
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

.fullscreen-modal {
  position: fixed;
  z-index: 1000;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.fullscreen-modal__content {
  background: white;
  border-radius: var(--radius-lg, 12px);
  padding: 2rem;
  position: relative;
  width: 95vw;
  max-width: none;
  height: 90vh;
  display: flex;
  flex-direction: column;
}
.fullscreen-modal__content .apexcharts-canvas {
  flex: 1 1 auto;
  min-height: 0;
}
.fullscreen-modal__content apexchart {
  flex: 1 1 auto;
  min-height: 0;
}
.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
}
.popout-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  margin-left: 1rem;
  cursor: pointer;
  color: var(--text-secondary, #888);
}
</style> 