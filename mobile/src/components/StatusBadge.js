import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text} from 'react-native-paper';
import {getStatusColor} from '../theme/theme';

export default function StatusBadge({status, size = 'sm'}) {
  const color = getStatusColor(status);
  const isLg  = size === 'lg';

  return (
    <View style={[styles.badge, {borderColor: color, backgroundColor: color + '22'}]}>
      <Text style={[styles.text, {color}, isLg && styles.textLg]}>
        {status ?? 'Unknown'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textLg: {
    fontSize: 13,
  },
});
