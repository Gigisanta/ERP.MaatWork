import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// AI_DECISION: Generate dynamic favicon using the app's characteristic Feather icon
// Justificación: Next.js icon.tsx allows creating a consistent favicon without external assets
// Impacto: Improves brand consistency in the browser tab
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse container
      <div
        style={{
          fontSize: 24,
          background: '#8b5cf6', // Primary Purple from globals.css
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '20%',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17.5" y1="15" x2="9" y2="15" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}









