/*
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
*/

import { ActivityIndicator, Alert, Button, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFilters } from './_layout';

import { supabase } from '../../services/supabase';

import { useState } from 'react';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();

  


/*
  // placeholder for database auth later for user login
  const userLoggedIn = false;
  */

  // import switch states
  const { 
    showOnlyEv, setShowOnlyEv,
    avoidTolls, setAvoidTolls,
    showTrafficData, setShowTrafficData,
    showOnlyWifi, setShowOnlyWifi,
    setSelectedDestination,
    setRouteStats,
    user, session,
   } = useFilters();

   // import tracker state variables
   const [email, setEmail] = useState<string>('');
   const [password, setPassword] = useState<string>('');
   const [authLoading, setAuthLoading] = useState<boolean>(false);

   const BottomTabInset = 49;
   const Spacing = { three: 12, six: 24, four: 16 };
   const insets = { ...safeAreaInsets, bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three };

   const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top + 20,
      paddingLeft: insets.left + 20,
      paddingRight: insets.right + 20,
      paddingBottom: insets.bottom
    },
    ios: {
      paddingTop: insets.top + 20,
      paddingLeft: insets.left + 20,
      paddingRight: insets.right + 20,
      paddingBottom: insets.bottom
    },
    web : {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four
    },
   });

   // match sign in with user records in database
   const handleSignIn = async () => {
    if (!email || !password) return Alert.alert("Required Fields", "Please complete all fields.");
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) Alert.alert("Login Failed", error.message);
    else { setEmail(''); setPassword(''); }
   };

   // handle sign up and establish new account
   const handleSignUp = async () => {
    if (!email || !password) return Alert.alert("Required Fields", "Please complete all fields.");
    setAuthLoading(true);
    const { error, data } = await supabase.auth.signUp({ email, password });
    setAuthLoading(false);
    if (error) Alert.alert("Registration Failed", error.message);
    else if (data.session === null) {
      Alert.alert("Registration Success!", "Please check your email inbox to confirm your account creation.");
    }
   };

   // disconnect user session tokens safely
   const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Sign Out Error", error.message);
   };

   const handlePreferenceChange = (stateSetter: (value: boolean) => void, currentVal: boolean) => {
    setSelectedDestination(null);
    setRouteStats(null);
    stateSetter(!currentVal);
   };


  // pass styles to container
  return (
    <ScrollView
      style={styles.container}
      // add spacing
      contentContainerStyle={contentPlatformStyle}
    >
      {/* account/profile bit */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Profile</Text>
        
        {user ? (
          // render profile data stats and sign out
          <View>
            <Text style={styles.bodyText}>👋 Welcome back!</Text>
            <Text style={styles.emailTextBadge}>{user.email}</Text>
            <View style={{ marginTop: 12 }}>
              <Button
                title="Sign Out of Profile"
                color="#d9534f"
                onPress={handleSignOut} />
            </View>
          </View>
        ) : (
          // logged out view
          <View style={{ gap: 10 }}>
            <Text style={styles.bodyText}>Sign up or log in to sync settings</Text>

            <TextInput
              style={styles.inputBox}
              placeholder="Email Address"
              placeholderTextColor="grey"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.inputBox}
              placeholder="Secure Password"
              placeholderTextColor="grey"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              secureTextEntry={true}
            />

            {authLoading ? (
              <ActivityIndicator
                size="small"
                color="#1A53A0"
                style={{ marginVertical: 8 }}
              />
        ) : (
          <View style={styles.authButtonRow}>
            <View style={{ flex: 1 }}>
              <Button
                title="Log In"
                color="#1A53A0"
                onPress={handleSignIn} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Sign Up"
                color="#555"
                onPress={handleSignUp} />
            </View>
          </View>
        )}
        </View>
        )}
      </View>

{/*
        <View style={styles.buttonWrapper}>
          <Button
            title={userLoggedIn ? "Sign Out of Account" : "Sign In / Register"}
            color={userLoggedIn ? "#d9534f" : "#1A53A0"}
            onPress={handleAccountAction}
          />
        </View>
        */}
      

      {/* Navigation Settings */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Navigation Settings</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>⚡ Show Only EV Charging Stops</Text>
          <Switch
            value={showOnlyEv}
            onValueChange={() => handlePreferenceChange(setShowOnlyEv, showOnlyEv)}
        
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showOnlyEv ? '#1A53A0' : '#f4f3f4'}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>📶 Show Only Stops With Wifi</Text>
          <Switch
            value={showOnlyWifi}
            onValueChange={() => handlePreferenceChange(setShowOnlyWifi, showOnlyWifi)}
        
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showOnlyWifi ? '#1A53A0' : '#f4f3f4'}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>🛣️ Avoid Toll Roads</Text>
          <Switch
            value={avoidTolls}
            onValueChange={() => handlePreferenceChange(setAvoidTolls, avoidTolls)}
          
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={avoidTolls ? '#1A53A0' : '#f4f3f4'}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>🚗 Display Real-time Active Traffic</Text>
          <Switch
            value={showTrafficData}
            onValueChange={() => handlePreferenceChange(setShowTrafficData, showTrafficData)}
        
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showTrafficData ? '#1A53A0' : '#f4f3f4'}
          />
        </View>

        
      </View>


    </ScrollView>
  );
}
  /*
  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Explore</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            This starter app includes example{'\n'}code to help you get started.
          </ThemedText>

          <ExternalLink href="https://docs.expo.dev" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.linkButton}>
                <ThemedText type="link">Expo documentation</ThemedText>
                <SymbolView
                  tintColor={theme.text}
                  name={{ ios: 'arrow.up.right.square', android: 'link', web: 'link' }}
                  size={12}
                />
              </ThemedView>
            </Pressable>
          </ExternalLink>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          <Collapsible title="File-based routing">
            <ThemedText type="small">
              This app has two screens: <ThemedText type="code">src/app/index.tsx</ThemedText> and{' '}
              <ThemedText type="code">src/app/explore.tsx</ThemedText>
            </ThemedText>
            <ThemedText type="small">
              The layout file in <ThemedText type="code">src/app/_layout.tsx</ThemedText> sets up
              the tab navigator.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/router/introduction">
              <ThemedText type="linkPrimary">Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Android, iOS, and web support">
            <ThemedView type="backgroundElement" style={styles.collapsibleContent}>
              <ThemedText type="small">
                You can open this project on Android, iOS, and the web. To open the web version,
                press <ThemedText type="smallBold">w</ThemedText> in the terminal running this
                project.
              </ThemedText>
              <Image
                source={require('@/assets/images/tutorial-web.png')}
                style={styles.imageTutorial}
              />
            </ThemedView>
          </Collapsible>

          <Collapsible title="Images">
            <ThemedText type="small">
              For static images, you can use the <ThemedText type="code">@2x</ThemedText> and{' '}
              <ThemedText type="code">@3x</ThemedText> suffixes to provide files for different
              screen densities.
            </ThemedText>
            <Image source={require('@/assets/images/react-logo.png')} style={styles.imageReact} />
            <ExternalLink href="https://reactnative.dev/docs/images">
              <ThemedText type="linkPrimary">Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Light and dark mode components">
            <ThemedText type="small">
              This template has light and dark mode support. The{' '}
              <ThemedText type="code">useColorScheme()</ThemedText> hook lets you inspect what the
              user&apos;s current color scheme is, and so you can adjust UI colors accordingly.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
              <ThemedText type="linkPrimary">Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Animations">
            <ThemedText type="small">
              This template includes an example of an animated component. The{' '}
              <ThemedText type="code">src/components/ui/collapsible.tsx</ThemedText> component uses
              the powerful <ThemedText type="code">react-native-reanimated</ThemedText> library to
              animate opening this hint.
            </ThemedText>
          </Collapsible>
        </ThemedView>
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );

  */


/*
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.one,
    alignItems: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  collapsibleContent: {
    alignItems: 'center',
  },
  imageTutorial: {
    width: '100%',
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
});

*/

// stylesheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },

  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    // uniform vertical cushions
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 8
    },

    bodyText: {
      fontSize: 14,
      color: '#666',
      lineHeight: 20,
      marginBottom: 12
    },

    buttonWrapper: {
      marginTop: 4
    },

    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },

    rowLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: '#444'
    },

    inputBox: {
      backgroundColor: '#f1f5f9',
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      fontSize: 14,
      color: '#333',
    },

    authButtonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 6,
    },

    emailTextBadge: {
      fontSize: 15,
      fontWeight: '600',
      color: '1A53A0',
      backgroundColor: '#edf2f7',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
});