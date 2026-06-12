import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import PropertySurveyScreen from '../screens/PropertySurveyScreen';

export type RootStackParamList = {
  Login: undefined;
  PropertySurvey: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="PropertySurvey" component={PropertySurveyScreen} />
    </Stack.Navigator>
  );
}
