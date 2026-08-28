import test from 'node:test'
import assert from 'node:assert/strict'
import { createVisualLocalizationEvidence } from '../src/index.js'

test('visual evidence binds a semantic event to an explicit source region', () => {
  const evidence = createVisualLocalizationEvidence({
    eventId: 'N1', page: 1, systemId: 'sys-1', measureId: 'm-3', staffId: 2,
    bbox: { x: 10, y: 20, width: 30, height: 40 }, imageCropRef: 'crop://source/1',
    localizationConfidence: 0.92, sourceQuality: { blur: 0.1, skew: 0.02 },
  })
  assert.equal(evidence.source, 'visual')
  assert.equal(evidence.code, 'IMAGE_LOCALIZATION')
  assert.equal(evidence.weight, 0.92)
  assert.equal(evidence.location.staffId, 2)
  assert.equal(evidence.details.sourceQuality.blur, 0.1)
})

test('visual localization refuses invalid confidence instead of guessing', () => {
  assert.throws(() => createVisualLocalizationEvidence({
    eventId: 'N1', page: 1, systemId: 's', measureId: 'm', staffId: 1,
    bbox: { x: 0, y: 0, width: 1, height: 1 }, imageCropRef: 'crop', localizationConfidence: 1.2,
  }), /between 0 and 1/)
})
