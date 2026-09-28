import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../components/LanguageContext'
import LazySection from '../components/LazySection'
import bubamaraImg from '../../bubamara.png'

const guessApiBase = () => {
  const envBase = (import.meta.env?.VITE_API_BASE || '').replace(/\/+$/, '')
  if (envBase) return envBase
  if (typeof window !== 'undefined') {
    if (window.location?.port === '5173') return 'http://localhost:3001'
    return window.location.origin.replace(/\/+$/, '')
  }
  return ''
}

const API_BASE = guessApiBase()

const stepsCopy = {
  en: [
    { title: 'Say hello', detail: "Share your child's age and needs. We'll answer questions and plan a visit." },
    { title: 'Visit & meet', detail: 'Tour the classrooms, meet teachers, and review routines and schedules.' },
    { title: 'Enroll', detail: 'Submit forms, confirm start date, and prepare your child for their first day.' },
  ],
  bs: [
    { title: 'Javite nam se', detail: 'Podijelite dob i potrebe djeteta. Odgovoricemo na pitanja i zakazati posjetu.' },
    { title: 'Posjeta i upoznavanje', detail: 'Obidjite ucionice, upoznajte nastavnike i prodjite kroz raspored.' },
    { title: 'Upis', detail: 'Predajte obrasce, potvrdite datum pocetka i pripremite dijete za prvi dan.' },
  ],
}

const reqCopy = {
  en: [
    'Completed application form',
    'Child ID / birth certificate (copy)',
    'Immunization or health record (as required)',
    'Emergency contact information',
    'Any allergy or medical notes',
  ],
  bs: [
    'Popunjen obrazac prijave',
    'Licna karta ili rodni list djeteta (kopija)',
    'Potvrda o vakcinaciji ili zdrastveni karton (po potrebi)',
    'Kontakt za hitne slucajeve',
    'Napomene o alergijama ili zdravlju',
  ],
}

const copy = {
  en: {
    title: 'A clear, caring enrollment process.',
    intro: 'We keep paperwork simple and stay close by to guide you at every step.',
    stepsTitle: '3 easy steps',
    tourTitle: 'Book a tour',
    tourText: 'Prefer to see us first? Click below to request a visit, and we\'ll confirm a time.',
    tourCTA: 'Request a tour',
    tourNote: 'No obligation. We\'ll reply within one business day.',
    formTitle: 'Online application',
    formIntro: 'Fill in the details below; we\'ll follow up to review availability and next steps.',
    reqTitle: 'Requirements & documents',
    feesTitle: 'Fees overview',
    feesNote: 'We tailor schedules to each family. Replace this placeholder with your pricing table or "Contact us for pricing".',
    feesPlaceholder: 'Fees table placeholder',
    confirmation: 'Thank you! We’ll review your application and contact you soon.',
    errors: {
      required: 'Please fill out this field.',
      email: 'Please enter a valid email address.',
      phone: 'Please enter a phone number (digits or +).',
      dob: 'Please enter a valid date of birth in the past.',
      start: 'Please enter a preferred start date that is today or later.',
    },
    placeholders: {
      parent: 'Parent/Guardian name',
      email: 'Email',
      phone: 'Phone',
      child: 'Child name',
      dob: 'Date of birth',
      start: 'Preferred start date',
      notes: 'Notes or questions',
      submit: 'Submit application',
    },
  },
  bs: {
    title: 'Jasan i brizan proces upisa.',
    intro: 'Papirologiju drzimo jednostavnom i vodimo vas kroz svaki korak.',
    stepsTitle: '3 jednostavna koraka',
    tourTitle: 'Zatrazi obilazak',
    tourText: 'Zelite prvo da nas vidite? Kliknite ispod da trazite termin, potvrdicemo vrijeme.',
    tourCTA: 'Zahtjev za obilazak',
    tourNote: 'Bez obaveze. Odgovaramo u roku od jednog radnog dana.',
    formTitle: 'Online prijava',
    formIntro: 'Popunite detalje; javicemo se o raspolozivosti i narednim koracima.',
    reqTitle: 'Zahtjevi i dokumenti',
    feesTitle: 'Pregled cijena',
    feesNote: 'Raspored prilagodjavamo porodicama. Ovdje mozete staviti tabelu ili poruku "Kontaktirajte nas za cijene".',
    feesPlaceholder: 'Rezervisano za tabelu cijena',
    confirmation: 'Hvala! Pregledaćemo vašu prijavu i javiti vam se uskoro.',
    errors: {
      required: 'Molimo popunite ovo polje.',
      email: 'Unesite važeću email adresu.',
      phone: 'Unesite broj telefona (cifre ili +).',
      dob: 'Unesite datum rođenja u prošlosti.',
      start: 'Unesite željeni datum početka koji je danas ili kasnije.',
    },
    placeholders: {
      parent: 'Ime roditelja/staratelja',
      email: 'Email',
      phone: 'Telefon',
      child: 'Ime djeteta',
      dob: 'Datum rodjenja',
      start: 'Zeljeni datum pocetka',
      notes: 'Napomene ili pitanja',
      submit: 'Pošalji prijavu',
    },
  },
}

