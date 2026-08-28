function sortedNumbers(values) {
  return [...values].sort((a, b) => a - b)
}

export function analyzeCrossStaffContext(events) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array.')
  const voiceStaffs = new Map()
  const beamStaffs = new Map()

  for (const event of events) {
    if (!event || typeof event !== 'object') throw new TypeError('events must contain objects.')
    if (event.isRest) continue
    if (!voiceStaffs.has(event.voice)) voiceStaffs.set(event.voice, new Set())
    voiceStaffs.get(event.voice).add(event.staff)

    const beamGroup = event.metadata?.beamGroup
    if (beamGroup) {
      if (!beamStaffs.has(beamGroup)) beamStaffs.set(beamGroup, new Set())
      beamStaffs.get(beamGroup).add(event.staff)
    }
  }

  const voiceTransitions = [...voiceStaffs.entries()]
    .filter(([, staffs]) => staffs.size > 1)
    .map(([voice, staffs]) => Object.freeze({ voice, staffs: Object.freeze(sortedNumbers(staffs)) }))

  const crossStaffBeamGroups = [...beamStaffs.entries()]
    .filter(([, staffs]) => staffs.size > 1)
    .map(([beamGroup, staffs]) => Object.freeze({ beamGroup, staffs: Object.freeze(sortedNumbers(staffs)) }))

  const present = voiceTransitions.length > 0 || crossStaffBeamGroups.length > 0
  return Object.freeze({
    mode: 'RESEARCH_ONLY',
    status: present ? 'CROSS_STAFF_EVIDENCE' : 'NO_CROSS_STAFF_EVIDENCE',
    crossStaffPresent: present,
    voiceTransitions: Object.freeze(voiceTransitions),
    crossStaffBeamGroups: Object.freeze(crossStaffBeamGroups),
    proposedPatches: Object.freeze([]),
  })
}
