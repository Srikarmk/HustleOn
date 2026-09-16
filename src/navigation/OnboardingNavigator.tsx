import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { WelcomeScreen } from '../screens/Onboarding/WelcomeScreen';
import { FeaturesScreen } from '../screens/Onboarding/FeaturesScreen';
import { UserInfoScreen } from '../screens/Onboarding/UserInfoScreen';
import { GetStartedScreen } from '../screens/Onboarding/GetStartedScreen';

/**
 * Onboarding is split in two around authentication.
 *
 * `IntroNavigator` (Welcome → Features) is marketing only and writes nothing,
 * so it can run before sign-in.
 *
 * `ProfileSetupNavigator` (UserInfo → GetStarted) writes the user profile, and
 * must run *after* sign-in. When it ran before, it bumped the store's
 * `dataUpdatedAt` clock while signed out; logging into an existing account then
 * looked "local newer" to last-write-wins sync, and `push()` deleted every
 * remote row not present in the fresh local state — wiping the account's cloud
 * data on any reinstall-then-login.
 */

export type IntroStackParamList = {
  Welcome: undefined;
  Features: undefined;
};

export type ProfileSetupStackParamList = {
  UserInfo: undefined;
  GetStarted: undefined;
};

const IntroStack = createNativeStackNavigator<IntroStackParamList>();
const ProfileSetupStack = createNativeStackNavigator<ProfileSetupStackParamList>();

const screenOptions = { headerShown: false } as const;

interface IntroNavigatorProps {
  onComplete: () => void;
}

export const IntroNavigator: React.FC<IntroNavigatorProps> = ({ onComplete }) => {
  const WelcomeWrapper = React.useCallback(() => {
    const navigation = useNavigation<any>();
    return <WelcomeScreen onNext={() => navigation.navigate('Features')} />;
  }, []);

  const FeaturesWrapper = React.useCallback(
    () => <FeaturesScreen onNext={onComplete} onSkip={onComplete} />,
    [onComplete]
  );

  return (
    <IntroStack.Navigator screenOptions={screenOptions}>
      <IntroStack.Screen name="Welcome" component={WelcomeWrapper} />
      <IntroStack.Screen name="Features" component={FeaturesWrapper} />
    </IntroStack.Navigator>
  );
};

interface ProfileSetupNavigatorProps {
  onComplete: () => void;
}

export const ProfileSetupNavigator: React.FC<ProfileSetupNavigatorProps> = ({ onComplete }) => {
  const UserInfoWrapper = React.useCallback(() => {
    const navigation = useNavigation<any>();
    return <UserInfoScreen onComplete={() => navigation.navigate('GetStarted')} />;
  }, []);

  const GetStartedWrapper = React.useCallback(
    () => <GetStartedScreen onGetStarted={onComplete} />,
    [onComplete]
  );

  return (
    <ProfileSetupStack.Navigator screenOptions={screenOptions}>
      <ProfileSetupStack.Screen name="UserInfo" component={UserInfoWrapper} />
      <ProfileSetupStack.Screen name="GetStarted" component={GetStartedWrapper} />
    </ProfileSetupStack.Navigator>
  );
};
