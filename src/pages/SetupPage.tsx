import { Link } from 'react-router-dom'
import { ArrowDoodle, SparkDoodle } from '../components/Doodles'
import { useApp } from '../context/AppContext'
import './SetupPage.css'

export function SetupPage() {
  const { activeProfile, setup } = useApp()

  return (
    <div className="setup-page">
      <header className="setup-hero pop-in">
        <p className="eyebrow">primeiro passo · {activeProfile?.name}</p>
        <h1 className="display-title">
          Falta o
          <br />
          básico
        </h1>
        <p className="muted">
          Para liberar o app inteiro, cadastre sua <strong>dieta</strong> e pelo
          menos um <strong>peso</strong>. O resto continua opcional.
        </p>
        <ArrowDoodle className="setup-arrow" />
      </header>

      <section className="setup-steps">
        <article className={`glass setup-card pop-in ${setup.hasDiet ? 'done' : ''}`}>
          <div className="setup-card-top">
            <span className="stamp-label">{setup.hasDiet ? 'feito' : 'obrigatório'}</span>
            <SparkDoodle className="setup-spark" />
          </div>
          <h2>1. Dieta</h2>
          <p className="muted">
            Monte as refeições com horários e alimentos. Sem isso não dá para
            registrar nem comparar o dia.
          </p>
          <Link to="/dieta" className="btn btn-primary">
            {setup.hasDiet ? 'Revisar dieta' : 'Cadastrar dieta'}
          </Link>
        </article>

        <article className={`glass setup-card pop-in ${setup.hasWeight ? 'done' : ''}`}>
          <div className="setup-card-top">
            <span className="stamp-label">{setup.hasWeight ? 'feito' : 'obrigatório'}</span>
            <SparkDoodle className="setup-spark" />
          </div>
          <h2>2. Peso</h2>
          <p className="muted">
            Registre seu peso atual. Depois você atualiza quando quiser.
          </p>
          <Link to="/metricas" className="btn btn-primary">
            {setup.hasWeight ? 'Atualizar peso' : 'Cadastrar peso'}
          </Link>
        </article>
      </section>

      {setup.complete ? (
        <p className="setup-ready glass pop-in">
          Tudo certo — o app está liberado. Vá para o início quando quiser.
          <Link to="/" className="btn btn-ghost">
            Ir para o início
          </Link>
        </p>
      ) : (
        <p className="muted setup-hint">
          Progresso: {[setup.hasDiet, setup.hasWeight].filter(Boolean).length}/2
        </p>
      )}
    </div>
  )
}
