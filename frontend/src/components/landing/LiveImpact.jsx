import { lazy, Suspense, useEffect, useState } from 'react'
import { liveImpactApi } from '../../services/api/liveImpactApi'
import { useLanguage } from '../../contexts/useLanguage'

const LiveImpactCharts = lazy(() => import('./LiveImpactCharts'))

function LoadingPanel() {
  const { t } = useLanguage()
  return (
    <div aria-label={t('সরাসরি পরিসংখ্যান লোড হচ্ছে')} className="live-impact-loading" role="status">
      <span />
      <span />
      <span />
    </div>
  )
}

function LiveImpact() {
  const { t } = useLanguage()
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState({ status: 'loading', data: null })

  useEffect(() => {
    const controller = new AbortController()

    liveImpactApi.get({ signal: controller.signal })
      .then((data) => setState({ status: 'success', data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error', data: null })
      })

    return () => controller.abort()
  }, [requestVersion])

  function retryLoad() {
    setState({ status: 'loading', data: null })
    setRequestVersion((version) => version + 1)
  }

  const data = state.data

  return (
    <section aria-labelledby="live-impact-title" className="live-impact">
      <div className="live-impact-heading">
        <h2 id="live-impact-title"><span aria-hidden="true">📊</span> {t('সরাসরি প্রভাব')}</h2>
        <span className="live-impact-status"><span aria-hidden="true" /> {t('রিয়েল-টাইম')}</span>
      </div>

      {state.status === 'loading' && <LoadingPanel />}

      {state.status === 'error' && (
        <div className="live-impact-error" role="alert">
          <p>{t('সরাসরি পরিসংখ্যান লোড করা যায়নি।')}</p>
          <button onClick={retryLoad} type="button">
            {t('আবার চেষ্টা করুন')}
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <div className="live-impact-content">
            <section aria-label={t('মোট নিবন্ধিত রক্তদাতা')} className="live-impact-total">
              <span>{t('মোট নিবন্ধিত রক্তদাতা')}</span>
              <strong>{data.totalRegistered.toLocaleString()}</strong>
            </section>
            <Suspense fallback={<LoadingPanel />}>
              <LiveImpactCharts data={data} />
            </Suspense>
          </div>

          <p className="live-impact-quote">{t('“Every drop counts.”')}</p>
        </>
      )}
    </section>
  )
}

export default LiveImpact
