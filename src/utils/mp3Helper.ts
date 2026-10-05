import { Mp3Encoder } from '@breezystack/lamejs';
import { parseWavHeader } from './wavHelper.ts';

/**
 * Converts a 16-bit PCM RIFF WAV buffer into a standard MP3 buffer.
 */
export function convertWavToMp3(wavBuffer: Buffer, kbps = 128): Buffer {
  const header = parseWavHeader(wavBuffer) || {
    sampleRate: 24000,
    numChannels: 1,
    bitsPerSample: 16,
    dataOffset: 44,
    dataLength: Math.max(0, wavBuffer.length - 44),
  };

  const sampleRate = header.sampleRate || 24000;
  const numChannels = header.numChannels || 1;
  const pcmBuffer = wavBuffer.subarray(header.dataOffset, header.dataOffset + header.dataLength);

  // Convert buffer to Int16Array (16-bit little-endian PCM)
  const samples = new Int16Array(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    Math.floor(pcmBuffer.byteLength / 2)
  );

  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);
  const mp3Chunks: Buffer[] = [];

  const sampleBlockSize = 1152;
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const chunk = samples.subarray(i, i + sampleBlockSize);
    let mp3buf: Uint8Array;
    if (numChannels === 1) {
      mp3buf = encoder.encodeBuffer(chunk);
    } else {
      mp3buf = encoder.encodeBuffer(chunk, chunk);
    }
    if (mp3buf && mp3buf.length > 0) {
      mp3Chunks.push(Buffer.from(mp3buf));
    }
  }

  const end = encoder.flush();
  if (end && end.length > 0) {
    mp3Chunks.push(Buffer.from(end));
  }

  return Buffer.concat(mp3Chunks);
}
