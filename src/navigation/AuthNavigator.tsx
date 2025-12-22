import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { SignupScreen } from '../screens/Auth/SignupScreen';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  onLogin: () => void;
  onSignup: () => void;
  onGoogleSignup: () => void;
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({
  onLogin,
  onSignup,
  onGoogleSignup,
}) => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen
            {...props}
            onLogin={onLogin}
            onNavigateToSignup={() => props.navigation.navigate('Signup')}
            onGoogleSignup={onGoogleSignup}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Signup">
        {(props) => (
          <SignupScreen
            {...props}
            onSignup={onSignup}
            onNavigateToLogin={() => props.navigation.navigate('Login')}
            onGoogleSignup={onGoogleSignup}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

