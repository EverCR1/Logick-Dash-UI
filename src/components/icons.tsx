import type { ReactNode, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const Icon = ({ children, size = 16, ...props }: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
)

export const I = {
  Home: (p: IconProps) => <Icon {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></Icon>,
  Dashboard: (p: IconProps) => <Icon {...p}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></Icon>,
  Users: (p: IconProps) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>,
  Building: (p: IconProps) => <Icon {...p}><rect x="4" y="3" width="16" height="18" /><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" /></Icon>,
  UserCircle: (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 19a6 6 0 0 1 11 0" /></Icon>,
  Truck: (p: IconProps) => <Icon {...p}><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></Icon>,
  Package: (p: IconProps) => <Icon {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" /></Icon>,
  Boxes: (p: IconProps) => <Icon {...p}><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19.18" /><path d="M7 16.5l-4.74-2.85M7 16.5l5-3M7 16.5v5.17" /><path d="M21.03 12.92A2 2 0 0 1 22 14.63v3.24a2 2 0 0 1-.97 1.71l-3 1.8a2 2 0 0 1-2.06 0L12 19.18" /><path d="M17 16.5l-5-3M17 16.5l4.74-2.85M17 16.5v5.17" /><path d="M12 8l-5 3 5 3 5-3-5-3z" /><path d="M12 2v6" /></Icon>,
  Cart: (p: IconProps) => <Icon {...p}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></Icon>,
  Card: (p: IconProps) => <Icon {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></Icon>,
  Store: (p: IconProps) => <Icon {...p}><path d="M3 9l1-5h16l1 5" /><path d="M3 9v11h18V9" /><path d="M3 9c0 1.66 1.34 3 3 3s3-1.34 3-3M9 9c0 1.66 1.34 3 3 3s3-1.34 3-3M15 9c0 1.66 1.34 3 3 3s3-1.34 3-3" /><path d="M9 21v-5h6v5" /></Icon>,
  Receipt: (p: IconProps) => <Icon {...p}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" /><path d="M8 7h8M8 11h8M8 15h5" /></Icon>,
  Star: (p: IconProps) => <Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Icon>,
  Help: (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12" y2="17" /></Icon>,
  Flag: (p: IconProps) => <Icon {...p}><path d="M4 22V4a2 2 0 0 1 2-2h12l-4 5 4 5H6" /></Icon>,
  Ticket: (p: IconProps) => <Icon {...p}><path d="M3 7v4a2 2 0 1 1 0 4v4h18v-4a2 2 0 1 1 0-4V7H3z" /><path d="M9 7v14" /></Icon>,
  Activity: (p: IconProps) => <Icon {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>,
  FileText: (p: IconProps) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></Icon>,
  Shield: (p: IconProps) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>,
  Search: (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></Icon>,
  Bell: (p: IconProps) => <Icon {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Icon>,
  Settings: (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.39 1.25 1 1.51h.09a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1 1.51z" /></Icon>,
  Plus: (p: IconProps) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>,
  Refresh: (p: IconProps) => <Icon {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Icon>,
  Cal: (p: IconProps) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>,
  Clock: (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 6 12 12 16 14" /></Icon>,
  TrendUp: (p: IconProps) => <Icon {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Icon>,
  TrendDown: (p: IconProps) => <Icon {...p}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></Icon>,
  ArrowUp: (p: IconProps) => <Icon {...p}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></Icon>,
  ArrowDown: (p: IconProps) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></Icon>,
  ArrowRight: (p: IconProps) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Icon>,
  Chevron: (p: IconProps) => <Icon {...p}><polyline points="9 18 15 12 9 6" /></Icon>,
  ChevronDown: (p: IconProps) => <Icon {...p}><polyline points="6 9 12 15 18 9" /></Icon>,
  ChevronsLeft: (p: IconProps) => <Icon {...p}><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></Icon>,
  More: (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></Icon>,
  Wave: (p: IconProps) => <Icon {...p}><path d="M7 11a3 3 0 0 1 0-6c3 0 4 2 4 4s-1 4-4 4" /><path d="M11 11l4 6c1 2 4 2 5 0l2-4M3 21l4-4" /></Icon>,
  Sun: (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></Icon>,
  Moon: (p: IconProps) => <Icon {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></Icon>,
  AlertCircle: (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16" x2="12" y2="16" /></Icon>,
  CheckCircle: (p: IconProps) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>,
  Inbox: (p: IconProps) => <Icon {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Icon>,
  Wallet: (p: IconProps) => <Icon {...p}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></Icon>,
  Tag: (p: IconProps) => <Icon {...p}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7" y2="7" /></Icon>,
  Ban: (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><line x1="5.64" y1="5.64" x2="18.36" y2="18.36" /></Icon>,
  Cash: (p: IconProps) => <Icon {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></Icon>,
  Trophy: (p: IconProps) => <Icon {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></Icon>,
  Layers: (p: IconProps) => <Icon {...p}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Icon>,
  LogOut: (p: IconProps) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>,
}

export type IconName = keyof typeof I
