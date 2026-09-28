import { Link } from 'react-router-dom'

import { useLanguage } from './LanguageContext'

export default function Footer() {
  const { language } = useLanguage()
  const labels = {
    en: {
      quick: 'Quick Links',
      visit: 'Visit & Hours',
      open: 'Open Monday - Friday',
      hours: '7:30 AM - 5:30 PM',
      links: { home: 'Home', about: 'About', programs: 'Programs', admissions: 'Admissions', gallery: 'Gallery', contact: 'Contact' },
      tourNote: 'We welcome tours by appointment.',
      address: '123 Sunshine Avenue, Friendly Town',
    },
    bs: {
      quick: 'Brzi linkovi',
      visit: 'Posjeta i radno vrijeme',
      open: 'Radimo ponedjeljak - petak',
      hours: '7:30 - 17:30',
      links: { home: 'Pocetna', about: 'O nama', programs: 'Programi', admissions: 'Upis', gallery: 'Galerija', contact: 'Kontakt' },
      tourNote: 'Obilasci uz prethodnu najavu.',
      address: 'Ulica Sunca 123, Grad prijatelja',
    },
  }
  const copy = labels[language] || labels.en
  return (
    <footer className="bg-softSage/70 border-t border-berry/10 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8 text-sm text-navy/80">
        <div className="space-y-2">
          <p className="font-display text-xl text-navy">Kindergarten</p>
          <p>{copy.address}</p>
          <p>Phone: (555) 123-4567</p>
          <p>Email: hello@kindergarten.com</p>
        </div>
        <div>
          <p className="font-semibold text-navy mb-3">{copy.quick}</p>
          <div className="flex flex-col gap-2">
            <FooterLink href="/">{copy.links.home}</FooterLink>
            <FooterLink href="/about">{copy.links.about}</FooterLink>
            <FooterLink href="/programs">{copy.links.programs}</FooterLink>
            <FooterLink href="/admissions">{copy.links.admissions}</FooterLink>
            <FooterLink href="/gallery">{copy.links.gallery}</FooterLink>
            <FooterLink href="/contact">{copy.links.contact}</FooterLink>
          </div>
        </div>
        <div className="space-y-3">
          <p className="font-semibold text-navy">{copy.visit}</p>
          <p>{copy.open}</p>
          <p>{copy.hours}</p>
          <p className="text-navy/70">{copy.tourNote}</p>
          <div className="flex gap-3 text-berry font-semibold">
            <a href="https://www.instagram.com/vrticmladost/" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://www.facebook.com/vrtic.mladost.2025" target="_blank" rel="noreferrer">Facebook</a>
          </div>
        </div>
      </div>
      <div className="border-t border-berry/10 text-center text-xs text-navy/60 py-4">
        © {new Date().getFullYear()} Kindergarten. All rights reserved.
      </div>
    </footer>
  )
}

function FooterLink({ href, children }) {
  return (
    <Link to={href} className="hover:text-berry transition">
      {children}
    </Link>
  )
}
