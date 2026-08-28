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
  createTeacherReviewPacket({
    id: 'review-piano-paradis-an-das-klavier-opening',
    sourceId: 'piano-openscore-paradis-an-das-klavier',
    excerpt: { kind: 'measure-range', measureStart: 1, measureEnd: 8, staffIds: [2, 3] },
    focusTags: ['grand-staff', 'multi-staff', '2-4-meter', 'piano-accompaniment', 'meter-rhythm', 'voice-assignment'],
    notes: 'New CC0 piano reference excerpt. Source inspection confirms a two-staff Pianoforte part and 2/4 opening. Remains PENDING until explicit musical review.',
  }),
  createTeacherReviewPacket({
    id: 'review-piano-webern-op4-no4-opening',
    sourceId: 'piano-openscore-webern-op4-no4',
    excerpt: { kind: 'measure-range', measureStart: 1, measureEnd: 8, staffIds: [2, 3] },
    focusTags: ['grand-staff', 'multi-staff', '3-8-meter', 'irregular-opening-measure', 'modern-notation', 'meter-rhythm', 'voice-assignment'],
    notes: 'New CC0 piano reference excerpt. Source inspection confirms a grand-piano part and an irregular opening measure in a 3/8 score. Remains PENDING until explicit musical review.',
  }),
  createTeacherReviewPacket({
    id: 'review-guitar-tarrega-lagrima-opening',
    sourceId: 'classical-guitar-tarrega-lagrima',
    excerpt: { kind: 'measure-range', measureStart: 1, measureEnd: 8, staffIds: [1] },
    focusTags: ['three-voice-polyphony', 'treble-8', '3-4-meter', 'fingering', 'string-number', 'barre', 'glissando', 'voice-assignment'],
    notes: 'New CC0 classical-guitar reference excerpt. Source inspection confirms explicit high, low and middle voices with guitar-specific notation. Remains PENDING until explicit musical review.',
  }),
  createTeacherReviewPacket({
    id: 'review-guitar-dowland-fantasia-7-opening',
    sourceId: 'classical-guitar-dowland-fantasia-7',
    excerpt: { kind: 'measure-range', measureStart: 1, measureEnd: 8, staffIds: [1] },
    focusTags: ['four-voice-polyphony', 'treble-8', '2-2-meter', 'tuplets', 'ties', 'arpeggios', 'fingering', 'string-number', 'voice-assignment'],
    notes: 'New CC0 classical-guitar reference excerpt. Source inspection confirms four explicit voice layers and complex relation material. Remains PENDING until explicit musical review.',
  }),
])

export function getReferenceReviewPacket(id) {
  const packet = REFERENCE_REVIEW_QUEUE.find((entry) => entry.id === id)
  if (!packet) throw new TypeError(`Unknown reference review packet: ${id}`)
  return packet
}
