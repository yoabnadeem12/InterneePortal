import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Appbar, Text} from 'react-native-paper';

export default function AppHeader({title, navigation, showBack = false, onBack}) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      // Fallback if no history to go back to
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
        <Appbar.BackAction onPress={handleBack} color="#E8EAF6" />
      ) : (
        <Appbar.Action
          icon="menu"
          color="#E8EAF6"
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
    backgroundColor: '#13152A',
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C45',
  },
  title: {
    color: '#E8EAF6',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
