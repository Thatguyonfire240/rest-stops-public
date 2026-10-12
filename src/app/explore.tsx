

import { Alert, Button, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFilters } from './_layout';

import { supabase } from '../../services/supabase';

import { useState } from 'react';

export default function SettingsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  // dynamic dark mode
  const isDarkMode = colorScheme === 'dark';

  // import switch states
  const { 
    showOnlyEv, setShowOnlyEv,
    avoidTolls, setAvoidTolls,
    showTrafficData, setShowTrafficData,
    showOnlyWifi, setShowOnlyWifi,
    setSelectedDestination,
    setRouteStats,
    user, session,
    showOnlyFavorites, setShowOnlyFavorites,
   } = useFilters();

   // import tracker state variables
   const [activeAuthView, setActiveAuthView] = useState<'NONE' | 'LOGIN' | 'SIGNUP'>('NONE');
   const [email, setEmail] = useState<string>('');
   const [password, setPassword] = useState<string>('');
   // track password confirmation text
   const [confirmPassword, setConfirmPassword] = useState<string>('');
   const [authLoading, setAuthLoading] = useState<boolean>(false);
   
   const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);

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
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(true);

    if (error)  {
      setAuthLoading(false);
      Alert.alert("Login Failed", error.message);
    } else {
      setActiveAuthView('NONE');
      setEmail('');
      setPassword('');
    }
   };

   // handle sign up and establish new account
   const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) return Alert.alert("Required Fields", "Please complete all fields.");

    if (password !== confirmPassword) {
      return Alert.alert("Password Mismatch", "Your passwords do not match. Please verify and try again.");
    }

    setAuthLoading(true);
    const { error, data } = await supabase.auth.signUp({ email, password });
    setAuthLoading(true);

    if (error) {
      setAuthLoading(false);
      Alert.alert("Registration Failed", error.message);
    } else {
      // collapses screen and cleares cache
      setActiveAuthView('NONE');
      setAuthLoading(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      if (data.session === null) {
      Alert.alert("Registration Success!", "Please check your email inbox to confirm your account creation.");
    }
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
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#f8f9fa' }}>
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        paddingTop: safeAreaInsets.top + 20,
        gap: 16
      }}

      // add dynamic dark mode
      style={isDarkMode && { backgroundColor: '#121212' }}
    >


      {/* account/profile bit */}
      <View style={[styles.card, isDarkMode && { backgroundColor: '#1e1e1e', borderColor: '#333' }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: '#fff' }]}>Account Profile</Text>
        
        {user ? (
          // render profile data stats and sign out
          <View>
            <Text style={[styles.bodyText, isDarkMode && { color: '#bbb'}]}>👋 Welcome back!</Text>
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
            <Text style={[styles.bodyText, isDarkMode && { color: '#bbb' }]}>Sign up or log in to sync settings</Text>

            <View style={styles.authLinkRow}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Sign In"
                  color="#1A53A0"
                  onPress={() => setActiveAuthView('LOGIN')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Create Account"
                  color="#555"
                  onPress={() => setActiveAuthView('SIGNUP')}
                />
              </View>
        </View>
        
      </View>
    )}
  </View>

      

      {/* Navigation Settings */}
      <View style={[styles.card, isDarkMode && { backgroundColor: '#1e1e1e', borderColor: '#333' }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: '#fff' }]}>Navigation Settings</Text>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, !user && { color: '#aaa' }, isDarkMode && { color: '#eee' }]}>⭐ Show Only My Favorites</Text>
          <Switch
            value={showOnlyFavorites}
            // disables automatically if user is anonymous
            disabled={!user}
            onValueChange={() => handlePreferenceChange(setShowOnlyFavorites, showOnlyFavorites)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showOnlyFavorites ? '#1A53A0' : '#f4f3f4'}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, isDarkMode && { color: '#eee' }]}>⚡ Show Only EV Charging Stops</Text>
          <Switch
            value={showOnlyEv}
            onValueChange={() => handlePreferenceChange(setShowOnlyEv, showOnlyEv)}
        
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showOnlyEv ? '#1A53A0' : '#f4f3f4'}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, isDarkMode && { color: '#eee' }]}>📶 Show Only Stops With Wifi</Text>
          <Switch
            value={showOnlyWifi}
            onValueChange={() => handlePreferenceChange(setShowOnlyWifi, showOnlyWifi)}
        
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showOnlyWifi ? '#1A53A0' : '#f4f3f4'}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, isDarkMode && { color: '#eee'}]}>🛣️ Avoid Toll Roads</Text>
          <Switch
            value={avoidTolls}
            onValueChange={() => handlePreferenceChange(setAvoidTolls, avoidTolls)}
          
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={avoidTolls ? '#1A53A0' : '#f4f3f4'}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, isDarkMode && { color: '#eee'}]}>🚗 Display Real-time Active Traffic</Text>
          <Switch
            value={showTrafficData}
            onValueChange={() => handlePreferenceChange(setShowTrafficData, showTrafficData)}
        
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showTrafficData ? '#1A53A0' : '#f4f3f4'}
          />
        </View>

        
      </View>


    </ScrollView>

    {activeAuthView !== 'NONE' && (
      <View style={[styles.authFullScreenModal, isDarkMode && { backgroundColor: '#121212'}, { paddingTop: safeAreaInsets.top + 40 }]}>
        <Text style={[styles.modalTitle, isDarkMode && { color: '#fff' }]}>
          {activeAuthView === 'LOGIN' ? 'Welcome Back!' : 'Join our Journey'}
        </Text>
        <Text style={[styles.modalSubtitle, isDarkMode && { color: '#aaa' }]}>
          {activeAuthView === 'LOGIN' ? 'Sign in to access your cloud-saved settings.' : 'Register an account to cross-sync configurations.'}
        </Text>

        <TextInput
          style={[styles.inputBox, isDarkMode && { backgroundColor: '#222', borderColor: '#444', color: '#fff' }]}
          placeholder="Email Address"
          placeholderTextColor="grey"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={[styles.passwordInputContainer, isDarkMode && { backgroundColor: '#222', borderColor: '#444' }]}>
          <TextInput
            style={[styles.passwordInputBox, isDarkMode && { color: '#fff' }]}
            placeholder="Secure Password"
            placeholderTextColor="grey"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry={!isPasswordVisible}
          />
          <TouchableOpacity
            style={styles.eyeIconWrapper}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Text style={styles.eyeIconText}>{isPasswordVisible ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        </View>

        {activeAuthView === 'SIGNUP' && (
          <View style={[styles.passwordInputContainer, isDarkMode && { backgroundColor: '#222', borderColor: '#444' }]}>
            <TextInput
              style={[styles.passwordInputBox, isDarkMode && { color: '#fff' }]}
              placeholder="Confirm Password"
              placeholderTextColor="grey"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              secureTextEntry={!isPasswordVisible}
            />
            <TouchableOpacity
              style={styles.eyeIconWrapper}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              <Text style={styles.eyeIconText}>{isPasswordVisible ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ gap: 10, marginTop: 12 }}>
          <Button
            title={activeAuthView === 'LOGIN'? 'Log In' : 'Sign Up'}
            color="#1A53A0"
            onPress={async () => {
              if ( activeAuthView === 'LOGIN') await handleSignIn();
              else await handleSignUp();
              // close overlay if auth sucessfull
              if (user) setActiveAuthView('NONE');
            }}
          />
          <Button
            title="Cancel"
            color="#666"
            onPress={() => {
              // clear inputs cleanly upon closing menu frame
              setConfirmPassword('');
              setActiveAuthView('NONE');
            }}
          />
        </View>
      </View>
    )}
    </View>
  );
}





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

    authLinkRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },

    authFullScreenModal: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#f8f9fa',
      padding: 24,
      // force input form card to take whole screen
      zIndex: 100,
    },

    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 4,
    },

    modalSubtitle: {
      fontSize: 14,
      color: '#666',
      marginBottom: 20,
    },

    inputBox: {
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      marginBottom: 12,
      color: '#333'
    },

    passwordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: '#cbd5e1',
      borderRadius: 8,
      marginBottom: 12,
      height: 50,
      color: 'grey'
    },

    passwordInputBox: {
      flex: 1,
      paddingHorizontal: 12,
      fontSize: 14,
      color: '#333',
      height: '100%',
    },

    eyeIconWrapper: {
      paddingHorizontal: 14,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },

    eyeIconText: {
      fontSize: 16,
    },
});