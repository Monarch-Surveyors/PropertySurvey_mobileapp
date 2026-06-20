import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  StatusBar,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Text, Surface, TouchableRipple, Divider } from 'react-native-paper';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNFS from 'react-native-fs';
import { ORANGE } from '../theme';
import { LocationData } from '../hooks/useLocation';

const CARD_SIZE = (Dimensions.get('window').width - 48 - 24) / 3;

type Props = {
  label: string;
  required?: boolean;
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
  onDelete: () => void;
  location: LocationData;
};

export default function ImageCard({
  label,
  required,
  imageUri,
  onImageSelected,
  onDelete,
  location,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const {width: previewWidth, height: previewHeight} = useWindowDimensions();

  const compressImageTo100KB = async (uri: string): Promise<string> => {
    let quality = 80;
    const originalSize = await new Promise<{width: number; height: number}>(resolve => {
      Image.getSize(
        uri,
        (width, height) => resolve({width, height}),
        () => resolve({width: 800, height: 800}),
      );
    });
    const getScaledSize = (maxSize: number) => {
      if (originalSize.width >= originalSize.height) {
        return {
          width: maxSize,
          height: Math.max(1, Math.round((originalSize.height / originalSize.width) * maxSize)),
        };
      }
      return {
        width: Math.max(1, Math.round((originalSize.width / originalSize.height) * maxSize)),
        height: maxSize,
      };
    };
    let maxSize = 1000;
    
    while (quality > 5) {
      const {width, height} = getScaledSize(maxSize);
      const compressed = await ImageResizer.createResizedImage(
        uri,
        width,
        height,
        'JPEG',
        quality,
        0,
        undefined,
        false,
        { mode: 'contain', onlyScaleDown: false }
      );
      
      const stats = await RNFS.stat(compressed.uri);
      const fileSizeKB = stats.size / 1024;
      
      if (fileSizeKB <= 100) {
        return compressed.uri;
      }
      
      if (quality > 50) {
        quality -= 10;
      } else if (quality > 20) {
        quality -= 5;
      } else {
        quality -= 2;
        maxSize = Math.max(320, Math.floor(maxSize * 0.9));
      }
    }
    
    const {width, height} = getScaledSize(maxSize);
    const compressed = await ImageResizer.createResizedImage(
      uri,
      width,
      height,
      'JPEG',
      5,
      0,
      undefined,
      false,
      { mode: 'contain', onlyScaleDown: false }
    );
    return compressed.uri;
  };

  const handleTakePhoto = async () => {
    setSheetVisible(false);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos');
          return;
        }
      }

      setProcessing(true);
      const result = await launchCamera({
        mediaType: 'photo',
        saveToPhotos: false,
      });

      if (result.errorMessage) {
        Alert.alert('Camera Error', result.errorMessage);
        return;
      }

      if (result.assets?.[0]?.uri) {
        const compressedUri = await compressImageTo100KB(result.assets[0].uri);
        onImageSelected(compressedUri);
      }
    } catch (error) {
      console.log('Camera Error:', error);
      Alert.alert('Camera Error', 'Unable to take photo. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleChooseGallery = async () => {
    setSheetVisible(false);
    try {
      setProcessing(true);
      const result = await launchImageLibrary({
        mediaType: 'photo',
      });

      if (result.errorMessage) {
        Alert.alert('Gallery Error', result.errorMessage);
        return;
      }

      if (result.assets?.[0]?.uri) {
        const compressedUri = await compressImageTo100KB(result.assets[0].uri);
        onImageSelected(compressedUri);
      }
    } catch (error) {
      console.log('Gallery Error:', error);
      Alert.alert('Gallery Error', 'Unable to choose photo. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <View style={styles.wrapper}>
        {imageUri ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={onDelete}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            if (processing) return;
            imageUri ? setPreviewVisible(true) : setSheetVisible(true);
          }}
          activeOpacity={0.8}>
          {processing ? (
            <View style={styles.placeholder}>
              <ActivityIndicator color={ORANGE} size="small" />
              <Text style={styles.addText}>Processing...</Text>
            </View>
          ) : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.addText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.labelRow}>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>
      </View>

      {/* Full-Screen Preview Modal */}
      <Modal
        visible={previewVisible}
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
        presentationStyle="fullScreen"
        navigationBarTranslucent
        statusBarTranslucent>
        <StatusBar hidden={previewVisible} backgroundColor="#000" translucent />
        <View style={styles.previewBg}>
          <Image
            source={{ uri: imageUri! }}
            style={[
              styles.previewImg,
              {width: previewWidth, height: previewHeight},
            ]}
            resizeMode="cover"
            onError={(e) => console.log('IMG ERROR:', e.nativeEvent.error, 'URI:', imageUri)}
            onLoad={() => console.log('IMG LOADED OK:', imageUri)}
          />
          <View style={styles.wmBar}>
            <Text style={styles.wmLabel}>{label}</Text>
            <Text style={styles.wmText}>
              {`Lat: ${location.latitude}  Lng: ${location.longitude}`}
            </Text>
            {/* <Text style={styles.wmText}>{`Date: ${formatDate()}`}</Text>
            <Text style={styles.wmText} numberOfLines={1}>
              {location.address}
            </Text> */}
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setPreviewVisible(false)}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Bottom Sheet Modal */}
      <Modal
        transparent
        visible={sheetVisible}
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSheetVisible(false)}>
          <Surface style={styles.sheet} elevation={5}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Image Source</Text>
            <Divider />
            <TouchableRipple onPress={handleTakePhoto} style={styles.sheetItem}>
              <View style={styles.sheetItemRow}>
                <Text style={styles.sheetItemIcon}>📸</Text>
                <Text style={styles.sheetItemText}>Take Photo</Text>
              </View>
            </TouchableRipple>
            <Divider />
            <TouchableRipple
              onPress={handleChooseGallery}
              style={styles.sheetItem}>
              <View style={styles.sheetItemRow}>
                <Text style={styles.sheetItemIcon}>🖼️</Text>
                <Text style={styles.sheetItemText}>Choose From Gallery</Text>
              </View>
            </TouchableRipple>
            <Divider />
            <TouchableRipple
              onPress={() => setSheetVisible(false)}
              style={styles.sheetItem}>
              <View style={styles.sheetItemRow}>
                <Text style={styles.sheetItemIcon}>✕</Text>
                <Text style={[styles.sheetItemText, styles.cancelText]}>
                  Cancel
                </Text>
              </View>
            </TouchableRipple>
          </Surface>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_SIZE,
    alignItems: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
    backgroundColor: '#F44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: { color: '#fff', fontSize: 10, fontWeight: '700' },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BDBDBD',
    borderStyle: 'dashed',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  cameraIcon: { fontSize: 28, marginBottom: 4 },
  addText: { fontSize: 10, color: '#9E9E9E', fontWeight: '500' },
  image: { width: '100%', height: '100%' },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 11,
    color: '#424242',
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  required: { color: '#F44336', fontWeight: '700', fontSize: 12, marginLeft: 1 },
  // Preview
  previewBg: { flex: 1, backgroundColor: '#000' },
  previewImg: {},
  wmBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  wmLabel: {
    color: '#f71606',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  wmText: { color: '#fff', fontSize: 19, fontWeight: '500', lineHeight: 20 },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetItem: { paddingVertical: 4 },
  sheetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetItemIcon: { fontSize: 22, marginRight: 16, width: 30, textAlign: 'center' },
  sheetItemText: { fontSize: 15, color: '#424242', fontWeight: '500' },
  cancelText: { color: '#F44336' },
});
