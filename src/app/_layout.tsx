import { Session, User } from '@supabase/supabase-js';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState } from 'react';
import { Alert, useColorScheme } from 'react-native';

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

  favoriteStopIds: string[];
  toggleFavoriteStop: (stopId: string) => Promise<void>;
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

  // hooks for fave stop IDs
  const [favoriteStopIds, setFavoriteStopIds] = useState<string[]>([]);


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

  // pull user faves from database
  useEffect(() => {
    if (!user) {
      // wipe cache if logged out
      setFavoriteStopIds([]);
      return;
    }

    const fetchFavorites = async () => {
      const { data, error } = await supabase
        .from('favorite_stops')
        .select('stop_id');

      if (!error && data) {
        setFavoriteStopIds(data.map(item => item.stop_id));
      }
    };

    fetchFavorites();
  }, [user]);

  // handler to add/remove favorites from cloud dynamically
  const toggleFavoriteStop = async (stopId: string) => {
    if (!user) {
      Alert.alert("Account Required", "Please log in to bookmark favorite rest stops.");
      return;
    }

    const isFav = favoriteStopIds.includes(stopId);

    if (isFav) {
      // remove from cloud
      setFavoriteStopIds(prev => prev.filter(id => id !== stopId));
      await supabase.from('favorite_stops').delete().eq('user_id', user.id).eq('stop_id', stopId);
    } else {
      // add to cloud
      setFavoriteStopIds(prev => [...prev, stopId]);
      await supabase.from('favorite_stops').insert({ user_id: user.id, stop_id: stopId });
    }
  };

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
        favoriteStopIds,
        toggleFavoriteStop,
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