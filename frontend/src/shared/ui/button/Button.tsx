import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

type ButtonVariant = 'default' | 'primary' | 'keyboard' | 'text'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

export function Button({ className = '', type = 'button', variant = 'default', ...props }: ButtonProps) {
  return <button type={type} className={`button button--${variant} ${className}`.trim()} {...props} />
}
