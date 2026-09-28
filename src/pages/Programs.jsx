import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../components/LanguageContext'
import LazySection from '../components/LazySection'
import sovicaImg from '../../sovica.png'
import gifer1 from '../../gifer1.gif'

const copy = {
  en: {
    heading: 'Programs',
    subtitle: 'Designed for each stage of childhood.',
    intro:
      'Small groups, warm educators, and balanced routines that blend comfort, play, and gentle structure.',
    dailyRhythm: 'A calm, predictable flow.',
    approachTitle: 'Learning approach',
    approachText: [
      'Children explore, ask questions, and build skills through hands-on discovery with educator guidance.',
      'Daily integration of music, language, movement, and nature supports all areas of development.',
    ],
    bringTitle: 'What to bring',
    bringList: [
      'Spare clothes, labeled',
      'Indoor slippers or soft shoes',
      'Weather-ready outerwear',
      'Water bottle',
      'Comfort item for rest (optional)',
    ],
  },
  bs: {
    heading: 'Programi',
    subtitle: 'Kreirani za svaku fazu djetinjstva.',
    intro:
      'Male grupe, topli odgajatelji i uravnotežene rutine koje spajaju udobnost, igru i blagu strukturu.',
    dailyRhythm: 'Miran i predvidljiv raspored.',
    approachTitle: 'Pristup učenju',
    approachText: [
      'Djeca istražuju, postavljaju pitanja i razvijaju vještine kroz praktično otkrivanje uz podršku odgajatelja.',
      'Dnevna integracija muzike, jezika, pokreta i prirode podržava sve aspekte razvoja.',
    ],
    bringTitle: 'Šta ponijeti',
    bringList: [
      'Rezervna odjeća (označena)',
      'Papuče ili mekane cipele za unutra',
      'Odjeća prilagođena vremenu',
      'Boca vode',
      'Predmet za utjehu (opcionalno)',
    ],
  },
}

const ageGroups = [
  {
    emoji: '🐣',
    titleEn: 'Toddlers (1–3 years)',
    titleBs: 'Jasličari (1–3 godine)',
    descEn:
      'Gentle routines, sensory play, music, movement, and plenty of emotional security.',
    descBs:
      'Nježne rutine, senzorna igra, muzika, pokret i puno osjećaja sigurnosti.',
    notesEn: ['Cozy nap spaces', 'Music and movement', 'Daily outdoor time'],
    notesBs: ['Ugodni kutci za odmor', 'Muzika i pokret', 'Dnevni boravak napolju'],
  },
  {
    emoji: '🎈',
    titleEn: 'Little Learners (3–4 years)',
    titleBs: 'Mali istraživači (3–4 godine)',
    descEn:
      'Hands-on stories, art, early language, and social play that spark curiosity and growing independence.',
    descBs:
      'Priče, umjetnost, prvi jezik i socijalna igra koja potiče radoznalost i samostalnost.',
    notesEn: [
      'Circle time and puppets',
      'Messy art and sensory trays',
      'Nature walks and garden play',
    ],
    notesBs: ['Krug i lutke', 'Kreativna i senzorna igra', 'Šetnje i igra u bašti'],
  },
  {
    emoji: '🌿',
    titleEn: 'Preschoolers (4–6 years)',
    titleBs: 'Predškolci (4–6 godina)',
    descEn:
      'Confidence-building projects with playful literacy, numeracy, teamwork, and simple STEM exploration.',
    descBs:
      'Projekti koji grade samopouzdanje kroz igru čitanja, brojanja, timski rad i jednostavan STEM.',
    notesEn: [
      'Playful pre-reading and numeracy',
      'STEM and building projects',
      'Storytelling and community themes',
    ],
    notesBs: ['Igre pred čitanje i brojanje', 'STEM i gradnja', 'Pričanje priča i teme zajednice'],
  },
]

