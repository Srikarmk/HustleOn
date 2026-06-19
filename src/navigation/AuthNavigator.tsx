import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { SignupScreen } from '../screens/Auth/SignupScreen';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen onNavigateToSignup={() => props.navigation.navigate('Signup')} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Signup">
        {(props) => (
          <SignupScreen onNavigateToLogin={() => props.navigation.navigate('Login')} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
