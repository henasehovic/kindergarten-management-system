import { Link } from 'react-router-dom'
import { useLanguage } from '../components/LanguageContext'
import LazySection from '../components/LazySection'
import heroVideo from '../../videohomepage.mp4'
const heroBackdrop = new URL('../../pozadinavideo.png', import.meta.url).href
import infoImage from '../../slikahome.png'
import toddlersImg from '../../toddlers.png'
import littleLearnersImg from '../../littlelearners.png'
import preschoolersImg from '../../preschoolers.png'
import dinoImg from '../../dino.png'
import patkicaImg from '../../patkica.png'

const copyByLang = {
  en: {
    heroTag: 'A warm place to grow',
    heroTitle: 'Where little explorers feel safe, loved, and ready to learn.',
    heroSubtitle: 'Gentle teachers, sunlit classrooms, and playful routines built for curious minds. We partner with families to make every drop-off feel easy and every pickup joyful.',
    ctaApply: 'Enroll',
    ctaVisit: 'Contact',
    smallLine: 'Small groups • Licensed staff • Daily outdoor play',
    stat1Value: '1:8',
    stat1Label: 'Teacher–Child Ratio',
    stat2Value: 'Fresh Air & Play',
    stat2Label: 'Outdoor Time Twice Daily',
    stat3Value: 'Nutritious Meals',
    stat3Label: 'Meals & Snacks Included',
    infoHeading: 'A Look Inside Our Classrooms',
    toursTitle: 'Come Visit Us',
    toursSubtitle: 'Friendly, no-pressure tours this week',
    whyTitle: 'Why Families Choose Us',
    whySubtitle: 'We create a warm and nurturing environment where children feel safe, supported, and encouraged to grow at their own pace.',
    whyLink: 'Learn more about our philosophy',
    newsTitle: 'Latest news & events',
    newsSubtitle: "See what's happening.",
    newsLink: 'View all',
    testimonialsTitle: 'Kind words',
    testimonialsSubtitle: 'What parents say.',
    finalTitle: "Let's plan the best start for your child.",
    finalSubtitle: "Send a quick note and we'll reach out to schedule a tour or share admissions details.",
    finalApply: 'Apply now',
    finalBook: 'Book a tour',
    book: 'Book a tour',
    readyTag: 'Ready to visit?',
    imagePlaceholder: 'Image Placeholder',
    newsItems: [
      { title: 'Winter open house', detail: 'Tour our classrooms and meet teachers this Saturday.', date: 'Jan 20' },
      { title: 'New garden beds', detail: 'Little hands planting herbs for our spring menu.', date: 'Jan 10' },
      { title: 'Family music morning', detail: 'Join us for songs and movement in the play hall.', date: 'Dec 15' },
    ],
    testimonials: [
      { quote: 'We felt welcomed from day one—the teachers truly know our child.', name: 'Parent of Mia' },
      { quote: 'The daily updates and calm routines made the transition so easy.', name: 'Parent of Luka' },
      { quote: 'Our son comes home excited to tell us about music and garden time.', name: 'Parent of Amir' },
    ],
  },
  bs: {
    heroTag: 'Toplo mjesto za rast',
    heroTitle: 'Mjesto gdje se mali istraživači osjećaju sigurno i voljeno.',
    heroSubtitle: 'Brižni nastavnici, sunčane učionice i razigrane rutine za radoznale umove. Radimo s porodicama da svaki dolazak i odlazak bude lagan.',
    ctaApply: 'Upis',
    ctaVisit: 'Kontakt',
    smallLine: 'Male grupe • Licencirano osoblje • Dnevna igra vani',
    stat1Value: '1:8',
    stat1Label: 'Omjer odgajatelj–dijete',
    stat2Value: 'Svježi zrak i igra',
    stat2Label: 'Vrijeme na otvorenom dvaput dnevno',
    stat3Value: 'Zdravi obroci',
    stat3Label: 'Obroci i užine uključeni',
    infoHeading: 'Pogled u naše učionice',
    toursTitle: 'Dođite u posjetu',
    toursSubtitle: 'Prijateljski, bez pritiska obilasci ove sedmice',
    whyTitle: 'Zašto porodice biraju nas',
    whySubtitle: 'Stvaramo toplo i njegujuće okruženje gdje se djeca osjećaju sigurno, podržano i ohrabreno da rastu svojim tempom.',
    whyLink: 'Saznajte više o našoj filozofiji',
    newsTitle: 'Novosti i događaji',
    newsSubtitle: 'Pogledajte šta se dešava.',
    newsLink: 'Pogledaj sve',
    testimonialsTitle: 'Lijepe riječi',
    testimonialsSubtitle: 'Šta roditelji kažu.',
    finalTitle: 'Isplanirajmo najbolji početak za vaše dijete.',
    finalSubtitle: 'Pošaljite nam kratku poruku i javićemo se za termin obilaska ili detalje o upisu.',
    finalApply: 'Prijavi se',
    finalBook: 'Rezerviši obilazak',
    book: 'Rezerviši obilazak',
    readyTag: 'Spremni za posjetu?',
    imagePlaceholder: 'Mjesto za sliku',
    newsItems: [
      { title: 'Dan otvorenih vrata', detail: 'Obilazak učionica i upoznavanje s nastavnicima ove subote.', date: 'Jan 20' },
      { title: 'Nove baštice', detail: 'Male ruke sade začinsko bilje za proljetni meni.', date: 'Jan 10' },
      { title: 'Porodično jutro muzike', detail: 'Pridružite se pjesmi i pokretu u dvorani.', date: 'Dec 15' },
    ],
    testimonials: [
      { quote: 'Osjećali smo se dobrodošlo od prvog dana—nastavnici zaista poznaju naše dijete.', name: 'Roditelj djevojčice' },
      { quote: 'Dnevna ažuriranja i mirne rutine olakšale su prelaz.', name: 'Roditelj dječaka' },
      { quote: 'Sin se vraća kući uzbuđen pričama o muzici i vremenu u bašti.', name: 'Roditelj dječaka' },
    ],
  },
}

