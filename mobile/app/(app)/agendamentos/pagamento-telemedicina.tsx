import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Animated, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors, BorderRadius } from '../../../constants/colors';
import { telemeditcinaService } from '../../../services/telemedicina.service';

const STRIPE_KEY = (Constants.expoConfig?.extra as any)?.stripePublishableKey ?? '';

function buildPaymentHtml(clientSecret: string, valor: number, medicoNome: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: transparent;
      padding: 0 4px;
      -webkit-text-size-adjust: 100%;
    }
    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #payment-element { margin-bottom: 20px; }
    #submit-btn {
      width: 100%;
      height: 54px;
      background: #7C3AED;
      color: white;
      font-size: 16px;
      font-weight: 700;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);
      transition: opacity 0.2s;
    }
    #submit-btn:disabled { opacity: 0.5; }
    #submit-btn:active { opacity: 0.8; }
    .secure-note {
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
      margin-top: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .error {
      color: #EF4444;
      font-size: 13px;
      margin-top: 10px;
      text-align: center;
      padding: 8px;
      background: #FEF2F2;
      border-radius: 8px;
    }
    .error:empty { display: none; }
    .spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="section-label">Dados do cartao</div>
  <div id="payment-element"></div>
  <div class="error" id="error-msg"></div>

  <button id="submit-btn" onclick="handlePagar()">
    Pagar R$ ${valor.toFixed(2).replace('.', ',')}
  </button>
  <div class="secure-note">Pagamento seguro via Stripe</div>

  <script>
    const stripe = Stripe('${STRIPE_KEY}');
    const elements = stripe.elements({
      clientSecret: '${clientSecret}',
      locale: 'pt-BR',
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#7C3AED',
          borderRadius: '10px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSizeBase: '15px',
        },
        rules: {
          '.Input': {
            border: '1.5px solid #E2E8F0',
            boxShadow: 'none',
            padding: '12px 14px',
          },
          '.Input:focus': {
            border: '1.5px solid #7C3AED',
            boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
          },
          '.Label': {
            fontWeight: '600',
            fontSize: '13px',
            color: '#0F172A',
          },
        },
      },
    });
    const paymentElement = elements.create('payment', { layout: 'tabs' });
    paymentElement.mount('#payment-element');

    async function handlePagar() {
      const btn = document.getElementById('submit-btn');
      const errEl = document.getElementById('error-msg');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Processando...';
      errEl.textContent = '';

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {},
        redirect: 'if_required',
      });

      if (error) {
        errEl.textContent = error.message || 'Erro ao processar pagamento';
        btn.disabled = false;
        btn.innerHTML = 'Pagar R$ ${valor.toFixed(2).replace('.', ',')}';
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ success: true }));
      } else {
        errEl.textContent = 'Pagamento nao confirmado. Tente novamente.';
        btn.disabled = false;
        btn.innerHTML = 'Pagar R$ ${valor.toFixed(2).replace('.', ',')}';
      }
    }
  </script>
</body>
</html>`;
}

export default function PagamentoTelemedicinaScreen() {
  const params = useLocalSearchParams<{
    clientSecret: string;
    paymentIntentId: string;
    pagamentoId: string;
    medicoId: string;
    medicoTelemedicinaId: string;
    medicoNome: string;
    valor: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [etapa, setEtapa] = useState<'pagamento' | 'iniciando' | 'pronto'>('pagamento');
  const webViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const valor = parseFloat(params.valor ?? '0');
  const html = buildPaymentHtml(params.clientSecret, valor, params.medicoNome);

  function showOverlay() {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  async function handleMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.success) {
        setProcessando(true);
        setEtapa('iniciando');
        showOverlay();

        const result = await telemeditcinaService.iniciarImediato({
          paymentIntentId: params.paymentIntentId,
          pagamentoId: params.pagamentoId,
          medicoId: params.medicoId,
          medicoTelemedicinaId: params.medicoTelemedicinaId,
        });

        setEtapa('pronto');

        // Small delay to show success state
        setTimeout(() => {
          router.replace({
            pathname: '/(app)/agendamentos/consulta-web',
            params: { url: result.patientLink, titulo: `Dr(a). ${params.medicoNome}` },
          });
        }, 1200);
      }
    } catch {
      setProcessando(false);
      setEtapa('pagamento');
      Alert.alert(
        'Erro',
        'Pagamento realizado mas houve um problema ao iniciar a consulta. Entre em contato com o suporte.'
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={processando}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={processando ? Colors.textMuted : Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Pagamento</Text>
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
          <Text style={styles.secureBadgeText}>Seguro</Text>
        </View>
      </View>

      {/* Doctor info card */}
      <View style={styles.doctorCard}>
        <View style={styles.doctorAvatar}>
          <Ionicons name="videocam" size={20} color={Colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.doctorName}>{params.medicoNome}</Text>
          <Text style={styles.doctorSub}>Consulta por Telemedicina</Text>
        </View>
        <View style={styles.valorPill}>
          <Text style={styles.valorText}>R$ {valor.toFixed(2).replace('.', ',')}</Text>
        </View>
      </View>

      {/* Stripe WebView */}
      {loading && !processando && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando formulario de pagamento...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://js.stripe.com' }}
        style={[styles.webview, processando && { opacity: 0 }]}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        scrollEnabled={true}
        bounces={false}
      />

      {/* Processing overlay */}
      {processando && (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          {etapa === 'iniciando' && (
            <View style={styles.overlayContent}>
              <View style={styles.overlayIconWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
              <Text style={styles.overlayTitle}>Preparando sua consulta...</Text>
              <Text style={styles.overlaySubtitle}>
                Pagamento confirmado! Estamos configurando a sala de video.
              </Text>
              <View style={styles.overlaySteps}>
                <StepItem done label="Pagamento confirmado" />
                <StepItem active label="Criando sala de video" />
                <StepItem label="Notificando o medico" />
              </View>
            </View>
          )}
          {etapa === 'pronto' && (
            <View style={styles.overlayContent}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
              </View>
              <Text style={styles.overlayTitle}>Tudo pronto!</Text>
              <Text style={styles.overlaySubtitle}>
                Entrando na sala de consulta...
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function StepItem({ done, active, label }: { done?: boolean; active?: boolean; label: string }) {
  return (
    <View style={stepStyles.row}>
      <View style={[
        stepStyles.dot,
        done && stepStyles.dotDone,
        active && stepStyles.dotActive,
      ]}>
        {done && <Ionicons name="checkmark" size={10} color={Colors.white} />}
        {active && <ActivityIndicator size={8} color={Colors.white} />}
      </View>
      <Text style={[
        stepStyles.label,
        done && stepStyles.labelDone,
        active && stepStyles.labelActive,
      ]}>
        {label}
      </Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: Colors.success },
  dotActive: { backgroundColor: Colors.primary },
  label: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  labelDone: { color: Colors.success },
  labelActive: { color: Colors.text, fontWeight: '600' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.text },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  secureBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.successDark },

  // Doctor card
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  doctorSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  valorPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  valorText: { fontSize: 15, fontWeight: '800', color: Colors.primary },

  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
  },
  loadingText: { fontSize: 13, color: Colors.textSecondary },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    padding: 32,
  },
  overlayContent: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  overlayIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successIconWrap: {
    marginBottom: 8,
  },
  overlayTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  overlaySubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  overlaySteps: {
    gap: 12,
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingLeft: 24,
  },
});
