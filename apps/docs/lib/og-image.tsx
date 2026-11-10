import { ImageResponse } from 'next/og';
import { site } from './site';

export function siteImage(title: string, description: string = site.description) {
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', padding: 64, background: site.themeColor, color: '#ffffff', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 30 }}>
        <span style={{ color: site.accent }}>ComposerKit</span><span>React components</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', fontSize: 64, letterSpacing: -2, lineHeight: 1.1, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 26, lineHeight: 1.5, color: '#c4d0bf', maxWidth: 950 }}>{description}</div>
      </div>
      <div style={{ display: 'flex', fontSize: 22, color: site.accent }}>Composers, conversations and component source</div>
    </div>,
    { width: 1200, height: 630 }
  );
}
