"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mic, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface MicrophoneDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface MicrophoneSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (deviceId: string) => void;
  currentDeviceId?: string;
}

export function MicrophoneSelectorModal({
  isOpen,
  onClose,
  onSelect,
  currentDeviceId,
}: MicrophoneSelectorModalProps) {
  const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(currentDeviceId || "");
  const [rememberChoice, setRememberChoice] = useState(false);
  const [audioLevels, setAudioLevels] = useState<{ [key: string]: number }>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRefs = useRef<{ [key: string]: AnalyserNode }>({});
  const streamRefs = useRef<{ [key: string]: MediaStream }>({});

  useEffect(() => {
    // Carregar microfone preferido do localStorage
    const savedDeviceId = localStorage.getItem("preferredMicrophone");
    if (savedDeviceId && !currentDeviceId) {
      setSelectedDeviceId(savedDeviceId);
    } else if (currentDeviceId) {
      setSelectedDeviceId(currentDeviceId);
    }
  }, [currentDeviceId]);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    } else {
      // Limpar streams quando fechar
      Object.values(streamRefs.current).forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      streamRefs.current = {};
      analyserRefs.current = {};
      setAudioLevels({});
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
          }
        } catch (error) {
          console.warn("Erro ao fechar AudioContext:", error);
        }
        audioContextRef.current = null;
      }
    }
    
    return () => {
      // Cleanup ao desmontar
      Object.values(streamRefs.current).forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isOpen]);

  const loadDevices = async () => {
    try {
      // Solicitar permissão primeiro
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Listar dispositivos
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceList
        .filter(device => device.kind === "audioinput")
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microfone ${device.deviceId.substring(0, 8)}`,
          groupId: device.groupId,
        }));

      setDevices(audioInputs);
      
      // Selecionar o primeiro se não houver seleção
      if (!selectedDeviceId && audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }

      // Iniciar monitoramento de áudio para cada dispositivo
      audioInputs.forEach(device => {
        monitorAudioLevel(device.deviceId);
      });
    } catch (error) {
      console.error("Erro ao carregar dispositivos:", error);
    }
  };

  const monitorAudioLevel = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
        },
      });

      streamRefs.current[deviceId] = stream;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRefs.current[deviceId] = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRefs.current[deviceId]) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = Math.min(100, (average / 255) * 100);
        
        setAudioLevels(prev => ({
          ...prev,
          [deviceId]: level,
        }));

        requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error(`Erro ao monitorar áudio do dispositivo ${deviceId}:`, error);
    }
  };

  const handleConfirm = () => {
    if (selectedDeviceId) {
      if (rememberChoice) {
        localStorage.setItem("preferredMicrophone", selectedDeviceId);
      }
      onSelect(selectedDeviceId);
      onClose();
    }
  };

  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-600" />
            Selecionar Microfone
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-1">
            {devices.length} dispositivo{devices.length !== 1 ? "s" : ""} encontrado{devices.length !== 1 ? "s" : ""}
          </p>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {devices.map((device) => {
            const isSelected = selectedDeviceId === device.deviceId;
            const audioLevel = audioLevels[device.deviceId] || 0;
            
            return (
              <div
                key={device.deviceId}
                onClick={() => setSelectedDeviceId(device.deviceId)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Mic className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 mb-1 truncate">
                      {device.label}
                    </h4>
                    <p className="text-xs text-emerald-600 font-medium">
                      Captando áudio
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const barHeight = Math.max(4, (audioLevel / 100) * 20 * (i + 1));
                      return (
                        <div
                          key={i}
                          className="w-1 bg-slate-300 rounded-full transition-all"
                          style={{
                            height: `${barHeight}px`,
                            backgroundColor: audioLevel > i * 20 ? "#3b82f6" : "#cbd5e1",
                          }}
                        />
                      );
                    })}
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedDevice && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Microfone selecionado:
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800 text-sm truncate">
                    {selectedDevice.label}
                  </h4>
                  <p className="text-xs text-emerald-600 font-medium">
                    Captando áudio
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const audioLevel = audioLevels[selectedDevice.deviceId] || 0;
                    const barHeight = Math.max(4, (audioLevel / 100) * 20 * (i + 1));
                    return (
                      <div
                        key={i}
                        className="w-1 bg-slate-300 rounded-full transition-all"
                        style={{
                          height: `${barHeight}px`,
                          backgroundColor: audioLevel > i * 20 ? "#3b82f6" : "#cbd5e1",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Checkbox
                id="remember"
                checked={rememberChoice}
                onCheckedChange={(checked) => setRememberChoice(checked === true)}
              />
              <label
                htmlFor="remember"
                className="text-xs text-slate-600 cursor-pointer"
              >
                Lembrar minha escolha
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!selectedDeviceId}
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

