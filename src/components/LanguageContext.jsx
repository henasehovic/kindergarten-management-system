'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import translations from './translations'

const LanguageContext = createContext()

export const useLanguage = () => useContext(LanguageContext)

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    const saved = localStorage.getItem('language')
    if (saved) setLanguage(saved)
  }, [])

  const switchLanguage = (lang) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key) => translations[language]?.[key] || key

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
