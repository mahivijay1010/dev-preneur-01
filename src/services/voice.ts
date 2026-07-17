// Voice logging. On the web build we use the browser's SpeechRecognition API to
// transcribe speech; on native (no Web Speech API) callers fall back to typing.
// The parser turns a plain sentence like "weighed 82 kilos, slept 7 hours and
// finished my workout" into a DailyLog patch, always shown to the user for
// review before it's saved.

import { Platform } from 'react-native';

import type { DailyLog } from '../types';

type Scale = 1 | 2 | 3 | 4 | 5;

export interface ParsedLog {
  patch: Partial<DailyLog>;
  // Human-readable summary of what we understood, for the review screen.
  detected: { label: string; value: string }[];
}

// --- Speech recognition (web only) -----------------------------------------

function getRecognitionCtor(): any {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function isVoiceEnabled(): boolean {
  return getRecognitionCtor() !== null;
}

export interface VoiceSession {
  stop: () => void;
}

// Starts listening. onPartial fires with the best-so-far transcript; onFinal
// fires once with the complete transcript when recognition ends.
export function startListening(handlers: {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
}): VoiceSession | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    handlers.onError('Voice input is only available in a browser that supports speech recognition.');
    return null;
  }
  const recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let finalText = '';
  recognition.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += chunk;
      else interim += chunk;
    }
    handlers.onPartial?.((finalText + interim).trim());
  };
  recognition.onerror = (event: any) => {
    handlers.onError(event?.error === 'not-allowed'
      ? 'Microphone access was blocked. Allow it in your browser to use voice logging.'
      : 'Could not hear that clearly — please try again.');
  };
  recognition.onend = () => {
    handlers.onFinal(finalText.trim());
  };

  try {
    recognition.start();
  } catch {
    handlers.onError('Voice input could not start.');
    return null;
  }
  return { stop: () => { try { recognition.stop(); } catch { /* ignore */ } } };
}

// --- Natural-language parsing ----------------------------------------------

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  half: 0.5, a: 1, an: 1,
};

// Finds a number that appears right before any of the given unit keywords.
// Accepts digits ("2000"), decimals ("7.5") and simple words ("seven").
function numberBefore(text: string, units: string[]): number | null {
  const unitAlt = units.join('|');
  const digit = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${unitAlt})`, 'i');
  const digitMatch = text.match(digit);
  if (digitMatch) return parseFloat(digitMatch[1]);

  const wordAlt = Object.keys(WORD_NUMBERS).join('|');
  const word = new RegExp(`(${wordAlt})\\s+(?:${unitAlt})`, 'i');
  const wordMatch = text.match(word);
  if (wordMatch) return WORD_NUMBERS[wordMatch[1].toLowerCase()];
  return null;
}

function firstNumberAfter(text: string, keywords: string[]): number | null {
  const kw = keywords.join('|');
  const digit = new RegExp(`(?:${kw})\\D{0,12}?(\\d+(?:\\.\\d+)?)`, 'i');
  const m = text.match(digit);
  if (m) return parseFloat(m[1]);
  const wordAlt = Object.keys(WORD_NUMBERS).join('|');
  const word = new RegExp(`(?:${kw})\\s+(?:is\\s+|was\\s+|at\\s+)?(${wordAlt})\\b`, 'i');
  const wm = text.match(word);
  if (wm) return WORD_NUMBERS[wm[1].toLowerCase()];
  return null;
}

function toScale(n: number | null): Scale | null {
  if (n === null) return null;
  const r = Math.round(n);
  if (r < 1 || r > 5) return null;
  return r as Scale;
}

// Parses a spoken/typed sentence into a DailyLog patch.
export function parseLog(raw: string): ParsedLog {
  const text = ` ${raw.toLowerCase().replace(/,/g, ' ')} `;
  const patch: Partial<DailyLog> = {};
  const detected: { label: string; value: string }[] = [];

  // Weight — kg or lb (convert lb → kg).
  const kg = numberBefore(text, ['kgs', 'kg', 'kilograms', 'kilogram', 'kilos', 'kilo']);
  const lb = numberBefore(text, ['lbs', 'lb', 'pounds', 'pound']);
  const weightKw = firstNumberAfter(text, ['weigh', 'weighed', 'weight', 'i am', 'bodyweight']);
  if (kg !== null) { patch.weightKg = round1(kg); detected.push({ label: 'Weight', value: `${round1(kg)} kg` }); }
  else if (lb !== null) { const v = round1(lb * 0.4536); patch.weightKg = v; detected.push({ label: 'Weight', value: `${v} kg (from ${lb} lb)` }); }
  else if (weightKw !== null && weightKw >= 30 && weightKw <= 300) { patch.weightKg = round1(weightKw); detected.push({ label: 'Weight', value: `${round1(weightKw)} kg` }); }

  // Water — litres or ml.
  const litres = numberBefore(text, ['litres', 'liters', 'litre', 'liter', 'l']);
  const ml = numberBefore(text, ['milliliters', 'millilitres', 'ml']);
  const glasses = numberBefore(text, ['glasses', 'glass', 'cups', 'cup']);
  if (ml !== null) { patch.waterMl = Math.round(ml); detected.push({ label: 'Water', value: `${Math.round(ml)} ml` }); }
  else if (litres !== null && /water|drank|drink|hydrat/.test(text)) { patch.waterMl = Math.round(litres * 1000); detected.push({ label: 'Water', value: `${litres} L` }); }
  else if (glasses !== null && /water|drank|drink|hydrat/.test(text)) { patch.waterMl = Math.round(glasses * 250); detected.push({ label: 'Water', value: `${glasses} glass (${Math.round(glasses * 250)} ml)` }); }

  // Steps.
  const steps = numberBefore(text, ['steps', 'step']);
  if (steps !== null) { patch.steps = Math.round(steps); detected.push({ label: 'Steps', value: `${Math.round(steps)}` }); }

  // Sleep — hours.
  const sleep = numberBefore(text, ['hours', 'hour', 'hrs', 'hr']);
  if (sleep !== null && /sle(e)?p|slept|rest/.test(text)) { patch.sleepHours = round1(sleep); detected.push({ label: 'Sleep', value: `${round1(sleep)} h` }); }

  // Energy & hunger (1–5).
  const energy = toScale(firstNumberAfter(text, ['energy', 'energetic']));
  if (energy !== null) { patch.energy = energy; detected.push({ label: 'Energy', value: `${energy}/5` }); }
  const hunger = toScale(firstNumberAfter(text, ['hunger', 'hungry', 'appetite']));
  if (hunger !== null) { patch.hunger = hunger; detected.push({ label: 'Hunger', value: `${hunger}/5` }); }

  // Workout completion.
  if (/(did|done|finished|completed|smashed|crushed)\s+(my\s+)?(workout|training|session|exercise|gym|lift)/.test(text)
    || /(workout|training|session)\s+(done|complete|completed|finished)/.test(text)
    || /(went to the|hit the)\s+gym/.test(text)) {
    patch.workoutCompleted = true;
    detected.push({ label: 'Workout', value: 'Completed' });
  } else if (/(skipped|missed|didn't|did not|no)\s+(my\s+)?(workout|training|session|gym)/.test(text)) {
    patch.workoutCompleted = false;
    detected.push({ label: 'Workout', value: 'Not done' });
  }

  return { patch, detected };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
