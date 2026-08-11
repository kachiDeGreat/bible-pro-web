import React, { useState, useEffect } from 'react';
import { useLive } from '../store/LiveContext';

const OutputView = () => {
  const { liveState } = useLive();
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [liveState.text]);

  useEffect(() => {
    // Force the body to be transparent for OBS, overriding global.css
    document.body.style.backgroundColor = 'transparent';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.overflow = '';
    };
  }, []);

  const renderBackground = () => {
    if (liveState.backgroundMode === 'image' && liveState.backgroundUrl) {
      return (
        <img 
          src={liveState.backgroundUrl} 
          alt="background" 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }} 
        />
      );
    }
    if (liveState.backgroundMode === 'video' && liveState.backgroundUrl) {
      return (
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}
        >
          <source src={liveState.backgroundUrl} />
        </video>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative',
      backgroundColor: liveState.backgroundMode === 'solid' && !liveState.transparentBackground ? liveState.backgroundColor : 'transparent',
      overflow: 'hidden'
    }}>
      {renderBackground()}
      
      {liveState.type !== 'clear' && (
        <div
          key={renderKey}
          className={`projected-content layout-${liveState.layout} valign-${liveState.verticalAlign} halign-${liveState.horizontalAlign}`}
          style={{
            position: 'absolute',
            zIndex: 1,
            fontFamily: liveState.fontFamily,
            paddingLeft: `${liveState.paddingLR}%`,
            paddingRight: `${liveState.paddingLR}%`,
            paddingBottom: liveState.layout === 'LT' ? '2vw' : '0',
            inset: 0,
            background: 'transparent'
          }}
        >
          <div
            className={`projected-box bg-${liveState.transparentBackground ? 'transparent' : 'normal'} anim-${liveState.animation} shadow-${liveState.shadow}`}
            style={{
              width: liveState.layout === 'LT' ? `${liveState.lowerThirdWidth}%` : '100%',
              height: liveState.layout === 'FS' ? '100%' : 'auto',
              padding: liveState.layout === 'FS' ? (liveState.transparentBackground ? '4vw' : '6vw') : '3vw 4vw',
              background: liveState.layout === 'LT' ? (liveState.transparentBackground ? 'transparent' : liveState.backgroundColor) : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: liveState.horizontalAlign === 'left' ? 'flex-start' : liveState.horizontalAlign === 'right' ? 'flex-end' : 'center',
              justifyContent: liveState.layout === 'FS'
                ? liveState.verticalAlign === 'top' ? 'flex-start' : liveState.verticalAlign === 'bottom' ? 'flex-end' : 'center'
                : 'center',
              gap: '1vw'
            }}
          >
            {liveState.title && liveState.type === 'bible' && liveState.refPosition === 'top' && (
              <div
                className="projected-title"
                style={{
                  width: '100%',
                  textAlign: liveState.refAlign as any,
                  color: liveState.refColor,
                  fontSize: `${liveState.refFontSize * (liveState.layout === 'LT' ? 0.6 : 1)}vw`,
                  fontFamily: liveState.fontFamily,
                  margin: 0,
                  marginBottom: '0.5vw',
                  textTransform: liveState.refTextTransform !== 'none' ? (liveState.refTextTransform as any) : undefined,
                  fontWeight: liveState.refFontWeight
                }}
              >
                {liveState.title}
              </div>
            )}
            
            <div
              className="projected-text"
              style={{
                width: '100%',
                textAlign: liveState.horizontalAlign as any,
                color: liveState.textColor,
                fontSize: `${(liveState.type === 'bible' ? liveState.bibleFontSize : liveState.songFontSize) * (liveState.layout === 'LT' ? 0.6 : 1)}vw`,
                fontFamily: liveState.fontFamily,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.3,
                textTransform: liveState.type === 'song' 
                  ? (liveState.songTextTransform !== 'none' ? liveState.songTextTransform as any : undefined)
                  : (liveState.bibleTextTransform !== 'none' ? liveState.bibleTextTransform as any : undefined),
                fontWeight: liveState.type === 'song' ? liveState.songFontWeight : liveState.bibleFontWeight
              }}
            >
              {liveState.text}
            </div>
            
            {liveState.title && liveState.type === 'bible' && liveState.refPosition === 'bottom' && (
              <div
                className="projected-title"
                style={{
                  width: '100%',
                  textAlign: liveState.refAlign as any,
                  color: liveState.refColor,
                  fontSize: `${liveState.refFontSize * (liveState.layout === 'LT' ? 0.6 : 1)}vw`,
                  fontFamily: liveState.fontFamily,
                  margin: 0,
                  marginTop: '0.5vw',
                  textTransform: liveState.refTextTransform !== 'none' ? (liveState.refTextTransform as any) : undefined,
                  fontWeight: liveState.refFontWeight
                }}
              >
                {liveState.title}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OutputView;