const highlights = [
  { key: 'hours', en: 'Extended Hours', bs: 'Produženo radno vrijeme' },
  { key: 'meals', en: 'Meals Included', bs: 'Obroci uključeni' },
  { key: 'safety', en: 'Safety First', bs: 'Sigurnost na prvom mjestu' },
]

const highlightDesc = {
  en: [
    'Open 7:30 AM - 5:30 PM with flexible drop-off and pickup for busy families.',
    'Nutritious breakfast, lunch, and snacks prepared fresh each day.',
    'Qualified, caring staff, secure entry, and daily health and wellbeing checks.',
  ],
  bs: [
    'Otvoreni smo 7:30 - 17:30 uz fleksibilan dolazak i preuzimanje za zauzete porodice.',
    'Zdravi doručak, ručak i užine pripremaju se svježe svaki dan.',
    'Stručno i brižno osoblje, siguran ulaz i dnevne provjere zdravlja i dobrobiti.',
  ],
}

const ageGroups = {
  en: [
    {
      key: 'toddlers',
      title: 'Toddlers',
      range: '1–2 years',
      desc: 'A gentle, nurturing environment focused on comfort, routine, and early sensory exploration.',
    },
    {
      key: 'little',
      title: 'Little Learners',
      range: '3–4 years',
      desc: 'Play-based learning that builds curiosity, language development, and social skills.',
    },
    {
      key: 'preschool',
      title: 'Preschoolers',
      range: '5–6 years',
      desc: 'Confidence-building activities that support independence and school readiness.',
    },
  ],
  bs: [
    {
      key: 'toddlers',
      title: 'Todleri',
      range: '1–2 godine',
      desc: 'Nježno, brižno okruženje fokusirano na udobnost, rutinu i rani senzorni razvoj.',
    },
    {
      key: 'little',
      title: 'Mali istraživači',
      range: '3–4 godine',
      desc: 'Učenje kroz igru koje gradi radoznalost, razvoj jezika i socijalne vještine.',
    },
    {
      key: 'preschool',
      title: 'Predškolci',
      range: '5–6 godina',
      desc: 'Aktivnosti koje grade samopouzdanje, samostalnost i spremnost za školu.',
    },
  ],
}

