import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useLanguage } from './LanguageContext'
import logoImg from '../../logo.png'

const navItems = [
  { key: 'home', to: '/' },
  { key: 'about', to: '/about' },
  { key: 'programs', to: '/programs' },
  { key: 'admissions', to: '/admissions' },
  { key: 'gallery', to: '/gallery' },
  { key: 'contact', to: '/contact' },
]

export default function NavBar() {
  const { language, switchLanguage } = useLanguage()
  const [open, setOpen] = useState(false)

  const brandName = language === 'bs' ? 'Mladost vrtić' : 'Mladost Kindergarten'

  const labels = {
    en: {
      home: 'Home',
      about: 'About',
      programs: 'Programs',
      admissions: 'Admissions',
      gallery: 'Gallery',
      contact: 'Contact',
      login: 'Login',
      tagline: 'Warm. Safe. Playful.',
    },
    bs: {
      home: 'Početna',
      about: 'O nama',
      programs: 'Programi',
      admissions: 'Upis',
      gallery: 'Galerija',
      contact: 'Kontakt',
      login: 'Prijava',
      tagline: 'Toplo. Sigurno. Razigrano.',
    },
  }

  const copy = labels[language] || labels.en

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-full transition ${
      isActive
        ? 'bg-butterYellow text-navy font-semibold shadow-sm border border-butterYellow/70'
        : 'text-navy/80 hover:text-navy'
    }`

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-softOlive/95 border-b border-black/5 shadow-sm">
      {/* fixed navbar height*/}
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2.5 overflow-visible">
        
        {/* LOGO + TEXT */}
        <Link to="/" className="flex items-center gap-3">
          {/* LOGO WRAPPER (fixed, does NOT resize navbar) */}
          <div className="relative h-10 w-10">
            <img
              src={logoImg}
              alt={`${brandName} logo`}
              className="absolute left-1/2 top-1/2 
                         -translate-x-1/2 -translate-y-1/2 
                         scale-150 object-contain"
            />
          </div>

          {/* TEXT */}
          <div className="leading-tight">
            <p className="font-display text-xl text-softCharcoal">
              {brandName}
            </p>
            <p className="text-sm text-softCharcoal/70">
              {copy.tagline}
            </p>
          </div>
        </Link>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="lg:hidden px-3 py-2 rounded-xl bg-softOlive text-navy font-semibold shadow"
          aria-label="Toggle navigation"
        >
          Menu
        </button>

        {/* NAV LINKS */}
        <div
          className={`${
            open ? 'flex' : 'hidden'
          } lg:flex flex-col lg:flex-row items-start lg:items-center 
             gap-3 lg:gap-6 bg-softOlive lg:bg-transparent 
             rounded-xl lg:rounded-none shadow lg:shadow-none 
             px-4 py-3 lg:p-0 absolute lg:static top-16 right-6 
             w-64 lg:w-auto`}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {copy[item.key]}
            </NavLink>
          ))}

          {/* LOGIN */}
          <div className="lg:ml-4 flex w-full lg:w-auto">
            <NavLink
              to="/login"
              className="w-full text-center px-4 py-2 rounded-full 
                         bg-butterYellow text-navy font-semibold shadow 
                         hover:-translate-y-0.5 transition 
                         border border-butterYellow/70"
              onClick={() => setOpen(false)}
            >
              {copy.login}
            </NavLink>
          </div>

          {/* LANGUAGE SWITCH */}
          <div className="flex gap-2 lg:ml-2">
            <button
              onClick={() => switchLanguage('en')}
              className={`px-3 py-1 rounded-full border ${
                language === 'en'
                  ? 'bg-butterYellow text-navy border-butterYellow/70'
                  : 'bg-softOlive/60 text-navy border-skyAccent/30'
              }`}
              type="button"
            >
              EN
            </button>
            <button
              onClick={() => switchLanguage('bs')}
              className={`px-3 py-1 rounded-full border ${
                language === 'bs'
                  ? 'bg-butterYellow text-navy border-butterYellow/70'
                  : 'bg-softOlive/60 text-navy border-skyAccent/30'
              }`}
              type="button"
            >
              BS
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
