import { useState } from 'react'
import { useLanguage } from '../components/LanguageContext'
import LazySection from '../components/LazySection'
import GoogleMap from '../components/GoogleMap'
import puzic from '../../puzic.png'

const API_BASE = (import.meta.env?.VITE_API_BASE || '').replace(/\/+$/, '') || ''

const copy = {
  en: {
    title: "We're here to help.",
    intro: 'Reach out with questions, book a tour, or chat about the best fit for your child.',
    contact: 'Contact details',
    send: 'Send us a note',
    placeholders: {
      name: 'Your name',
      email: 'Email',
      phone: 'Phone (optional)',
      message: 'How can we help?',
      submit: 'Submit',
    },
    map: 'Map',
    visit: 'Visit us',
    visitText: 'We are happy to host you for a short tour during the morning or early afternoon. Let us know your preferred day and time in the form in the Admissions tab.',
    visitNote: 'Parking available near the main entrance.',
    hoursLine1: 'Opening hours: Monday - Friday',
    hoursLine2: '7:30 AM - 5:30 PM',
  },
  bs: {
    title: 'Tu smo da pomognemo.',
    intro: 'Javite se sa pitanjima, rezervisite obilazak ili popricajte o najboljem programu za vase dijete.',
    contact: 'Kontakt detalji',
    send: 'Posaljite poruku',
    placeholders: {
      name: 'Vase ime',
      email: 'Email',
      phone: 'Telefon (opciono)',
      message: 'Kako mozemo pomoci?',
      submit: 'Posalji',
    },
    map: 'Mapa',
    visit: 'Posjetite nas',
    visitText: 'Rado cemo vas primiti na kratak obilazak ujutro ili rano popodne. Upisite zeljeni dan i vrijeme u formi u tabu Upis.',
    visitNote: 'Parking je dostupan kod glavnog ulaza.',
    hoursLine1: 'Radno vrijeme: ponedjeljak - petak',
    hoursLine2: '7:30 - 17:30',
  },
}

