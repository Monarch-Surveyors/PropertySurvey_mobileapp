import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import ViewShot, {captureRef} from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import {LocationData} from '../hooks/useLocation';

function formatDate(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

type WatermarkViewProps = {
  imageUri: string;
  location: LocationData;
  viewRef: React.RefObject<ViewShot>;
  size: number;
};

export function WatermarkView({imageUri, location, viewRef, size}: WatermarkViewProps) {
  const lines = [
    `Lat: ${location.latitude}  Lng: ${location.longitude}`,
    `Date: ${formatDate()}`,
    location.address,
  ];

  return (
    <ViewShot
      ref={viewRef}
      options={{format: 'jpg', quality: 0.92}}
      style={[styles.container, {width: size, height: size}]}>
      <Image
        source={{uri: imageUri}}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.watermarkBar}>
        {lines.map((line, i) => (
          <Text key={i} style={styles.watermarkText} numberOfLines={1}>
            {line}
          </Text>
        ))}
      </View>
    </ViewShot>
  );
}

export async function saveWatermarkedImage(
  viewRef: React.RefObject<ViewShot>,
): Promise<string> {
  const uri = await captureRef(viewRef, {format: 'jpg', quality: 0.92});
  const dest = `${RNFS.CachesDirectoryPath}/wm_${Date.now()}.jpg`;
  await RNFS.copyFile(uri, dest);
  return `file://${dest}`;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  watermarkBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 16,
  },
});
