import { useState } from 'react'
import { useLanguage } from '../components/LanguageContext'
import LazySection from '../components/LazySection'
import priredba1 from '../../priredba1.png'
import priredba2 from '../../priredba2.png'
import priredba3 from '../../priredba3.png'
import priredba4 from '../../priredba4.png'
import priredba5 from '../../priredba5.png'
import igraliste1 from '../../igraliste1.png'
import igraliste2 from '../../igraliste2.png'
import igraliste3 from '../../igraliste3.png'
import igraliste4 from '../../igraliste4.png'
import slonic from '../../slonic.png'
import ucionica from '../../ucionica.png'
import ucionica1 from '../../ucionica1.png'
import ucionica2 from '../../ucionica2.png'
import ucionica3 from '../../ucionica3.png'
import ucionica4 from '../../ucionica4.png'
import ucionica5 from '../../ucionica5.png'
import ucionica6 from '../../ucionica6.png'
import ucionica7 from '../../ucionica7.png'
import ucionica8 from '../../ucionica8.png'

const galleryItems = [
  { src: priredba1, type: 'events', alt: 'Stage performance with kids' },
  { src: ucionica1, type: 'classroom', alt: 'Colorful classroom activity' },
  { src: igraliste1, type: 'playground', alt: 'Playground slide time' },
  { src: priredba2, type: 'events', alt: 'Children singing on stage' },
  { src: ucionica2, type: 'classroom', alt: 'Reading corner in classroom' },
  { src: igraliste2, type: 'playground', alt: 'Outdoor play with friends' },
  { src: priredba3, type: 'events', alt: 'Event performance with props' },
  { src: ucionica3, type: 'classroom', alt: 'Group work at tables' },
  { src: igraliste3, type: 'playground', alt: 'Playground climbing' },
  { src: ucionica4, type: 'classroom', alt: 'Learning wall displays' },
  { src: priredba4, type: 'events', alt: 'Kids on stage during show' },
  { src: ucionica5, type: 'classroom', alt: 'Art time in classroom' },
  { src: igraliste4, type: 'playground', alt: 'Outdoor games on grass' },
  { src: priredba5, type: 'events', alt: 'Family event applause' },
  { src: ucionica6, type: 'classroom', alt: 'Bright classroom desks' },
  { src: ucionica7, type: 'classroom', alt: 'Reading with teacher' },
  { src: ucionica8, type: 'classroom', alt: 'STEM play area' },
  { src: ucionica, type: 'classroom', alt: 'Main classroom overview' },
]

export default function GalleryPage() {
  const { language } = useLanguage()
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [lightbox, setLightbox] = useState(null)
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
  const labels = {
    en: {
      title: 'A peek into our days.',
      intro: 'Snapshots from our classrooms, playground adventures, and family events.',
    },
    bs: {
      title: 'Zavirite u nase dane.',
      intro: 'Trenuci iz ucionica, sa igralista i sa nasih dogadjaja.',
    },
  }
  const t = labels[language] || labels.en
  const filterOptions = [
    { value: 'all', label: language === 'bs' ? 'Sve' : 'All', color: '#CDE7F0' }, // babyBlue
    { value: 'classroom', label: language === 'bs' ? 'Ucionice' : 'Classroom', color: '#FFF1B6' }, // butterYellow
    { value: 'playground', label: language === 'bs' ? 'Igraliste' : 'Playground', color: '#CFEDEA' }, // seafoam
    { value: 'events', label: language === 'bs' ? 'Dogadjaji' : 'Events', color: '#FCE2E3' }, // blushPetal
  ]
  const filteredItems =
    selectedFilter === 'all' ? galleryItems : galleryItems.filter((item) => item.type === selectedFilter)

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 space-y-10">
      <header className="space-y-3 relative">
        <p className="text-berry font-semibold">{language === 'bs' ? 'Galerija' : 'Gallery'}</p>
        <h1 className="font-display text-4xl text-navy">{t.title}</h1>
        <p className="text-lg text-navy/80">{t.intro}</p>
        <img
          src={slonic}
          alt=""
          className="hidden sm:block pointer-events-auto select-none absolute -right-16 -top-[135px] object-contain opacity-90"
          style={{ width: '32rem', height: '32rem' }}
          aria-hidden="true"
          onMouseEnter={wiggle}
        />
      </header>

      <div className="flex flex-wrap gap-3">
        {filterOptions.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSelectedFilter(filter.value)}
            className={`px-4 py-2 rounded-full border transition shadow-sm ${
              selectedFilter === filter.value
                ? 'text-navy border-navy/10 shadow-md ring-1 ring-navy/10'
                : 'text-navy border-berry/15 hover:-translate-y-0.5'
            }`}
            style={{ backgroundColor: filter.color }}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <LazySection>
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.map((item, idx) => (
            <div
              key={`${item.type}-${idx}`}
              className="aspect-[4/3] rounded-2xl overflow-hidden border border-berry/15 shadow-sm bg-white cursor-pointer"
              onClick={() => setLightbox(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLightbox(item)}
            >
              <img src={item.src} alt={item.alt} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </section>
      </LazySection>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
          role="presentation"
          onKeyDown={(e) => e.key === 'Escape' && setLightbox(null)}
          tabIndex={-1}
        >
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-h-[85vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  )
}
