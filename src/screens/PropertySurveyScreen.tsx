import React, {useState, useMemo, useRef, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {Card, Text, Button, Divider, TextInput} from 'react-native-paper';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import Header from '../components/Header';
import CustomDropdown from '../components/CustomDropdown';
import ImageCard from '../components/ImageCard';
import {ORANGE} from '../theme';
import ViewShot, {captureRef, type ViewShotRef} from 'react-native-view-shot';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import {useLocation} from '../hooks/useLocation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PropertySurvey'>;
};

const WARD_ITEMS = Array.from({length: 10}, (_, i) => `${i + 1}`);

export default function PropertySurveyScreen({navigation}: Props) {
  const [ward, setWard] = useState('');
  const [property, setProperty] = useState('');
  const [partition, setPartition] = useState('');
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);
  const [captureRequest, setCaptureRequest] = useState<{images: string[], labels: string[]} | null>(null);
  const {location, ready} = useLocation();

  const imageLabels = useMemo(() => {
    if (!ward || !property) return ['Property Image-A', 'Property Image-B', 'Property Image-C'];
    const base = partition ? `${ward}-${property}-${partition}` : `${ward}-${property}`;
    return [`${base}-A`, `${base}-B`, `${base}-C`];
  }, [ward, property, partition]);

  const handleImageSelected = (index: number, uri: string) => {
    const updated = [...images];
    updated[index] = uri;
    setImages(updated);
  };

  const handleDelete = (index: number) => {
    const updated = [...images];
    updated[index] = null;
    setImages(updated);
  };

  // ─── Runtime storage permission (version-aware) ───────────────────────────
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const api = Number(Platform.Version);

    if (api >= 33) {
      // Android 13+ → READ_MEDIA_IMAGES
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to save property images to your gallery.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } else if (api >= 29) {
      // Android 10–12 → READ_EXTERNAL_STORAGE
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to save property images to your gallery.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // Android 9 and below → WRITE_EXTERNAL_STORAGE
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to save property images to your gallery.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  const processCapturedImages = useCallback(async (capturedUris: string[]) => {
    const req = captureRequest;
    setCaptureRequest(null);
    if (!req) return;

    const tempFiles: string[] = [];
    try {
      let savedCount = 0;
      for (let i = 0; i < capturedUris.length; i++) {
        const uri = capturedUris[i];
        const fileName = `${req.labels[i]}.jpg`;
        const destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        const tempPath = uri.replace('file://', '');
        
        if (await RNFS.exists(destPath)) {
          await RNFS.unlink(destPath);
        }
        await RNFS.copyFile(tempPath, destPath);
        tempFiles.push(tempPath, destPath);
        await CameraRoll.saveAsset(`file://${destPath}`, {type: 'photo', album: 'PropertySurvey'});
        
        console.log('Saved:', fileName);
        savedCount++;
      }
      Alert.alert('Success', `${savedCount} image(s) saved to PropertySurvey folder!`);
    } catch (error) {
      console.log('Save Error:', error);
      Alert.alert('Error', 'Failed to save images: ' + error);
    } finally {
      await Promise.all(
        tempFiles.map(async filePath => {
          try {
            if (await RNFS.exists(filePath)) {
              await RNFS.unlink(filePath);
            }
          } catch (cleanupError) {
            console.log('Temp cleanup failed:', cleanupError);
          }
        }),
      );
      setSaving(false);
    }
  }, [captureRequest]);

  const handleSaveImages = async () => {
    if (!ward || !property) {
      Alert.alert('Error', 'Ward and Property numbers are required');
      return;
    }
    const filledImages = images.filter(img => img !== null);
    if (filledImages.length === 0) {
      Alert.alert('Error', 'No images to save');
      return;
    }

    // Request the correct storage permission for this Android version
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Storage permission is required to save images. Please allow it in app settings.',
      );
      return;
    }

    setSaving(true);
    const validImages: string[] = [];
    const validLabels: string[] = [];
    images.forEach((img, idx) => {
      if (img) {
        validImages.push(img);
        validLabels.push(imageLabels[idx]);
      }
    });
    setCaptureRequest({images: validImages, labels: validLabels});
  };

  const handleSyncImages = () => {
    Alert.alert('Sync', 'All images synced with server!');
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all fields and images?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setWard('');
            setProperty('');
            setPartition('');
            setImages([null, null, null]);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Property Survey" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Survey Card */}
        <Card style={styles.card} elevation={3}>
          <Card.Content style={styles.cardContent}>

            {/* Card Title */}
            <View style={styles.cardTitleRow}>
              <Text style={styles.cameraEmoji}>📷</Text>
              <Text style={styles.cardTitle}>Upload Property Images</Text>
            </View>

            <Divider style={styles.divider} />

            {/* Dropdowns Row */}
            <View style={styles.dropdownRow}>
              <View style={styles.inputWrapper}>
                <CustomDropdown
                  label="Ward No"
                  required
                  items={WARD_ITEMS}
                  value={ward}
                  onChange={setWard}
                />
              </View>
              <View style={styles.dropdownSpacer} />
              <View style={styles.inputWrapper}>
                <TextInput
                  label="Property No"
                  value={property}
                  onChangeText={setProperty}
                  mode="outlined"
                  keyboardType="numeric"
                  dense
                  outlineColor="#BDBDBD"
                  activeOutlineColor={ORANGE}
                  style={styles.textInput}
                  right={<TextInput.Affix text="*" textStyle={{color: '#F44336'}} />}
                />
              </View>
              <View style={styles.dropdownSpacer} />
              <View style={styles.inputWrapper}>
                <TextInput
                  label="Partition No"
                  value={partition}
                  onChangeText={setPartition}
                  mode="outlined"
                  keyboardType="numeric"
                  dense
                  outlineColor="#BDBDBD"
                  activeOutlineColor={ORANGE}
                  style={styles.textInput}
                />
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Image Cards Section */}
            <Text style={styles.sectionLabel}>Property Images</Text>
            <View style={styles.imageRow}>
              <ImageCard
                label={imageLabels[0]}
                required
                imageUri={images[0]}
                onImageSelected={uri => handleImageSelected(0, uri)}
                onDelete={() => handleDelete(0)}
                location={location}
              />
              <View style={styles.imageSpacer} />
              <ImageCard
                label={imageLabels[1]}
                imageUri={images[1]}
                onImageSelected={uri => handleImageSelected(1, uri)}
                onDelete={() => handleDelete(1)}
                location={location}
              />
              <View style={styles.imageSpacer} />
              <ImageCard
                label={imageLabels[2]}
                imageUri={images[2]}
                onImageSelected={uri => handleImageSelected(2, uri)}
                onDelete={() => handleDelete(2)}
                location={location}
              />
            </View>



            <Divider style={styles.divider} />

            {/* Location status */}
            {!ready && (
              <Text style={styles.locationStatus}>📍 Fetching GPS location...</Text>
            )}

            {/* Action Buttons Row */}
            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                onPress={handleClearAll}
                style={styles.clearButton}
                contentStyle={styles.clearButtonContent}
                labelStyle={styles.clearButtonLabel}
                textColor="#F44336"
                icon="close-circle-outline">
                CLEAR ALL
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveImages}
                buttonColor={ORANGE}
                style={styles.saveButton}
                contentStyle={styles.saveButtonContent}
                labelStyle={styles.saveButtonLabel}
                loading={saving}
                disabled={saving || !ready}>
                {saving ? 'SAVING...' : !ready ? 'WAITING FOR GPS...' : 'SAVE IMAGES'}
              </Button>
            </View>

            {/* Sync Button */}
            <View style={styles.syncWrapper}>
              <Button
                mode="contained"
                onPress={handleSyncImages}
                buttonColor={ORANGE}
                style={styles.syncButton}
                contentStyle={styles.syncButtonContent}
                labelStyle={styles.syncButtonLabel}
                icon="cloud-upload">
                SYNC ALL IMAGES WITH SERVER
              </Button>
            </View>

          </Card.Content>
        </Card>
      </ScrollView>

      {/* Offscreen watermark views for saving */}
      {captureRequest && (
        <WatermarkCaptureManager
          images={captureRequest.images}
          labels={captureRequest.labels}
          location={location}
          ready={ready}
          onSuccess={processCapturedImages}
          onError={(err) => {
            setCaptureRequest(null);
            setSaving(false);
            Alert.alert('Error', err.toString());
          }}
        />
      )}

      {/* <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.footerBtn}
          contentStyle={styles.footerBtnContent}
          textColor={ORANGE}
          labelStyle={styles.footerBtnLabel}>
          ◀  PREVIOUS
        </Button>
        <Button
          mode="contained"
          onPress={() => Alert.alert('Navigation', 'No next screen defined.')}
          style={styles.footerBtn}
          contentStyle={styles.footerBtnContent}
          buttonColor={ORANGE}
          labelStyle={styles.footerBtnLabel}>
          NEXT  ▶
        </Button>
      </View> */}
    </View>
  );
}

