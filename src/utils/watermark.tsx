import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import ViewShot, {captureRef, type ViewShotRef} from 'react-native-view-shot';
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
  viewRef: React.RefObject<ViewShotRef>;
  size: number;
};

export function WatermarkView({
  imageUri,
  location,
  viewRef,
  size,
}: WatermarkViewProps) {
  const lines = [
    `Lat: ${location.latitude}  Lng: ${location.longitude}`,
    `Date: ${formatDate()}`,
    location.address,
  ];

  return (
    <ViewShot
      ref={viewRef}
      options={{
        format: 'jpg',
        quality: 0.8,
      }}
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
  viewRef: React.RefObject<ViewShotRef>,
): Promise<string> {
  try {
    if (!viewRef.current) {
      throw new Error('ViewShot reference is null');
    }

    const uri = await captureRef(viewRef.current, {
      format: 'jpg',
      quality: 0.8,
    });

    const dest = `${RNFS.CachesDirectoryPath}/wm_${Date.now()}.jpg`;

    // Remove file if already exists
    const exists = await RNFS.exists(dest);
    if (exists) {
      await RNFS.unlink(dest);
    }

    await RNFS.copyFile(uri, dest);

    // Cleanup temporary ViewShot file
    try {
      const tempPath = uri.replace('file://', '');

      if (await RNFS.exists(tempPath)) {
        await RNFS.unlink(tempPath);
      }
    } catch (cleanupError) {
      console.log('Temp file cleanup failed:', cleanupError);
    }

    return `file://${dest}`;
  } catch (error) {
    console.error('Watermark save failed:', error);
    throw error;
  }
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
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
});
