import { Bar, Doughnut } from 'react-chartjs-2'
import { useLanguage } from '../../contexts/useLanguage'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LinearScale, Tooltip)

const bloodGroupColors = [
  '#ef4444',
  '#fb7185',
  '#f97316',
  '#fbbf24',
  '#a78bfa',
  '#818cf8',
  '#34d399',
  '#2dd4bf',
]

const chartTextColor = '#c7c9d1'
const chartGridColor = 'rgb(255 255 255 / 9%)'

ChartJS.defaults.color = chartTextColor

function LiveImpactCharts({ data }) {
  const { t } = useLanguage()
  const groupEntries = Object.entries(data.bloodGroups)
  const hasBloodGroups = groupEntries.some(([, count]) => count > 0)
  const hasMonthlyRegistrations = data.monthlyRegistrations.length > 0

  const bloodGroupChart = {
    labels: groupEntries.map(([group]) => group),
    datasets: [{
      data: groupEntries.map(([, count]) => count),
      backgroundColor: bloodGroupColors,
      borderColor: '#171923',
      borderWidth: 3,
      hoverOffset: 7,
    }],
  }

  const monthlyChart = {
    labels: data.monthlyRegistrations.map(({ label }) => label),
    datasets: [{
      label: t('নিবন্ধন'),
      data: data.monthlyRegistrations.map(({ count }) => count),
      backgroundColor: 'rgba(239, 68, 68, .78)',
      borderColor: '#fb7185',
      borderWidth: 1,
      borderRadius: 6,
      maxBarThickness: 32,
    }],
  }

  return (
    <div className="live-impact-charts">
      <section aria-labelledby="live-impact-blood-title" className="live-impact-card">
        <h3 id="live-impact-blood-title">{t('রক্তের গ্রুপসমূহ')}</h3>
        <div className="live-impact-blood-content">
          <div className="live-impact-doughnut">
            {hasBloodGroups
              ? (
                <Doughnut
                  aria-label="Registered donors by blood group"
                  data={bloodGroupChart}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: '66%',
                  }}
                  role="img"
                />
              )
              : <p className="live-impact-empty-chart">{t('এখনও রক্তের গ্রুপের তথ্য নেই।')}</p>}
          </div>
          <ul className="live-impact-group-list">
            {groupEntries.map(([group, count], index) => (
              <li key={group}>
                <span aria-hidden="true" style={{ '--group-color': bloodGroupColors[index] }} />
                <span>{group}</span>
                <strong>{count.toLocaleString()}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="live-impact-month-title" className="live-impact-card">
        <h3 id="live-impact-month-title">{t('মাসিক নিবন্ধন')}</h3>
        {hasMonthlyRegistrations
          ? (
            <div className="live-impact-bar">
              <Bar
                aria-label="Registrations by year and month"
                data={monthlyChart}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      ticks: { color: chartTextColor, maxRotation: 0, autoSkip: true },
                      grid: { display: false },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: { color: chartTextColor, precision: 0, stepSize: 1 },
                      grid: { color: chartGridColor },
                    },
                  },
                }}
                role="img"
              />
            </div>
          )
          : <p className="live-impact-empty-chart">{t('এখনও নিবন্ধনের ইতিহাস নেই।')}</p>}
      </section>
    </div>
  )
}

export default LiveImpactCharts