export default function Home() {
  const { language } = useLanguage()
  const copy = copyByLang[language] || copyByLang.en
  const ageImages = {
    toddlers: toddlersImg,
    little: littleLearnersImg,
    preschool: preschoolersImg,
  }

  const handleCardEnter = (e) => {
    e.currentTarget.style.backgroundColor = '#F9C7CA'
  }

  const handleCardLeave = (e) => {
    e.currentTarget.style.backgroundColor = '#FDEAE3'
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

  return (
    <main className="space-y-16 pb-16">
      <section
        className="relative isolate w-full overflow-hidden aspect-video bg-center bg-cover"
        style={{ backgroundImage: `url(${heroBackdrop})` }}
      >
        <video
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-skyAccent/35 via-transparent to-grassPastel/35 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-warmWhite/30 via-transparent to-warmWhite/30 pointer-events-none"></div>

        <div className="relative z-10 flex h-full w-full items-start justify-start px-4 sm:px-8 lg:px-12 pt-10 pb-6">
          <div className="space-y-6 max-w-2xl rounded-3xl bg-white/45 p-6 shadow-lg backdrop-blur-md">
            <span className="inline-flex px-4 py-2 rounded-full bg-butterYellow text-navy font-semibold text-sm">{copy.heroTag}</span>
            <h1 className="font-display text-4xl lg:text-5xl text-navy leading-tight">
              {copy.heroTitle}
            </h1>
            <p className="text-lg text-navy/80">
              {copy.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/admissions" className="px-5 py-3 rounded-full bg-softOlive text-navy font-semibold shadow-lg hover:-translate-y-0.5 transition">
                {copy.ctaApply}
              </Link>
              <Link to="/contact" className="px-5 py-3 rounded-full bg-softOlive text-navy font-semibold shadow hover:-translate-y-0.5 transition">
                {copy.ctaVisit}
              </Link>
            </div>
            <p className="text-sm text-navy/70">{copy.smallLine}</p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-[220px,1fr] gap-6 items-start lg:items-center">
          <div className="relative w-full max-w-[240px] aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border border-white/70 mx-auto lg:mx-0">
            <img src={infoImage} alt="Classroom snapshot" className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="relative self-center w-full">
            <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-softGold/50 blur-2xl"></div>
            <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-mistBlue/45 blur-2xl"></div>
            <div className="bg-warmWhite/90 border border-babyBlue/20 rounded-3xl shadow-2xl p-6 space-y-5">
              <div className="space-y-1">
                <p className="font-display text-xl text-navy">{copy.infoHeading}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <Stat label={copy.stat1Label} value={copy.stat1Value} />
                <Stat label={copy.stat2Label} value={copy.stat2Value} />
                <Stat label={copy.stat3Label} value={copy.stat3Value} />
              </div>
              <div className="rounded-2xl bg-softFern text-navy p-5 flex items-center justify-between border border-softFern/60">
                <div>
                  <p className="font-semibold">{copy.toursTitle}</p>
                  <p className="text-navy/80 text-sm">{copy.toursSubtitle}</p>
                </div>
                <Link to="/contact" className="px-4 py-2 rounded-full bg-white text-navy font-semibold shadow">
                  {copy.book}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LazySection>
        <section className="max-w-6xl mx-auto px-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-display text-3xl text-navy">{language === 'bs' ? 'Naše dobne grupe' : 'Our Age Groups'}</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {(ageGroups[language] || ageGroups.en).map((item) => (
              <div
                key={item.title}
                className="relative rounded-3xl border border-berry/20 shadow p-5 space-y-2 transition"
                style={{ backgroundColor: '#FDEAE3' }}
                onMouseEnter={handleCardEnter}
                onMouseLeave={handleCardLeave}
              >
                <div className="absolute top-3 right-3 h-14 w-14 overflow-hidden">
                  <img
                    src={ageImages[item.key]}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    onMouseEnter={(e) => {
                      e.stopPropagation()
                      e.currentTarget.animate(
                        [
                          { transform: 'rotate(0deg)' },
                          { transform: 'rotate(-4deg)' },
                          { transform: 'rotate(4deg)' },
                          { transform: 'rotate(0deg)' },
                        ],
                        { duration: 280 }
                      )
                    }}
                  />
                </div>
                <p className="font-display text-xl text-navy">{item.title}</p>
                <p className="text-sm text-navy/70">{item.range}</p>
                <p className="text-navy/80">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </LazySection>

      <LazySection>
        <section className="max-w-6xl mx-auto px-6 space-y-8">
        <header className="flex flex-col gap-2">
          <div className="inline-flex px-3 py-2 rounded-2xl bg-fairyPurple/70 border border-fairyPurple/50 w-fit">
            <p className="text-navy font-semibold">{copy.whyTitle}</p>
          </div>
          <h2 className="font-display text-3xl text-navy">{copy.whySubtitle}</h2>
        </header>
        <div className="grid md:grid-cols-3 gap-4 relative">
          {highlights.map((item, idx) => (
            <div
              key={item.key}
              className="bg-mistyGrey/90 border border-babyBlue/30 rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition"
            >
              <p className="font-display text-xl text-navy">{language === 'bs' ? item.bs : item.en}</p>
              <p className="text-navy/75 mt-2">{highlightDesc[language]?.[idx] || highlightDesc.en[idx]}</p>
            </div>
          ))}
        </div>
        <div className="relative flex items-center gap-3 flex-wrap">
          <Link to="/about" className="text-berry font-semibold hover:underline relative z-10">{copy.whyLink}</Link>
        </div>
        </section>
      </LazySection>

      <LazySection>
        <section className="max-w-6xl mx-auto px-6 space-y-6">
        <header className="flex flex-col gap-2">
          <div className="inline-flex px-3 py-2 rounded-2xl bg-bubblegum/50 border border-bubblegum/50 w-fit">
            <p className="text-navy font-semibold">{copy.newsTitle}</p>
          </div>
          <h2 className="font-display text-3xl text-navy">{copy.newsSubtitle}</h2>
        </header>
          <div className="relative">
            <div className="grid md:grid-cols-3 gap-4">
              {copy.newsItems.map((item) => (
                <article
                  key={item.title}
                  className="bg-softFern/90 border border-softFern/60 rounded-2xl p-5 shadow-sm space-y-2 transition hover:bg-softOlive/60"
                >
                  <p className="text-xs uppercase tracking-wide text-berry">{item.date}</p>
                  <p className="font-semibold text-navy text-lg">{item.title}</p>
                  <p className="text-navy/75 text-sm">{item.detail}</p>
                </article>
            ))}
            <div className="md:col-span-3">
              <Link to="/programs" className="text-berry font-semibold hover:underline">{copy.newsLink}</Link>
            </div>
          </div>
          <img
            src={dinoImg}
            alt="Dinosaur accent"
            className="pointer-events-auto absolute object-contain opacity-90"
            style={{ height: '14.5rem', width: '18rem', right: '-0.5rem', top: '-14.5rem' }}
            onMouseEnter={wiggle}
          />
          <img
            src={patkicaImg}
            alt=""
            aria-hidden="true"
            className="pointer-events-auto absolute object-contain z-20 w-32 md:w-44 max-w-full h-auto"
            style={{ left: '60%', transform: 'translateX(-50%)', top: '6rem', width: '18rem' }}
            onMouseEnter={wiggle}
          />
        </div>
        </section>
      </LazySection>

      <LazySection>
        <section className="max-w-6xl mx-auto px-6 space-y-6">
        <header className="space-y-2">
          <div className="inline-flex px-3 py-2 rounded-2xl bg-mistyGrey/80 border border-babyBlue/50 w-fit">
            <p className="text-navy font-semibold">{copy.testimonialsTitle}</p>
          </div>
          <h2 className="font-display text-3xl text-navy">{copy.testimonialsSubtitle}</h2>
        </header>
        <div className="grid md:grid-cols-3 gap-4">
          {copy.testimonials.map((item) => (
            <div
              key={item.name}
              className="border border-softGold/50 rounded-2xl p-5 shadow-sm space-y-3 transition hover:shadow-lg hover:-translate-y-1"
              style={{ backgroundColor: '#fbf8cb' }}
            >
              <p className="text-navy/80">"{item.quote}"</p>
              <p className="text-sm text-navy font-semibold">{item.name}</p>
            </div>
          ))}
        </div>
        </section>
      </LazySection>

      <LazySection>
        <section className="max-w-6xl mx-auto px-6">
        <div className="rounded-3xl bg-peachCream text-navy p-8 lg:p-12 grid lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-3">
            <p className="text-softCharcoal font-semibold uppercase tracking-wide text-xs">{copy.readyTag}</p>
            <h3 className="font-display text-3xl">{copy.finalTitle}</h3>
            <p className="text-navy/80">{copy.finalSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admissions" className="flex-1 text-center px-4 py-3 rounded-full bg-white text-navy font-semibold shadow flex items-center justify-center">
              {copy.finalApply}
            </Link>
            <Link
              to="/contact"
              className="flex-1 text-center px-4 py-3 rounded-full text-navy font-semibold shadow flex items-center justify-center"
              style={{ backgroundColor: '#b2e0ff' }}
            >
              {copy.finalBook}
            </Link>
          </div>
        </div>
        </section>
      </LazySection>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-2xl bg-sunrise/60 shadow-sm border border-white">
      <p className="font-display text-xl text-navy">{value}</p>
      <p className="text-navy/70 text-xs mt-1">{label}</p>
    </div>
  )
}
