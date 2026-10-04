import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert, Button, Linking, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';


// coordinate structure
interface LocationCoordinates {
  latitude: number;
  longitude: number;
  name: string;
}

// container structure for coordinates
interface RouteContainer {
  origin: LocationCoordinates | null;
  destination: LocationCoordinates;
}

export default function App() {
  // store coordinates in a single variable
  const [currentRoute, setCurrentRoute] = useState<RouteContainer>({
    origin: null,
    destination: {
      latitude: 32.5191, //Andrews County Northbound, TX
      longitude: -102.6121,
      name: "Andrews County Northbound, TX",
    },
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
        origin: { latitude: 30.2672, longitude: -97.7431, name: "Downtown Austin, TX" }
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
    const { origin, destination } = currentRoute;

    if (!origin) {
      Alert.alert("Please wait", "Still obtaining your current location.");
      return;
    }

    const url = `https://google.com{origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;

    // launch external map from URL
    Linking.openURL(url).catch(err => console.error("An error occurred", err));
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
        latitude: (currentRoute.origin.latitude + currentRoute.destination.latitude) /2,
        longitude: (currentRoute.origin.longitude + currentRoute.destination.longitude) /2,
        latitudeDelta: 0.422,
        longitudeDelta: 0.368,}} showsUserLocation={true} showsIndoors={false} showsTraffic={true}
      >
        {/* render physical pins from state variable */}
        <Marker coordinate={currentRoute.origin} title={currentRoute.origin.name} />
        <Marker coordinate={currentRoute.destination} title={currentRoute.destination.name} />

        <MapViewDirections
          origin={currentRoute.origin}
          destination={currentRoute.destination}
          apikey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
          strokeWidth={4}
          strokeColor="blue"
        />
      </MapView>

      {/* Button to interact with coordinate variables */}
      <View style={styles.buttonContainer}>
        <Button title="Open in Google Maps" onPress={shareWithExternalMap} />
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
    bottom: 20,
    left: 20,
    right: 20,
  },
  center: {
    flex: 1, justifyContent: 'center', alignItems:'center' }
});