const routine = [
  {
    time: '7:30 – 9:00',
    labelEn: 'Arrival: soft play invitations, hugs, settling in',
    labelBs: 'Dolazak: tiha igra, zagrljaji i prilagođavanje',
    details: [
      'Arrival routines and check-in',
      'Free-choice play',
      'Transition into the day',
    ],
  },
  {
    time: '9:00 – 10:00',
    labelEn: 'Circle time with music and stories',
    labelBs: 'Jutarnji krug uz muziku i priče',
    details: [
      'Group songs and stories',
      'Listening and speaking practice',
      'Group interaction',
    ],
  },
  {
    time: '10:00 – 11:30',
    labelEn: 'Outdoor play and movement',
    labelBs: 'Boravak vani i pokret',
    details: [
      'Physical activity and coordination',
      'Outdoor exploration',
      'Social play',
    ],
  },
  {
    time: '11:30 – 12:30',
    labelEn: 'Lunch',
    labelBs: 'Ručak',
    details: [
      'Mealtime routines',
      'Independent eating skills',
      'Group interaction',
    ],
  },
  {
    time: '12:30 – 14:00',
    labelEn: 'Rest/nap',
    labelBs: 'Odmor / drijemež i tihe aktivnosti',
    details: [
      'Nap or quiet activities',
      'Supervised rest period',
      'Calm environment',
    ],
  },
  {
    time: '14:00 – 15:30',
    labelEn: 'Projects, art, and small-group exploration',
    labelBs: 'Projekti, umjetnost i istraživanje u malim grupama',
    details: [
      'Hands-on activities',
      'Small-group work',
      'Guided exploration',
    ],
  },
  {
    time: '15:30 – 17:30',
    labelEn: 'Snack, more outdoor time, and pickup',
    labelBs: 'Užina, još boravka napolju i preuzimanje',
    details: [
      'Snack time',
      'Free play',
      'Departure routines',
    ],
  },
]

