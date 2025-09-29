import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import ImageDetailScreen from './screens/ImageDetailScreen';
import UploadScreen from './screens/UploadScreen';
import SearchScreen from './screens/SearchScreen';
import RecycleBinScreen from './screens/RecycleBinScreen';
import FaceGroupView from './screens/FaceGroupView';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { useEffect, useCallback, useState } from 'react';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { View, Image, StyleSheet } from 'react-native';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

export default function App() {
    const [appIsReady, setAppIsReady] = useState(false);
useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);


  if (!appIsReady) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/splash.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
  name="Login"
  component={LoginScreen}
  options={{
    title: 'Login',
    headerStyle: { backgroundColor: '#11001C' },
    headerTintColor: '#F6CEFC',
    headerTitleStyle: { fontWeight: 'bold' },
  }}
/>

        <Stack.Screen name="Register" component={RegisterScreen} options={{
    title: 'Register',
    headerStyle: { backgroundColor: '#11001C' },
    headerTintColor: '#F6CEFC',
    headerTitleStyle: { fontWeight: 'bold' },
  }}/>
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ImageDetail" component={ImageDetailScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Upload" component={UploadScreen} options={{
    title: 'Upload',
    headerStyle: { backgroundColor: '#11001C' },
    headerTintColor: '#F6CEFC',
    headerTitleStyle: { fontWeight: 'bold' },
  }}/>
        <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }}/> 
        <Stack.Screen name="RecycleBin" component={RecycleBinScreen} options={{
    title: 'Recycle Bin',
    headerStyle: { backgroundColor: '#11001C' },
    headerTintColor: '#F6CEFC',
    headerTitleStyle: { fontWeight: 'bold' },
  }}/>
        <Stack.Screen name="FaceGroupView" component={FaceGroupView} options={{
    title: '',
    headerStyle: { backgroundColor: '#11001C' },
    headerTintColor: '#F6CEFC',
    headerTitleStyle: { fontWeight: 'bold' },
  }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#11001C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: 200,
    height: 200,
  },
});