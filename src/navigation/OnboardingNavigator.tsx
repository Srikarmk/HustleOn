import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { WelcomeScreen } from '../screens/Onboarding/WelcomeScreen';
import { FeaturesScreen } from '../screens/Onboarding/FeaturesScreen';
import { UserInfoScreen } from '../screens/Onboarding/UserInfoScreen';
import { GetStartedScreen } from '../screens/Onboarding/GetStartedScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Features: undefined;
  UserInfo: undefined;
  GetStarted: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

// Wrapper components using useNavigation hook
const WelcomeScreenWrapper: React.FC = () => {
  const navigation = useNavigation<any>();
  return <WelcomeScreen onNext={() => navigation.navigate('Features')} />;
};

const FeaturesScreenWrapper: React.FC = () => {
  const navigation = useNavigation<any>();
  return (
    <FeaturesScreen
      onNext={() => navigation.navigate('UserInfo')}
      onSkip={() => navigation.navigate('UserInfo')}
    />
  );
};

const UserInfoScreenWrapper: React.FC = () => {
  const navigation = useNavigation<any>();
  return (
    <UserInfoScreen
      onComplete={() => {
        // Navigate to GetStarted after saving user info
        navigation.navigate('GetStarted');
      }}
    />
  );
};

// Create a factory function for GetStarted screen
const createGetStartedScreen = (onComplete: () => void) => {
  return () => <GetStartedScreen onGetStarted={onComplete} />;
};

export const OnboardingNavigator: React.FC<OnboardingNavigatorProps> = ({ onComplete }) => {
  const GetStartedScreenComponent = React.useMemo(
    () => createGetStartedScreen(onComplete),
    [onComplete]
  );

  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreenWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Features" 
        component={FeaturesScreenWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UserInfo" 
        component={UserInfoScreenWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="GetStarted" 
        component={GetStartedScreenComponent}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