export default function ProgramsPage() {
  const { language } = useLanguage()
  const t = copy[language] || copy.en
  const [activeIdx, setActiveIdx] = useState(null)
  const scheduleRef = useRef(null)
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (scheduleRef.current && !scheduleRef.current.contains(event.target)) {
        setActiveIdx(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  return (
    <main className="max-w-6xl mx-auto px-6 pt-4 pb-12 space-y-12">
      {/* HEADER */}
      <header className="relative space-y-4">
        <h1 className="font-display text-4xl text-navy">
          {language === 'bs' ? 'Programi' : 'Programs'}
        </h1>
        <p className="text-xl text-navy/85">{t.subtitle}</p>
        <p className="text-lg text-navy/80 max-w-3xl">{t.intro}</p>
      </header>

      {/* AGE GROUPS */}
      <LazySection>
        <div className="relative">
        <div
          className="absolute right-0 w-96 h-96 md:w-[260px] md:h-[260px] pointer-events-auto hidden md:block"
          style={{ top: '-195px' }}
        >
          <img
            src={sovicaImg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-contain"
            loading="lazy"
            onMouseEnter={wiggle}
          />
        </div>
          <section className="grid md:grid-cols-3 gap-6">
            {ageGroups.map((group, idx) => {
              const colors = ['#FFD6C9', '#CFF3E6', '#DCEBFF']
              return (
                <article
                  key={group.titleEn}
                  className="rounded-2xl p-6 shadow-sm space-y-3 border border-berry/10 transition duration-300 ease-out transform hover:-translate-y-1 hover:shadow-lg"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                >
                  <h3 className="font-display text-xl text-navy">
                    {group.emoji} {language === 'bs' ? group.titleBs : group.titleEn}
                  </h3>
                  <p className="text-navy/75">
                    {language === 'bs' ? group.descBs : group.descEn}
                  </p>
                  <ul className="list-disc list-inside text-sm text-navy/70 space-y-1">
                    {(language === 'bs' ? group.notesBs : group.notesEn).map(
                      (note) => (
                        <li key={note}>{note}</li>
                      )
                    )}
                  </ul>
                </article>
              )
            })}
          </section>
        </div>
      </LazySection>

      {/* DAILY RHYTHM + SIDEBAR */}
      <LazySection>
        <section className="grid lg:grid-cols-3 gap-8 lg:items-center">
          <div className="lg:col-span-2 space-y-4">
            <p className="text-navy font-semibold">
              {language === 'bs' ? 'Dnevni ritam' : 'Daily rhythm'}
            </p>
            <h2 className="font-display text-3xl text-navy">
              {t.dailyRhythm}
            </h2>
            <div className="space-y-4" ref={scheduleRef}>
              {routine.map((item, idx) => {
                const isActive = activeIdx === idx
                const colors = ['#FFE8D9', '#EAF4F4', '#F1E6FF', '#FFF4D6', '#E7F1FF', '#EAF6E8', '#FBEAF3']
                const detailLine = item.details.join(' • ')
                return (
                  <button
                    key={item.time}
                    type="button"
                    onClick={() => setActiveIdx(isActive ? null : idx)}
                    aria-expanded={isActive}
                    className="w-full text-left rounded-2xl border border-berry/10 shadow-sm transition duration-300 ease-in-out overflow-hidden"
                    style={{ backgroundColor: colors[idx % colors.length] }}
                  >
                    <div
                      className="relative"
                      style={{
                        perspective: '1200px',
                      }}
                    >
                      <div
                        className="relative transition-transform duration-300 ease-in-out"
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: isActive ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          minHeight: '64px',
                        }}
                      >
                        <div
                          className="absolute inset-0 px-4 py-2 flex flex-row flex-wrap items-center gap-3 backface-hidden"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <p className="text-sm font-semibold text-berry">{item.time}</p>
                          <p className="text-navy/85 flex items-center gap-2">
                            <span>{language === 'bs' ? item.labelBs : item.labelEn}</span>
                            <span aria-hidden="true">
                              {['🧸', '🎵', '🌿', '🍽️', '🌙', '🎨', '🧺'][idx % 7]}
                            </span>
                          </p>
                        </div>

                        <div
                          className="absolute inset-0 px-4 py-2 flex items-center backface-hidden"
                          style={{
                            transform: 'rotateY(180deg)',
                            backfaceVisibility: 'hidden',
                          }}
                        >
                          <p className="text-sm text-navy/85 leading-relaxed">{detailLine}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 lg:self-center lg:translate-y-8">
            <p className="text-navy font-semibold">{t.approachTitle}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: language === 'bs' ? 'Učenje kroz igru' : 'Learning through play',
                  body: t.approachText[0],
                  bg: '#FFF1E6',
                },
                {
                  title: language === 'bs' ? 'Uravnotežen razvoj' : 'Balanced development',
                  body: t.approachText[1],
                  bg: '#E7F4EE',
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl p-5 sm:p-6 border border-berry/10 shadow-sm transition duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md"
                  style={{ backgroundColor: item.bg }}
                >
                  <h3 className="text-lg font-semibold text-navy mb-2">{item.title}</h3>
                  <p className="text-navy/80 leading-relaxed">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="bg-white/80 rounded-2xl p-6 border border-berry/10 shadow-sm relative overflow-visible">
              <div
                className="absolute top-6 right-3 pointer-events-none"
                style={{ width: '110px', height: '110px' }}
              >
                <img
                  src={gifer1}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <p className="font-semibold text-navy mb-2">
                {t.bringTitle}
              </p>
              <ul className="text-sm text-navy/80 space-y-2">
                {[
                  { icon: '🧸', text: 'Spare clothes, labeled', textBs: 'Rezervna odjeća (označena)' },
                  { icon: '🧦', text: 'Indoor slippers or soft shoes', textBs: 'Papuče ili mekane cipele za unutra' },
                  { icon: '🌦️', text: 'Weather-ready outerwear', textBs: 'Odjeća prilagođena vremenu' },
                  { icon: '💧', text: 'Water bottle', textBs: 'Boca vode' },
                  { icon: '🌙', text: 'Comfort item for rest (optional)', textBs: 'Predmet za utjehu (opcionalno)' },
                ].map((item) => (
                  <li
                    key={item.text}
                    className="flex items-start gap-2 px-3 py-2 rounded-xl bg-white/70"
                  >
                    <span className="text-xl leading-none" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{language === 'bs' ? item.textBs : item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </LazySection>
    </main>
  )
}
