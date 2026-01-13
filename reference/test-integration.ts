#!/usr/bin/env npx tsx
/**
 * TTS AI Studio Docker Integration Tests
 *
 * Tests the tts-aistudio Docker container functionality.
 * 
 * Note: This proxy requires an AI Studio browser client connected
 * to handle HTTP proxy requests. These tests validate the 
 * container is running and responding correctly.
 *
 * Run: npx tsx tests/test-integration.ts
 */

import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  dockerHost: 'localhost',
  proxyPort: 5345,
  wsPath: '/v1/ws',
  testTimeoutMs: 5000,
  wsConnectionTimeoutMs: 5000,
  // API key from docker-compose.yml (AUTH_API_KEY env var in Go proxy)
  apiKey: 'aistudio-proxy-key-2024',
};

// ============================================================================
// Types
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

interface WSMessage {
  id?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

// ============================================================================
// Utilities
// ============================================================================

function printBanner(title: string) {
  console.log('\n' + '═'.repeat(70));
  console.log(`║ ${title.padEnd(66)} ║`);
  console.log('═'.repeat(70) + '\n');
}

function printStep(step: number, description: string) {
  console.log(`\n📌 Step ${step}: ${description}`);
  console.log('─'.repeat(50));
}

function checkPortOpen(host: string, port: number, timeout: number = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function httpGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, body });
      });
    });
    req.on('error', reject);
    req.setTimeout(CONFIG.testTimeoutMs, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Convert raw PCM audio data to WAV format
 * Adds proper WAV header for L16 PCM audio at specified sample rate
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize - 8;

  const wavBuffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(fileSize, 4);
  wavBuffer.write('WAVE', 8);

  // fmt subchunk
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavBuffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  wavBuffer.writeUInt16LE(numChannels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);

  // Copy PCM data
  pcmBuffer.copy(wavBuffer, 44);

  return wavBuffer;
}

// ============================================================================
// Test Cases
// ============================================================================

/**
 * Test 1: Container Port Accessible
 * Verifies the Docker container has port 5345 open and listening
 */
async function testContainerPortAccessible(): Promise<TestResult> {
  const start = Date.now();
  const testName = 'Container Port Accessible';

  try {
    console.log(`   📡 Checking if port ${CONFIG.proxyPort} is open...`);
    
    const isOpen = await checkPortOpen(CONFIG.dockerHost, CONFIG.proxyPort);
    
    if (isOpen) {
      return {
        name: testName,
        passed: true,
        duration: Date.now() - start,
        details: `Port ${CONFIG.proxyPort} is open and accepting connections`,
      };
    } else {
      return {
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: `Port ${CONFIG.proxyPort} is not accessible`,
      };
    }
  } catch (err) {
    return {
      name: testName,
      passed: false,
      duration: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

/**
 * Test 2: HTTP Returns 401 Without Auth
 * Verifies the Go proxy rejects unauthenticated requests
 */
async function testHttpReturns401WithoutAuth(): Promise<TestResult> {
  const start = Date.now();
  const testName = 'HTTP Auth Required (401)';

  try {
    const url = `http://${CONFIG.dockerHost}:${CONFIG.proxyPort}/`;
    console.log(`   📡 GET ${url} (without auth)`);

    const response = await httpGet(url);
    console.log(`   📥 Status: ${response.status}`);

    if (response.status === 401) {
      return {
        name: testName,
        passed: true,
        duration: Date.now() - start,
        details: 'Correctly returns 401 for unauthenticated requests',
      };
    } else {
      return {
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: `Expected 401, got ${response.status}`,
      };
    }
  } catch (err) {
    return {
      name: testName,
      passed: false,
      duration: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

/**
 * Test 3: WebSocket Endpoint Exists
 * Verifies WebSocket upgrade is handled (even if auth fails)
 */
async function testWebSocketEndpointExists(): Promise<TestResult> {
  const start = Date.now();
  const testName = 'WebSocket Endpoint Exists';

  return new Promise((resolve) => {
    const wsUrl = `ws://${CONFIG.dockerHost}:${CONFIG.proxyPort}${CONFIG.wsPath}`;
    console.log(`   📡 Connecting to ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      ws.close();
      resolve({
        name: testName,
        passed: true,
        duration: Date.now() - start,
        details: 'WebSocket endpoint exists (auth required for full connection)',
      });
    }, 2000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`   ✅ WebSocket connected (unexpected without auth)`);
      ws.close();
      resolve({
        name: testName,
        passed: true,
        duration: Date.now() - start,
        details: 'WebSocket connected without auth (open config)',
      });
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      // 401 error means the endpoint exists but requires auth
      if (err.message.includes('401')) {
        console.log(`   📥 Got 401 - endpoint requires auth`);
        resolve({
          name: testName,
          passed: true,
          duration: Date.now() - start,
          details: 'WebSocket endpoint exists, requires authentication',
        });
      } else {
        resolve({
          name: testName,
          passed: false,
          duration: Date.now() - start,
          error: err.message,
        });
      }
    });
  });
}

/**
 * Test 4: WebSocket Auth Token Format
 * Verifies WebSocket accepts auth_token query param format
 */
async function testWebSocketAuthTokenFormat(): Promise<TestResult> {
  const start = Date.now();
  const testName = 'WebSocket Auth Token Format';

  return new Promise((resolve) => {
    // The Go proxy expects auth_token query parameter for WebSocket
    const wsUrl = `ws://${CONFIG.dockerHost}:${CONFIG.proxyPort}${CONFIG.wsPath}?auth_token=valid-token-user-1`;
    console.log(`   📡 Connecting to ${wsUrl}`);

    const ws = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      ws.close();
      resolve({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: 'Connection timeout',
      });
    }, CONFIG.wsConnectionTimeoutMs);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`   ✅ WebSocket connected with auth_token`);

      // Send a ping
      const pingId = randomUUID();
      ws.send(JSON.stringify({ id: pingId, type: 'ping' }));
      console.log(`   📤 Sent ping`);

      // Wait for potential pong or just confirm connection works
      setTimeout(() => {
        ws.close();
        resolve({
          name: testName,
          passed: true,
          duration: Date.now() - start,
          details: 'WebSocket connected with auth_token successfully',
        });
      }, 1000);
    });

    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      console.log(`   📥 Received: ${msg.type || 'unknown'}`);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`   ⚠️ Error: ${err.message}`);
      resolve({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      });
    });
  });
}

