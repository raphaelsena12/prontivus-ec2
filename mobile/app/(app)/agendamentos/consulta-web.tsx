import React, { useRef, useEffect } from 'react';
import {
  View, StyleSheet, Alert, BackHandler, StatusBar, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';

// Inject CSS to hide native video controls that Android WebView shows on tap
const INJECTED_JS = `
  (function() {
    var style = document.createElement('style');
    style.textContent = 'video::-webkit-media-controls { display: none !important; } video::-webkit-media-controls-enclosure { display: none !important; }';
    document.head.appendChild(style);

    // Observe dynamically added video elements
    var observer = new MutationObserver(function() {
      document.querySelectorAll('video').forEach(function(v) {
        v.removeAttribute('controls');
        v.setAttribute('playsinline', '');
        v.disableRemotePlayback = true;
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  })();
  true;
`;

export default function ConsultaWebScreen() {
  const { url, titulo } = useLocalSearchParams<{ url: string; titulo: string }>();
  const webViewRef = useRef<WebView>(null);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Encerrar consulta',
        'Tem certeza que deseja sair da consulta?',
        [
          { text: 'Continuar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => router.back() },
        ]
      );
      return true;
    });
    return () => backHandler.remove();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo={false}
        originWhitelist={['*']}
        mediaCapturePermissionGrantType="grant"
        allowsBackForwardNavigationGestures={false}
        thirdPartyCookiesEnabled
        mixedContentMode="always"
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        injectedJavaScript={INJECTED_JS}
        userAgent={
          Platform.OS === 'ios'
            ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
            : undefined
        }
        onPermissionRequest={(event: any) => {
          event?.nativeEvent?.grant?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
});
