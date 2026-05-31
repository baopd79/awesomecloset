import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { T } from '@/lib/theme';

// Hanger logo: black square with white hanger SVG path
// Matches BrandMark in design_handoff_awesomecloset/app-auth.jsx
interface Props {
  size?: number;
}

export function BrandMark({ size = 56 }: Props) {
  const iconSize = size * 0.55;
  const borderRadius = size * 0.36;

  return (
    <View style={[styles.box, { width: size, height: size, borderRadius }, T.shadowLg]}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
        <Path
          d="M12 4a2 2 0 00-1 3.7c.6.3 1 .8 1 1.5L3.5 14c-1 .6-1.5 1.3-1.5 2 0 1 .9 1.5 2 1.5h16c1.1 0 2-.5 2-1.5 0-.7-.5-1.4-1.5-2L13 9.2"
          fill="none"
          stroke="#FBF8F2"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: T.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