export default function AdmissionsPage() {
  const { language } = useLanguage()
  const isBs = language === 'bs'
  const t = copy[language] || copy.en
  const steps = stepsCopy[language] || stepsCopy.en
  const reqs = reqCopy[language] || reqCopy.en
  const stepsRefs = useRef([])
  const [visibleSteps, setVisibleSteps] = useState([])
  const [formData, setFormData] = useState({
    parentName: '',
    email: '',
    phone: '',
    childName: '',
    dob: '',
    startDate: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitNotice, setSubmitNotice] = useState('')
  const [isTourOpen, setIsTourOpen] = useState(false)
  const [tourSubmitted, setTourSubmitted] = useState(false)
  const [tourErrors, setTourErrors] = useState({})
  const [tourForm, setTourForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
  })
  const [isFeesOpen, setIsFeesOpen] = useState(false)
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)
  const [errorModalMsg, setErrorModalMsg] = useState('')
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isoFromDate = (d) => d.toISOString().split('T')[0]
  const maxDobDate = new Date(today)
  maxDobDate.setFullYear(maxDobDate.getFullYear() - 1)
  const minDobDate = new Date(today)
  minDobDate.setFullYear(minDobDate.getFullYear() - 6)
  const minDobISO = isoFromDate(minDobDate)
  const maxDobISO = isoFromDate(maxDobDate)
  const minStartISO = isoFromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000))
  const minTourDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSteps((prev) => {
              const next = new Set(prev)
              next.add(entry.target.dataset.index)
              return Array.from(next)
            })
          }
        })
      },
      { threshold: 0.3 }
    )
    stepsRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isTourOpen && !isFeesOpen && !isErrorModalOpen && !isSuccessModalOpen) return undefined
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsTourOpen(false)
        setIsFeesOpen(false)
        setIsErrorModalOpen(false)
        setIsSuccessModalOpen(false)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isTourOpen, isFeesOpen, isErrorModalOpen, isSuccessModalOpen])

  const onChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const onTourChange = (e) => {
    const { name, value } = e.target
    setTourForm((prev) => ({ ...prev, [name]: value }))
    setTourErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateApplication = (data) => {
    const newErrors = {}
    const namePattern = /^(?=.{2,}$)[A-Za-z\s-]+$/
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    const phoneAllowedPattern = /^[+\d\s-]+$/
    const digitsOnly = (str) => str.replace(/\D/g, '')

    if (!data.parentName.trim()) {
      newErrors.parentName = isBs ? 'Unesite ime roditelja/staratelja.' : 'Please enter a parent/guardian name.'
    } else if (!namePattern.test(data.parentName.trim())) {
      newErrors.parentName = isBs ? 'Koristite samo slova, razmake ili crtice (min. 2 slova).' : 'Use letters, spaces, or hyphens (min 2 characters).'
    }

    if (!emailPattern.test(data.email.trim())) {
      newErrors.email = isBs ? 'Unesite važeću email adresu.' : 'Please enter a valid email address.'
    }

    if (data.phone.trim()) {
      const phoneTrim = data.phone.trim()
      if (!phoneAllowedPattern.test(phoneTrim) || digitsOnly(phoneTrim).length < 6) {
        newErrors.phone = isBs ? 'Unesite važeći broj telefona (dovoljno cifara).' : 'Please enter a valid phone number with enough digits.'
      }
    }

    if (!data.childName.trim()) {
      newErrors.childName = isBs ? 'Unesite ime djeteta.' : 'Please enter a child name.'
    } else if (!namePattern.test(data.childName.trim())) {
      newErrors.childName = isBs ? 'Koristite samo slova, razmake ili crtice (min. 2 slova).' : 'Use letters, spaces, or hyphens (min 2 characters).'
    }

    const dobDate = data.dob ? new Date(data.dob) : null
    if (!dobDate || Number.isNaN(dobDate.getTime())) {
      newErrors.dob = isBs ? 'Unesite datum rođenja.' : 'Please enter a valid date of birth.'
    } else {
      if (dobDate > maxDobDate || dobDate < minDobDate) {
        newErrors.dob = isBs ? 'Datum treba da bude između 1 i 6 godina starosti.' : 'Birth date should be between 1 and 6 years old.'
      }
    }

    if (data.startDate) {
      const startDate = new Date(data.startDate)
      if (Number.isNaN(startDate.getTime()) || startDate <= today) {
        newErrors.startDate = isBs ? 'Izaberite budući datum početka.' : 'Please choose a future start date.'
      }
    }

    if (data.notes && data.notes.length > 500) {
      newErrors.notes = isBs ? 'Molimo do 500 znakova.' : 'Please keep this to 500 characters.'
    }

    return newErrors
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const validation = validateApplication(formData)
    setErrors(validation)
    if (Object.keys(validation).length === 0) {
      const payload = {
        parentName: formData.parentName,
        email: formData.email,
        phone: formData.phone,
        childName: formData.childName,
        dateOfBirth: formData.dob,
        preferredStartDate: formData.startDate,
        notes: formData.notes,
      }
      fetch(`${API_BASE}/api/requests/application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          let data = {}
          try {
            data = await res.json()
          } catch (err) {
            data = {}
          }
          if (!res.ok) throw new Error(data.error || (isBs ? 'Nije moguće poslati.' : 'Unable to submit.'))
          return data
        })
        .then(() => {
          setSubmitted(true)
          setSubmitNotice('')
          setIsErrorModalOpen(false)
          setIsSuccessModalOpen(true)
          setFormData({
            parentName: '',
            email: '',
            phone: '',
            childName: '',
            dob: '',
            startDate: '',
            notes: '',
          })
          setErrors({})
        })
        .catch((err) => {
          setSubmitted(false)
          const friendly = err.message || (isBs ? 'Nije moguće poslati.' : 'Unable to submit.')
          setErrorModalMsg(friendly)
          setIsErrorModalOpen(true)
        })
    } else {
      setSubmitted(false)
      const firstError = Object.values(validation)[0]
      setSubmitNotice('')
      setErrorModalMsg(
        firstError ||
          (isBs ? 'Molimo popunite obavezna polja.' : 'Please fill in all required fields.')
      )
      setIsErrorModalOpen(true)
    }
  }

  const openTourModal = () => {
    setIsTourOpen(true)
    setTourSubmitted(false)
    setTourErrors({})
    setTourForm({
      name: '',
      email: '',
      phone: '',
      date: '',
    })
  }

  const closeTourModal = () => {
    setTourForm({
      name: '',
      email: '',
      phone: '',
      date: '',
    })
    setTourErrors({})
    setTourSubmitted(false)
    setIsTourOpen(false)
  }

  const openFeesModal = () => {
    setIsFeesOpen(true)
  }

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

  const closeFeesModal = () => {
    setIsFeesOpen(false)
  }

  const validateTour = () => {
    const newErrors = {}
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    if (!tourForm.name.trim()) newErrors.name = isBs ? 'Unesite svoje ime.' : 'Please enter your name.'
    if (!emailPattern.test(tourForm.email.trim())) newErrors.email = isBs ? 'Unesite važeću email adresu.' : 'Please enter a valid email.'
    const phonePattern = /^[+\d][\d\s-]{5,}$/
    if (!tourForm.phone.trim() || !phonePattern.test(tourForm.phone.trim())) {
      newErrors.phone = isBs ? 'Unesite važeći broj telefona.' : 'Please enter a valid phone number.'
    }
    const selectedDate = tourForm.date ? new Date(tourForm.date) : null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!selectedDate || Number.isNaN(selectedDate.getTime()) || selectedDate <= today) {
      newErrors.date = isBs ? 'Odaberite budući datum posjete (od sutra nadalje).' : 'Please choose a future visit date (starting tomorrow).'
    }
    return newErrors
  }

  const onTourSubmit = (e) => {
    e.preventDefault()
    const validation = validateTour()
    setTourErrors(validation)
    if (Object.keys(validation).length === 0) {
      const payload = {
        parentName: tourForm.name,
        email: tourForm.email,
        phone: tourForm.phone,
        preferredStartDate: tourForm.date,
      }
      fetch(`${API_BASE}/api/requests/tour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          let data = {}
          try {
            data = await res.json()
          } catch (err) {
            data = {}
          }
          if (!res.ok) throw new Error(data.error || (isBs ? 'Nije moguće poslati.' : 'Unable to submit.'))
          return data
        })
        .then(() => {
          setTourSubmitted(true)
          setTourForm({ name: '', email: '', phone: '', date: '' })
          setTourErrors({})
        })
        .catch((err) => {
          setErrorModalMsg(err.message || (isBs ? 'Nije moguće poslati.' : 'Unable to submit.'))
          setIsErrorModalOpen(true)
          setTourSubmitted(false)
        })
    } else {
      setTourSubmitted(false)
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <header className="relative space-y-3">
        <div
          className="absolute right-[-5px] w-96 h-96 md:w-[380px] md:h-[380px] pointer-events-auto hidden md:block"
          style={{ top: '-70px' }}
        >
          <img
            src={bubamaraImg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-contain"
            loading="lazy"
            onMouseEnter={wiggle}
          />
        </div>
        <p className="text-mainRose font-semibold">{language === 'bs' ? 'Upis' : 'Admissions'}</p>
        <h1 className="font-display text-4xl text-navy">{t.title}</h1>
        <p className="text-lg text-navy/80">{t.intro}</p>
      </header>

      <LazySection>
        <section className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <p className="text-accentRose font-semibold">{t.stepsTitle}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  ref={(el) => (stepsRefs.current[index] = el)}
                  data-index={String(index)}
                  className="group rounded-3xl border border-berry/15 shadow-md p-6 space-y-3 bg-skyMist/90 backdrop-blur-sm transition duration-500 ease-out hover:-translate-y-2 hover:shadow-2xl hover:border-berry/30"
                  style={{
                    opacity: visibleSteps.includes(String(index)) ? 1 : 0.9,
                    transform: visibleSteps.includes(String(index)) ? 'translateY(0)' : 'translateY(6px)',
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-sunrise text-berry font-bold grid place-items-center transition-transform duration-300 group-hover:-translate-y-0.5 shadow-sm">
                    {index + 1}
                  </div>
                  <p className="font-semibold text-navy">{step.title}</p>
                  <p className="text-sm text-navy/75">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div
            className="border border-berry/10 rounded-2xl p-5 shadow-sm space-y-3"
            style={{ backgroundColor: '#FFE08A' }}
          >
            <p className="text-accentRose font-semibold">{t.tourTitle}</p>
            <p className="text-navy/75">{t.tourText}</p>
            <button
              className="w-full px-4 py-3 rounded-full font-semibold shadow hover:-translate-y-0.5 transition"
              type="button"
              onClick={openTourModal}
              style={{ backgroundColor: '#8C6A4A', color: '#FFF7EB' }}
            >
              {t.tourCTA}
            </button>
            <p className="text-xs text-navy/60">{t.tourNote}</p>
          </div>
        </section>
      </LazySection>

      <LazySection>
        <section className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <p className="text-accentRose font-semibold">{t.formTitle}</p>
            <p className="text-navy/80">{t.formIntro}</p>
            <form
              onSubmit={onSubmit}
              className="bg-white/80 border border-berry/10 rounded-2xl p-6 shadow-sm grid md:grid-cols-2 gap-4"
              style={{ backgroundColor: '#F3ECFF' }}
            >
              <div className="space-y-1">
                <label className="text-sm text-navy/80" htmlFor="parentName">{t.placeholders.parent}</label>
                <input
                  id="parentName"
                  name="parentName"
                  required
                  value={formData.parentName}
                  onChange={onChange}
                  className={`w-full px-4 py-3 rounded-xl text-navy bg-white border ${errors.parentName ? 'border-berry' : 'border-berry/15'}`}
                />
                {errors.parentName && <p className="text-xs text-berry">{errors.parentName}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm text-navy/80" htmlFor="email">{t.placeholders.email}</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={onChange}
                  className={`w-full px-4 py-3 rounded-xl text-navy bg-white border ${errors.email ? 'border-berry' : 'border-berry/15'}`}
                />
                {errors.email && <p className="text-xs text-berry">{errors.email}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm text-navy/80" htmlFor="phone">{t.placeholders.phone}</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={onChange}
                  className={`w-full px-4 py-3 rounded-xl text-navy bg-white border ${errors.phone ? 'border-berry' : 'border-berry/15'}`}
                />
                {errors.phone && <p className="text-xs text-berry">{errors.phone}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm text-navy/80" htmlFor="childName">{t.placeholders.child}</label>
                <input
                  id="childName"
                  name="childName"
                  required
                  value={formData.childName}
                  onChange={onChange}
                  className={`w-full px-4 py-3 rounded-xl text-navy bg-white border ${errors.childName ? 'border-berry' : 'border-berry/15'}`}
                />
                {errors.childName && <p className="text-xs text-berry">{errors.childName}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm text-navy/80" htmlFor="dob">{t.placeholders.dob}</label>
                <input
                  id="dob"
                  name="dob"
                  type="date"
                  required
                  min={minDobISO}
                  max={maxDobISO}
                  value={formData.dob}
                  onChange={onChange}
                  className={`w-full px-4 py-3 rounded-xl text-navy bg-white border ${errors.dob ? 'border-berry' : 'border-berry/15'}`}
                />
                {errors.dob && <p className="text-xs text-berry">{errors.dob}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm text-navy/80" htmlFor="startDate">{t.placeholders.start}</label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  min={minStartISO}
                  value={formData.startDate}
                  onChange={onChange}
                  className={`w-full px-4 py-3 rounded-xl text-navy bg-white border ${errors.startDate ? 'border-berry' : 'border-berry/15'}`}
                />
                {errors.startDate && <p className="text-xs text-berry">{errors.startDate}</p>}
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm text-navy/80" htmlFor="notes">{t.placeholders.notes}</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="4"
                  maxLength={500}
                  value={formData.notes}
                  onChange={onChange}
                  className={`w-full px-4 py-3 rounded-xl text-navy bg-white border ${errors.notes ? 'border-berry' : 'border-berry/15'}`}
                />
                {errors.notes && <p className="text-xs text-berry">{errors.notes}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <button
                  className="w-full px-5 py-3 rounded-full bg-berry text-white font-semibold shadow hover:-translate-y-0.5 transition"
                  type="submit"
                >
                  {t.placeholders.submit}
                </button>
                {submitNotice && <p className="text-sm text-berry">{submitNotice}</p>}
              </div>
            </form>
          </div>
          <div className="space-y-4">
            <div
              className="bg-white/80 border border-berry/10 rounded-2xl p-5 shadow-sm space-y-2"
              style={{ backgroundColor: '#EAF6EE' }}
            >
              <p className="font-semibold text-navy">{t.reqTitle}</p>
              <ul className="space-y-1 text-navy/80 list-disc list-inside">
                {reqs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div
              className="bg-white/80 border border-berry/10 rounded-2xl p-5 shadow-sm space-y-3"
              style={{ backgroundColor: '#D5F2C2' }}
            >
              <p className="font-semibold text-navy">{t.feesTitle}</p>
              <p className="text-sm text-navy/75">{t.feesNote}</p>
              <button
                type="button"
                onClick={openFeesModal}
                className="w-full px-4 py-3 rounded-full text-white font-semibold shadow hover:-translate-y-0.5 transition"
                style={{ backgroundColor: '#3B6C4A' }}
              >
                {isBs ? 'Pogledaj cijene' : 'View fees'}
              </button>
            </div>
          </div>
        </section>
      </LazySection>

      {isTourOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={closeTourModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-modal-title"
        >
          <div className="absolute inset-0 bg-navy/30 backdrop-blur-[2px]" aria-hidden="true" />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-berry/10 p-6 space-y-4"
            style={{ animation: 'modalFade 200ms ease-out forwards', transformOrigin: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeTourModal}
              className="absolute top-3 right-3 text-navy/60 hover:text-navy"
              aria-label="Close"
            >
              ×
            </button>
            {!tourSubmitted ? (
              <form onSubmit={onTourSubmit} className="space-y-4">
                <div>
                  <p id="tour-modal-title" className="font-display text-2xl text-navy">
                    {isBs ? 'Zatraži obilazak' : 'Book a tour'}
                  </p>
                  <p className="text-sm text-navy/70">
                    {isBs ? 'Pošaljite zahtjev za posjetu, potvrdićemo termin.' : 'Request a visit and we’ll confirm a time.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-navy/80" htmlFor="tourName">
                    {t.placeholders.parent}
                  </label>
                  <input
                    id="tourName"
                    name="name"
                    required
                    value={tourForm.name}
                    onChange={onTourChange}
                    className="w-full px-4 py-3 rounded-xl border border-berry/15 text-navy bg-white"
                  />
                  {tourErrors.name && <p className="text-xs text-berry">{tourErrors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-navy/80" htmlFor="tourEmail">
                    {t.placeholders.email}
                  </label>
                  <input
                    id="tourEmail"
                    name="email"
                    type="email"
                    required
                    value={tourForm.email}
                    onChange={onTourChange}
                    className="w-full px-4 py-3 rounded-xl border border-berry/15 text-navy bg-white"
                  />
                  {tourErrors.email && <p className="text-xs text-berry">{tourErrors.email}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-navy/80" htmlFor="tourPhone">
                    {t.placeholders.phone}
                  </label>
                  <input
                    id="tourPhone"
                    name="phone"
                    required
                    value={tourForm.phone}
                    onChange={onTourChange}
                    className="w-full px-4 py-3 rounded-xl border border-berry/15 text-navy bg-white"
                  />
                  {tourErrors.phone && <p className="text-xs text-berry">{tourErrors.phone}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-navy/80" htmlFor="tourDate">
                    {isBs ? 'Željeni datum posjete' : 'Preferred visit date'}
                  </label>
                  <input
                    id="tourDate"
                    name="date"
                    type="date"
                    min={minTourDate}
                    required
                    value={tourForm.date}
                    onChange={onTourChange}
                    className="w-full px-4 py-3 rounded-xl border border-berry/15 text-navy bg-white"
                  />
                  {tourErrors.date && <p className="text-xs text-berry">{tourErrors.date}</p>}
                </div>
                <button
                  type="submit"
                  className="w-full px-5 py-3 rounded-full bg-berry text-white font-semibold shadow hover:-translate-y-0.5 transition"
                >
                  {language === 'bs' ? 'Zahtjev za obilazak' : 'Request a tour'}
                </button>
              </form>
            ) : (
              <div
                className="space-y-3 text-center"
                style={{ animation: 'successFade 240ms ease-out forwards' }}
                role="status"
              >
                <div className="mx-auto h-12 w-12 rounded-full bg-mint/70 grid place-items-center text-navy text-2xl">
                  ✓
                </div>
                <p className="font-display text-2xl text-navy">{isBs ? 'Hvala!' : 'Thank you!'}</p>
                <p className="text-navy/75">
                  {isBs ? 'Javit ćemo vam se uskoro.' : 'We’ll get back to you soon.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {isFeesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={closeFeesModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fees-modal-title"
        >
          <div className="absolute inset-0 bg-navy/30 backdrop-blur-[2px]" aria-hidden="true" />
          <div
            className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-berry/10 p-6 space-y-5"
            style={{ animation: 'modalFade 200ms ease-out forwards', transformOrigin: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeFeesModal}
              className="absolute top-3 right-3 text-navy/60 hover:text-navy"
              aria-label="Close"
            >
              ×
            </button>
            <div className="space-y-1">
              <p id="fees-modal-title" className="font-display text-2xl text-navy">
                {t.feesTitle}
              </p>
              <p className="text-sm text-navy/75">
                {isBs ? 'Jasne cijene za svaki program.' : 'Clear pricing for each program.'}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-berry/15">
              <table className="w-full text-left text-sm text-navy/80">
                <thead className="bg-skyMist/70 text-navy font-semibold">
                  <tr>
                    <th className="px-4 py-3">{isBs ? 'Program' : 'Program'}</th>
                    <th className="px-4 py-3">{isBs ? 'Dob' : 'Age range'}</th>
                    <th className="px-4 py-3">{isBs ? 'Raspored' : 'Schedule'}</th>
                    <th className="px-4 py-3">{isBs ? 'Mjesečna cijena' : 'Monthly fee'}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { program: isBs ? 'Jasličari (1–3 godine)' : 'Toddlers (1–3 years)', age: '1–3', schedule: isBs ? 'Cijeli dan (7:30–17:30)' : 'Full day (7:30–17:30)', fee: isBs ? '380 KM/mjesec' : '380 KM/month' },
                    { program: isBs ? 'Mali istraživači (3–4 godine)' : 'Little Learners (3–4 years)', age: '3–4', schedule: isBs ? 'Cijeli dan (7:30–17:30)' : 'Full day (7:30–17:30)', fee: isBs ? '340 KM/mjesec' : '340 KM/month' },
                    { program: isBs ? 'Predškolci (4–6 godina)' : 'Preschoolers (4–6 years)', age: '4–6', schedule: isBs ? 'Cijeli dan (7:30–17:30)' : 'Full day (7:30–17:30)', fee: isBs ? '300 KM/mjesec' : '300 KM/month' },
                  ].map((row) => (
                    <tr key={row.program} className="odd:bg-white even:bg-skyMist/40">
                      <td className="px-4 py-3 font-semibold text-navy">{row.program}</td>
                      <td className="px-4 py-3">{row.age}</td>
                      <td className="px-4 py-3">{row.schedule}</td>
                      <td className="px-4 py-3">{row.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 text-navy/80 text-sm">
              <p className="font-semibold text-navy">{isBs ? 'Šta je uključeno' : 'What’s included'}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{isBs ? 'Obroci i užine' : 'Meals and snacks'}</li>
                <li>{isBs ? 'Materijali i pribor za učenje' : 'Learning materials and supplies'}</li>
                <li>{isBs ? 'Svaki dan boravak napolju' : 'Daily outdoor time'}</li>
                <li>{isBs ? 'Produženi boravak' : 'Extended hours coverage'}</li>
              </ul>
              <p className="text-navy/75">
                {isBs
                  ? 'Popust za braću/sestre; opcije skraćenog boravka na upit.'
                  : 'Sibling discount available; part-time options on request.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalFade {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes successFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {isErrorModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setIsErrorModalOpen(false)}
          role="alertdialog"
          aria-modal="true"
          aria-live="assertive"
        >
          <div className="absolute inset-0 bg-navy/25" aria-hidden="true" />
          <div
            className="relative z-10 max-w-sm w-full rounded-2xl bg-white shadow-xl border border-berry/15 p-5 space-y-3"
            style={{ animation: 'modalFade 180ms ease-out forwards', transformOrigin: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsErrorModalOpen(false)}
              className="absolute top-3 right-3 text-navy/60 hover:text-navy"
              aria-label={isBs ? 'Zatvori' : 'Close'}
            >
              ×
            </button>
            <p className="font-display text-xl text-navy">
              {isBs ? 'Nije moguće poslati' : 'Unable to submit'}
            </p>
            <p className="text-navy/75 text-sm">{errorModalMsg}</p>
          </div>
        </div>
      )}

      {isSuccessModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setIsSuccessModalOpen(false)}
          role="alertdialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-navy/25" aria-hidden="true" />
          <div
            className="relative z-10 max-w-sm w-full rounded-2xl bg-white shadow-xl border border-berry/15 p-5 space-y-3 text-center"
            style={{ animation: 'successFade 200ms ease-out forwards', transformOrigin: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              className="absolute top-3 right-3 text-navy/60 hover:text-navy"
              aria-label={isBs ? 'Zatvori' : 'Close'}
            >
              ×
            </button>
            <p className="font-display text-2xl text-navy">
              {isBs ? 'Gotovo!' : 'Done!'}
            </p>
            <p className="text-navy/75 text-sm">
              {isBs ? 'Javićemo vam se uskoro.' : 'We’ll get to you soon.'}
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
