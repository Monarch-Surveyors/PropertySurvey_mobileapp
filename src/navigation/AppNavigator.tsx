import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import PropertySurveyScreen from '../screens/PropertySurveyScreen';
import {useAuth} from '../context/AuthContext';
import {ORANGE} from '../theme';

export type RootStackParamList = {
  Login: undefined;
  PropertySurvey: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const {isAuthenticated, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {isAuthenticated ? (
        <Stack.Screen name="PropertySurvey" component={PropertySurveyScreen} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});
