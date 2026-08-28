export const classicalGuitarProfile = Object.freeze({
  id: 'classical-guitar',
  maxVoices: 4,
  expectedStaffCount: 1,
  allowCrossStaffVoice: false,
  voiceEqualsStaff: false,
  handEqualsStaff: false,
  writtenOctaveTransposition: -1,
  stemVoicePrior: Object.freeze({ up: 1, down: 2 }),
  semanticHints: Object.freeze(['fingering-number', 'string-number', 'harmonic', 'slur', 'tie', 'arpeggiation']),
})
