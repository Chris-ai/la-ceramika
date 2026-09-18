import { Icon } from '@iconify/react/offline'
import blocksWave from '@iconify-icons/svg-spinners/blocks-wave'

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return <Icon icon={blocksWave} className={`app-spinner ${className}`} aria-hidden="true" />
}
