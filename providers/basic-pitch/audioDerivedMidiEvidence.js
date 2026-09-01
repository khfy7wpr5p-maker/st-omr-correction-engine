import { analyzeMidiReferenceEvidence } from '../../adapters/midi/midiEvidenceBridge.js'
import { createAudioDerivedMidiReference, deriveMidiReferenceFromAudio } from './basicPitchProvider.js'

function audioSnapshot(audioInput) {
  if (Buffer.isBuffer(audioInput) || audioInput instanceof Uint8Array) return Buffer.from(audioInput)
  return null
}

export function analyzeAudioDerivedMidiEvidence({
  scoreGraph,
  audioInput,
  sourceId,
  fileName = null,
  alignmentContext = {},
  options = {},
  providerOptions = {},
} = {}) {
  if (!scoreGraph || typeof scoreGraph !== 'object') throw new TypeError('scoreGraph is required.')
  const before = audioSnapshot(audioInput)
  const providerResult = deriveMidiReferenceFromAudio(audioInput, { sourceId, fileName, ...providerOptions })
  const audioBytesUnchanged = before ? before.equals(Buffer.from(audioInput)) : true
  if (!audioBytesUnchanged) throw new Error('CE-AUDIO source immutability invariant failed.')

  if (!providerResult.ok) {
    return Object.freeze({
      mode: 'SHADOW_ONLY',
      authority: 'SHADOW_EVIDENCE_ONLY',
      sourceType: providerResult.sourceType,
      providerResult,
      midiEvidence: null,
      diagnostics: Object.freeze([]),
      evidence: Object.freeze([]),
      metrics: Object.freeze({
        ...providerResult.metrics,
        alignment_success_rate: 0,
        event_match_coverage: 0,
        pitch_agreement_rate: 0,
        onset_agreement_rate: 0,
        duration_agreement_rate: 0,
        ambiguous_match_rate: 0,
        unaligned_rate: 1,
        wrong_piece_rejection_rate: 0,
        audio_derived_vs_trusted_reference_delta: null,
      }),
      invariants: Object.freeze({
        audioBytesUnchanged,
        sourceMutation: false,
        automaticCorrectionAuthority: false,
        correctionPatchesProduced: false,
      }),
    })
  }

  const reference = createAudioDerivedMidiReference(providerResult)
  const midiEvidence = analyzeMidiReferenceEvidence({
    scoreGraph,
    midiInput: reference.midiInput,
    provenance: reference.provenance,
    alignmentContext,
    options,
  })
  if (midiEvidence.midiReference.sha256 !== providerResult.generatedMidiSha256) {
    throw new Error('CE-AUDIO generated MIDI provenance invariant failed.')
  }
  const wrongPieceRejected = midiEvidence.alignment?.status === 'UNALIGNED' ? 1 : 0

  return Object.freeze({
    mode: 'SHADOW_ONLY',
    authority: 'SHADOW_EVIDENCE_ONLY',
    sourceType: providerResult.sourceType,
    providerResult,
    midiEvidence,
    diagnostics: midiEvidence.diagnostics,
    evidence: midiEvidence.evidence,
    metrics: Object.freeze({
      ...providerResult.metrics,
      ...midiEvidence.metrics,
      wrong_piece_rejection_rate: wrongPieceRejected,
      audio_derived_vs_trusted_reference_delta: null,
    }),
    invariants: Object.freeze({
      audioBytesUnchanged,
      scoreUnchanged: midiEvidence.invariants.scoreUnchanged,
      midiBytesUnchanged: midiEvidence.invariants.midiBytesUnchanged,
      sourceMutation: false,
      automaticCorrectionAuthority: false,
      correctionPatchesProduced: false,
    }),
  })
}
