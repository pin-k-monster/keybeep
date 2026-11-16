import type { JSX, ReactNode, SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

function IconBase({
  size = 16,
  children,
  ...props
}: IconProps & { children: ReactNode }): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function KeyboardIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12.5h.01M10 12.5h.01M14 12.5h.01M18 12.5h.01" />
      <path d="M8 16h8" />
    </IconBase>
  )
}

export function SettingsIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  )
}

export function InfoIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </IconBase>
  )
}

export function VolumeIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </IconBase>
  )
}

export function VolumeMutedIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="m16 9 5 5M21 9l-5 5" />
    </IconBase>
  )
}

export function PlayIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </IconBase>
  )
}

export function CloseIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </IconBase>
  )
}

export function CheckIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="m5 12 4.5 4.5L19 7" />
    </IconBase>
  )
}

export function SunIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </IconBase>
  )
}

export function MoonIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </IconBase>
  )
}

export function MonitorIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </IconBase>
  )
}

export function SlidersIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </IconBase>
  )
}

export function AudioLinesIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
    </IconBase>
  )
}

export function ResetIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path d="M3 3v5h5" />
    </IconBase>
  )
}

export function GithubIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.5a3 3 0 0 0-.9-2.3c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 19 5.6 4.9 4.9 0 0 0 18.9 2S17.7 1.6 15 3.4a13 13 0 0 0-6 0C6.3 1.6 5.1 2 5.1 2a4.9 4.9 0 0 0-.1 3.6A5.2 5.2 0 0 0 3.7 9c0 5.2 3.2 6.4 6.2 6.7a3 3 0 0 0-.9 2.3V22" />
    </IconBase>
  )
}

export function ExternalLinkIcon({ size, ...props }: IconProps): JSX.Element {
  return (
    <IconBase size={size} {...props}>
      <path d="M15 3h6v6M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </IconBase>
  )
}
