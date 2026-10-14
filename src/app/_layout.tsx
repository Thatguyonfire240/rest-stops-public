import { Session, User } from '@supabase/supabase-js';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState } from 'react';
import { Alert, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { supabase } from '../../services/supabase';

import AppTabs from '../components/app-tabs';

import * as Linking from 'expo-linking';

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

  showOnlyFavorites: boolean;
  setShowOnlyFavorites: (val: boolean) => void;

  // premium tracking
  isPremiumUser: boolean;
  setIsPremiumUser: (val: boolean) => void;
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

  // hook for showing only favorites
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  
  // hook for premium user handling, init as false
  const [isPremiumUser, setIsPremiumUser] = useState<boolean>(false);

  // listens for sign ins and pulls premium status
  useEffect(() => {
    if (!user) {
      setIsPremiumUser(false); //default to locked if not logged in
      return;
    }

    const checkPremiumDatabasePoint = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single(); // grabs singular atching profile row

      if (!error && data) {
        setIsPremiumUser(data.is_premium); // set premium status strictly based on database records
      }
    };

    checkPremiumDatabasePoint();

    const realtimeChannel = supabase
      .channel('live-profile-tracker')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          // if you change checkbox in browser editor this fires live
          if (payload.new && 'is_premium' in payload.new) {
            setIsPremiumUser(payload.new.is_premium);
          }
        }
      )
      .subscribe();

      return () => {
        supabase.removeChannel(realtimeChannel);
      };

  }, [user]); // re runs whenever a login, logout or session change occurs

  // init background listener to watch for auth
  useEffect(() => {
    // pull init login session immediately on application launch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // constant listening stream to update if user logs in, signs up etc
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_authEvent, session) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  const handleDeepLinkIncoming = async (url: string) => {
    if (!url) return;
    
    // Parses out standard query string hashes
    const parsed = Linking.parse(url);
    
    // Checks for recoveryMode flag parameter
    if (parsed.queryParams?.recoveryMode === 'true' || url.includes('recovery')) {
      // Extract the auth tokens straight out of the URL param string
      const fragment = url.split('#')[1];
      if (fragment) {
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          // Manually authenticate into profile session using the tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (!error) {
            Alert.alert(
              "Account Recovered! 🔑",
              "You have been securely authenticated. Please use your profile settings dashboard to save a new password immediately.",
              [{ text: "Open Settings" }]
            );
          }
        }
      }
    }
  };

  // Listen for links firing while the app process is already open in the background
  const linkListener = Linking.addEventListener('url', (event) => {
    handleDeepLinkIncoming(event.url);
  });

  // Listen for links waking up a completely killed app process
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLinkIncoming(url);
  });



    return () =>  {
      subscription.unsubscribe();
      linkListener.remove();
    };
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
        showOnlyFavorites, setShowOnlyFavorites,
        isPremiumUser, setIsPremiumUser,
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