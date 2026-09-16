// Pin the timezone so date behaviour is deterministic across machines and CI.
// A UTC-offset zone that observes DST is deliberate: it is exactly where the
// "stored in UTC, read back in local time" bug class shows up.
process.env.TZ = 'America/New_York';

// Mock AsyncStorage with the library's official in-memory jest mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
