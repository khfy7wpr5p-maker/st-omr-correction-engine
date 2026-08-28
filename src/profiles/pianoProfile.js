export const pianoProfile = Object.freeze({
  id: 'piano',
  maxVoices: 4,
  expectedStaffCount: 2,
  allowCrossStaffVoice: true,
  voiceEqualsStaff: false,
  handEqualsStaff: false,
  stemVoicePrior: Object.freeze({ up: 1, down: 2 }),
  semanticHints: Object.freeze(['cross-staff', 'pedal', 'hand-crossing', 'shared-chord', 'tuplet']),
})
