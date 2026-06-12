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
    (async () => {
      const permitted = await requestLocationPermission();
      if (!permitted) {
        setReady(true);
        return;
      }
      Geolocation.getCurrentPosition(
        async pos => {
          const {latitude, longitude} = pos.coords;
          const address = await reverseGeocode(latitude, longitude);
          if (mounted) {
            setLocation({
              latitude: latitude.toFixed(6),
              longitude: longitude.toFixed(6),
              address,
            });
            setReady(true);
          }
        },
        () => {
          if (mounted) setReady(true);
        },
        {enableHighAccuracy: true, timeout: 10000, maximumAge: 60000},
      );
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return {location, ready};
}
