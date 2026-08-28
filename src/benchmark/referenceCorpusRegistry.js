import { createCorpusSource } from './corpusSource.js'

export const REFERENCE_CORPUS = Object.freeze([
  createCorpusSource({
    id: 'piano-openscore-lieder-satie-je-te-veux',
    instrumentProfile: 'piano',
    sourceFormat: 'MuseScore MSCX',
    repository: 'OpenScore/Lieder',
    commitSha: '6b2dc542ce2e8aa4b78c8ee62103b210efc07015',
    filePath: 'scores/Satie,_Erik/_/Je_te_veux/lc6986302.mscx',
    blobSha: 'bd7d6721c841e6b1d88bc9b8c48b1095e301781a',
    license: 'CC0-1.0',
    rights: { benchmarkUse: true, commercialUse: true, trainingUse: true, redistribution: true },
    challengeTags: ['grand-staff', 'piano-accompaniment', 'multi-staff', '3-4-meter'],
    notes: 'Reference-only source. The pinned score contains a two-staff Piano part. It is not teacher-gold until separately approved.',
  }),
  createCorpusSource({
    id: 'classical-guitar-sor-op35-no13-study-in-c',
    instrumentProfile: 'classical-guitar',
    sourceFormat: 'LilyPond',
    repository: 'yawnoc/guitar',
    commitSha: 'fe48dbba46be760fab453b3a72ef35746f20ea48',
    filePath: 'sor-c-major-35-13/sor-c-major-35-13.ly',
    blobSha: 'c96155e3693c4963c1ebf669ed8e54d17c075e77',
    license: 'CC0-1.0',
    rights: { benchmarkUse: true, commercialUse: true, trainingUse: true, redistribution: true },
    challengeTags: ['single-staff-polyphony', 'treble-8', '2-4-meter', 'high-low-voices', 'fingering'],
    notes: 'Reference-only source. The pinned score explicitly separates high and low voices. It is not teacher-gold until separately approved.',
  }),
])

export function getReferenceCorpusSource(id) {
  const source = REFERENCE_CORPUS.find((entry) => entry.id === id)
  if (!source) throw new TypeError(`Unknown reference corpus source: ${id}`)
  return source
}
