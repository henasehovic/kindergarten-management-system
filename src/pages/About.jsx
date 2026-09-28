import { useState } from 'react'
import { useLanguage } from '../components/LanguageContext'
import LazySection from '../components/LazySection'
import aboutImg from '../../slikahome2.png'
import ucionica0 from '../../ucionica.png'
import ucionica1 from '../../ucionica1.png'
import ucionica2 from '../../ucionica2.png'
import ucionica3 from '../../ucionica3.png'
import ucionica4 from '../../ucionica4.png'
import ucionica5 from '../../ucionica5.png'
import ucionica6 from '../../ucionica6.png'
import ucionica7 from '../../ucionica7.png'
import teacher1 from '../../ucitelj1.jpg'
import teacher2 from '../../ucitelj2.jpg'
import teacher3 from '../../ucitelj3.jpg'
import teacher6 from '../../ucitelj6.png'
import teacher5 from '../../ucitelj5.png'
import teacher7 from '../../ucitelj7.png'
import teacher8 from '../../ucitelj8.png'

const copy = {
  en: {
    heading: 'About Us',
    subtitle: 'A gentle, play-based start to learning.',
    intro1:
      'We keep days calm, kind, and playful so little ones feel safe to explore. Routines stay steady and predictable, with soft spaces for rest and plenty of time for giggles, questions, and quiet moments.',
    intro2:
      "Families partner with us every step of the way. We share updates, listen closely, and celebrate each child's unique spark.",
    missionTitle: 'Mission & Values',
    storyTitle: 'Our Story',
    story:
      'We began as a small group of educators who wanted early childhood to feel like a second home. Today, our classrooms are filled with music, stories, nature materials, and cozy corners—designed to meet children right where they are.',
    bullets: [
      { icon: '💛', text: 'Warm relationships with every child and family.' },
      { icon: '🎨', text: 'Play-based learning that sparks creativity and problem-solving.' },
      { icon: '🍎', text: 'Healthy meals, outdoor play, and a calm daily rhythm.' },
      { icon: '💬', text: 'Transparent communication with parents and guardians.' },
      { icon: '🌐', text: 'Secure digital updates that help parents stay connected to their child’s day.' },
      { icon: '🩺', text: 'On-site health support to ensure children’s wellbeing and safety.' },
    ],
    inside: 'Inside our day',
    insideTitle: 'Bright spaces for little imaginations.',
    teamTag: 'Meet the team',
    teamTitle: 'Caring educators and support staff.',
    photo: 'Photo',
    licenses: 'Licenses & approvals',
    licenseList: [
      'Licensed early childhood program with regular inspections.',
      'Certified educators trained in play-based learning.',
      'Safety, health, and nutrition standards reviewed often.',
    ],
  },
  bs: {
    heading: 'O nama',
    subtitle: 'Nježan, igrom vođen početak učenja.',
    intro1:
      'Dane činimo smirenim, ljubaznim i razigranim kako bi se mališani osjećali sigurno dok istražuju. Rutine su stabilne i predvidive, sa mekanim kutcima za odmor i puno vremena za smijeh, pitanja i tihe trenutke.',
    intro2:
      'Porodice su nam partneri u svakom koraku. Dijelimo novosti, pažljivo slušamo i slavimo iskru svakog djeteta.',
    missionTitle: 'Misija i vrijednosti',
    storyTitle: 'Naša priča',
    story:
      'Počeli smo kao mala grupa edukatora koji vjeruju da predškolski period treba da bude kao drugi dom. Danas su učionice pune muzike, priča, prirodnih materijala i udobnih kutaka—osmišljene da susretnu djecu baš tamo gdje jesu.',
    bullets: [
      { icon: '💛', text: 'Topli odnosi sa svakim djetetom i porodicom.' },
      { icon: '🎨', text: 'Učenje kroz igru koje potiče kreativnost i rješavanje problema.' },
      { icon: '🍎', text: 'Zdravi obroci, boravak vani i miran dnevni ritam.' },
      { icon: '💬', text: 'Otvorena komunikacija s roditeljima i starateljima.' },
      { icon: '🌐', text: 'Sigurna digitalna ažuriranja koja roditelje drže povezanima s danom djeteta.' },
    ],
    inside: 'Unutar našeg dana',
    insideTitle: 'Svijetle prostorije za male maštalice.',
    teamTag: 'Upoznajte tim',
    teamTitle: 'Brižni odgajatelji i podrška.',
    photo: 'Foto',
    licenses: 'Licence i odobrenja',
    licenseList: [
      'Licenciran predškolski program uz redovne inspekcije.',
      'Certifikovani odgajatelji obučeni za učenje kroz igru.',
      'Standardi sigurnosti, zdravlja i ishrane koji se redovno provjeravaju.',
    ],
  },
}

