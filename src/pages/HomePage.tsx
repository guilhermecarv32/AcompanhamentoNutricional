import { Link } from 'react-router-dom'
import { ArrowDoodle, SparkDoodle } from '../components/Doodles'
import { useApp } from '../context/AppContext'
import './HomePage.css'

const cards = [
  {
    to: '/dieta',
    title: 'Montar dieta',
    copy: 'Refeições, horários, alimentos e quantidades.',
  },
  {
    to: '/registrar',
    title: 'Registrar refeição',
    copy: 'Sugestão automática pela refeição mais próxima.',
  },
  {
    to: '/andamento',
    title: 'Andamento do dia',
    copy: 'Compare planejado x feito, dia a dia.',
  },
  {
    to: '/dashboard',
    title: 'Dashboard',
    copy: 'Aderência, calorias, peso e muito mais.',
  },
]

export function HomePage() {
  const { activeProfile } = useApp()

  return (
    <div className="home-page">
      <section className="home-hero pop-in">
        <p className="eyebrow">olá, {activeProfile?.name}</p>
        <h1 className="display-title">
          Como está
          <br />
          o prato hoje?
        </h1>
        <p className="muted">
          Cadastre a dieta, atualize o peso e vá registrando as refeições no
          ritmo do dia.
        </p>
        <ArrowDoodle className="home-arrow" />
      </section>

      <section className="home-grid">
        {cards.map((card, index) => (
          <Link
            key={card.to}
            to={card.to}
            className="glass home-card pop-in"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <SparkDoodle className="home-card-spark" />
            <h2>{card.title}</h2>
            <p>{card.copy}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
