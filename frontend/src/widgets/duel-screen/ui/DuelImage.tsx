import { useState } from 'react'

export function DuelImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <div role="alert">
        <p>Nie udało się wczytać ilustracji.</p>
        <button type="button" onClick={() => setFailed(false)}>
          Ponów wczytywanie
        </button>
      </div>
    )
  return <img src={src} alt="Element do rozpoznania" onError={() => setFailed(true)} />
}