const team = [
  {
    name: 'Berina Juković',
    roleEn: 'Lead Teacher - Preschool',
    roleBs: 'Vodeća odgajateljica - predškolska grupa',
    bioEn: 'Keeps preschoolers feeling brave with steady routines, soft songs, and a cozy welcome each morning.',
    bioBs: 'Čini da se predškolci osjećaju hrabro uz mirne rutine, tihe pjesme i topao doček svakog jutra.',
    photo: teacher1,
  },
  {
    name: 'Hena Šehović',
    roleEn: 'Toddler Educator',
    roleBs: 'Odgajatelj - jaslička grupa',
    bioEn: 'Guides toddlers with simple songs, sensory bins, and lots of calm reassurance during new transitions.',
    bioBs: 'Vodi jasličare kroz jednostavne pjesme, senzorne igre i mnogo smirenog ohrabrenja tokom novih koraka.',
    photo: teacher2,
  },
  {
    name: 'Berin Žunić',
    roleEn: 'Assistant Teacher',
    roleBs: 'Asistent odgajatelja',
    bioEn: 'Supports small groups, offers gentle comfort, and helps each child join in at their own pace.',
    bioBs: 'Podržava male grupe, pruža nježnu utjehu i pomaže svakom djetetu da se uključi svojim tempom.',
    photo: teacher6,
  },
  {
    name: 'Iman Mezit',
    roleEn: 'Nurse',
    roleBs: 'Medicinska sestra',
    bioEn: 'Keeps health checks gentle and reassuring, partnering with families to support daily wellbeing.',
    bioBs: 'Vodi nježne zdravstvene provjere i sarađuje s porodicama kako bi svakodnevno podržala dobrobit djece.',
    photo: teacher5,
  },
  {
    name: 'Derviš Dautbašić',
    roleEn: 'Support Staff',
    roleBs: 'Pomoćno osoblje',
    bioEn: 'Helps classrooms run smoothly with a calm presence and reliable care.',
    bioBs: 'Pomaže da učionice rade glatko uz smireno prisustvo i pouzdanu brigu.',
    photo: teacher8,
  },
  {
    name: 'Emina Jusić',
    roleEn: 'Cook',
    roleBs: 'Kuharica',
    bioEn: 'Prepares warm, nourishing meals with extra care for little taste buds.',
    bioBs: 'Priprema tople, hranljive obroke s posebnom pažnjom za male nepce.',
    photo: teacher7,
  },
]

const galleryImages = [ucionica0, ucionica1, ucionica2, ucionica3, ucionica4, ucionica5, ucionica6, ucionica7]
const cardColors = ['#fce2e3', '#fef6df', '#e9f1e4', '#e4ebf1', '#b2e0ff', '#f9c7ca']

