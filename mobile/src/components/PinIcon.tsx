import { StyleSheet, View } from 'react-native';

type Props = {
  color: string;
  size?: number;
  outline?: string;
};

export default function PinIcon({ color, size = 18, outline = '#fff' }: Props) {
  const s = size;
  const piece = { backgroundColor: color, borderColor: outline, borderWidth: Math.max(1, s * 0.06) };

  return (
    <View style={[styles.box, { width: s, height: s }]}>
      <View style={{ alignItems: 'center', transform: [{ rotate: '45deg' }] }}>
        <View style={[piece, { width: s * 0.42, height: s * 0.16, borderRadius: s * 0.05 }]} />
        <View style={[piece, { width: s * 0.28, height: s * 0.26, marginTop: -1, borderTopWidth: 0 }]} />
        <View style={[piece, { width: s * 0.62, height: s * 0.14, marginTop: -1, borderRadius: s * 0.05 }]} />
        <View style={{ width: Math.max(1.5, s * 0.08), height: s * 0.3, backgroundColor: outline }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
