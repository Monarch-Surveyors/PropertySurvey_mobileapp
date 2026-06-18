import NetInfo from '@react-native-community/netinfo';

export const NetworkService = {
  subscribe(callback: (isConnected: boolean) => void) {
    try {
      return NetInfo.addEventListener(state => {
        callback(state.isConnected ?? false);
      });
    } catch (error) {
      console.log('NetInfo error:', error);
      callback(true);
      return () => {};
    }
  },

  async isConnected(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch (error) {
      console.log('NetInfo error:', error);
      return true;
    }
  },
};