export default function AboutPage() {
  const { language } = useLanguage()
  const t = copy[language] || copy.en
  const [openCard, setOpenCard] = useState(null)

  const toggleCard = (name) => {
    setOpenCard((prev) => (prev === name ? null : name))
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <section className="rounded-3xl bg-mistyGrey/70 p-8 md:p-12 shadow-sm">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-berry font-semibold">{t.heading}</p>
              <h1 className="font-display text-4xl text-navy leading-tight">{t.subtitle}</h1>
            </div>
            <p className="text-lg leading-relaxed text-navy/85">{t.intro1}</p>
            <p className="text-lg leading-relaxed text-navy/80">{t.intro2}</p>

            <div className="space-y-3">
              <p className="font-semibold text-navy">{t.missionTitle}</p>
              <ul className="space-y-2 text-navy/85">
                {t.bullets.map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="h-8 w-8 rounded-full bg-blushPetal/60 grid place-items-center text-lg">{item.icon}</span>
                    <span className="leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-navy">{t.storyTitle}</p>
              <p className="text-navy/85 leading-relaxed">{t.story}</p>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-lg bg-white/70">
            <img src={aboutImg} alt="Calm classroom" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <LazySection>
        <section className="mt-12 space-y-4 bg-white/70 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="space-y-1">
            <p className="text-berry font-semibold">{t.inside}</p>
            <h2 className="font-display text-3xl text-navy">{t.insideTitle}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {galleryImages.map((img, idx) => (
              <div
                key={idx}
                className="aspect-[4/3] rounded-2xl bg-mistyGrey/60 shadow overflow-hidden transition transform hover:-translate-y-1 hover:shadow-md"
              >
                <img
                  src={img}
                  alt="Classroom"
                  className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-105"
                />
              </div>
            ))}
          </div>
        </section>
      </LazySection>

      <LazySection>
        <section className="mt-12 space-y-4 bg-white/70 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="space-y-1">
            <p className="text-berry font-semibold">{t.teamTag}</p>
            <h2 className="font-display text-3xl text-navy">{t.teamTitle}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map((member, idx) => {
              const cardColor = cardColors[idx % cardColors.length]
              return (
              <div
                key={member.name}
                role="button"
                tabIndex={0}
                onClick={() => toggleCard(member.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleCard(member.name)
                  }
                }}
                className="relative rounded-3xl bg-mistyGrey/50 p-0 shadow-sm text-center min-h-[280px] overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-berry/60 transition"
                style={{ perspective: '1000px' }}
              >
                <div
                  className="relative h-full w-full transition-transform duration-500 ease-out transform-gpu"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: openCard === member.name ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  <div
                    className="absolute inset-0 p-5 space-y-3 rounded-3xl"
                    style={{ backfaceVisibility: 'hidden', backgroundColor: cardColor }}
                  >
                    <div className="mx-auto h-36 w-36 rounded-full overflow-hidden bg-white shadow">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-babyBlue/50 grid place-items-center text-navy/60 text-sm">
                          {t.photo}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-display text-xl text-navy">{member.name}</p>
                      <p className="text-sm text-navy/70 font-semibold">{language === 'bs' ? member.roleBs : member.roleEn}</p>
                    </div>
                  </div>

                  <div
                    className="absolute inset-0 p-5 flex flex-col items-center justify-center gap-3 rounded-3xl"
                    style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', backgroundColor: cardColor }}
                  >
                    <p className="font-display text-xl text-navy">{member.name}</p>
                    <p className="text-sm text-navy/75 max-w-xs text-center">
                      {language === 'bs' ? member.bioBs : member.bioEn}
                    </p>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </section>
      </LazySection>

      <LazySection>
        <section className="mt-10 space-y-3 bg-white/60 rounded-2xl p-5 shadow-sm">
          <p className="text-berry font-semibold text-sm">{t.licenses}</p>
          <ul className="space-y-2 text-navy/80">
            {t.licenseList.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="h-6 w-6 rounded-full bg-sageMist/80 text-navy grid place-items-center text-xs">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </LazySection>
    </main>
  )
}
