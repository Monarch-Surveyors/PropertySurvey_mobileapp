import React, {useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {Text, Surface, TouchableRipple, Divider} from 'react-native-paper';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useLocation} from '../hooks/useLocation';
import {ORANGE} from '../theme';

const CARD_SIZE = (Dimensions.get('window').width - 48 - 24) / 3;
const {width: W, height: H} = Dimensions.get('window');

type Props = {
  label: string;
  required?: boolean;
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
  onDelete: () => void;
};

export default function ImageCard({
  label,
  required,
  imageUri,
  onImageSelected,
  onDelete,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const {location} = useLocation();

  const formatDate = useCallback(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  }, []);

  const handleTakePhoto = async () => {
    setSheetVisible(false);
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    setProcessing(true);
    const result = await launchCamera({mediaType: 'photo', quality: 0.9});
    setProcessing(false);
    if (result.assets?.[0]?.uri) onImageSelected(result.assets[0].uri);
  };

  const handleChooseGallery = async () => {
    setSheetVisible(false);
    setProcessing(true);
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.9});
    setProcessing(false);
    if (result.assets?.[0]?.uri) onImageSelected(result.assets[0].uri);
  };

  return (
    <>
      <View style={styles.wrapper}>
        {imageUri ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={onDelete}
            hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}>
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
              source={{uri: imageUri}}
              style={styles.image}
              resizeMode="cover"
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
        statusBarTranslucent>
        <View style={styles.previewBg}>
          <Image
            source={{uri: imageUri!}}
            style={styles.previewImg}
            resizeMode="contain"
            onError={(e) => console.log('IMG ERROR:', e.nativeEvent.error, 'URI:', imageUri)}
            onLoad={() => console.log('IMG LOADED OK:', imageUri)}
          />
          <View style={styles.wmBar}>
            <Text style={styles.wmLabel}>{label}</Text>
            <Text style={styles.wmText}>
              {`Lat: ${location.latitude}  Lng: ${location.longitude}`}
            </Text>
            <Text style={styles.wmText}>{`Date: ${formatDate()}`}</Text>
            <Text style={styles.wmText} numberOfLines={1}>
              {location.address}
            </Text>
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
          <Surface style={styles.sheet} elevation={8}>
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
  deleteIcon: {color: '#fff', fontSize: 10, fontWeight: '700'},
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
  placeholder: {alignItems: 'center', justifyContent: 'center', gap: 4},
  cameraIcon: {fontSize: 28, marginBottom: 4},
  addText: {fontSize: 10, color: '#9E9E9E', fontWeight: '500'},
  image: {width: '100%', height: '100%'},
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
  required: {color: '#F44336', fontWeight: '700', fontSize: 12, marginLeft: 1},
  // Preview
  previewBg: {flex: 1, backgroundColor: '#000'},
  previewImg: {width: W, height: H},
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
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  wmText: {color: '#fff', fontSize: 13, fontWeight: '500', lineHeight: 20},
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
  closeText: {color: '#fff', fontSize: 16, fontWeight: '700'},
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
  sheetItem: {paddingVertical: 4},
  sheetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetItemIcon: {fontSize: 22, marginRight: 16, width: 30, textAlign: 'center'},
  sheetItemText: {fontSize: 15, color: '#424242', fontWeight: '500'},
  cancelText: {color: '#F44336'},
});
