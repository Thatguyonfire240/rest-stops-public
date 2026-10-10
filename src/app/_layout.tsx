import { Session, User } from '@supabase/supabase-js';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { supabase } from '../../services/supabase';

import AppTabs from '../components/app-tabs';

// init global shared filter contexts
interface FilterContextType {
  showOnlyEv: boolean;
  setShowOnlyEv: (val: boolean) => void;
  avoidTolls: boolean;
  setAvoidTolls: (val: boolean) => void;
  showTrafficData: boolean;
  setShowTrafficData: (val: boolean) => void;
  showOnlyWifi: boolean;
  setShowOnlyWifi: (val: boolean) => void;

  selectedDestination: any;
  setSelectedDestination: (val: any) => void;
  routeStats: any;
  setRouteStats: (val: any) => void;

  // track user login state init
  user: User | null;
  session: Session | null;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // active preference states live here
  const [showOnlyEv, setShowOnlyEv] = useState<boolean>(false);
  const [avoidTolls, setAvoidTolls] = useState<boolean>(false);
  const [showTrafficData, setShowTrafficData] = useState<boolean>(false);
  const [showOnlyWifi, setShowOnlyWifi] = useState<boolean>(false);

  const [selectedDestination, setSelectedDestination] = useState<any>(null);
  const [routeStats, setRouteStats] = useState<any>(null);
  
  // catch user login status
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // init background listener to watch for auth
  useEffect(() => {
    // pull init login session immediately on application launch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // constant listening stream to update if user logs in, signs up etc
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <FilterContext.Provider value={{ 
        showOnlyEv, setShowOnlyEv, 
        avoidTolls, setAvoidTolls, 
        showTrafficData, setShowTrafficData, 
        showOnlyWifi, setShowOnlyWifi,
        selectedDestination, setSelectedDestination,
        routeStats, setRouteStats,
        user,
        session,
        }}>
      <AnimatedSplashOverlay />

      <AppTabs />
  
      </FilterContext.Provider>
    </ThemeProvider>
  );
}

// export hook so other screens can access data
export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters must be consumed inside a FilterContext.Provider framework");
  }
  return context;
};