import * as Location from 'expo-location';
import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Button, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { useFilters } from './_layout';

import SafeAdBanner from '../components/SafeAdBanner';

import { StatusBar } from 'expo-status-bar';


// coordinate structure
interface LocationCoordinates {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  // keep track of stuff rest stop has
  highway?: string;
  direction?: string;
  amenities?: string[];
}

// container structure for coordinates
interface RouteContainer {
  origin: LocationCoordinates | null;
  destinations: LocationCoordinates[];
}
/*
MobileAds()
  .initialize()
  .then(adapterStatuses => {
    console.log('Google Mobile Ads SDK Initialized Successfully!');
  })
  .catch(err => console.log('AdMob initialization handled safely: ', err));
  */

  

export default function App() {

  const safeAreaInsets = useSafeAreaInsets();
  // implemented dark mode
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
 
  // init animation value for map opacity
  const [mapOpacity] = useState(new Animated.Value(0)); 

  // init empty array variable
  const [currentRoute, setCurrentRoute] = useState<RouteContainer>({
    origin: null,
    destinations: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  // loading for database state
  const [loadingDatabase, setLoadingDatabase] = useState<boolean>(true);

  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  const [subscriberPins, setSubscriberPins] = useState<any[]>([]);

  const [pendingCoords, setPendingCoords] = useState<{ latitude: Number; longitude: Number } | null>(null);
  const [customPinName, setCustomPinName] = useState<string>('');
  const [isSavingPin, setIsSavingPin] = useState<boolean>(false);


  // update map reference
  const mapRef = useRef<MapView | null>(null);

  // import switch states
  const {
    showOnlyEv,
    avoidTolls,
    showTrafficData,
    showOnlyWifi,
    selectedDestination,
    setSelectedDestination,
    routeStats,
    setRouteStats,
    user,
    favoriteStopIds,
    toggleFavoriteStop,
    showOnlyFavorites,
    isPremiumUser,
  } = useFilters();


  
    

    const fetchSubscriberPins = async () => {
      if (!user || !isPremiumUser) {
      setSubscriberPins([]);
      return;
    }
      const {data, error } = await supabase
        .from('subscriber_pins')
        .select('*')
        .eq('user_id', user.id);

      if (!error && data) {
        setSubscriberPins(data);
      }
    };

    useEffect(() => {
      fetchSubscriberPins();
    }, [user, isPremiumUser]);

  const getUserLiveLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Using downtown Austin placeholder.");
        setCurrentRoute(prev => ({
          ...prev,
          origin: { id: 'default', latitude: 30.2672, longitude: -97.7431, name: "Downtown Austin, TX" }
        }));
        return;
      }

      // Create a racing promise that automatically fails after 3 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("GPS Hardware Timeout")), 3000)
      );

      // Race the actual hardware fetch against our 3-second limit
      const locationPromise = (async () => {
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }
        return loc;
      })();

      // Whichever finishes first wins the race!
      const location = (await Promise.race([locationPromise, timeoutPromise])) as Location.LocationObject;

      setCurrentRoute(prev => ({
        ...prev,
        origin: {
          id: 'default',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          name: "Current Location",
        }
      }));
    } catch (error) {
      console.warn("GPS failed or timed out. Falling back to Austin placeholder.", error);
      // HARD FALLBACK: Instantly insert fallback coordinate variables so the thread continues
      setCurrentRoute(prev => ({
        ...prev,
        origin: { id: 'default', latitude: 30.2672, longitude: -97.7431, name: "Downtown Austin, TX" }
      }));
    }
  };

  const navigation = useNavigation();

  useEffect (() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setSelectedDestination(null);
      setRouteStats(null);
    });

    return unsubscribe;
  }, [navigation]);

  //pulls permanent pins from database
  const loadPinsFromCustomDatabase = async () => {
    setLoadingDatabase(true);
    try {
      // REPLACE LATER WITH ACTUAL DATABASE CALL
      // const data = await response.json();
      // const response = await fetch('https://database-endpoint.com');

      // add live supabase table to query
      const { data, error } = await supabase
        .from('rest_stops')
        .select('id, name, latitude, longitude, highway, direction, amenities');

      if (error) {
        throw error;
      }

      // debug
      console.log("Supabase Connection Sucessful! data:", data);

      if (data) {
        // map PostgreSQL into frontend
        const formattedStops: LocationCoordinates[] = data.map((stop : any) => ({
          id: stop.id.toString(),
          latitude: stop.latitude,
          longitude: stop.longitude,
          name: stop.name,
          highway: stop.highway,
          direction: stop.direction,
          amenities: stop.amenities,
        }));

        // sync central state variable
        setCurrentRoute((prev) => ({
          ...prev,
          destinations: formattedStops,
        }));
      }


      // error catching
    } catch (error) {
      console.error(error);
      Alert.alert("Database Error", "Failed to load database");
    } finally {
      setLoadingDatabase(false);
    }

    };

    //  extended math for destination formats raw data into minutes and hours
    const formatDuration = (rawMinutes: number) => {
      const totalMinutes = Math.round(rawMinutes);

      if (totalMinutes < 60) {
        return `${totalMinutes} mins`
      }

      const hours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      if (remainingMinutes === 0) {
        return `${hours} hr${hours > 1 ? 's' : ''}`;
      }

      return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes} mins`;
    };

    // turn database amenity string array into visual icons (emoji)
    const renderAmenityIcons = (amenitiesList?: string[]) => {
      if (!amenitiesList || amenitiesList.length === 0) return null;

      // map strings from database directly to emoji output
      return amenitiesList.map((amenityId) => {
        switch (amenityId) {
          case 'restrooms': return '🚽';
          case 'vending': return '🍔';
          case 'pet_area': return '🐕';
          case 'wifi': return '📶';
          case 'ev_charging': return '⚡';
          default: return '📍';
        }
      // separate icons by two space cushion
      }).join('  ');
    };

  // function to share same coordinates with external launch
const shareWithExternalMap = () => {
  const { origin } = currentRoute;

  if (!origin) {
    Alert.alert("Please wait", "Still obtaining your current location.");
    return;
  }

  if (!selectedDestination) {
    Alert.alert("Select a stop", "Tap on a pin first to get directions to that location.");
    return;
  }

  // Define cross platform native map endpoints
  const iosUrl = `maps://0,0?saddr=${origin.latitude},${origin.longitude}&daddr=${selectedDestination.latitude},${selectedDestination.longitude}&dirflg=d`;
  const androidUrl = `google.navigation:q=${selectedDestination.latitude},${selectedDestination.longitude}&mode=d`;

  // Select the correct string depending on platform
  const url = Platform.select({
    ios: iosUrl,
    android: androidUrl,
    default: androidUrl // Fallback
  });

  // Launch the native directions protocol
  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to web link 
        const webUrl = `https://google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${selectedDestination.latitude},${selectedDestination.longitude}&travelmode=driving`;
        Linking.openURL(webUrl);
      }
    })
    .catch((err) => console.error("An error occurred", err));
};

