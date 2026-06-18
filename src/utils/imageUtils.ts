import {launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import ImageResizer from '@bam.tech/react-native-image-resizer';

const IMAGES_FOLDER = `${RNFS.DocumentDirectoryPath}/survey_images`;

export const initializeImageFolder = async (): Promise<void> => {
  const exists = await RNFS.exists(IMAGES_FOLDER);
  if (!exists) {
    await RNFS.mkdir(IMAGES_FOLDER);
  }
};

export const getNextImageName = async (): Promise<string> => {
  try {
    const files = await RNFS.readDir(IMAGES_FOLDER);
    const imageFiles = files.filter(file => file.name.match(/^\d+-\d+-\d+-[A-Z]\.jpg$/));
    const numbers = imageFiles.map(file => {
      const match = file.name.match(/^(\d+)-(\d+)-(\d+)-([A-Z])\.jpg$/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxNumber = Math.max(0, ...numbers);
    return `${maxNumber + 1}-244-5-A.jpg`;
  } catch {
    return '1-244-5-A.jpg';
  }
};

export const compressAndSaveImage = async (imageUri: string): Promise<string> => {
  try {
    await initializeImageFolder();
    const imageName = await getNextImageName();
    const destPath = `${IMAGES_FOLDER}/${imageName}`;
    
    // Compress image to approximately 100KB
    const compressedImage = await ImageResizer.createResizedImage(
      imageUri,
      800, // max width
      600, // max height
      'JPEG',
      30, // quality (0-100)
      0, // rotation
      undefined, // outputPath
      false, // keep meta
      {
        mode: 'contain',
        onlyScaleDown: true,
      }
    );
    
    // Copy compressed image to destination
    await RNFS.copyFile(compressedImage.uri, destPath);
    
    // Save to gallery
    await CameraRoll.save(destPath);
    
    return destPath;
  } catch (error) {
    throw new Error('Failed to save image');
  }
};



export const pickImageFromGallery = (): Promise<string | null> => {
  return new Promise((resolve) => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response: ImagePickerResponse) => {
        if (response.assets && response.assets[0]) {
          resolve(response.assets[0].uri || null);
        } else {
          resolve(null);
        }
      }
    );
  });
};