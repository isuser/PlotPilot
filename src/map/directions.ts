import { ActionSheetIOS, Linking, Platform } from 'react-native';

export interface DirectionsTarget {
  latitude: number;
  longitude: number;
  name: string;
}

export interface DirectionsLabels {
  title: string;
  appleMaps: string;
  googleMaps: string;
  cancel: string;
}

// Works everywhere: opens the Google Maps app when installed (Android app
// links / iOS universal links), otherwise the browser.
function webDirectionsUrl({ latitude, longitude }: DirectionsTarget): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

async function openWithFallback(url: string, target: DirectionsTarget): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(webDirectionsUrl(target));
  }
}

// Opens the plot's location in a maps app with directions to it.
// - Android: a geo: intent, so the user's default maps app (or the system
//   chooser) handles it.
// - iOS: there's no "default maps app" to query, so Apple Maps opens
//   directly unless Google Maps is installed, in which case the user picks.
//   Detecting Google Maps relies on `comgooglemaps` being listed in
//   LSApplicationQueriesSchemes (app.json → ios.infoPlist).
export async function openDirections(target: DirectionsTarget, labels: DirectionsLabels): Promise<void> {
  const coords = `${target.latitude},${target.longitude}`;

  if (Platform.OS === 'android') {
    await openWithFallback(`geo:${coords}?q=${coords}(${encodeURIComponent(target.name)})`, target);
    return;
  }

  const appleMapsUrl = `maps://?daddr=${coords}&dirflg=d`;
  const googleMapsUrl = `comgooglemaps://?daddr=${coords}&directionsmode=driving`;
  const hasGoogleMaps = await Linking.canOpenURL('comgooglemaps://').catch(() => false);

  if (!hasGoogleMaps) {
    await openWithFallback(appleMapsUrl, target);
    return;
  }

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: labels.title,
      options: [labels.appleMaps, labels.googleMaps, labels.cancel],
      cancelButtonIndex: 2,
    },
    (index) => {
      if (index === 0) openWithFallback(appleMapsUrl, target);
      if (index === 1) openWithFallback(googleMapsUrl, target);
    },
  );
}
