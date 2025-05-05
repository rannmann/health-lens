import { ref } from 'vue';
import { useUserStore } from '../stores/user';
import api from '../api/axios';

export interface ChartDataPoint {
  x: number;
  y: number | null;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}

export function useMetricTrend(
  metric: string,
  label: string,
  color: string,
  startDate: any,
  endDate: any
) {
  const userStore = useUserStore();
  const trendSeries = ref<ChartSeries[]>([
    { name: label, data: [] }
  ]);

  const trendOptions = ref({
    chart: {
      toolbar: {
        show: false
      },
      type: 'bar',
      height: 200
    },
    xaxis: {
      type: 'datetime',
      style: { colors: '#222', fontWeight: 500 }
    },
    stroke: {
      curve: 'smooth'
    },
    markers: {
      size: 4
    },
    colors: [color],
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded'
      }
    },
    yaxis: {
      title: { text: label },
      min: 0
    }
  });

  async function fetchTrend() {
    if (!userStore.userId) return;
    try {
      const params = {
        startDate: startDate.value,
        endDate: endDate.value,
        metrics: metric
      };
      const response = await api.get('/health/metrics', { params });
      const { data } = response.data;
      if (!data || !Array.isArray(data) || data.length === 0) {
        trendSeries.value = [{ name: label, data: [] }];
        return;
      }
      const series = {
        name: label,
        data: data.map((d: any): ChartDataPoint => ({
          x: new Date(d.date).getTime(),
          y: typeof d[metric] === 'number' ? d[metric] : null
        })).filter((d: ChartDataPoint) => d.y != null)
      };
      trendSeries.value = [series];
    } catch (e) {
      trendSeries.value = [{ name: label, data: [] }];
    }
  }

  return {
    trendOptions,
    trendSeries,
    fetchTrend
  };
} 