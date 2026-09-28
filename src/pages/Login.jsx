import { Link } from 'react-router-dom'
import { useLanguage } from '../components/LanguageContext'

export default function LoginPage() {
  const { t } = useLanguage()

  return (
    <main className="px-6 lg:px-12 py-12 space-y-8">
      <header className="space-y-2 max-w-3xl">
        <p className="text-berry font-semibold">{t('loginSelect')}</p>
        <h1 className="font-display text-4xl">Login</h1>
        <p className="text-navy/75">{t('loginGuestNote')}</p>
      </header>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white p-6 shadow space-y-3">
          <p className="text-berry font-semibold">{t('parentPortal')}</p>
          <h2 className="font-display text-2xl">{t('loginParent')}</h2>
          <p className="text-navy/75 text-sm">{t('parentIntro')}</p>
          <Link to="/parent/login" className="inline-flex items-center px-4 py-3 rounded-xl bg-berry text-white font-semibold shadow hover:-translate-y-0.5 transition">
            {t('loginParent')}
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow space-y-3">
          <p className="text-berry font-semibold">{t('workerPortal')}</p>
          <h2 className="font-display text-2xl">{t('loginWorker')}</h2>
          <p className="text-navy/75 text-sm">{t('workerIntro')}</p>
          <Link to="/worker" className="inline-flex items-center px-4 py-3 rounded-xl bg-navy text-white font-semibold shadow hover:-translate-y-0.5 transition">
            {t('loginWorker')}
          </Link>
        </div>
      </section>
    </main>
  )
}
