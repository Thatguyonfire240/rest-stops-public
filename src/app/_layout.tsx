import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <FilterContext.Provider value={{ showOnlyEv, setShowOnlyEv, 
        avoidTolls, setAvoidTolls, 
        showTrafficData, setShowTrafficData, 
        showOnlyWifi, setShowOnlyWifi,
        selectedDestination, setSelectedDestination,
        routeStats, setRouteStats
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
    throw new Error("useFilters must be consumed inside a FilterContext.Provider franework");
  }
  return context;
};