// init gps tracking and database on launch
  useEffect(() => {
    const timer = setTimeout(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        console.log("1. Starting GPS Tracking...");
        await getUserLiveLocation();
        
        console.log("2. Starting Database Sync...");
        await loadPinsFromCustomDatabase();
        Animated.timing(mapOpacity, {
          toValue: 1,
          duration: 600,
          // enable Hardware acceleration
          useNativeDriver: true,
        }).start();

      } catch (error) {
        console.error("An initialization step failed unexpectedly:", error);
      } finally {
        setLoading(false);
        console.log("3. App Loaded successfully.");
      }
    };
    initializeApp();

  }, 0); // 0ms delay to defer execution

  // clean out timer context
  return () => clearTimeout(timer);
  }, []);

  // handle layout rendering so UI doesn't break if origin is null
  if (loading || !currentRoute.origin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="blue" />
        <Text style={{ marginTop: 10}}>Configuring Navigation Environment...</Text>
      </View>
    );
  }

  const displayedPins = currentRoute.destinations.filter((pin) => {
    // check Ev charging preferences
    if (showOnlyEv && !pin.amenities?.includes('ev_charging')) {
      return false; // hide pin if user requests Ev only but stop does not have it
    }

    // check toll road avoidance preferences
    if (avoidTolls && pin.highway?.toLowerCase().includes('toll')) {
      return false; // hide pin if avoiding toll roads
    }

    // check for wifi
    if (showOnlyWifi && !pin.amenities?.includes('wifi')) {
      return false;
    }

    // filters out pins not in favorites
    if (showOnlyFavorites && !favoriteStopIds.includes(pin.id)) {
      return false;
    }

    // when rest stop clears all checks, display
    return true;
  });
    

  return (
    <Animated.View style={[styles.container, { opacity: mapOpacity }]}>

      {/* forces hardware status bar to use correct text color */}
      <StatusBar
        style={
          isDarkMode
            ? 'light' // dark mode active
            : (!isPremiumUser ? 'dark' : 'auto') // free user light mode: forces text to dark grey over ad banner
        }
        animated={true}
      />

      {/* Insert Ad Banner */}
      <SafeAdBanner
        isPremiumUser={isPremiumUser}
        isDarkMode={isDarkMode}
        safeAreaTop={safeAreaInsets.top}
      />

      {/* Render map using coordinates stored from variable */}
      <MapView
      // binds map to reference handle
      ref={mapRef} 
      // re renders whenever pin count changes
      key={`map-canvas-${displayedPins.length}-${avoidTolls}-${showTrafficData}-${showOnlyFavorites}-${isPremiumUser}`} 
      style={styles.map} 
      provider={PROVIDER_GOOGLE} 
      initialRegion={{
        latitude: currentRoute.origin?.latitude || 30.2672,
        longitude: currentRoute.origin?.longitude || -97.7431,
        latitudeDelta: 0.422,
        longitudeDelta: 0.368,}} 
        showsUserLocation={true} 
        showsIndoors={false} 
        showsTraffic={showTrafficData}

        // intercept long press coordinates (shows paywall if not premium sub)
        onLongPress={async (e) => {
          if (!user) return Alert.alert("Account Required", "Please log in to manage custom trip pins.");
          if (!isPremiumUser) {
            setShowPaywall(true);
            return;
          }

          const { latitude, longitude } = e.nativeEvent.coordinate;
          setPendingCoords({ latitude, longitude });
        }}
      >
        {/* render physical pins from state variable */}
        {currentRoute.origin && (
          <Marker coordinate={currentRoute.origin} title={currentRoute.origin.name} pinColor="red" />
        )}

        {/* Loop through destinations and render pins onto screen */}
        {displayedPins.map((pin) => (
          <Marker
            key={pin.id} // creates unique key for each pin to save performance
            coordinate={pin}
            pinColor={selectedDestination?.id === pin.id ? "green" : "blue"} //highlights green if selected, otherwise default to blue
            onPress={() => {
              setRouteStats(null); 
              setSelectedDestination(pin); // sets selected pin to state variable
            }}
          >
            <Callout tooltip={false}>
              <View style={styles.calloutBubble}>
                <Text style={styles.calloutTitle}>{pin.name}</Text>

                {/* checks database for highway badge */}
                {pin.highway && (
                  <View style={styles.calloutBadgeRow}>
                    <Text style={styles.calloutBadgeText}>
                      🌎 {pin.highway} {pin.direction ? `• ${pin.direction}` : ''}
                    </Text>
                  </View>
                )}

                {/* Render amenity icons if present */}
                {pin.amenities && pin.amenities.length > 0 && (
                  <View style={styles.amenityRow}>
                    <Text style={styles.amenityText}>
                      {renderAmenityIcons(pin.amenities)}
                    </Text>
                  </View>
                )}
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Premium pin loop*/}
        {isPremiumUser && user && subscriberPins && subscriberPins
          .filter(pin => !showOnlyFavorites || favoriteStopIds.includes(pin.id)) // Obeys the favorites toggle seamlessly
          .map((customPin) => (
            <Marker
              key={customPin.id}
              coordinate={{ latitude: customPin.latitude, longitude: customPin.longitude }}
              title={customPin.name}
              description="💎 Subscriber Custom Stop"
              pinColor={selectedDestination?.id === customPin.id ? "green" : "purple"} // premium badge
              onPress={() => {
                setRouteStats(null);
                setSelectedDestination({
                  id: customPin.id,
                  name: customPin.name,
                  latitude: customPin.latitude,
                  longitude: customPin.longitude,
                  amenities: ['custom'] // placeholder to prevent crash loops in renders
                });
              }}

              onCalloutPress={() => {
                Alert.alert(
                  "Delete Custom Pin",
                  `Are you sure you want to permanently delete '${customPin.name}' from your cloud travel map profile?`,
                  [
                    { text: "Cancel", style:"cancel" },
                    {
                      text: "🗑️ Delete Pin",
                      style: "destructive",
                      onPress: async () => {
                        const { error } = await supabase
                          .from('subscriber_pins')
                          .delete()
                          .eq('id', customPin.id)
                          .eq('user_id', user.id);

                          if (error) {
                            Alert.alert("Delete Error", error.message);
                          } else {
                            Alert.alert("Deleted", `'${customPin.name}' removed from your profile.`);
                            if (selectedDestination?.id === customPin.id) {
                              setSelectedDestination(null);
                              setRouteStats(null);
                            }
                            await fetchSubscriberPins();
                          }
                      }
                    }
                  ]
                );
              }}
            >

              <Callout tooltip={false}>
                <View style={{ padding: 4, minWidth: 140, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 2 }}>
                    {customPin.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#d9534f', fontWeight: '600', marginTop: 2 }}>
                    🛑 Tap Bubble to Remove
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))
        }

      

        {/* calculate and show directions if user has selected a destination pin */}
        {currentRoute.origin && selectedDestination && (
          <MapViewDirections
            origin={currentRoute.origin}
            destination={selectedDestination}
            apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_KEY || ""}
            strokeWidth={4}
            strokeColor="blue"

            // tells google directions to actively recalculate when settings change
            mode="DRIVING"
            optimizeWaypoints={true}
            {...(avoidTolls ? { avoid: ['tolls'] as any } : {})}

           

            // listen for calculation response
            onReady={(result) => {
              setRouteStats({
                // convert kilometers to freedom units
                distance: result.distance * 0.621372,
                duration: result.duration // minutes
              });

              // make camera frame the route coordinates dynamically
              if (mapRef.current) {
                mapRef.current.fitToCoordinates(result.coordinates, {
                  edgePadding: {
                    top: 340, //extra padding to clear buttons
                    right: 120,
                    bottom: 160, // extra padding on bottom to clear summary card
                    left: 120,
                  },
                  animated: true, // smooth zoom animation
                });
              }
            }}
            onError={(errorMessage) => {
              console.error("Directions Error: ", errorMessage);
            }}
          />
        )}
      </MapView>



      {/* Button to clear route */}
      {selectedDestination && (
        <View style={[
          styles.clearRouteWrapper,
          { top: safeAreaInsets.top + (!isPremiumUser ? 64 : 12) }
          ]}>
          <TouchableOpacity
            style={[styles.floatingActionCloseCircle, isDarkMode && { backgroundColor: '#222', borderColor: '#444' }]}
            // deselect pin and remove mileage/eta
            onPress={() => {
              setSelectedDestination(null);
              setRouteStats(null);
            }}
          >
            <Text style={styles.floatingButtonText}>❌</Text>
            </TouchableOpacity>
        </View>
      )}

      {/* Button to interact with coordinate variables */}
      <View style={[
        styles.bottomContainerWrapper,
        { bottom: safeAreaInsets.bottom + 16 }
        ]}>


        {loadingDatabase ? (
          <View style={styles.loadingDatabaseRow}>
            <ActivityIndicator size="small" color="#1A53A0" />
            <Text style={styles.loadingDatabaseText}>Synchronizing Database...</Text>
            </View>
        ) : (
          <View style={{ width: '100%', gap: 8 }}>
            {/* displays live calculation when pin route is generated */}
            {routeStats && (
              <View style={[styles.floatingStatsRow, isDarkMode && { backgroundColor: '#1e1e1e', borderColor: '#333' }]}>
                <Text style={[styles.statsText, isDarkMode && { color: '#fff' }]}>🛣️ {routeStats.distance.toFixed(1)} miles</Text>
                <Text style={[styles.statsText, isDarkMode && { color: '#fff' }]}>⏱️ {formatDuration(routeStats.duration)}</Text>
                </View>
            )}

          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <TouchableOpacity
            style={[
              styles.floatingActionBadgeBar,
              !selectedDestination && styles.disabledFloatingActionBadgeBar,
              { flex: 1 }
            ]}
            disabled={!selectedDestination}
            onPress={shareWithExternalMap}
          >
            <Text style={[
              styles.floatingActionBadgeText,
              !selectedDestination && { color: '#8895a5' }
            ]}

            // lock text to one row, add '...' to end if too long
            numberOfLines={1}
            ellipsizeMode="tail"
            >
              {selectedDestination ? `Navigate to ${selectedDestination.name}` : "Select a Stop to Navigate"}
            </Text>
            </TouchableOpacity>

            {selectedDestination && (
              <TouchableOpacity
                style={[styles.floatingActionStarCircle, isDarkMode && { backgroundColor: '#222', borderColor: '#444' }]}
                onPress={() => toggleFavoriteStop(selectedDestination.id)}
              >
                <Text style={styles.starButtonText}>
                  {favoriteStopIds.includes(selectedDestination.id) ? '🌟' : '⭐'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          </View>
        )}
      </View>

      {showPaywall && (
        <View style={styles.paywallOverlay}>
          <View style={[styles.paywallCard, isDarkMode && { backgroundColor: '#1e1e1e' }]}>
            <Text style={styles.paywallTitle}>💎 Unlock Custom Map Pins</Text>
            <Text style={[styles.paywallSubtitle, isDarkMode && { color: '#bbb' }]}>
              Premium subscribers can long-press anywhere on the map to drop down unlimited custom stops, synced to their cloud account dashboard!
            </Text>

            <View style={{ gap: 10, marginTop: 4 }}>
              <Button title="Upgrade to Premium ($4.99/mo)" color="#a855f7"
                onPress={() => {
                  Alert.alert("Sandbox Checkout Active", "Go to the settings screen to simulate premium activation");
                  setShowPaywall(false);
              }} />
              <Button title="Maybe Later" color="#666"
                onPress={() => setShowPaywall(false)} />
            </View>
          </View>
        </View>
      )}

      {pendingCoords && (
        <View style={styles.paywallOverlay}>
          <View style={[styles.paywallCard, isDarkMode && { backgroundColor: '#1e1e1e' }]}>
            <Text style={[styles.paywallTitle, { color: '#1A53AO' }]}>📍 Drop Custom Stop</Text>
            <Text style={[styles.paywallSubtitle, isDarkMode && { color: '#bbb' }]}>
              Give this exact map location a label:
            </Text>

            <TextInput
              style={[styles.inputBox, isDarkMode && { backgroundColor: '#222', borderColor: '#444', color: '#fff' }, { marginBottom: 16 }]}
              placeholder="e.g., Hidden Campsite, My Rest Area"
              placeholderTextColor="grey"
              value={customPinName}
              onChangeText={setCustomPinName}
              autoCapitalize="words"
            />

            {isSavingPin ? (
              <ActivityIndicator size="small" color="#1A53A0" style={{ marginVertical: 12 }} />
            ) : (
              <View style={{ gap: 10 }}>
                <Button
                  title="Save Custom Pin"
                  color='#1A53A0'
                  onPress={async () => {
                    if (!customPinName.trim()) return Alert.alert("Name Required", "Please enter a name for your pin.");

                    setIsSavingPin(true);
                    const { error } = await supabase
                      .from('subscriber_pins')
                      .insert({
                        user_id: user?.id,
                        name: customPinName,
                        latitude: pendingCoords.latitude,
                        longitude: pendingCoords.longitude
                      });

                      setIsSavingPin(false);
                      if (error) {
                        Alert.alert("Save Error", error.message);
                      } else {
                        Alert.alert("Success!", `'${customPinName}' saved straight to your cloud profile!`);
                        await fetchSubscriberPins();
                        setCustomPinName('');
                        setPendingCoords(null);
                      }
                  }}
                />
                <Button
                  title="Cancel"
                  color="#666"
                  onPress={() => {
                    setCustomPinName('');
                    setPendingCoords(null);
                  }}
                  />
                </View>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8
  },
  center: {
    flex: 1, justifyContent: 'center', alignItems:'center' },

  filterContainer: {
    position: 'absolute',
    top: 50, //floats on top of screen layer
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 4,
  },

  statsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },

  clearRouteWrapper: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },

  floatingActionCloseCircle: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffccd5',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',

    //crispy shadow framing
    elevation: 4,
    shadowColor: '#d9534f',
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    shadowOffset: { width: 0, height: 2 },
  },

  floatingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },


  calloutBubble: {
    padding: 8,
    maxWidth: 200,
    backgroundColor: 'white',
    borderRadius: 6,
    alignItems: 'flex-start',
  },

  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },

  calloutBadgeRow: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0DDF0',
  },

  calloutBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A53A0',
  },

  amenityRow: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    width: '100%',
  },

  amenityText: {
    fontSize: 14,
    letterSpacing: 2, // keeps icons uniform and decluttered
  },

  bottomContainerWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
  },

  floatingActionBadgeBar: {
    backgroundColor: '#1A53A0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#154280',

    paddingHorizontal: 20,

    // shadow elevation lines crispy
    elevation: 4,
    shadowColor: '#1A53A0',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  // semi transparent gray placeholder when no pin is selected
  disabledFloatingActionBadgeBar: {
    backgroundColor: 'rgba(235, 240, 250, 0.92)',
    borderColor: 'rgba(210, 220, 235, 0.6)',
    shadowOpacity: 0,
    elevation: 0,
  },

  floatingActionBadgeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  //glass effect backgrop for driving stats
  floatingStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2
    },
  },

  loadingDatabaseRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  loadingDatabaseText: {
    fontWeight: '600',
    color: '#666',
  },

  calloutTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginBottom:4,
  },


  starTouchArea: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  floatingActionStarCircle: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 25,
    width: 50,
    // aligns with 50px high navigation badge bar
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  starButtonText: {
    fontSize: 18,
    textAlign: 'center',
    // centers text vertically on android
    textAlignVertical: 'center',
    // wipes out invisible native font
    includeFontPadding: false,
    // locks bounding frame height
    lineHeight: 22,
    color: '#f59e0b',
    // fine tune by pixel offset if system font forces lower text
    transform: [{ translateY: -1 }],
  },

  paywallOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },

  paywallCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    elevation: 5,
    shadowColor: '#a855f7',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  paywallTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },

  paywallSubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,    
  },

  inputBox: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    width: '100%',
  },

  adBannerRowSlot: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 2,
    marginBottom: 6,
  },

  topAdBannerRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
});
