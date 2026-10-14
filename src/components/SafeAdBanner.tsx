import { Text, View } from 'react-native';

interface SafeAdBannerProps {
  isPremiumUser: boolean;
  isDarkMode: boolean;
  safeAreaTop: number;
}

// 🚀 FIXED: Completely clean fallback file that doesn't reference any missing libraries directly!
export default function SafeAdBanner({ isPremiumUser, isDarkMode, safeAreaTop }: SafeAdBannerProps) {
  if (isPremiumUser) return null;

  return (
    <View style={[{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
      justifyContent: 'center', 
      alignItems: 'center', 
      zIndex: 99, 
      borderBottomWidth: 1, 
      borderBottomColor: isDarkMode ? '#333' : '#e2e8f0', 
      paddingBottom: 4 
    }, { paddingTop: safeAreaTop + 4 }]}>
      <View style={{
        width: '90%',
        height: 44,
        backgroundColor: isDarkMode ? '#222' : '#e2e8f0',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: isDarkMode ? '#444' : '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4
      }}>
        <Text style={{ 
          fontSize: 11, 
          fontWeight: 'bold', 
          color: isDarkMode ? '#aaa' : '#64748b',
          letterSpacing: 1
        }}>
          📢 GOOGLE ADMOB BANNER INCOME SLOT • (EXPO GO MOCK)
        </Text>
      </View>
    </View>
  );
}
