import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert, Button, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';


// coordinate structure
interface LocationCoordinates {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

// container structure for coordinates
interface RouteContainer {
  origin: LocationCoordinates | null;
  destinations: LocationCoordinates[];
}

export default function App() {
  // track which destination pin is selected
  const [selectedDestination, setSelectedDestination] = useState<LocationCoordinates | null>(null);
  // store coordinates in a single variable
  const [currentRoute, setCurrentRoute] = useState<RouteContainer>({
    origin: null,
    destinations: [
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
    ],
  });

  const [loading, setLoading] = useState<boolean>(true);

  // trigger gps tracking on launch
  useEffect(() => {
    getUserLiveLocation();
  }, []);

  const getUserLiveLocation = async () => {
    setLoading(true);

    //request permissions and get user location
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Using downtown Austin placeholder.");

      //fallback if not authorized
      setCurrentRoute(prev => ({
        ...prev,
        origin: { id: 'default', latitude: 30.2672, longitude: -97.7431, name: "Downtown Austin, TX" }
      }));
      setLoading(false);
      return;
    }

    try {
      // get device coordinates
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // update origin nested inside existing variable structure
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
      Alert.alert("Error", "Could not retrieve live location.");
    } finally {
      setLoading(false);
    }
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

  // handle layout rendering so UI doesn't break if origin is null
  if (loading || !currentRoute.origin) {
    return (
      <View style={styles.center}>
        <Text>Fetching User Location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Render map using coordinates stored from variable */}
      <MapView style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={{
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
        {currentRoute.destinations.map((pin) => (
          <Marker
            key={pin.id} // creates unique key for each pin to save performance
            coordinate={pin}
            title={pin.name}
            pinColor={selectedDestination?.id === pin.id ? "green" : "blue"} //highlights green if selected, otherwise default to blue
            onPress={() => setSelectedDestination(pin)} // sets selected pin to state variable
          />
        ))}

        {/* calculate and show directions if user has selected a destination pin */}
        {currentRoute.origin && selectedDestination && (
          <MapViewDirections
            origin={currentRoute.origin}
            destination={selectedDestination}
            apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_KEY || ""}
            strokeWidth={4}
            strokeColor="blue"
          />
        )}
      </MapView>

      {/* Button to interact with coordinate variables */}
      <View style={styles.buttonContainer}>
        <Button
        title={selectedDestination ? `Navigate to ${selectedDestination.name}` : "Tap a pin to begin"}
        disabled={!selectedDestination}
        onPress={shareWithExternalMap}
        />
      </View>
    </View>
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
    flex: 1, justifyContent: 'center', alignItems:'center' }
});
