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
      <h2>Cel i przygotowanie</h2>
      <p>
        Gra dla 2–6 drużyn. Wygrywa ostatnia drużyna posiadająca terytorium — natychmiast, nawet jeśli
        pozostali są w czyśćcu. Nie ma limitu rund. Kolory, ikony, wielkość mapy, próg bonusu i możliwość
        powrotu ustalacie przed grą. Bazy oraz stała kolejność tur są losowane.
      </p>
      <h2>Tura i bonusy</h2>
      <p>
        Najpierw wykonaj ruch bazowy. Potem możesz wykorzystać bonusy albo zachować je na później. Maksymalnie
        przechowujesz dwa bonusy. Seria wygranych ruchów bazowych daje bonus po osiągnięciu ustawionego progu
        (domyślnie 3) i zeruje serię. Przy pełnym banku nowy bonus przepada. Porażka w ruchu bazowym zeruje
        serię, ale nie odbiera bonusów. Ruchy bonusowe nigdy nie zmieniają serii. Prowadzący kończy turę
        ręcznie.
      </p>
      <h2>Neutralne pola</h2>
      <p>
        Wybierz pole sąsiadujące z Twoim terytorium, a następnie QUIZ, RUSH lub GAMBLE. Konkretna treść jest
        ukryta do wyboru. Wygrana przejmuje pole. Porażka spala wybrane wyzwanie na tym polu. Możesz próbować
        pozostałych wyzwań, jeśli masz ruchy.
      </p>
      <p>
        Po spaleniu wszystkich trzech wyzwań pole znika na zawsze. Jeżeli utworzyłoby to odłączoną wyspę,
        pozostaje neutralne i dostaje trzy nowe wyzwania. Przez dziury nie można atakować.
      </p>
      <h2>Wyzwania</h2>
      <ul>
        <li>
          <strong>QUIZ:</strong> wybierz jedną z czterech odpowiedzi albo uporządkuj cztery elementy. Masz 30
          sekund. Koniec czasu automatycznie zatwierdza wybraną odpowiedź lub ułożoną kolejność. Przycisk
          „Zatwierdź” pozwala zakończyć wcześniej. Brak wyboru lub niepełna kolejność oznacza porażkę.
        </li>
        <li>
          <strong>RUSH:</strong> wpisz wymaganą liczbę odpowiedzi przed końcem czasu wskazanego w zadaniu.
          Aliasy, wielkość liter, polskie znaki, spacje i łączniki nie przeszkadzają w rozpoznaniu. Powtórzona
          odpowiedź nie liczy się ponownie. Błędne próby nie mają kary.
        </li>
        <li>
          <strong>ALL IN:</strong> rozdziel całe 100 na cztery odpowiedzi. Wygrywasz, jeśli co najmniej 50
          trafi na poprawną odpowiedź.
        </li>
        <li>
          <strong>MNIEJ / WIĘCEJ:</strong> zdecyduj, czy prawdziwa wartość jest mniejsza, czy większa od
          podanej.
        </li>
        <li>
          <strong>RULETKA:</strong> obstaw czerwone lub czarne. Wybrany kolor wygrywa, przeciwny i zielone
          zero przegrywają. Szansa wygranej wynosi 18/37.
        </li>
      </ul>
      <p>GAMBLE losuje jedną z trzech ostatnich gier. Drużyna nie wybiera jej rodzaju.</p>
      <h2>Pojedynek i przejęcia</h2>
      <p>
        Atak na sąsiednie pole przeciwnika rozpoczyna DUEL. Drużyny wybierają przedstawicieli ustnie. Zaczyna
        atakujący. Każda strona ma 30 sekund; biegnie tylko zegar odpowiadającego. Prowadzący ocenia
        odpowiedzi. Poprawna odpowiedź przełącza stronę i zmienia hasło w rozpoznawaniu. Błędne zgadywanie nie
        ma limitu. PASS pomija hasło i odbiera 3 sekundy. W zadaniach polegających na wymienianiu przykładów
        obowiązuje ta sama kategoria. Kto pierwszy wyczerpie czas, przegrywa.
      </p>
      <p>
        Po przejęciu zwykłego pola zdobywasz też wszystkie pola obrońcy odcięte od jego bazy. Zdobycie bazy
        daje całe jego terytorium. Zachowujesz własną bazę, a zdobyta przestaje być bazą. Zmiany nie obejmują
        terytoriów innych drużyn.
      </p>
      <h2>Czyściec</h2>
      <p>
        Utrata całego terytorium zeruje serię i bonusy. Przy włączonych powrotach drużyna pozostaje w kolejce
        jako uczestnik czyśćca; w przeciwnym razie odpada. Na początku jej tury liczba neutralnych pól musi
        być co najmniej równa liczbie drużyn w czyśćcu. Jeśli warunek nie jest spełniony, prowadzący
        przechodzi dalej.
      </p>
      <p>
        Próba powrotu losuje neutralne pole oraz jedno z jego dostępnych wyzwań. Wygrana tworzy tam nową bazę,
        porażka spala wyzwanie według zwykłych zasad. Próba zużywa całą turę; nie daje serii ani bonusów.
        Powracająca drużyna nie ma ochrony.
      </p>
      <h2>Kolejne partie i prowadzenie</h2>
      <p>
        Zaznacz „Kolejna partia tego samego wieczoru”, aby nie powtarzać pokazanych treści QUIZ, RUSH, ALL IN
        i MNIEJ / WIĘCEJ. Nowy wieczór resetuje tę pulę. Dokładne hasło DUEL nie powtarza się w jednej partii,
        ale jego kategoria może wracać.
      </p>
      <p>
        Prowadzący obsługuje aplikację i przyciski pojedynku w osobnym oknie. Mapa służy do prezentacji.
        Zakończone ruchy są zapisywane; odświeżenie przywraca planszę i turę. Trwające liczniki nie są
        zapisywane co sekundę.
      </p>
    </main>
  )
}
