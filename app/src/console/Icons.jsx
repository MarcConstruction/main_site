/* Inline SVGs rather than an icon package. Sixteen glyphs at ~20 lines total
   is not worth a dependency, and these inherit currentColor so the rail and
   the light views style them the same way. */

const S = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Grid = () => <S><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></S>;
export const Home = () => <S><path d="M4 10.5 12 4l8 6.5V20H4z" /></S>;
export const Mail = () => <S><rect x="3" y="5" width="18" height="14" /><path d="m3 7 9 6 9-6" /></S>;
export const Library = () => <S><rect x="3" y="4" width="18" height="16" /><path d="M9 4v16" /></S>;
export const Cog = () => <S><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" /></S>;
export const Out = () => <S size={18}><path d="M15 4h3v16h-3M11 8l-4 4 4 4M7 12h9" /></S>;
export const Pencil = () => <S size={16}><path d="M4 20h4L20 8l-4-4L4 16z" /></S>;
export const Star = () => <S size={16}><path d="m12 4 2.4 5 5.6.8-4 3.9.9 5.5L12 16.6 7.1 19.2l.9-5.5-4-3.9 5.6-.8z" /></S>;
export const Trash = () => <S size={16}><path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13" /></S>;
export const Back = () => <S size={18}><path d="M14 6l-6 6 6 6" /></S>;
export const Eye = () => <S size={18}><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.6" /></S>;
export const Alert = () => <S size={22}><path d="M12 4 2.5 20h19z" /><path d="M12 10v4m0 3v.5" /></S>;
export const Up = () => <S size={26}><path d="M12 17V5m-5 5 5-5 5 5" /><path d="M4 19h16" /></S>;
export const Box = () => <S size={20}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></S>;
export const Play = () => <S size={20}><rect x="3" y="5" width="18" height="14" /><path d="m10 9.5 5 2.5-5 2.5z" /></S>;
export const Doc = () => <S size={20}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></S>;
export const Pic = () => <S size={22}><rect x="3" y="4" width="18" height="16" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m4 18 5-5 4 4 3-3 4 4" /></S>;
export const Lock = () => <S size={18}><rect x="4" y="10" width="16" height="10" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></S>;
export const Dots = () => <S size={16}><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></S>;
