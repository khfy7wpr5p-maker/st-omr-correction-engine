function freezeObject(value) {
  return value == null ? null : Object.freeze(value)
}

function nearestContext(items, ticks) {
  let selected = null
  for (const item of items) {
    if (item.ticks > ticks) break
    selected = item
  }
  return selected
}

function sustainContext(track, note) {
  const controls = Array.isArray(track.controlChanges?.[64]) ? track.controlChanges[64] : []
  let activeAtStart = false
  const during = []
  for (const cc of controls) {
    if (cc.ticks <= note.ticks) activeAtStart = cc.value >= 0.5
    if (cc.ticks >= note.ticks && cc.ticks <= note.ticks + note.durationTicks) {
      during.push(Object.freeze({ ticks: cc.ticks, value: cc.value }))
    }
  }
  return Object.freeze({ activeAtStart, changesDuringNote: Object.freeze(during) })
}

function normalizeTempo(header) {
  return Object.freeze(header.tempos.map((tempo) => Object.freeze({
    ticks: tempo.ticks,
    bpm: tempo.bpm,
    time: Number.isFinite(tempo.time) ? tempo.time : header.ticksToSeconds(tempo.ticks),
  })))
}

function normalizeTimeSignatures(header) {
  return Object.freeze(header.timeSignatures.map((signature) => Object.freeze({
    ticks: signature.ticks,
    numerator: signature.timeSignature?.[0] ?? null,
    denominator: signature.timeSignature?.[1] ?? null,
    measures: Number.isFinite(signature.measures) ? signature.measures : null,
  })))
}

export function normalizeParsedMidiReference(parsed) {
  const { midi, sourceId, sourceType, sha256, header } = parsed
  const ppq = midi.header.ppq
  const tempos = normalizeTempo(midi.header)
  const timeSignatures = normalizeTimeSignatures(midi.header)
  const tracks = []
  const events = []

  midi.tracks.forEach((track, trackIndex) => {
    const program = Number.isInteger(track.instrument?.number) ? track.instrument.number : null
    const instrumentName = typeof track.instrument?.name === 'string' && track.instrument.name ? track.instrument.name : null
    const percussion = !!track.instrument?.percussion || track.channel === 9
    const pitchBends = Object.freeze((track.pitchBends ?? []).map((bend) => Object.freeze({ ticks: bend.ticks, value: bend.value })))
    const sustain = Object.freeze((Array.isArray(track.controlChanges?.[64]) ? track.controlChanges[64] : []).map((cc) => Object.freeze({ ticks: cc.ticks, value: cc.value })))

    track.notes.forEach((note, rawIndex) => {
      const tempo = nearestContext(tempos, note.ticks)
      const timeSignature = nearestContext(timeSignatures, note.ticks)
      events.push(Object.freeze({
        eventId: `${sourceId}:T${trackIndex}:N${rawIndex}:${note.ticks}:${note.midi}`,
        sourceId,
        sourceType,
        trackIndex,
        channel: Number.isInteger(track.channel) ? track.channel : null,
        program,
        instrumentName,
        percussion,
        midiPitch: note.midi,
        noteName: note.name,
        velocity: note.velocity,
        startTicks: note.ticks,
        durationTicks: note.durationTicks,
        startSeconds: note.time,
        durationSeconds: note.duration,
        startBeats: Number.isFinite(ppq) && ppq > 0 ? note.ticks / ppq : null,
        durationBeats: Number.isFinite(ppq) && ppq > 0 ? note.durationTicks / ppq : null,
        barPosition: Number.isFinite(ppq) && ppq > 0 ? midi.header.ticksToMeasures(note.ticks) : null,
        tempoContext: freezeObject(tempo ? { ...tempo } : null),
        timeSignatureContext: freezeObject(timeSignature ? { ...timeSignature } : null),
        sustainContext: sustainContext(track, note),
        rawIndex,
      }))
    })

    tracks.push(Object.freeze({
      trackIndex,
      name: track.name || null,
      channel: Number.isInteger(track.channel) ? track.channel : null,
      program,
      instrumentName,
      percussion,
      noteCount: track.notes.length,
      sustain,
      pitchBends,
    }))
  })

  return Object.freeze({
    ok: true,
    sourceId,
    sourceType,
    sha256,
    format: header.format,
    trackCount: header.trackCount,
    ppq,
    tempos,
    timeSignatures,
    tracks: Object.freeze(tracks),
    events: Object.freeze(events),
  })
}