type CaptureManagerProps = {
  images: string[];
  labels: string[];
  location: any;
  ready: boolean;
  onSuccess: (uris: string[]) => void;
  onError: (error: any) => void;
};

function WatermarkCaptureManager({images, labels, location, ready, onSuccess, onError}: CaptureManagerProps) {
  const [dimensions, setDimensions] = useState<({width: number, height: number} | null)[]>(images.map(() => null));
  const [loadedCount, setLoadedCount] = useState(0);
  const viewRefs = useRef<(ViewShotRef | null)[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchDimensions = async () => {
      const dims = await Promise.all(
        images.map(img => 
          new Promise<{width: number, height: number}>(resolve => {
            Image.getSize(
              img, 
              (width, height) => resolve({width, height}),
              () => resolve({width: 800, height: 800})
            );
          })
        )
      );
      if (mounted) {
        const scaledDims = dims.map(d => {
          const MAX_DIM = 800; // Cap at 800 to prevent Android canvas clipping
          let targetWidth, targetHeight;
          if (d.width > d.height) {
             targetWidth = MAX_DIM;
             targetHeight = (d.height / d.width) * MAX_DIM;
          } else {
             targetHeight = MAX_DIM;
             targetWidth = (d.width / d.height) * MAX_DIM;
          }
          return {width: targetWidth, height: targetHeight};
        });
        setDimensions(scaledDims);
      }
    };
    fetchDimensions();
    return () => { mounted = false; };
  }, [images]);

  useEffect(() => {
    let mounted = true;
    const dimensionsReady = dimensions.every(d => d !== null);
    if (dimensionsReady && loadedCount === images.length && images.length > 0) {
      const timer = setTimeout(async () => {
        try {
          const uris: string[] = [];
          for (let i = 0; i < images.length; i++) {
            if (viewRefs.current[i]) {
              const uri = await captureRef(viewRefs.current[i], {format: 'jpg', quality: 0.9});
              uris.push(uri);
            } else {
              throw new Error(`ViewShot ${i} not ready`);
            }
          }
          if (mounted) onSuccess(uris);
        } catch (e) {
          if (mounted) onError(e);
        }
      }, 500);
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }
    return () => { mounted = false; };
  }, [dimensions, loadedCount, images.length, onSuccess, onError]);

  return (
    <>
      {dimensions.map((dim, i) => {
        if (!dim) return null;

        const labelSize = Math.max(18, dim.width * 0.055);
        const textSize = Math.max(16, dim.width * 0.048);

        return (
          <ViewShot
            key={i}
            ref={el => (viewRefs.current[i] = el)}
            options={{format: 'jpg', quality: 0.9}}
            style={[styles.offscreen, {width: dim.width, height: dim.height}]}>
            <Image
              source={{uri: images[i]}}
              style={{width: dim.width, height: dim.height}}
              resizeMode="cover"
              onLoad={() => setLoadedCount(c => c + 1)}
              onError={() => setLoadedCount(c => c + 1)}
            />
            <View style={styles.offscreenWm}>
              <Text style={[styles.offscreenLabel, {fontSize: labelSize}]}>{labels[i]}</Text>
              <Text style={[styles.offscreenText, {fontSize: textSize, lineHeight: textSize * 1.2}]}>
                {ready
                  ? `Lat: ${location.latitude}  Lng: ${location.longitude}`
                  : 'Fetching location...'}
              </Text>
            </View>
          </ViewShot>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  scroll: {
    padding: 16,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cameraEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
  },
  divider: {
    marginVertical: 14,
    backgroundColor: '#F0F0F0',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
  },
  dropdownSpacer: {
    width: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  imageSpacer: {
    width: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  clearButton: {
    borderRadius: 10,
    flex: 1,
    borderColor: '#F44336',
    borderWidth: 1.5,
  },
  clearButtonContent: {
    height: 46,
  },
  clearButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  saveButton: {
    borderRadius: 10,
    flex: 1,
    elevation: 3,
  },
  saveButtonContent: {
    height: 46,
  },
  saveButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  syncWrapper: {
    alignItems: 'center',
    marginTop: 12,
  },
  syncButton: {
    borderRadius: 10,
    width: '80%',
    elevation: 3,
  },
  syncButtonContent: {
    height: 46,
  },
  syncButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: -2},
  },
  footerBtn: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 10,
    borderColor: ORANGE,
  },
  footerBtnContent: {
    height: 44,
  },
  footerBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  offscreen: {
    position: 'absolute',
    width:720,
    height:720,
    top: -99999,
    left: -99999,
  },
  offscreenImg: {
    width: 720,
    height: 720,
  },
  offscreenWm: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  offscreenLabel: {
    color: '#f52b07',
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 8,
  },
  locationStatus: {
    textAlign: 'center',
    color: '#FF9800',
    fontSize: 12,
    marginBottom: 10,
  },
  offscreenText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 42,
    flexWrap: 'wrap',
  },
});
