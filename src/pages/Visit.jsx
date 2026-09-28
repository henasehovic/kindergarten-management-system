import { useState } from 'react'
import { useLanguage } from '../components/LanguageContext'

export default function VisitPage() {
  const { t } = useLanguage()
  const [message, setMessage] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    setMessage(t('thanks'))
    e.target.reset()
    setTimeout(() => setMessage(''), 4000)
  }

  return (
    <main className="px-6 lg:px-12 py-12">
      <div className="rounded-3xl bg-navy text-white p-8 lg:p-12 grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <p className="text-sunrise font-semibold">{t('scheduleVisit')}</p>
          <h1 className="font-display text-4xl">{t('magic')}</h1>
          <p className="text-white/80">{t('tours')}</p>
          <ul className="text-white/80 list-disc list-inside space-y-1">
            <li>{t('meet')}</li>
            <li>{t('peekClass')}</li>
            <li>{t('playground')}</li>
          </ul>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="h-28 rounded-xl bg-gradient-to-br from-sunrise to-berry opacity-90 text-white grid place-items-center text-sm">Classroom peek</div>
            <div className="h-28 rounded-xl bg-gradient-to-br from-sky to-mint opacity-90 text-white grid place-items-center text-sm">Outdoor tour</div>
          </div>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <input required name="parent" placeholder={t('parent')} className="w-full px-4 py-3 rounded-xl text-navy" />
            <input required name="child" placeholder={t('child')} className="w-full px-4 py-3 rounded-xl text-navy" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input required name="email" type="email" placeholder={t('email')} className="w-full px-4 py-3 rounded-xl text-navy" />
            <input required name="phone" type="tel" placeholder={t('phone')} className="w-full px-4 py-3 rounded-xl text-navy" />
          </div>
          <textarea name="notes" rows="3" placeholder={t('notes')} className="w-full px-4 py-3 rounded-xl text-navy"></textarea>
          <button className="w-full bg-sunrise text-navy font-semibold px-5 py-3 rounded-xl shadow hover:-translate-y-0.5 transition">{t('request')}</button>
          {message && <p className="text-sm text-sunrise/90">{message}</p>}
        </form>
      </div>
    </main>
  )
}
