import type { ChallengeAnswer } from '../api/challengeApi'
import { useEffect, useRef, useState } from 'react'
import type { QuizQuestion } from '../model/quizData'
import './QuizGame.css'

const shuffle = <T,>(items: T[]) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}
type QuizResult = 'WIN' | 'LOSS' | 'NO_ANSWER'
const QUIZ_TIME_SECONDS = 30
const evaluateAnswer = (question: QuizQuestion, answer: string | null, order: string[]): QuizResult => {
  if (question.type === 'ABCD') {
    if (!answer) return 'NO_ANSWER'
    return question.options.find((option) => option.text === answer)?.is_correct ? 'WIN' : 'LOSS'
  }
  if (order.length !== 4) return 'NO_ANSWER'
  const expected = [...question.options].sort(
    (first, second) => first.correct_position - second.correct_position,
  )
  return order.every((text, index) => text === expected[index].text) ? 'WIN' : 'LOSS'
}

export function QuizGame({
  question,
  start,
  onResolved,
}: {
  question: QuizQuestion
  start: boolean
  onResolved: (result: 'WIN' | 'LOSS', answer?: ChallengeAnswer) => void
}) {
  const [abcdChoices] = useState(() => (question.type === 'ABCD' ? shuffle(question.options) : []))
  const [orderChoices] = useState(() => (question.type === 'ORDER' ? shuffle(question.options) : []))
  const [typedQuestion, setTypedQuestion] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME_SECONDS)
  const [answer, setAnswer] = useState<string | null>(null)
  const [order, setOrder] = useState<string[]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const answerRef = useRef<string | null>(null)
  const orderRef = useRef<string[]>([])
  const resolvedRef = useRef(false)

  useEffect(() => {
    if (!start) return
    let index = 0
    const typing = window.setInterval(() => {
      index += 1
      setTypedQuestion(question.question.slice(0, index))
      if (index >= question.question.length) {
        window.clearInterval(typing)
        window.setTimeout(() => setIsReady(true), 220)
      }
    }, 38)
    return () => window.clearInterval(typing)
  }, [question.question, start])

  function checkAnswer() {
    if (resolvedRef.current || timeLeft <= 0) return
    resolvedRef.current = true
    const next = evaluateAnswer(question, answerRef.current, orderRef.current)
    setResult(next)
    onResolved(next === 'WIN' ? 'WIN' : 'LOSS', { choice: answerRef.current, answers: orderRef.current })
  }

  useEffect(() => {
    if (!isReady || result) return
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          window.setTimeout(() => {
            if (resolvedRef.current) return
            resolvedRef.current = true
            const next = evaluateAnswer(question, answerRef.current, orderRef.current)
            setResult(next)
            onResolved(next === 'WIN' ? 'WIN' : 'LOSS', {
              choice: answerRef.current,
              answers: [...orderRef.current],
              timedOut: true,
            })
          }, 0)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isReady, result, question, onResolved])

  const canSubmit = question.type === 'ABCD' ? answer !== null : order.length === 4
  const expectedOrder =
    question.type === 'ORDER'
      ? [...question.options].sort((first, second) => first.correct_position - second.correct_position)
      : []
  return (
    <div className="quiz-game">
      <div className="quiz-question-wrap">
        <h3>
          {typedQuestion}
          <span className={isReady ? 'typing-caret typing-caret--done' : 'typing-caret'} aria-hidden="true" />
        </h3>
      </div>
      <div className={`quiz-controls ${isReady ? 'quiz-controls--visible' : 'quiz-controls--waiting'}`}>
        <div className="quiz-clock">
          <div className="quiz-progress">
            <span style={{ width: `${(timeLeft / QUIZ_TIME_SECONDS) * 100}%` }} />
          </div>
          <span className={`quiz-timer ${timeLeft <= 8 ? 'quiz-timer--urgent' : ''}`}>
            <strong>{timeLeft}</strong>
            <small>sek.</small>
          </span>
        </div>
        {question.type === 'ABCD' ? (
          <div className="quiz-answers">
            {abcdChoices.map((option, index) => (
              <button
                type="button"
                key={option.text}
                disabled={result !== null || timeLeft <= 0}
                style={{ animationDelay: `${index * 80}ms` }}
                className={`quiz-answer ${answer === option.text ? 'quiz-answer--selected' : ''} ${
                  result
                    ? option.is_correct
                      ? 'quiz-answer--correct'
                      : answer === option.text
                        ? 'quiz-answer--wrong'
                        : 'quiz-answer--muted'
                    : ''
                }`}
                onClick={() => {
                  answerRef.current = option.text
                  setAnswer(option.text)
                }}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                {option.text}
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="quiz-order-hint">Klikaj elementy w odpowiedniej kolejności.</p>
            <div className="quiz-order-pool">
              {orderChoices.map((option, index) => {
                const position = order.indexOf(option.text)
                return (
                  <button
                    type="button"
                    key={option.text}
                    disabled={result !== null || timeLeft <= 0 || position >= 0}
                    style={{ animationDelay: `${index * 80}ms` }}
                    className={`quiz-order-choice ${position >= 0 ? 'quiz-order-choice--used' : ''}`}
                    onClick={() =>
                      setOrder((current) => {
                        if (current.length >= 4 || current.includes(option.text)) return current
                        const next = [...current, option.text]
                        orderRef.current = next
                        return next
                      })
                    }
                  >
                    {option.text}
                  </button>
                )
              })}
            </div>
            <div className="quiz-order-list" aria-label="Ustalona kolejność">
              {Array.from({ length: 4 }, (_, index) => {
                const text = order[index]
                const isCorrect = result && text && expectedOrder[index]?.text === text
                return (
                  <button
                    type="button"
                    key={index}
                    disabled={!text || result !== null || timeLeft <= 0}
                    className={`quiz-order-slot ${text ? 'quiz-order-slot--filled' : ''} ${
                      result && text ? (isCorrect ? 'quiz-answer--correct' : 'quiz-answer--wrong') : ''
                    }`}
                    onClick={() => {
                      const next = order.filter((_, position) => position !== index)
                      orderRef.current = next
                      setOrder(next)
                    }}
                  >
                    <span>{index + 1}</span>
                    <strong>{text ?? 'Wybierz element'}</strong>
                  </button>
                )
              })}
            </div>
          </>
        )}
        <div className="quiz-submit-slot">
          {!result && canSubmit && (
            <button type="button" className="quiz-submit" onClick={checkAnswer}>
              Zatwierdź
            </button>
          )}
        </div>
        {result && (
          <span className="quiz-result-announcement" role="status">
            {result === 'WIN'
              ? 'Odpowiedź poprawna.'
              : result === 'NO_ANSWER'
                ? 'Czas minął bez odpowiedzi.'
                : 'Odpowiedź niepoprawna.'}
          </span>
        )}
      </div>
    </div>
  )
}
