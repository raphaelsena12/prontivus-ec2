import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
} from "@aws-sdk/client-chime-sdk-meetings";

// O endpoint (control plane) do Chime SDK deve ser us-east-1.
// sa-east-1 não tem endpoint próprio do Chime SDK Meetings.
// Porém, o MediaRegion pode ser sa-east-1 — o servidor de mídia
// ficará em São Paulo, garantindo baixa latência para usuários brasileiros.
const CHIME_CONTROL_REGION = "us-east-1"; // Endpoint da API — fixo
const CHIME_MEDIA_REGION = process.env.AWS_CHIME_MEDIA_REGION || "sa-east-1"; // Mídia — configurável

const chimeClient = new ChimeSDKMeetingsClient({
  region: CHIME_CONTROL_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Cria uma reunião Chime vinculada ao sessionId da telemedicina.
 * - Control plane: us-east-1 (único endpoint suportado na nossa conta)
 * - MediaRegion: sa-east-1 (servidor de mídia em São Paulo — menor latência para BR)
 */
export async function createChimeMeeting(sessionId: string) {
  const command = new CreateMeetingCommand({
    ClientRequestToken: sessionId,
    ExternalMeetingId: sessionId,
    MediaRegion: CHIME_MEDIA_REGION,
    MeetingFeatures: {
      Audio: { EchoReduction: "AVAILABLE" },
    },
  });

  const response = await chimeClient.send(command);

  if (!response.Meeting) {
    throw new Error("Falha ao criar reunião Chime: resposta vazia");
  }

  return response.Meeting;
}

/**
 * Cria um participante (attendee) em uma reunião Chime existente.
 * externalUserId = "DOCTOR_{medicoId}" ou "PATIENT_{pacienteId}"
 */
export async function createChimeAttendee(
  meetingId: string,
  externalUserId: string
) {
  const command = new CreateAttendeeCommand({
    MeetingId: meetingId,
    ExternalUserId: externalUserId,
  });

  const response = await chimeClient.send(command);

  if (!response.Attendee) {
    throw new Error("Falha ao criar participante Chime: resposta vazia");
  }

  return response.Attendee;
}

/**
 * Encerra uma reunião Chime, desconectando todos os participantes.
 */
export async function deleteChimeMeeting(meetingId: string) {
  const command = new DeleteMeetingCommand({
    MeetingId: meetingId,
  });

  await chimeClient.send(command);
}
