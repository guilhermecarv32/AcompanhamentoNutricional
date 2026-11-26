import { ArrowDoodle } from '../components/Doodles'
import './PlaceholderPage.css'

type Props = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <section className="placeholder glass pop-in">
      <div className="stamp-label">em construção</div>
      <h1 className="display-title">{title}</h1>
      <p className="muted">{description}</p>
      <ArrowDoodle className="placeholder-arrow" />
    </section>
  )
}
