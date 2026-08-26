module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@src':        './src',
          '@api':        './src/api',
          '@components': './src/components',
          '@screens':    './src/screens',
          '@navigation': './src/navigation',
          '@context':    './src/context',
          '@theme':      './src/theme',
          '@utils':      './src/utils',
          '@assets':     './assets',
        },
      },
    ],
  ],
};
