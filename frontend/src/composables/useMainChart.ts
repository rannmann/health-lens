import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { format, subDays } from 'date-fns';

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

interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}

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

const SERIES_COLORS = ['#7FA2FF', '#FFB347'];
const TRAILING_AVG_COLORS = ['#1A237E', '#FF6F00'];

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

function computeTrailingAverage(data: ChartDataPoint[], window: number): ChartDataPoint[] {
  const n = data.length;
  if (n === 0 || window < 2) {
    return data.map(d => ({ x: d.x, y: null }));
  }
  return data.map((point, idx) => {
    if (idx < window - 1) {
      return { x: point.x, y: null };
    }
    const slice = data.slice(idx - window + 1, idx + 1);
    const vals = slice.map(d => d.y).filter((y): y is number => y != null);
    if (vals.length === 0) {
      return { x: point.x, y: null };
    }
    const sum = vals.reduce((acc, y) => acc + y, 0);
    const avg = sum / vals.length;
    return { x: point.x, y: +avg.toFixed(2) };
  });
}

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

export function useMainChart() {
  const userStore = useUserStore();
  const router = useRouter();

  // State
  const startDate = ref(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const endDate = ref(format(new Date(), 'yyyy-MM-dd'));
  const primaryMetric1 = ref('hrv');
  const primaryMetric2 = ref('sleep');
  const showTrailingAverage = ref(false);
  const trailingAverageWindow = ref(10);
  const showFilterOutliers = ref(false);
  const primaryChartSeries = ref<ChartSeries[]>([]);

  const dateRangeDays = computed(() => {
    const start = new Date(startDate.value);
    const end = new Date(endDate.value);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  });

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
  };

  const primaryChartOptions = computed(() => {
    const yaxes: any[] = [];
    if (primaryMetric1.value) {
      const axis0Series = [
        getMetricLabel(primaryMetric1.value),
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
        seriesName: axis0Series
      });
    }
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
    const colors: string[] = [];
    if (primaryMetric1.value) {
      colors.push(SERIES_COLORS[0]);
      if (showTrailingAverage.value) colors.push(TRAILING_AVG_COLORS[0]);
    }
    if (primaryMetric2.value) {
      colors.push(SERIES_COLORS[1]);
      if (showTrailingAverage.value) colors.push(TRAILING_AVG_COLORS[1]);
    }
    return {
      ...chartCommonOptions,
      colors,
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
          style: { colors: '#222', fontWeight: 500 }
        },
        tooltip: { enabled: false }
      },
      yaxis: yaxes,
      tooltip: {
        shared: true,
        x: { format: 'MMM dd, yyyy' }
      },
      stroke: {
        width: [2, 2, 3, 3],
        dashArray: [0, 0, 0, 0],
        curve: 'smooth'
      },
      markers: {
        size: dateRangeDays.value > 31 ? 0 : 2,
        strokeWidth: 0,
        hover: { size: 7 }
      },
      grid: {
        show: true,
        borderColor: '#e0e0e0',
        strokeDashArray: 2,
        position: 'back'
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: {
          colors: '#222',
          useSeriesColors: false,
          fontWeight: 500
        },
        markers: {
          width: 18,
          height: 6,
          radius: 2
        }
      }
    };
  });

  async function fetchData() {
    if (!userStore.userId) {
      router.push('/settings');
      return;
    }
    try {
      const metric1 = METRIC_MAPPINGS[primaryMetric1.value as keyof typeof METRIC_MAPPINGS];
      const metric2 = primaryMetric2.value ? METRIC_MAPPINGS[primaryMetric2.value as keyof typeof METRIC_MAPPINGS] : null;
      if (!metric1) return;
      const metricsParam = metric2 ? `${metric1},${metric2}` : metric1;
      const url = `/api/health/${userStore.userId}/metrics`;
      const params = new URLSearchParams({
        startDate: startDate.value,
        endDate: endDate.value,
        metrics: metricsParam
      });
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const { data } = await response.json();
      if (!data || !Array.isArray(data) || data.length === 0) {
        primaryChartSeries.value = [];
        return;
      }
      const seriesArr: ChartSeries[] = [];
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
      primaryChartSeries.value = [];
    }
  }

  watch([
    primaryMetric1, primaryMetric2, showTrailingAverage, trailingAverageWindow, showFilterOutliers, startDate, endDate
  ], () => {
    fetchData();
  });

  return {
    startDate,
    endDate,
    primaryMetric1,
    primaryMetric2,
    showTrailingAverage,
    trailingAverageWindow,
    showFilterOutliers,
    primaryChartOptions,
    primaryChartSeries,
    fetchData,
    dateRangeDays
  };
} 