/**
 * Helper to parse, validate, and concatenate RIFF WAV audio buffers
 */

export interface WavInfo {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataOffset: number;
  dataLength: number;
}

/**
 * Parses header information from a WAV buffer.
 */
export function parseWavHeader(buffer: Buffer): WavInfo | null {
  if (buffer.length < 44) return null;
  const riff = buffer.toString('ascii', 0, 4);
  const wave = buffer.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || wave !== 'WAVE') return null;

  let offset = 12;
  let numChannels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;
  let dataOffset = 44;
  let dataLength = buffer.length - 44;

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === 'fmt ') {
      numChannels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataLength = Math.min(chunkSize, buffer.length - dataOffset);
      break;
    }
    offset += 8 + chunkSize;
  }

  return { numChannels, sampleRate, bitsPerSample, dataOffset, dataLength };
}

/**
 * Creates a standard 44-byte WAV header for PCM data.
 */
export function createWavHeader(
  dataLength: number,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = Math.floor((sampleRate * numChannels * bitsPerSample) / 8);
  const blockAlign = Math.floor((numChannels * bitsPerSample) / 8);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

/**
 * Combines multiple WAV buffers into a single continuous WAV buffer.
 * Adds an optional brief silence gap (e.g. 250ms) between segments.
 */
export function combineWavBuffers(
  wavBuffers: Buffer[],
  silenceMs = 200
): Buffer {
  if (!wavBuffers || wavBuffers.length === 0) {
    return createWavHeader(0);
  }
  if (wavBuffers.length === 1) {
    return wavBuffers[0];
  }

  // Detect properties from first valid WAV
  const firstInfo = parseWavHeader(wavBuffers[0]) || {
    sampleRate: 24000,
    numChannels: 1,
    bitsPerSample: 16,
    dataOffset: 44,
    dataLength: Math.max(0, wavBuffers[0].length - 44),
  };

  const sampleRate = firstInfo.sampleRate || 24000;
  const numChannels = firstInfo.numChannels || 1;
  const bitsPerSample = firstInfo.bitsPerSample || 16;

  // Calculate silence bytes
  const bytesPerSec = (sampleRate * numChannels * bitsPerSample) / 8;
  const silenceBytesCount = Math.floor((silenceMs / 1000) * bytesPerSec);
  const silenceBuffer = Buffer.alloc(silenceBytesCount); // filled with 0s

  const pcmParts: Buffer[] = [];

  for (let i = 0; i < wavBuffers.length; i++) {
    const buf = wavBuffers[i];
    const info = parseWavHeader(buf);
    if (info && info.dataOffset < buf.length) {
      const pcm = buf.subarray(info.dataOffset, info.dataOffset + info.dataLength);
      pcmParts.push(pcm);
    } else if (buf.length > 44) {
      // Fallback: strip first 44 bytes
      pcmParts.push(buf.subarray(44));
    } else {
      pcmParts.push(buf);
    }

    // Add silence between chunks, but not after the last chunk
    if (i < wavBuffers.length - 1 && silenceBytesCount > 0) {
      pcmParts.push(silenceBuffer);
    }
  }

  const combinedPcm = Buffer.concat(pcmParts);
  const header = createWavHeader(combinedPcm.length, sampleRate, numChannels, bitsPerSample);

  return Buffer.concat([header, combinedPcm]);
}
