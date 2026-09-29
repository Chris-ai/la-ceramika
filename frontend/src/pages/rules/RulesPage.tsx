import { Link } from 'react-router-dom'
import './RulesPage.css'

export function RulesPage() {
  return (
    <main className="rules-page">
      <Link className="rules-page__back" to="/">
        ← Menu główne
      </Link>
      <h1>Zasady</h1>
      <p>Rozwijaj terytorium, zdobywaj sąsiednie heksy i broń swojej bazy.</p>
      <ul>
        <li>Neutralne pola zdobywasz przez QUIZ, RUSH lub GAMBLE. Terytorium przeciwnika — przez DUEL.</li>
        <li>
          W każdej turze masz jeden ruch bazowy. Możesz też wykorzystać maksymalnie dwa zgromadzone ruchy
          bonusowe.
        </li>
        <li>
          Przejęcie bazy daje całe terytorium przeciwnika. Odcięte od jego bazy pola również przechodzą do
          atakującego.
        </li>
        <li>Po zakończeniu swoich akcji prowadzący przełącza turę na następną drużynę.</li>
      </ul>
      <p className="rules-page__note">Pełny ekran zasad jest w przygotowaniu.</p>
    </main>
  )
}
