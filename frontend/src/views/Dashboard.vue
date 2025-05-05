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
          <template #title>Steps (Past Month)</template>
          <div class="chart-container">
            <apexchart
              type="bar"
              height="200"
              :options="stepsTrendOptions"
              :series="stepsTrendSeries"
            />
          </div>
        </BaseCard>
        
        <BaseCard>
          <template #title>Active Zone Minutes</template>
          <div class="chart-container">
            <apexchart
              type="bar"
              height="200"
              :options="azmTrendOptions"
              :series="azmTrendSeries"
            />
          </div>
        </BaseCard>
        
        <BaseCard>
          <template #title>Wake Minutes</template>
          <div class="chart-container">
            <apexchart
              type="bar"
              height="200"
              :options="wakeTrendOptions"
              :series="wakeTrendSeries"
            />
          </div>
        </BaseCard>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import BaseCard from '../components/BaseCard.vue'
import { useMainChart } from '../composables/useMainChart'
import { useMetricTrend } from '../composables/useMetricTrend'

// Main chart composable
const {
  startDate,
  endDate,
  primaryMetric1,
  primaryMetric2,
  showTrailingAverage,
  trailingAverageWindow,
  showFilterOutliers,
  primaryChartOptions,
  primaryChartSeries,
  fetchData} = useMainChart()

// Other dashboard state
const showMedications = ref(true)
const showSymptoms = ref(false)
const showAllChanges = ref(false)
const showFullScreenChart = ref(false)

// Wake Minutes trend composable
const { trendOptions: wakeTrendOptions, trendSeries: wakeTrendSeries, fetchTrend: fetchWakeTrend } = useMetricTrend('wake_minutes', 'Wake Minutes', '#FFB347', startDate, endDate)

// Steps trend composable (generic)
const { trendOptions: stepsTrendOptions, trendSeries: stepsTrendSeries, fetchTrend: fetchStepsTrend } = useMetricTrend('steps', 'Steps', '#008FFB', startDate, endDate)

// Activity trend composable (AZM)
const { trendOptions: azmTrendOptions, trendSeries: azmTrendSeries, fetchTrend: fetchAzmTrend } = useMetricTrend('azm_total', 'Active Zone Minutes', '#00E396', startDate, endDate)

// Fullscreen chart logic
const fullscreenChartRef = ref()
watch(showFullScreenChart, async (val) => {
  if (val) {
    await nextTick()
    fullscreenChartRef.value?.chart?.resize()
  }
})

onMounted(() => {
  fetchData();
  fetchStepsTrend();
  fetchAzmTrend();
  fetchWakeTrend();
})

watch([startDate, endDate], () => {
  fetchStepsTrend();
  fetchAzmTrend();
  fetchWakeTrend();
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