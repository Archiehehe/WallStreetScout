import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2563EB',
        borderRadius: 6,
        flexDirection: 'column',
      }}
    >
      <span
        style={{
          color: 'white',
          fontSize: 16,
          fontWeight: 700,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        IIF
      </span>
    </div>,
    { width: 32, height: 32 },
  )
}
