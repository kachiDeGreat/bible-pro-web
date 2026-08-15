import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface LiveState {
  type: 'bible' | 'song' | 'clear';
  title: string;
  text: string;
  backgroundMode: 'solid' | 'image' | 'video';
  backgroundColor: string;
  backgroundUrl: string;
  linesMode: 1 | 2 | 3 | 4;
  verticalAlign: 'top' | 'middle' | 'bottom';
  horizontalAlign: 'left' | 'center' | 'right';
  layout: 'FS' | 'LT';
  animation: 'none' | 'fade' | 'slide' | 'zoom';
  shadow: 'none' | 'light' | 'heavy';
  transparentBackground: boolean;
  fontFamily: string;
  bibleFontSize: number;
  songFontSize: number;
  refFontSize: number;
  refPosition: 'top' | 'bottom';
  refAlign: 'left' | 'center' | 'right';
  songTextTransform: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  bibleTextTransform: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  refTextTransform: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  songFontWeight: string;
  bibleFontWeight: string;
  refFontWeight: string;
  paddingLR: number;
  lowerThirdWidth: number;
  enableLowerThirdBg: boolean;
  lowerThirdBgColor: string;
  lowerThirdBgOpacity: number;
  lowerThirdPadding: number;
  refColor: string;
  textColor: string;
}

interface LiveContextType {
  liveState: LiveState;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState>>;
  projectLive: (newState: Partial<LiveState>) => void;
  clearLive: () => void;
}

const defaultState: LiveState = {
  type: 'clear',
  title: '',
  text: '',
  backgroundMode: 'solid',
  backgroundColor: '#050505', // A deep black default
  backgroundUrl: '',
  linesMode: 2,
  verticalAlign: 'bottom',
  horizontalAlign: 'center',
  layout: 'FS', // Change default to FS for a better initial experience
  animation: 'fade',
  shadow: 'heavy',
  transparentBackground: false,
  fontFamily: 'Inter',
  bibleFontSize: 4.5,
  songFontSize: 5.5,
  refFontSize: 2.5,
  refPosition: 'top',
  refAlign: 'left',
  songTextTransform: 'none',
  bibleTextTransform: 'none',
  refTextTransform: 'none',
  songFontWeight: '600',
  bibleFontWeight: '600',
  refFontWeight: 'bold',
  paddingLR: 5,
  lowerThirdWidth: 78,
  enableLowerThirdBg: true,
  lowerThirdBgColor: '#000000',
  lowerThirdBgOpacity: 50,
  lowerThirdPadding: 3,
  refColor: '#FFFFFF',
  textColor: '#FFFFFF'
};

import { updateLiveState, subscribeToLiveState } from '../services/dbService';

const LiveContext = createContext<LiveContextType | undefined>(undefined);

const getInitialState = (): LiveState => {
  try {
    const saved = localStorage.getItem('bibleSongProSettings');
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to parse local settings', e);
  }
  return defaultState;
};

export function LiveProvider({ children }: { children: ReactNode }) {
  const [liveState, setLiveState] = useState<LiveState>(getInitialState);

  useEffect(() => {
    // Subscribe to Local SSE Server for cross-device/OBS syncing
    const unsubscribe = subscribeToLiveState('default', (state) => {
      if (state) {
        if (state.timestamp) {
          console.warn('Ignoring old RTDB state format to prevent crash.');
        } else {
          setLiveState(state);
          localStorage.setItem('bibleSongProSettings', JSON.stringify(state));
        }
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const projectLive = (newState: Partial<LiveState>) => {
    const updatedState = { ...liveState, ...newState };
    setLiveState(updatedState);
    localStorage.setItem('bibleSongProSettings', JSON.stringify(updatedState));
    updateLiveState('default', updatedState);
  };

  const clearLive = () => {
    const updatedState = { ...liveState, type: 'clear' as const };
    setLiveState(updatedState);
    updateLiveState('default', updatedState);
  };

  return (
    <LiveContext.Provider value={{ liveState, setLiveState, projectLive, clearLive }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive() {
  const context = useContext(LiveContext);
  if (context === undefined) {
    throw new Error('useLive must be used within a LiveProvider');
  }
  return context;
}
