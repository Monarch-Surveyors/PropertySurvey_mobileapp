import {useState, useEffect} from 'react';
import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export type LocationData = {
  latitude: string;
  longitude: string;
  address: string;
};

const FALLBACK: LocationData = {
  latitude: 'N/A',
  longitude: 'N/A',
  address: 'Location unavailable',
};

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {headers: {'User-Agent': 'PropertySurveyApp/1.0'}},
    );
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.road ?? a.neighbourhood ?? a.suburb,
      a.city ?? a.town ?? a.village ?? a.county,
      a.state,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : data.display_name ?? 'Unknown location';
  } catch {
    return 'Location unavailable';
  }
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData>(FALLBACK);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let watchId: number | null = null;

    (async () => {
      const permitted = await requestLocationPermission();
      if (!permitted) {
        setReady(true);
        return;
      }

      const onSuccess = async (pos: {coords: {latitude: number; longitude: number}}) => {
        if (!mounted) return;
        const {latitude, longitude} = pos.coords;
        const address = await reverseGeocode(latitude, longitude);
        if (mounted) {
          setLocation({
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            address,
          });
          setReady(true);
          // Stop watching once we have a good fix
          if (watchId !== null) {
            Geolocation.clearWatch(watchId);
            watchId = null;
          }
        }
      };

      const onError = () => {
        // Try once more with low accuracy as fallback
        Geolocation.getCurrentPosition(
          onSuccess,
          () => { if (mounted) setReady(true); },
          {enableHighAccuracy: false, timeout: 15000, maximumAge: 0},
        );
      };

      watchId = Geolocation.watchPosition(
        onSuccess,
        onError,
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 0, distanceFilter: 0},
      );
    })();

    return () => {
      mounted = false;
      if (watchId !== null) Geolocation.clearWatch(watchId);
    };
  }, []);

  return {location, ready};
}
