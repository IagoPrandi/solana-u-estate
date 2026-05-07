import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "stroke"> & {
  size?: number;
  stroke?: number;
};

const Base = ({
  children,
  size = 18,
  stroke = 1.8,
  ...rest
}: IconProps & { children: ReactNode }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

export const IconHome = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 11.5L12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </Base>
);
export const IconBuilding = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
  </Base>
);
export const IconStore = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M5 9v11h14V9" />
    <path d="M9 14h6" />
  </Base>
);
export const IconWallet = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 7v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2 2 2 0 0 1 2-2h13" />
    <path d="M17 14h.01" />
  </Base>
);
export const IconReceipt = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2" />
    <path d="M8 7h8M8 11h8M8 15h5" />
  </Base>
);
export const IconBook = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 4v16a2 2 0 0 0 2 2h14V4H6a2 2 0 0 0-2 2z" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </Base>
);
export const IconSettings = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Base>
);
export const IconSearch = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Base>
);
export const IconBell = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Base>
);
export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Base>
);
export const IconArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </Base>
);
export const IconArrowLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Base>
);
export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const IconUpload = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </Base>
);
export const IconFile = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </Base>
);
export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Base>
);
export const IconCoins = (p: IconProps) => (
  <Base {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
    <path d="M16.71 13.88l.7.71-2.82 2.82" />
  </Base>
);
export const IconCopy = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Base>
);
export const IconExternal = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14L21 3" />
    <path d="M21 14v7H3V3h7" />
  </Base>
);
export const IconMapPin = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </Base>
);
export const IconTrending = (p: IconProps) => (
  <Base {...p}>
    <path d="m22 7-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </Base>
);
export const IconLayers = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 2-10 5 10 5 10-5-10-5z" />
    <path d="m2 12 10 5 10-5" />
    <path d="m2 17 10 5 10-5" />
  </Base>
);
export const IconFilter = (p: IconProps) => (
  <Base {...p}>
    <path d="M22 3H2l8 9.5V19l4 2v-8.5z" />
  </Base>
);
export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Base>
);
export const IconSparkles = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 17l.9 2.1L22 20l-2.1.9L19 23l-.9-2.1L16 20l2.1-.9z" />
  </Base>
);
export const IconKey = (p: IconProps) => (
  <Base {...p}>
    <circle cx="7" cy="15" r="4" />
    <path d="m10.6 12.4 7.4-7.4 3 3-3 3 2 2-2 2-2-2-2 2" />
  </Base>
);
export const IconZap = (p: IconProps) => (
  <Base {...p}>
    <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
  </Base>
);
export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </Base>
);
export const IconLock = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Base>
);
export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="m21.7 18-9-15a1 1 0 0 0-1.4 0l-9 15a1 1 0 0 0 .9 1.5h17a1 1 0 0 0 .9-1.5z" />
  </Base>
);
export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Base>
);
export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 18 6-6-6-6" />
  </Base>
);
export const IconHistory = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </Base>
);
export const IconLink = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </Base>
);
export const IconEye = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);
export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Base>
);
export const IconNetwork = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
  </Base>
);
export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12h18M3 6h18M3 18h18" />
  </Base>
);
