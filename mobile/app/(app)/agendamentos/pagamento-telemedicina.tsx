import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../../constants/colors';
import { telemeditcinaService } from '../../../services/telemedicina.service';

const STRIPE_KEY = (Constants.expoConfig?.extra as any)?.stripePublishableKey ?? '';

function buildPaymentHtml(clientSecret: string, valor: number, medicoNome: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 20px; }
    .card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 16px; }
    .medico-row { display: flex; align-items: center; gap: 12px; }
    .medico-nome { font-weight: 700; font-size: 15px; color: #111827; }
    .medico-esp { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .valor { font-size: 20px; font-weight: 800; color: #111827; }
    .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; gap: 4px; }
    #payment-element { margin-bottom: 16px; }
    #submit-btn {
      width: 100%; height: 52px; background: linear-gradient(135deg, #10b981, #0d9488);
      color: white; font-size: 16px; font-weight: 700; border: none; border-radius: 12px;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    #submit-btn:disabled { opacity: 0.6; }
    .secure { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 12px; }
    .error { color: #ef4444; font-size: 13px; margin-top: 10px; text-align: center; }
    .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="medico-row">
      <div style="flex:1">
        <div class="medico-nome">${medicoNome}</div>
        <div class="medico-esp">Consulta por Telemedicina</div>
      </div>
      <div class="valor">R$ ${valor.toFixed(2).replace('.', ',')}</div>
    </div>
  </div>

  <div class="card">
    <div class="label">🔒 Dados do cartão</div>
    <div id="payment-element"></div>
    <div class="error" id="error-msg"></div>
  </div>

  <button id="submit-btn" onclick="handlePagar()">
    🔒 Pagar R$ ${valor.toFixed(2).replace('.', ',')} e Entrar
  </button>
  <div class="secure">Pagamento seguro processado pelo Stripe</div>

  <script>
    const stripe = Stripe('${STRIPE_KEY}');
    const elements = stripe.elements({ clientSecret: '${clientSecret}', locale: 'pt-BR', appearance: { theme: 'stripe', variables: { colorPrimary: '#10b981', borderRadius: '8px' } } });
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
        btn.innerHTML = '🔒 Pagar R$ ${valor.toFixed(2).replace('.', ',')} e Entrar';
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ success: true }));
      } else {
        errEl.textContent = 'Pagamento não confirmado. Tente novamente.';
        btn.disabled = false;
        btn.innerHTML = '🔒 Pagar R$ ${valor.toFixed(2).replace('.', ',')} e Entrar';
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
  const webViewRef = useRef(null);

  const valor = parseFloat(params.valor ?? '0');
  const html = buildPaymentHtml(params.clientSecret, valor, params.medicoNome);

  async function handleMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.success) {
        setProcessando(true);
        const result = await telemeditcinaService.iniciarImediato({
          paymentIntentId: params.paymentIntentId,
          pagamentoId: params.pagamentoId,
          medicoId: params.medicoId,
          medicoTelemedicinaId: params.medicoTelemedicinaId,
        });
        router.replace({
          pathname: '/(app)/agendamentos/consulta-web',
          params: { url: result.patientLink, titulo: `Dr(a). ${params.medicoNome}` },
        });
      }
    } catch {
      setProcessando(false);
      Alert.alert('Erro', 'Pagamento realizado mas houve um problema ao iniciar a consulta. Entre em contato com o suporte.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={processando}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Pagamento</Text>
      </View>

      {processando && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.overlayText}>Iniciando consulta...</Text>
        </View>
      )}

      {loading && !processando && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando formulário de pagamento...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://js.stripe.com' }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border ?? '#E5E7EB',
  },
  title: { fontSize: 17, fontWeight: '600', color: Colors.text },
  webview: { flex: 1 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.surface ?? '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border ?? '#E5E7EB',
  },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    gap: 12,
  },
  overlayText: { fontSize: 15, fontWeight: '600', color: Colors.text },
});
