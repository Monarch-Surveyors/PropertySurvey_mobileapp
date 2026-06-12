import React, {useState, useMemo, useRef} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
  Image,
} from 'react-native';
import {Card, Text, Button, Divider, TextInput} from 'react-native-paper';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import Header from '../components/Header';
import CustomDropdown from '../components/CustomDropdown';
import ImageCard from '../components/ImageCard';
import {ORANGE} from '../theme';
import ViewShot, {captureRef} from 'react-native-view-shot';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {useLocation} from '../hooks/useLocation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PropertySurvey'>;
};

const WARD_ITEMS = Array.from({length: 100}, (_, i) => `${i + 1}`);

function formatDate(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function formatTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function PropertySurveyScreen({navigation}: Props) {
  const [ward, setWard] = useState('');
  const [property, setProperty] = useState('');
  const [partition, setPartition] = useState('');
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);
  const viewShotRefs = [useRef<ViewShot>(null), useRef<ViewShot>(null), useRef<ViewShot>(null)];
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

  const handleSaveImages = async () => {
    const filledImages = images.filter(img => img !== null);
    if (filledImages.length === 0) {
      Alert.alert('Error', 'No images to save');
      return;
    }
    if (!ward || !property) {
      Alert.alert('Error', 'Ward and Property numbers are required');
      return;
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
         PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Storage permission required to save images');
        return;
      }
    }

    setSaving(true);
    try {
      let savedCount = 0;
      for (let i = 0; i < images.length; i++) {
        if (images[i]) {
          const uri = await captureRef(viewShotRefs[i], {format: 'jpg', quality: 0.95});
          await CameraRoll.save(uri, {
            type: 'photo',
            album: 'PropertySurvey',
          });
          console.log('Saved:', imageLabels[i]);
          savedCount++;
        }
      }
      Alert.alert('Success', `${savedCount} image(s) saved to gallery in PropertySurvey album!`);
    } catch (error) {
      console.log('Save Error:', error);
      Alert.alert('Error', 'Failed to save images: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncImages = () => {
    Alert.alert('Sync', 'All images synced with server!');
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
              />
              <View style={styles.imageSpacer} />
              <ImageCard
                label={imageLabels[1]}
                imageUri={images[1]}
                onImageSelected={uri => handleImageSelected(1, uri)}
                onDelete={() => handleDelete(1)}
              />
              <View style={styles.imageSpacer} />
              <ImageCard
                label={imageLabels[2]}
                imageUri={images[2]}
                onImageSelected={uri => handleImageSelected(2, uri)}
                onDelete={() => handleDelete(2)}
              />
            </View>

            {/* Offscreen watermark views for saving */}
            {images.map((img, idx) => img ? (
              <ViewShot
                key={idx}
                ref={viewShotRefs[idx]}
                options={{format: 'jpg', quality: 0.95}}
                style={styles.offscreen}>
                <Image source={{uri: img}} style={styles.offscreenImg} resizeMode="cover" />
                <View style={styles.offscreenWm}>
                  <Text style={styles.offscreenLabel}>{imageLabels[idx]}</Text>
                  <Text style={styles.offscreenText}>
                    {`Lat: ${location.latitude}  Lng: ${location.longitude}`}
                  </Text>
                  {/* <Text style={styles.offscreenText}>{`Date: ${formatDate()}  Time: ${formatTime()}`}</Text> */}
                </View>
              </ViewShot>
            ) : null)}

            <Divider style={styles.divider} />

            {/* Save Images Button */}
            <Button
              mode="contained"
              onPress={handleSaveImages}
              buttonColor={ORANGE}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
              labelStyle={styles.saveButtonLabel}
              loading={saving}
              disabled={saving}>
              {saving ? 'SAVING...' : 'SAVE IMAGES'}
            </Button>

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

      Footer Navigation
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
  saveButton: {
    borderRadius: 10,
    alignSelf: 'center',
    width: '60%',
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
    width: 1080,
    height: 1080,
    top: -99999,
    left: -99999,
  },
  offscreenImg: {
    width: 1080,
    height: 1080,
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
  offscreenText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 42,
  },
});