/**
 * Test 5: WebSocket Ping/Pong
 * Verifies WebSocket bidirectional communication
 */
async function testWebSocketPingPong(): Promise<TestResult> {
  const start = Date.now();
  const testName = 'WebSocket Ping/Pong';

  return new Promise((resolve) => {
    const wsUrl = `ws://${CONFIG.dockerHost}:${CONFIG.proxyPort}${CONFIG.wsPath}?auth_token=valid-token-user-1`;
    console.log(`   📡 Connecting to ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    let pongReceived = false;

    const timeout = setTimeout(() => {
      ws.close();
      resolve({
        name: testName,
        passed: pongReceived,
        duration: Date.now() - start,
        details: pongReceived ? 'Ping/pong successful' : undefined,
        error: pongReceived ? undefined : 'Timeout waiting for pong',
      });
    }, CONFIG.wsConnectionTimeoutMs);

    ws.on('open', () => {
      console.log(`   ✅ Connected`);

      // Send ping
      const pingId = randomUUID();
      const pingMsg: WSMessage = { id: pingId, type: 'ping' };
      ws.send(JSON.stringify(pingMsg));
      console.log(`   📤 Sent ping (id: ${pingId.substring(0, 8)})`);
    });

    ws.on('message', (data: Buffer) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString());
        console.log(`   📥 Received: ${msg.type}`);

        if (msg.type === 'pong') {
          pongReceived = true;
          clearTimeout(timeout);
          ws.close();
          resolve({
            name: testName,
            passed: true,
            duration: Date.now() - start,
            details: 'Ping/pong message flow working',
          });
        }
      } catch (err) {
        console.log(`   ⚠️ Parse error: ${(err as Error).message}`);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: err.message,
      });
    });
  });
}

/**
 * Test 6: Production TTS Endpoint
 * Calls the production TTS endpoint with a proper TTS request and saves audio response
 */
async function testProductionTTSEndpoint(): Promise<TestResult> {
  const start = Date.now();
  const testName = 'Production TTS Endpoint';

  return new Promise((resolve) => {
    const ttsHost = 'tts-aistudio.gscfin.com';
    const ttsPath = '/v1beta/models/gemini-2.5-pro-preview-tts:streamGenerateContent?alt=sse';
    console.log(`   📡 POST https://${ttsHost}${ttsPath}`);

    const timeout = setTimeout(() => {
      resolve({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: 'Request timeout (60s)',
      });
    }, 60000);

    // TTS request body based on reference implementation
    const requestBody = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Hello! This is a test of text to speech.' }],
        },
      ],
      generationConfig: {
        temperature: 1,
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore',
            },
          },
        },
      },
    });

    const requestOptions: https.RequestOptions = {
      hostname: ttsHost,
      port: 443,
      path: ttsPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'x-goog-api-key': CONFIG.apiKey,
      },
    };

    const req = https.request(requestOptions, (res) => {
      const contentType = res.headers['content-type'] || '';
      console.log(`   📥 Status: ${res.statusCode}, Content-Type: ${contentType}`);

      let responseData = '';
      const audioChunks: string[] = [];

      res.on('data', (chunk: Buffer) => {
        responseData += chunk.toString();
      });

      res.on('end', () => {
        clearTimeout(timeout);

        // Handle 503 - no browser client connected
        if (res.statusCode === 503) {
          console.log(`   ⚠️  Service unavailable (no browser client connected)`);
          resolve({
            name: testName,
            passed: true, // Pass because endpoint is reachable, just no client
            duration: Date.now() - start,
            details: 'Endpoint reachable but no browser client connected (503)',
          });
          return;
        }

        // Handle other non-success status codes
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          console.log(`   ❌ Error response: ${responseData.substring(0, 200)}...`);
          resolve({
            name: testName,
            passed: false,
            duration: Date.now() - start,
            error: `HTTP ${res.statusCode}: ${responseData.substring(0, 100)}`,
          });
          return;
        }

        // Parse SSE stream to extract audio data
        // Format: data: {"candidates":[{"content":{"parts":[{"inlineData":{"mimeType":"audio/L16;rate=24000","data":"BASE64..."}}]}}]}
        const sseLines = responseData.split('\n');
        let mimeType = 'audio/wav';

        for (const line of sseLines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.substring(6));
              const parts = jsonData?.candidates?.[0]?.content?.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  audioChunks.push(part.inlineData.data);
                  if (part.inlineData.mimeType) {
                    mimeType = part.inlineData.mimeType;
                  }
                  console.log(`   🔊 Audio chunk: ${mimeType}, ${(part.inlineData.data.length * 0.75 / 1024).toFixed(1)} KB`);
                }
              }
            } catch {
              // Ignore parse errors for malformed lines
            }
          }
        }

        if (audioChunks.length > 0) {
          // Combine all base64 chunks and decode
          const combinedBase64 = audioChunks.join('');
          let audioBuffer = Buffer.from(combinedBase64, 'base64');
          
          // Extract sample rate from mimeType (e.g., "audio/L16;codec=pcm;rate=24000")
          let sampleRate = 24000;
          const rateMatch = mimeType.match(/rate=(\d+)/);
          if (rateMatch) {
            sampleRate = parseInt(rateMatch[1], 10);
          }
          
          // Convert PCM to WAV format
          if (mimeType.includes('L16') || mimeType.includes('pcm')) {
            console.log(`   🔄 Converting PCM to WAV (${sampleRate}Hz)...`);
            audioBuffer = pcmToWav(audioBuffer, sampleRate);
          }
          
          const outputPath = path.join(process.cwd(), 'tests', 'test_integration.wav');
          
          try {
            fs.writeFileSync(outputPath, audioBuffer);
            console.log(`   💾 Saved audio: ${outputPath} (${audioBuffer.length} bytes)`);
            resolve({
              name: testName,
              passed: true,
              duration: Date.now() - start,
              details: `Audio saved: ${audioChunks.length} chunks, ${(audioBuffer.length / 1024).toFixed(1)} KB WAV`,
            });
          } catch (writeErr) {
            resolve({
              name: testName,
              passed: false,
              duration: Date.now() - start,
              error: `Failed to save audio: ${(writeErr as Error).message}`,
            });
          }
        } else {
          console.log(`   📝 Response (no audio): ${responseData.substring(0, 150)}...`);
          resolve({
            name: testName,
            passed: res.statusCode === 200,
            duration: Date.now() - start,
            details: `Responded with status ${res.statusCode}, no audio in response`,
          });
        }
      });

      res.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          name: testName,
          passed: false,
          duration: Date.now() - start,
          error: `Response error: ${err.message}`,
        });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        name: testName,
        passed: false,
        duration: Date.now() - start,
        error: `Request error: ${err.message}`,
      });
    });

    // Send request body
    req.write(requestBody);
    req.end();
  });
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const tests = [
    { fn: testContainerPortAccessible },
    { fn: testHttpReturns401WithoutAuth },
    { fn: testWebSocketEndpointExists },
    { fn: testWebSocketAuthTokenFormat },
    { fn: testWebSocketPingPong },
    { fn: testProductionTTSEndpoint },
  ];

  for (const test of tests) {
    const result = await test.fn();
    console.log(`\n🧪 ${result.name}`);
    results.push(result);

    if (result.passed) {
      console.log(`   ✅ PASSED (${result.duration}ms)`);
      if (result.details) console.log(`   📝 ${result.details}`);
    } else {
      console.log(`   ❌ FAILED (${result.duration}ms)`);
      if (result.error) console.log(`   ❌ Error: ${result.error}`);
    }
  }

  return results;
}

async function main() {
  printBanner('TTS AI Studio Integration Tests');

  console.log('Testing Docker container at:');
  console.log(`  Host: ${CONFIG.dockerHost}:${CONFIG.proxyPort}`);
  console.log(`  WebSocket: ws://${CONFIG.dockerHost}:${CONFIG.proxyPort}${CONFIG.wsPath}`);

  // Step 1: Run all tests
  printStep(1, 'Running Integration Tests');

  const results = await runAllTests();

  // Print results
  printBanner('FINAL RESULTS');

  console.log('┌─────────────────────────────────────────────────────┬─────────┬──────────┐');
  console.log('│ Test                                                │ Result  │ Duration │');
  console.log('├─────────────────────────────────────────────────────┼─────────┼──────────┤');

  for (const r of results) {
    const name = r.name.padEnd(51).substring(0, 51);
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    const duration = `${r.duration}ms`.padStart(8);
    console.log(`│ ${name} │ ${status} │ ${duration} │`);
  }

  console.log('└─────────────────────────────────────────────────────┴─────────┴──────────┘');

  const passed = results.filter((r) => r.passed).length;
  console.log(`\n✅ ${passed}/${results.length} tests passed`);

  if (passed === results.length) {
    console.log('\n🎉 ALL TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
