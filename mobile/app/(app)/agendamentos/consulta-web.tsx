import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Animated, Platform, BackHandler, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../../constants/colors';

export default function ConsultaWebScreen() {
  const { url, titulo } = useLocalSearchParams<{ url: string; titulo: string }>();
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout>>();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Timer
  useEffect(() => {
    if (!loading) {
      const interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Auto-hide controls after 5s
  useEffect(() => {
    if (showControls && !loading) {
      controlsTimeout.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }, 5000);
    }
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [showControls, loading]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEndCall();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  function toggleControls() {
    if (showControls) return;
    setShowControls(true);
    fadeAnim.setValue(1);
  }

  function handleEndCall() {
    Alert.alert(
      'Encerrar consulta',
      'Tem certeza que deseja sair da consulta?',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  }

  function toggleMic() {
    setMicMuted((v) => !v);
    webViewRef.current?.injectJavaScript(`
      try {
        document.querySelectorAll('audio, video').forEach(el => {
          if (el.srcObject) {
            el.srcObject.getAudioTracks().forEach(t => { t.enabled = ${micMuted}; });
          }
        });
      } catch(e) {}
      true;
    `);
  }

  function toggleCam() {
    setCamOff((v) => !v);
    webViewRef.current?.injectJavaScript(`
      try {
        document.querySelectorAll('video').forEach(el => {
          if (el.srcObject) {
            el.srcObject.getVideoTracks().forEach(t => { t.enabled = ${camOff}; });
          }
        });
      } catch(e) {}
      true;
    `);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handleMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'connected') {
        setConnected(true);
      }
      if (data.type === 'ended') {
        router.back();
      }
    } catch {
      // ignore non-JSON messages
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Loading screen */}
      {loading && (
        <View style={styles.loadingScreen}>
          <SafeAreaView style={styles.loadingContent}>
            <View style={styles.loadingIconWrap}>
              <Ionicons name="videocam" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.loadingTitle}>Entrando na consulta</Text>
            <Text style={styles.loadingSubtitle}>
              Aguarde enquanto conectamos voce ao medico...
            </Text>
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />

            <View style={styles.loadingTips}>
              <View style={styles.tipRow}>
                <Ionicons name="mic-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.tipText}>Verifique se seu microfone esta ativado</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="camera-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.tipText}>Permita o acesso a camera quando solicitado</Text>
              </View>
              <View style={styles.tipRow}>
                <Ionicons name="wifi-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.tipText}>Use uma conexao Wi-Fi estavel</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* WebView */}
      <TouchableOpacity
        style={styles.webviewContainer}
        activeOpacity={1}
        onPress={toggleControls}
      >
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          originWhitelist={['*']}
          mediaCapturePermissionGrantType="grant"
          allowsBackForwardNavigationGestures={false}
          userAgent={
            Platform.OS === 'ios'
              ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
              : undefined
          }
          onPermissionRequest={(event: any) => {
            event?.nativeEvent?.grant?.();
          }}
        />
      </TouchableOpacity>

      {/* Top bar overlay */}
      {showControls && !loading && (
        <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
          <SafeAreaView edges={['top']} style={styles.topBarInner}>
            <View style={styles.topBarContent}>
              <View>
                <Text style={styles.topBarTitle} numberOfLines={1}>
                  {titulo ?? 'Consulta'}
                </Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, connected && styles.statusDotConnected]} />
                  <Text style={styles.statusText}>
                    {connected ? 'Conectado' : 'Conectando...'}
                  </Text>
                  <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}

      {/* Bottom controls overlay */}
      {showControls && !loading && (
        <Animated.View style={[styles.bottomBar, { opacity: fadeAnim }]}>
          <SafeAreaView edges={['bottom']} style={styles.bottomBarInner}>
            <View style={styles.controls}>
              {/* Mic */}
              <TouchableOpacity
                style={[styles.controlBtn, micMuted && styles.controlBtnActive]}
                onPress={toggleMic}
              >
                <Ionicons
                  name={micMuted ? 'mic-off' : 'mic'}
                  size={22}
                  color={micMuted ? Colors.error : Colors.white}
                />
                <Text style={[styles.controlLabel, micMuted && styles.controlLabelActive]}>
                  {micMuted ? 'Ativar' : 'Mudo'}
                </Text>
              </TouchableOpacity>

              {/* Camera */}
              <TouchableOpacity
                style={[styles.controlBtn, camOff && styles.controlBtnActive]}
                onPress={toggleCam}
              >
                <Ionicons
                  name={camOff ? 'videocam-off' : 'videocam'}
                  size={22}
                  color={camOff ? Colors.error : Colors.white}
                />
                <Text style={[styles.controlLabel, camOff && styles.controlLabelActive]}>
                  {camOff ? 'Ativar' : 'Camera'}
                </Text>
              </TouchableOpacity>

              {/* End call */}
              <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
                <Ionicons name="call" size={24} color={Colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webviewContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#000' },

  // Loading
  loadingScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    zIndex: 20,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  loadingTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  loadingSubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  loadingTips: {
    gap: 12,
    marginTop: 32,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { fontSize: 13, color: Colors.textSecondary },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBarInner: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  statusDotConnected: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  timerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginLeft: 4,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomBarInner: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },

  controlBtn: {
    alignItems: 'center',
    gap: 4,
    width: 64,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  controlLabelActive: {
    color: Colors.error,
  },

  endCallBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
