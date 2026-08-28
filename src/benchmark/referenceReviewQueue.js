import { createTeacherReviewPacket } from './teacherReviewPacket.js'

export const REFERENCE_REVIEW_QUEUE = Object.freeze([
  createTeacherReviewPacket({
    id: 'review-piano-satie-je-te-veux-opening',
    sourceId: 'piano-openscore-lieder-satie-je-te-veux',
    excerpt: { kind: 'measure-range', measureStart: 1, measureEnd: 8, staffIds: [2, 3] },
    focusTags: ['grand-staff', 'multi-staff', 'meter-rhythm', 'voice-assignment'],
    notes: 'Opening piano excerpt selected for future rendered teacher review. Pending by default.',
  }),
  createTeacherReviewPacket({
    id: 'review-guitar-sor-op35-no13-home-theme',
    sourceId: 'classical-guitar-sor-op35-no13-study-in-c',
    excerpt: { kind: 'measure-range', measureStart: 1, measureEnd: 8, staffIds: [1] },
    focusTags: ['high-low-voices', 'fingering', 'treble-8', '2-4-meter', 'voice-assignment'],
    notes: 'Home-theme excerpt selected for future rendered teacher review. Pending by default.',
  }),
])

export function getReferenceReviewPacket(id) {
  const packet = REFERENCE_REVIEW_QUEUE.find((entry) => entry.id === id)
  if (!packet) throw new TypeError(`Unknown reference review packet: ${id}`)
  return packet
}
