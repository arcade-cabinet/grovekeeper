/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)/|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-reanimated|three)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  collectCoverageFrom: [
    "game/**/*.{ts,tsx}",
    "!game/**/*.d.ts",
    "!game/**/index.ts",
  ],
};
