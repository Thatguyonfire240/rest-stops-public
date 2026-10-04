import { useState } from 'react';
import { Button, Linking, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

const GOOGLE_MAPS_API_KEY = 'API_KEY_HERE';

// coordinate structure
interface LocationCoordinates {
  latitude: number;
  longitude: number;
  name: string;
}

// container structure for coordinates
interface RouteContainer {
  origin: LocationCoordinates;
  destination: LocationCoordinates;
}

export default function App() {
  // store coordinates in a single variable
  const [currentRoute, setCurrentRoute] = useState<RouteContainer>({
    origin: {
      latitude: 30.2672, //Downtown Austin, TX
      longitude: -97.7431,
      name: "Downtown Austin, TX",
    },
    destination: {
      latitude: 32.5191, //Andrews County Northbound, TX
      longitude: -102.6121,
      name: "Andrews County Northbound, TX",
    },
  });

  // function to share same coordinates with external launch
  const shareWithExternalMap = () => {
    const { origin, destination } = currentRoute;
    const url = `https://google.com{origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;

    // launch external map from URL
    Linking.openURL(url);
  };

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
          apikey={"API_KEY_HERE"}
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
});
