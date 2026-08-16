import React, { useState, useEffect } from 'react';
import { useLive } from '../store/LiveContext';

const getRgba = (hex: string, opacity: number) => {
  if (!hex) return `rgba(0, 0, 0, ${opacity / 100})`;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
};

const OutputView = () => {
  const { liveState } = useLive();
  const [displayState, setDisplayState] = useState(liveState);
  const [outgoingState, setOutgoingState] = useState<any>(null);

  useEffect(() => {
    setDisplayState(prev => {
      if (liveState.text !== prev.text || liveState.title !== prev.title || liveState.type !== prev.type) {
        if (prev.type !== 'clear' && liveState.animation !== 'none') {
          setOutgoingState(prev);
          setTimeout(() => {
            setOutgoingState(null);
          }, 800);
        } else {
          setOutgoingState(null);
        }
        return liveState;
      }
      return liveState;
    });
  }, [liveState]);

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

  const renderProjectedContent = (state: any, isOutgoing: boolean) => {
    if (!state || state.type === 'clear') return null;
    
    const isBgTransparent = state.layout === 'LT' ? !state.enableLowerThirdBg : state.transparentBackground;
    const animClass = isOutgoing ? `anim-${state.animation}-out` : `anim-${state.animation}-in`;
    
    let bgClass = isBgTransparent ? 'transparent' : 'normal';
    if (!isBgTransparent && state.layout === 'LT' && state.type === 'bible' && state.bibleLowerThirdStyle === 'torn-edge') {
      bgClass = 'torn-edge';
    }

    return (
      <div
        key={isOutgoing ? 'outgoing' : 'display-' + state.text + state.title}
        className={`projected-content layout-${state.layout} valign-${state.verticalAlign} halign-${state.horizontalAlign}`}
        style={{
          position: 'absolute',
          zIndex: isOutgoing ? 1 : 2,
          fontFamily: state.fontFamily,
          paddingLeft: `${state.paddingLR}%`,
          paddingRight: `${state.paddingLR}%`,
          paddingBottom: state.layout === 'LT' ? '2vw' : '0',
          inset: 0,
          background: 'transparent'
        }}
      >
        <div 
          className={`projected-box bg-${bgClass} ${state.animation !== 'none' ? animClass : ''} shadow-${state.shadow}`}
          style={{ 
            width: state.layout === 'LT' ? `${state.lowerThirdWidth}%` : '100%',
            height: state.layout === 'FS' ? '100%' : 'auto',
            padding: state.layout === 'FS' ? (state.transparentBackground ? '4vw' : '6vw') : `${state.lowerThirdPadding ?? 3}vw 4vw`,
            background: state.layout === 'LT' ? (bgClass === 'transparent' ? 'transparent' : getRgba(state.lowerThirdBgColor || '#000000', state.lowerThirdBgOpacity ?? 50)) : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: state.horizontalAlign === 'left' ? 'flex-start' : state.horizontalAlign === 'right' ? 'flex-end' : 'center',
            justifyContent: state.layout === 'FS'
              ? state.verticalAlign === 'top' ? 'flex-start' : state.verticalAlign === 'bottom' ? 'flex-end' : 'center'
              : 'center',
            gap: '1vw'
          }}
        >
          {state.title && state.type === 'bible' && state.refPosition === 'top' && (
            <div
              className="projected-title"
              style={{
                width: '100%',
                textAlign: state.refAlign as any,
                color: state.refColor,
                fontSize: `${state.refFontSize * (state.layout === 'LT' ? 0.6 : 1)}vw`,
                fontFamily: state.fontFamily,
                margin: 0,
                marginBottom: '0.5vw',
                textTransform: state.refTextTransform !== 'none' ? (state.refTextTransform as any) : undefined,
                fontWeight: state.refFontWeight
              }}
            >
              {state.title}
            </div>
          )}
          
          <div
            className="projected-text"
            style={{
              width: '100%',
              textAlign: state.horizontalAlign as any,
              color: state.textColor,
              fontSize: `${(state.type === 'bible' ? state.bibleFontSize : state.songFontSize) * (state.layout === 'LT' ? 0.6 : 1)}vw`,
              fontFamily: state.fontFamily,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.3,
              textTransform: state.type === 'song' 
                ? (state.songTextTransform !== 'none' ? state.songTextTransform as any : undefined)
                : (state.bibleTextTransform !== 'none' ? state.bibleTextTransform as any : undefined),
              fontWeight: state.type === 'song' ? state.songFontWeight : state.bibleFontWeight
            }}
          >
            {state.text}
          </div>
          
          {state.title && state.type === 'bible' && state.refPosition === 'bottom' && (
            <div
              className="projected-title"
              style={{
                width: '100%',
                textAlign: state.refAlign as any,
                color: state.refColor,
                fontSize: `${state.refFontSize * (state.layout === 'LT' ? 0.6 : 1)}vw`,
                fontFamily: state.fontFamily,
                margin: 0,
                marginTop: '0.5vw',
                textTransform: state.refTextTransform !== 'none' ? (state.refTextTransform as any) : undefined,
                fontWeight: state.refFontWeight
              }}
            >
              {state.title}
            </div>
          )}
        </div>
      </div>
    );
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
      {renderProjectedContent(outgoingState, true)}
      {renderProjectedContent(displayState, false)}
    </div>
  );
};

export default OutputView;
