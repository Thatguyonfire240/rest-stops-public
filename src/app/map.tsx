import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Button, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { supabase } from '../../services/supabase';


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

export default function App() {
  // track which destination pin is selected
  const [selectedDestination, setSelectedDestination] = useState<LocationCoordinates | null>(null);
 
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

  // ev mode toggle
  const [showOnlyEV, setShowOnlyEV] = useState<boolean>(false);

  // route stats
  const [routeStats, setRouteStats] = useState<{ distance: number; duration: number } | null>(null);

  // update map reference
  const mapRef = useRef<MapView | null>(null);

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

      // simulation of fast cloud response delay
      /*
      await new Promise(resolve => setTimeout(resolve, 10000));

      const databaseResponse: LocationCoordinates[] = [
        {
          id: '1',
          latitude: 32.5191,
          longitude: -102.6121,
          name: 'Andrews County Northbound, TX',
        },
        {
          id: '2',
          latitude: 30.2117,
          longitude: -97.7971,
          name: 'Garrison Park, Austin, TX',
        },
        {
          id: '3',
          latitude: 30.2672,
          longitude: -97.7431,
          name: 'Downtown Austin, TX',
        },
      ];
      */

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

  const displayedPins = showOnlyEV
    ? currentRoute.destinations.filter(pin => pin.amenities?.includes('ev_charging'))
    : currentRoute.destinations;
    

  return (
    <Animated.View style={[styles.container, { opacity: mapOpacity }]}>
      {/* Render map using coordinates stored from variable */}
      <MapView
      // binds map to reference handle
      ref={mapRef} 
      // re renders whenever pin count changes
      key={`map-canvas-${displayedPins.length}`} 
      style={styles.map} 
      provider={PROVIDER_GOOGLE} 
      initialRegion={{
        latitude: currentRoute.origin?.latitude || 30.2672,
        longitude: currentRoute.origin?.longitude || -97.7431,
        latitudeDelta: 0.422,
        longitudeDelta: 0.368,}} showsUserLocation={true} showsIndoors={false} showsTraffic={true}
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

        {/* calculate and show directions if user has selected a destination pin */}
        {currentRoute.origin && selectedDestination && (
          <MapViewDirections
            origin={currentRoute.origin}
            destination={selectedDestination}
            apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_KEY || ""}
            strokeWidth={4}
            strokeColor="blue"

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

      {/* Button to toggle filter on/off */}
      <View style={styles.filterContainer}>
        <Button
          title={showOnlyEV ? "Showing EV Charging Only" : "Filter: All Rest Stops"}
          color={showOnlyEV ? "green" : "#666"}
          // toggles button on/off
          onPress= {() => setShowOnlyEV(!showOnlyEV)}
          />
      </View>

      {/* Button to clear route */}
      {selectedDestination && (
        <View style={styles.clearRouteContainer}>
          <Button
            title="Clear Selected Route"
            color="#d9534f"
            // deselect pin and remove mileage/eta
            onPress={() => {
              setSelectedDestination(null);
              setRouteStats(null);
            }}
          />
        </View>
      )}

      {/* Button to interact with coordinate variables */}
      <View style={styles.buttonContainer}>
        {loadingDatabase ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator size="small" color="blue" />
            <Text>Synchronizing Database...</Text>
            </View>
        ) : (
          <View style={{ width: '100%', gap: 10 }}>
            {/* displays live calculation when pin route is generated */}
            {routeStats && (
              <View style={styles.statsRow}>
                <Text style={styles.statsText}> {routeStats.distance.toFixed(1)} miles</Text>
                <Text style={styles.statsText}> {formatDuration(routeStats.duration)}</Text>
                </View>
            )}
          <Button
            title={selectedDestination ? `Navigate to ${selectedDestination.name}` : "Select a Stop to Navigate"}
            disabled={!selectedDestination}
            onPress={shareWithExternalMap}
          />
          </View>
        )}
      </View>
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
    bottom: 40,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  clearRouteContainer: {
    position: 'absolute',
    top: 105, // float right below ev charging filter, change later to move ev filter to settings menu
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
});
