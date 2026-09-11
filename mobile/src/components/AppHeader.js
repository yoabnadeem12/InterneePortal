import React from 'react';
import {StyleSheet} from 'react-native';
import {Appbar, Text} from 'react-native-paper';

export default function AppHeader({title, navigation, showBack = false, onBack}) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      try {
        navigation.navigate('InternDash');
      } catch (e) {
        navigation.goBack();
      }
    }
  };

  return (
    <Appbar.Header style={styles.header} elevated>
      {showBack ? (
        <Appbar.BackAction onPress={handleBack} color="#1C1917" />
      ) : (
        <Appbar.Action
          icon="menu"
          color="#1C1917"
          onPress={() => navigation?.openDrawer?.()}
        />
      )}
      <Appbar.Content
        title={
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        }
      />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE2D5',
  },
  title: {
    color: '#1C1917',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