export default function ContactPage() {
  const { language } = useLanguage()
  const t = copy[language] || copy.en
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const wiggle = (e) => {
    e.currentTarget.animate(
      [
        { transform: 'rotate(0deg) translateY(0)' },
        { transform: 'rotate(-4deg) translateY(-3px)' },
        { transform: 'rotate(4deg) translateY(3px)' },
        { transform: 'rotate(0deg) translateY(0)' },
      ],
      { duration: 320, easing: 'ease-in-out' }
    )
  }
  const validate = () => {
    const next = {}
    const namePattern = /^(?=.{2,}$)[A-Za-zÀ-ÿ\s-]+$/
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    const phonePattern = /^[+\d\s-]{6,}$/
    if (!form.name.trim()) next.name = language === 'bs' ? 'Unesite ime.' : 'Please enter your name.'
    else if (!namePattern.test(form.name.trim()))
      next.name = language === 'bs' ? 'Koristite samo slova (min. 2).' : 'Use letters, spaces, or hyphens (min 2).'
    if (!emailPattern.test(form.email.trim()))
      next.email = language === 'bs' ? 'Unesite važeći email.' : 'Please enter a valid email.'
    if (form.phone.trim() && !phonePattern.test(form.phone.trim()))
      next.phone = language === 'bs' ? 'Unesite važeći telefon (6+ cifara).' : 'Enter a valid phone (6+ digits).'
    if (!form.message.trim()) next.message = language === 'bs' ? 'Poruka je obavezna.' : 'Message is required.'
    else if (form.message.trim().length > 500)
      next.message = language === 'bs' ? 'Do 500 znakova.' : 'Up to 500 characters.'
    return next
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(false)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/requests/tour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          notes: form.message.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to send.')
      setForm({ name: '', email: '', phone: '', message: '' })
      setSubmitted(true)
      setErrors({})
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.message || 'Unable to send.' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <header className="space-y-3 max-w-3xl relative">
        <p className="text-berry font-semibold">{language === 'bs' ? 'Kontakt' : 'Contact'}</p>
        <h1 className="font-display text-4xl text-navy">{t.title}</h1>
        <p className="text-lg text-navy/80">{t.intro}</p>
        <img
          src={puzic}
          alt=""
          className="hidden sm:block pointer-events-auto select-none absolute right-[-450px] -top-[174px] object-contain opacity-90"
          style={{ width: '32rem', height: '32rem' }}
          aria-hidden="true"
          onMouseEnter={wiggle}
        />
      </header>

      <LazySection>
        <section className="grid lg:grid-cols-3 gap-8">
          <div className="bg-white/80 border border-berry/10 rounded-2xl p-6 shadow-sm space-y-4" style={{ backgroundColor: '#CDE7F0' }}>
            <p className="font-semibold text-navy">{t.contact}</p>
            <div className="space-y-2 text-navy/80">
              <p>{language === 'bs' ? 'Telefon: (555) 123-4567' : 'Phone: (555) 123-4567'}</p>
              <p>{language === 'bs' ? 'Email: hello@kindergarten.com' : 'Email: hello@kindergarten.com'}</p>
              <p>{language === 'bs' ? 'Adresa: Ulica Sunca 123, Grad prijatelja' : 'Address: 123 Sunshine Avenue, Friendly Town'}</p>
            </div>
            <div className="space-y-1 text-sm text-navy/70">
              <p>{t.hoursLine1}</p>
              <p>{t.hoursLine2}</p>
            </div>
            <div className="flex gap-3 text-berry font-semibold">
              <a href="https://www.instagram.com/vrticmladost/" target="_blank" rel="noreferrer">
                Instagram
              </a>
              <a href="https://www.facebook.com/vrtic.mladost.2025" target="_blank" rel="noreferrer">
                Facebook
              </a>
            </div>
          </div>
          <div className="bg-white/80 border border-berry/10 rounded-2xl p-6 shadow-sm space-y-3 lg:col-span-2" style={{ backgroundColor: '#FCE2E3' }}>
            <p className="font-semibold text-navy">{t.send}</p>
            <form className="grid md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <input
                  name="name"
                  placeholder={t.placeholders.name}
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border text-navy bg-white ${errors.name ? 'border-berry' : 'border-berry/15'}`}
                  required
                />
                {errors.name && <p className="text-xs text-berry">{errors.name}</p>}
              </div>
              <div className="space-y-1">
                <input
                  type="email"
                  name="email"
                  placeholder={t.placeholders.email}
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border text-navy bg-white ${errors.email ? 'border-berry' : 'border-berry/15'}`}
                  required
                />
                {errors.email && <p className="text-xs text-berry">{errors.email}</p>}
              </div>
              <div className="space-y-1 md:col-span-2">
                <input
                  name="phone"
                  placeholder={t.placeholders.phone}
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border text-navy bg-white ${errors.phone ? 'border-berry' : 'border-berry/15'}`}
                />
                {errors.phone && <p className="text-xs text-berry">{errors.phone}</p>}
              </div>
              <div className="space-y-1 md:col-span-2">
                <textarea
                  name="message"
                  rows="4"
                  maxLength={500}
                  placeholder={t.placeholders.message}
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border text-navy bg-white ${errors.message ? 'border-berry' : 'border-berry/15'}`}
                  required
                />
                {errors.message && <p className="text-xs text-berry">{errors.message}</p>}
              </div>
              <div className="md:col-span-2 flex flex-col gap-2">
                <button
                  className="px-5 py-3 rounded-full bg-berry text-white font-semibold shadow hover:-translate-y-0.5 transition disabled:opacity-60"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (language === 'bs' ? 'Šaljemo…' : 'Sending…') : t.placeholders.submit}
                </button>
                {submitted && <p className="text-sm text-navy/80">{language === 'bs' ? 'Poruka poslata!' : 'Message sent!'}</p>}
                {errors.submit && <p className="text-sm text-berry">{errors.submit}</p>}
              </div>
            </form>
          </div>
        </section>
      </LazySection>

      <LazySection>
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white/80 border border-berry/10 rounded-2xl p-6 shadow-sm" style={{ backgroundColor: '#CFEDEA' }}>
            <GoogleMap className="aspect-video rounded-xl border border-dashed border-berry/25 bg-mint/40" />
          </div>
          <div className="bg-white/80 border border-berry/10 rounded-2xl p-6 shadow-sm space-y-3" style={{ backgroundColor: '#FFF1B6' }}>
            <p className="font-semibold text-navy">{t.visit}</p>
            <p className="text-navy/80">{t.visitText}</p>
            <p className="text-sm text-navy/70">{t.visitNote}</p>
          </div>
        </section>
      </LazySection>
    </main>
  )
}
