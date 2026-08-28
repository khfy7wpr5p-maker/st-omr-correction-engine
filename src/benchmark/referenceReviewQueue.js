import { createTeacherReviewPacket } from './teacherReviewPacket.js'

export const REFERENCE_REVIEW_QUEUE = Object.freeze([
  createTeacherReviewPacket({
    id: 'review-piano-satie-je-te-veux-opening',
    sourceId: 'piano-openscore-lieder-satie-je-te-veux',
    excerpt: { kind: 'measure-range', measureStart: 1, measureEnd: 8, staffIds: [2, 3] },
    focusTags: ['grand-staff', 'multi-staff', 'meter-rhythm', 'voice-assignment', 'multi-voice-upper-staff', 'ties', 'arpeggiated-chords'],
    notes: 'Opening piano excerpt selected for rendered teacher review. Source inspection confirms multiple voices on the upper piano staff plus ties and arpeggiated chord material. Pending by default; this source inspection is not teacher approval.',
  }),
  createTeacherReviewPacket({
    id: 'review-guitar-sor-op35-no13-home-theme',
    sourceId: 'classical-guitar-sor-op35-no13-study-in-c',
    excerpt: { kind: 'measure-range', measureStart: 1, measureEnd: 8, staffIds: [1] },
    focusTags: ['three-voice-polyphony', 'upper-melody', 'sustained-bass', 'middle-arpeggio-voice', 'fingering', 'string-number', 'treble-8', '2-4-meter', 'voice-assignment'],
    notes: 'Home-theme excerpt selected for rendered teacher review. Source inspection confirms separate high, low and middle voice material; the middle voice uses repeated sixteenth-note arpeggiation. Pending by default; this source inspection is not teacher approval.',
  }),
])

export function getReferenceReviewPacket(id) {
  const packet = REFERENCE_REVIEW_QUEUE.find((entry) => entry.id === id)
  if (!packet) throw new TypeError(`Unknown reference review packet: ${id}`)
  return packet
}
