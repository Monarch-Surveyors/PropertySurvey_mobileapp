import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {Platform} from 'react-native';

export type ImageSyncStatus = 'Pending' | 'Uploading' | 'Synced' | 'Failed';

export interface ImageMetadata {
  id: string;
  localPath: string;
  fileName: string;
  status: ImageSyncStatus;
  uploadedAt?: number;
  serverUrl?: string;
  retryCount: number;
  error?: string;
}

const SYNC_KEY = '@image_sync_metadata';
export const SERVER_ALBUM = 'PropertySurvey_Synced';

export const ImageSyncService = {
  async getMetadata(): Promise<ImageMetadata[]> {
    const data = await AsyncStorage.getItem(SYNC_KEY);
    return data ? JSON.parse(data) : [];
  },

  async saveMetadata(metadata: ImageMetadata[]): Promise<void> {
    await AsyncStorage.setItem(SYNC_KEY, JSON.stringify(metadata));
  },

  async addPendingImage(localPath: string, fileName: string): Promise<void> {
    const metadata = await this.getMetadata();
    const existing = metadata.find(m => m.fileName === fileName);
    if (existing) return;

    metadata.push({
      id: `${Date.now()}_${Math.random()}`,
      localPath,
      fileName,
      status: 'Pending',
      retryCount: 0,
    });
    await this.saveMetadata(metadata);
  },

  async getPendingImages(): Promise<ImageMetadata[]> {
    const metadata = await this.getMetadata();
    return metadata.filter(m => m.status === 'Pending' || m.status === 'Failed');
  },

  async updateStatus(id: string, status: ImageSyncStatus, error?: string): Promise<void> {
    const metadata = await this.getMetadata();
    const item = metadata.find(m => m.id === id);
    if (item) {
      item.status = status;
      if (error) item.error = error;
      if (status === 'Synced') item.uploadedAt = Date.now();
      await this.saveMetadata(metadata);
    }
  },

  async uploadImage(image: ImageMetadata, onProgress?: (progress: number) => void): Promise<string> {
    // Simulate upload with progress
    return new Promise(async (resolve, reject) => {
      try {
        const exists = await RNFS.exists(image.localPath);
        if (!exists) {
          reject(new Error('Image file not found'));
          return;
        }

        await this.updateStatus(image.id, 'Uploading');

        // Simulate upload progress
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(res => setTimeout(res, 300));
          onProgress?.(i);
        }

        // Simulate server response
        const serverUrl = `https://server.com/uploads/${image.fileName}`;
        await this.updateStatus(image.id, 'Synced');
        resolve(serverUrl);
      } catch (error) {
        await this.updateStatus(image.id, 'Failed', (error as Error).message);
        reject(error);
      }
    });
  },

  async moveToSyncedFolder(localPath: string, fileName: string): Promise<string> {
    try {
      const exists = await RNFS.exists(localPath);
      if (!exists) throw new Error('Source file not found');

      // Check Android API level
      const apiLevel = Platform.OS === 'android' ? Number(Platform.Version) : 0;
      
      if (apiLevel >= 29) {
        // Android 10+ (API 29+): Album creation requires special handling
        // First, check if album exists by trying to save with album name
        try {
          const savedPath = await CameraRoll.saveAsset(localPath, {
            type: 'photo',
            album: SERVER_ALBUM,
          });
          return savedPath;
        } catch (albumError) {
          // If album doesn't exist, save without album (will go to default DCIM)
          // and copy to a dedicated folder
          const syncFolder = `${RNFS.PicturesDirectoryPath}/${SERVER_ALBUM}`;
          const folderExists = await RNFS.exists(syncFolder);
          if (!folderExists) {
            await RNFS.mkdir(syncFolder);
          }
          
          const destPath = `${syncFolder}/${fileName}`;
          await RNFS.copyFile(localPath, destPath);
          
          // Also save to gallery without album specification
          await CameraRoll.saveAsset(destPath, {type: 'photo'});
          return destPath;
        }
      } else {
        // Android 9 and below: Album creation works normally
        const savedPath = await CameraRoll.saveAsset(localPath, {
          type: 'photo',
          album: SERVER_ALBUM,
        });
        return savedPath;
      }
    } catch (error) {
      throw new Error(`Failed to move image: ${error}`);
    }
  },

  async syncAllImages(
    onProgress?: (current: number, total: number, fileName: string) => void,
    onComplete?: (success: number, failed: number) => void
  ): Promise<void> {
    const pending = await this.getPendingImages();
    if (pending.length === 0) {
      onComplete?.(0, 0);
      return;
    }

    let success = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i++) {
      const image = pending[i];
      onProgress?.(i + 1, pending.length, image.fileName);

      try {
        // Step 1: Upload to server
        const serverUrl = await this.uploadImage(image);
        
        // Step 2: Only if upload successful, move to synced folder
        await this.moveToSyncedFolder(image.localPath, image.fileName);
        
        // Step 3: Update metadata with server URL
        const metadata = await this.getMetadata();
        const item = metadata.find(m => m.id === image.id);
        if (item) {
          item.serverUrl = serverUrl;
          await this.saveMetadata(metadata);
        }

        success++;
      } catch (error) {
        // Upload or move failed - mark as Failed for retry
        const metadata = await this.getMetadata();
        const item = metadata.find(m => m.id === image.id);
        if (item) {
          item.retryCount++;
          item.status = 'Failed';
          item.error = (error as Error).message;
          await this.saveMetadata(metadata);
        }
        failed++;
      }
    }

    onComplete?.(success, failed);
  },

  async getSyncedImages(): Promise<ImageMetadata[]> {
    const metadata = await this.getMetadata();
    return metadata.filter(m => m.status === 'Synced');
  },

  async clearSyncedImages(): Promise<void> {
    const metadata = await this.getMetadata();
    const remaining = metadata.filter(m => m.status !== 'Synced');
    await this.saveMetadata(remaining);
  },
};
