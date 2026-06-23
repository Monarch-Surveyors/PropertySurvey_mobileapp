import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  Modal,
} from 'react-native';
import { Card, Text, Button, Divider, TextInput, ProgressBar } from 'react-native-paper';
import Header from '../components/Header';
import CustomDropdown from '../components/CustomDropdown';
import ImageCard from '../components/ImageCard';
import { useAuth } from '../context/AuthContext';
import { ORANGE } from '../theme';

import Marker, { Position, TextBackgroundType } from 'react-native-image-marker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import { useLocation } from '../hooks/useLocation';
import { ImageSyncService, SERVER_ALBUM } from '../services/imageSync';

// Dummy property list
const DUMMY_PROPERTIES = [
  { ward: '1', property: '1', partition: '1' },
  { ward: '1', property: '1', partition: '2' },
  { ward: '1', property: '2', partition: '1' },
  { ward: '1', property: '3', partition: '1' },
  { ward: '1', property: '3', partition: '2' },
  { ward: '2', property: '1', partition: '1' },
  { ward: '2', property: '2', partition: '1' },
  { ward: '2', property: '2', partition: '2' },
  { ward: '2', property: '2', partition: '3' },
];

const SAVE_CANVAS_WIDTH = 1080;

export default function PropertySurveyScreen() {
  const { logout, isOnline } = useAuth();
  const [ward, setWard] = useState('');
  const [property, setProperty] = useState('');
  const [partition, setPartition] = useState('');
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);
  const { location, ready } = useLocation();
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [pendingCount, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);

  const WARD_ITEMS = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

  const loadSyncCounts = useCallback(async () => {
    const pending = await ImageSyncService.getPendingImages();
    const synced = await ImageSyncService.getSyncedImages();
    setPendingCount(pending.length);
    setSyncedCount(synced.length);
  }, []);

  useEffect(() => {
    loadSyncCounts();
  }, [loadSyncCounts]);

  const handleLogout = () => {
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'You cannot logout while offline. Please connect to the internet to logout.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ]
    );
  };

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
      // Android 10–12 → READ_EXTERNAL_STORAGE + WRITE_EXTERNAL_STORAGE for album creation
      const readResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to save property images to your gallery.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      const writeResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to create albums and save images.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return readResult === PermissionsAndroid.RESULTS.GRANTED &&
        writeResult === PermissionsAndroid.RESULTS.GRANTED;
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

  const processCapturedImages = useCallback(async (capturedUris: string[], labels: string[]) => {
    try {
      let savedCount = 0;
      for (let i = 0; i < capturedUris.length; i++) {
        const uri = capturedUris[i];
        const fileName = `${labels[i]}.jpg`;
        const destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        const tempPath = uri.replace('file://', '');

        if (await RNFS.exists(destPath)) {
          await RNFS.unlink(destPath);
        }

        const imageSize = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
        }).catch(() => ({ width: 1080, height: 1920 }));

        const labelText = labels[i];
        const locationText = ready
          ? `Lat: ${location.latitude}  Lng: ${location.longitude}`
          : 'Fetching location...';

        const fontSize = Math.max(30, Math.floor(imageSize.width * 0.043));
        const smallFontSize = Math.max(24, Math.floor(fontSize * 0.75));

        const markedImagePath = await Marker.markText({
          backgroundImage: {
            src: uri,
            scale: 1,
          },
          watermarkTexts: [
            {
              // Label — placed above the lat/lng
              text: labelText,
              positionOptions: {
                X: '2%',
                Y: `${100 - (((fontSize * 2.2) / imageSize.height) * 100) - 1}%`,
              },
              style: {
                color: '#FF0000',
                fontName: 'Arial',
                fontSize: fontSize,
                bold: true,
                textBackgroundStyle: {
                  type: TextBackgroundType.stretchX,
                  paddingX: 20,
                  paddingY: 10,
                  color: 'rgba(0,0,0,0.6)',
                },
              },
            },
            {
              // Location line — placed below the label at the very bottom
              text: locationText,
              positionOptions: {
                X: '2%',
                Y: `${100 - ((fontSize * 1.8) / imageSize.height) * 100}%`,
              },
              style: {
                color: '#fbf3f3ff',
                fontName: 'Arial',
                fontSize: smallFontSize,
                textBackgroundStyle: {
                  type: TextBackgroundType.stretchX,
                  paddingX: 20,
                  paddingY: 10,
                  color: 'rgba(0,0,0,0.6)',
                },
              },
            },
          ],
          quality: 100,
        });

        const actualMarkedPath = markedImagePath.startsWith('file://') ? markedImagePath.replace('file://', '') : markedImagePath;

        await RNFS.copyFile(actualMarkedPath, destPath);
        await CameraRoll.saveAsset(`file://${destPath}`, { type: 'photo', album: 'PropertySurvey' });

        // Add to sync queue
        await ImageSyncService.addPendingImage(destPath, fileName);

        try {
          if (actualMarkedPath !== destPath && await RNFS.exists(actualMarkedPath)) {
            await RNFS.unlink(actualMarkedPath);
          }
        } catch (e) { }

        console.log('Saved:', fileName);
        savedCount++;
      }
      await loadSyncCounts();
      Alert.alert('Success', `${savedCount} image(s) saved to PropertySurvey folder!`);
    } catch (error) {
      console.log('Save Error:', error);
      Alert.alert('Error', 'Failed to save images: ' + error);
    } finally {
      setSaving(false);
    }
  }, [loadSyncCounts, location, ready]);

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

    await processCapturedImages(validImages, validLabels);
  };

  const handleSyncImages = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync images while offline. Please connect to the internet.');
      return;
    }

    const pending = await ImageSyncService.getPendingImages();
    if (pending.length === 0) {
      Alert.alert('No Images', 'No pending images to sync.');
      return;
    }

    setSyncing(true);
    setSyncProgress({ current: 0, total: pending.length, fileName: '' });

    await ImageSyncService.syncAllImages(
      (current, total, fileName) => {
        setSyncProgress({ current, total, fileName });
      },
      (success, failed) => {
        setSyncing(false);
        loadSyncCounts();
        if (failed === 0) {
          Alert.alert('Success', `${success} image(s) synced successfully!\n\nSynced images are now in "${SERVER_ALBUM}" folder.`);
        } else {
          Alert.alert('Sync Complete', `Success: ${success}\nFailed: ${failed}\n\nFailed images will retry on next sync.`);
        }
      }
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all fields and images?',
      [
        { text: 'Cancel', style: 'cancel' },
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

  const getCurrentIndex = () => {
    if (!ward || !property) return -1;
    return DUMMY_PROPERTIES.findIndex(
      p => p.ward === ward && p.property === property && p.partition === (partition || '1')
    );
  };

  const handleNext = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex === -1) {
      Alert.alert('Info', 'Please select Ward and Property to navigate.');
      return;
    }
    if (currentIndex >= DUMMY_PROPERTIES.length - 1) {
      Alert.alert('Info', 'You are on the last property.');
      return;
    }
    const next = DUMMY_PROPERTIES[currentIndex + 1];
    setWard(next.ward);
    setProperty(next.property);
    setPartition(next.partition);
    setImages([null, null, null]);
  };

  const handlePreview = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex === -1) {
      Alert.alert('Info', 'Please select Ward and Property to navigate.');
      return;
    }
    if (currentIndex <= 0) {
      Alert.alert('Info', 'You are on the first property.');
      return;
    }
    const prev = DUMMY_PROPERTIES[currentIndex - 1];
    setWard(prev.ward);
    setProperty(prev.property);
    setPartition(prev.partition);
    setImages([null, null, null]);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Property Survey"
        rightButton={
          <Button
            mode="contained"
            onPress={handleLogout}
            buttonColor={ORANGE}
            compact
            labelStyle={{ fontSize: 11, fontWeight: '700' }}
          >
            LOGOUT
          </Button>
        }
      />

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📡 Offline Mode - Data will sync when online</Text>
        </View>
      )}

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
                  right={<TextInput.Affix text="*" textStyle={{ color: '#F44336' }} />}
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

            {/* Sync Stats */}
            <View style={styles.syncStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>📁 Offline Images:</Text>
                <Text style={styles.statValue}>{pendingCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>✅ Synced Images:</Text>
                <Text style={styles.statValue}>{syncedCount}</Text>
              </View>
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
                icon="cloud-upload"
                disabled={!isOnline || syncing || pendingCount === 0}>
                {syncing ? 'SYNCING...' : 'SYNC ALL IMAGES WITH SERVER'}
              </Button>
            </View>

          </Card.Content>
        </Card>
      </ScrollView>

      {/* Sync Progress Modal */}
      <Modal visible={syncing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Syncing Images</Text>
            <Text style={styles.modalText}>
              {syncProgress.current} of {syncProgress.total}
            </Text>
            <Text style={styles.modalFileName} numberOfLines={1}>
              {syncProgress.fileName}
            </Text>
            <ProgressBar
              progress={syncProgress.total > 0 ? syncProgress.current / syncProgress.total : 0}
              color={ORANGE}
              style={styles.progressBar}
            />
          </View>
        </View>
      </Modal>

      {/* Capture views removed to save original image instead */}

      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={handlePreview}
          style={styles.footerBtn}
          contentStyle={styles.footerBtnContent}
          textColor={ORANGE}
          labelStyle={styles.footerBtnLabel}>
          ◀  PREVIEW
        </Button>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.footerBtn}
          contentStyle={styles.footerBtnContent}
          buttonColor={ORANGE}
          labelStyle={styles.footerBtnLabel}>
          NEXT  ▶
        </Button>
      </View>
    </View>
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
    shadowOffset: { width: 0, height: -2 },
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
    top: 0,
    left: 0,
    opacity: 0,
    zIndex: -1,
    elevation: -1,
    overflow: 'hidden',
    backgroundColor: '#000',
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
    paddingTop: 6,
    paddingBottom: 30,
  },
  offscreenLabel: {
    color: '#f52b07',
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 2,
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
    includeFontPadding: true,
  },
  offlineBanner: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE69C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '600',
  },
  syncStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: ORANGE,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 15,
    color: '#757575',
    marginBottom: 8,
  },
  modalFileName: {
    fontSize: 13,
    color: ORANGE,
    marginBottom: 16,
    maxWidth: '100%',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
});
