module.exports = {
  expo: {
    name: "rest-stops",
    slug: "rest-stops",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "reststops",
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/expo.icon",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Allow $(PRODUCT_NAME) to access your location while you are using the app.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Allow $(PRODUCT_NAME) to access your location to show nearby rest stops.",
        NSLocationAlwaysUsageDescription: "Allow $(PRODUCT_NAME) to access your location while you are not using the app.",
        UIBackgroundModes: ["location"]
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false,
      package: "com.thatguyonfire240.reststops",
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION"
      ]
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#208AEF",
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 76
        }
      ],
      [
        "react-native-maps",
        {
          
          "androidGoogleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      ],
      [
        "react-native-permissions/app.plugin.js",
        {
          "permissions": [
            "android.permission.ACCESS_COARSE_LOCATION",
            "android.permission.ACCESS_FINE_LOCATION",
            "android.permission.ACCESS_BACKGROUND_LOCATION"
          ]
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "2e73c3b4-d1b5-4414-b525-a85323fdb6dd"
      }
    },
    owner: "thatguyonfire240"
  }
};
