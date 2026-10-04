import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react/offline'
import closeIcon from '@iconify-icons/heroicons/x-mark'
import { QuizGame } from './QuizGame'
import { randomQuizQuestion, type QuizQuestion } from '../model/quizData'
import { RushGame } from './RushGame'
import { randomRushTask, type RushTask } from '../model/rushData'
import { GambleGame } from './GambleGame'
import { challengeOptions, type ChallengeType } from '@/entities/challenge'
import type { ChallengeAnswer, ChallengeData } from '../api/challengeApi'
import './ChallengeModal.css'

type ChallengeVerdict = 'WIN' | 'LOSS'

export function ChallengeModal({
  mode,
  initialType = null,
  challengeData,
  onClose,
  onResolve,
  onRouletteSpin,
  onReturn,
}: {
  mode: 'NEUTRAL' | 'DUEL'
  initialType?: ChallengeType | null
  challengeData?: ChallengeData
  onClose: () => void
  onResolve: (answer: ChallengeAnswer) => Promise<ChallengeVerdict>
  onRouletteSpin?: (
    choice: 'RED' | 'BLACK',
  ) => Promise<{ number: number; color: 'RED' | 'BLACK' | 'GREEN'; result: ChallengeVerdict }>
  onReturn: (verdict: ChallengeVerdict) => void
}) {
  const [selected, setSelected] = useState<ChallengeType | null>(initialType)
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(() =>
    initialType === 'QUIZ' ? ((challengeData?.payload as QuizQuestion) ?? randomQuizQuestion()) : null,
  )
  const [quizIntroDone, setQuizIntroDone] = useState(false)
  const [rushTask, setRushTask] = useState<RushTask | null>(() =>
    initialType === 'RUSH' ? ((challengeData?.payload as RushTask) ?? randomRushTask()) : null,
  )
  const [verdict, setVerdict] = useState<ChallengeVerdict | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const resolutionStarted = useRef(false)
  const pendingAnswer = useRef<ChallengeAnswer>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const available = mode === 'NEUTRAL' ? challengeOptions.slice(0, 3) : challengeOptions.slice(3)
  const activeOption = challengeOptions.find((option) => option.type === selected)
  const handleResolved = useCallback(
    (_result: ChallengeVerdict, answer: ChallengeAnswer = {}) => {
      if (resolutionStarted.current) return
      resolutionStarted.current = true
      pendingAnswer.current = answer
      setSaveError(null)
      void onResolve(answer)
        .then(setVerdict)
        .catch((error: unknown) => {
          setSaveError(error instanceof Error ? error.message : 'Nie udało się zapisać wyniku.')
          resolutionStarted.current = false
        })
    },
    [onResolve],
  )
  useEffect(() => {
    if (selected === null) closeRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selected === null) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, selected])
  useEffect(() => {
    if (selected !== 'QUIZ') return
    const timeout = window.setTimeout(() => setQuizIntroDone(true), 1350)
    return () => window.clearTimeout(timeout)
  }, [selected, quizQuestion])
  useLayoutEffect(() => {
    const modal = modalRef.current
    const heading = headingRef.current
    const body = bodyRef.current
    if (!modal || !heading || !body) return
    const fitContent = () => {
      modal.style.height = `${heading.offsetHeight + body.scrollHeight + (footerRef.current?.offsetHeight ?? 0)}px`
    }
    fitContent()
    const observer = new ResizeObserver(fitContent)
    observer.observe(heading)
    observer.observe(body)
    if (footerRef.current) observer.observe(footerRef.current)
    return () => observer.disconnect()
  }, [selected, verdict, saveError])
  return (
    <div
      className="challenge-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && selected === null) onClose()
      }}
    >
      <section
        ref={modalRef}
        className={`challenge-modal ${activeOption ? 'challenge-modal--stage' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-title"
      >
        <div ref={headingRef} className="challenge-heading">
          {activeOption ? (
            <>
              <span id="challenge-title" className="challenge-title-placeholder">
                {activeOption.label}
              </span>
              <span className="challenge-active-icon" style={{ backgroundColor: activeOption.color }}>
                <Icon icon={activeOption.icon} aria-hidden="true" />
              </span>
            </>
          ) : (
            <h2 id="challenge-title">Wybierz wyzwanie</h2>
          )}
          {!activeOption && (
            <button
              ref={closeRef}
              type="button"
              className="challenge-close"
              aria-label="Zamknij okno wyzwania"
              onClick={onClose}
            >
              <Icon icon={closeIcon} aria-hidden="true" />
            </button>
          )}
        </div>
        {activeOption?.type === 'QUIZ' && quizQuestion && (
          <div className="challenge-category-stamp">{quizQuestion.category}</div>
        )}
        <div ref={bodyRef} className="challenge-body">
          {activeOption ? (
            <div className="challenge-stage">
              <div
                className={`challenge-play-area ${activeOption.type === 'QUIZ' ? 'challenge-play-area--quiz' : ''} ${activeOption.type === 'RUSH' ? 'challenge-play-area--rush' : ''} ${activeOption.type === 'GAMBLE' ? 'challenge-play-area--gamble' : ''}`}
                aria-label={`Miejsce rozgrywki ${activeOption.label}`}
              >
                {activeOption.type === 'QUIZ' && quizQuestion && (
                  <QuizGame question={quizQuestion} start={quizIntroDone} onResolved={handleResolved} />
                )}
                {activeOption.type === 'RUSH' && rushTask && (
                  <RushGame task={rushTask} onResolved={handleResolved} />
                )}
                {activeOption.type === 'GAMBLE' && (
                  <GambleGame
                    onResolved={handleResolved}
                    gambleType={challengeData?.gambleType}
                    payload={challengeData?.payload}
                    onRouletteSpin={onRouletteSpin}
                    onRouletteResolved={(result) => {
                      resolutionStarted.current = true
                      setVerdict(result)
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="challenge-options">
                {available.map((option) => (
                  <button
                    type="button"
                    className="challenge-option"
                    key={option.type}
                    onClick={() => {
                      setVerdict(null)
                      if (option.type === 'QUIZ') {
                        setQuizIntroDone(false)
                        setQuizQuestion(randomQuizQuestion())
                      }
                      if (option.type === 'RUSH') setRushTask(randomRushTask())
                      setSelected(option.type)
                    }}
                  >
                    <span className="challenge-option-icon" style={{ backgroundColor: option.color }}>
                      <Icon icon={option.icon} aria-hidden="true" />
                    </span>
                    <strong>{option.label}</strong>
                  </button>
                ))}
              </div>
              <div className="challenge-credit">
                Ikony:{' '}
                <a href="https://icon-sets.iconify.design/game-icons/" target="_blank" rel="noreferrer">
                  Game Icons
                </a>{' '}
                ·{' '}
                <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
                  CC BY 3.0
                </a>
              </div>
            </>
          )}
        </div>
        {saveError && (
          <footer ref={footerRef} className="challenge-footer" role="alert">
            <p>{saveError}</p>
            <button type="button" onClick={() => handleResolved('LOSS', pendingAnswer.current)}>
              Ponów zapis wyniku
            </button>
          </footer>
        )}
        {verdict && (
          <footer ref={footerRef} className={`challenge-footer challenge-footer--${verdict.toLowerCase()}`}>
            <div className="challenge-verdict">
              <strong>{verdict === 'WIN' ? 'Wygrana!' : 'Przegrana'}</strong>
            </div>
            <button type="button" onClick={() => onReturn(verdict)}>
              Wróć do mapy
            </button>
          </footer>
        )}
      </section>
    </div>
  )
}
