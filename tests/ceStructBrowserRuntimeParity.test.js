import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

import { processSesliTabTeacherStructuralEdit as processNodeEdit } from '../adapters/seslitab/teacherStructuralEditAdapter.js'
import {
  createTeacherEditAuthorization as createNodeAuthorization,
  createTeacherStructuralPatch as createNodePatch,
  createTeacherStructuralPatchSet as createNodePatchSet,
  fingerprintScoreGraph as fingerprintNodeGraph,
} from '../src/contracts/teacherStructuralPatch.js'
import { createMeasure as createNodeMeasure } from '../src/model/measure.js'
import { createScoreEvent as createNodeEvent } from '../src/model/scoreEvent.js'
import { createScoreGraph as createNodeGraph } from '../src/model/scoreGraph.js'

const artifactUrl = new URL('../dist/browser/ce-struct-browser-runtime.js', import.meta.url)

function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

async function loadBrowserRuntime() {
  const source = await readFile(artifactUrl, 'utf8')
  const context = vm.createContext({
    TextEncoder,
    TextDecoder,
    Uint8Array,
  })
  vm.runInContext(source, context, { filename: 'ce-struct-browser-runtime.js' })
  return context.STOmrCorrectionCeStructRuntime
}

const nodeRuntime = Object.freeze({
  createMeasure: createNodeMeasure,
  createScoreEvent: createNodeEvent,
  createScoreGraph: createNodeGraph,
  createTeacherEditAuthorization: createNodeAuthorization,
  createTeacherStructuralPatch: createNodePatch,
  createTeacherStructuralPatchSet: createNodePatchSet,
  fingerprintScoreGraph: fingerprintNodeGraph,
  processSesliTabTeacherStructuralEdit: processNodeEdit,
})

function makeGraph(runtime, { overlap = false, expectedFindings = false } = {}) {
  const measure = runtime.createMeasure({ key: 'm1', beats: 4, beatType: 4 })

  if (overlap) {
    return runtime.createScoreGraph({
      sourceId: 'ce-browser-overlap',
      measures: [measure],
      events: [
        runtime.createScoreEvent({
          id: 'a', measureKey: 'm1', onset: 0, duration: 2,
          voice: 1, staff: 1, pitch: 60,
        }),
        runtime.createScoreEvent({
          id: 'b', measureKey: 'm1', onset: 1, duration: 1,
          voice: 2, staff: 1, pitch: 62,
        }),
      ],
    })
  }

  return runtime.createScoreGraph({
    sourceId: expectedFindings ? 'ce-browser-findings' : 'ce-browser-source',
    measures: [measure],
    events: [
      runtime.createScoreEvent({
        id: 'n1',
        measureKey: 'm1',
        onset: 0,
        duration: 1,
        voice: 1,
        staff: 1,
        pitch: 60,
        isRest: false,
        metadata: expectedFindings ? { expectedStaff: 2 } : { tieTypes: ['start'] },
      }),
      runtime.createScoreEvent({
        id: 'r1',
        measureKey: 'm1',
        onset: 1,
        duration: 1,
        voice: 1,
        staff: 1,
        pitch: expectedFindings ? 62 : null,
        isRest: !expectedFindings,
        metadata: expectedFindings ? { expectedPitch: 63 } : null,
      }),
    ],
  })
}

function makePatchSet(runtime, source, patches, id = 'ce-browser-set', overrides = {}) {
  return runtime.createTeacherStructuralPatchSet({
    patchSetId: id,
    baseSourceId: overrides.baseSourceId ?? source.sourceId,
    baseGraphFingerprint:
      overrides.baseGraphFingerprint ?? runtime.fingerprintScoreGraph(source),
    authorization:
      overrides.authorization
      ?? runtime.createTeacherEditAuthorization({ actionId: 'ce-browser-teacher-action' }),
    patches,
  })
}

function insertedEvent(id, { rest = false } = {}) {
  return {
    id,
    measureKey: 'm1',
    onset: 2,
    duration: 0.5,
    voice: 2,
    staff: 1,
    pitch: rest ? null : 64,
    isRest: rest,
    isChordTone: false,
    metadata: null,
  }
}

function comparePackets(nodePacket, browserPacket) {
  assert.deepEqual(plain(browserPacket), plain(nodePacket))
}

test('CE-STRUCT browser fingerprint exactly matches Node for canonical and Unicode graphs', async () => {
  const browser = await loadBrowserRuntime()

  for (const sourceId of ['ce-browser-source', 'öğretmen-düzeltmesi-şğü']) {
    const nodeGraph = nodeRuntime.createScoreGraph({
      sourceId,
      measures: [nodeRuntime.createMeasure({ key: 'm1', beats: 4, beatType: 4 })],
      events: [
        nodeRuntime.createScoreEvent({
          id: 'n1', measureKey: 'm1', onset: 0, duration: 1,
          voice: 1, staff: 1, pitch: 60, metadata: { label: 'İzmir' },
        }),
      ],
    })
    const browserGraph = browser.createScoreGraph(plain(nodeGraph))

    assert.equal(
      browser.fingerprintScoreGraph(browserGraph),
      nodeRuntime.fingerprintScoreGraph(nodeGraph),
    )
  }
})

test('CE-STRUCT browser runtime matches Node for every admitted structural operation', async () => {
  const browser = await loadBrowserRuntime()

  const cases = [
    {
      name: 'insert note',
      patch(runtime, source) {
        return runtime.createTeacherStructuralPatch({
          operation: 'INSERT_EVENT',
          measureKey: 'm1',
          eventId: 'n2',
          eventIndex: 2,
          before: null,
          after: insertedEvent('n2'),
        })
      },
    },
    {
      name: 'insert rest',
      patch(runtime, source) {
        return runtime.createTeacherStructuralPatch({
          operation: 'INSERT_EVENT',
          measureKey: 'm1',
          eventId: 'r2',
          eventIndex: 2,
          before: null,
          after: insertedEvent('r2', { rest: true }),
        })
      },
    },
    {
      name: 'remove first event',
      patch(runtime, source) {
        return runtime.createTeacherStructuralPatch({
          operation: 'REMOVE_EVENT',
          measureKey: 'm1',
          eventId: 'n1',
          eventIndex: 0,
          before: source.events[0],
          after: null,
        })
      },
    },
    {
      name: 'duration',
      patch(runtime) {
        return runtime.createTeacherStructuralPatch({
          operation: 'CHANGE_EVENT_DURATION',
          measureKey: 'm1',
          eventId: 'n1',
          before: 1,
          after: 0.5,
        })
      },
    },
    {
      name: 'voice',
      patch(runtime) {
        return runtime.createTeacherStructuralPatch({
          operation: 'CHANGE_EVENT_VOICE',
          measureKey: 'm1',
          eventId: 'n1',
          before: 1,
          after: 2,
        })
      },
    },
    {
      name: 'staff',
      patch(runtime) {
        return runtime.createTeacherStructuralPatch({
          operation: 'CHANGE_EVENT_STAFF',
          measureKey: 'm1',
          eventId: 'n1',
          before: 1,
          after: 2,
        })
      },
    },
    {
      name: 'tie',
      patch(runtime) {
        return runtime.createTeacherStructuralPatch({
          operation: 'CHANGE_EVENT_TIE',
          measureKey: 'm1',
          eventId: 'n1',
          before: ['start'],
          after: ['start', 'stop'],
        })
      },
    },
    {
      name: 'meter',
      patch(runtime) {
        return runtime.createTeacherStructuralPatch({
          operation: 'CHANGE_MEASURE_METER',
          measureKey: 'm1',
          before: { beats: 4, beatType: 4, implicit: false, pickup: false },
          after: { beats: 3, beatType: 4, implicit: false, pickup: false },
        })
      },
    },
  ]

  for (const item of cases) {
    const nodeSource = makeGraph(nodeRuntime)
    const browserSource = makeGraph(browser)
    const nodePatch = item.patch(nodeRuntime, nodeSource)
    const browserPatch = item.patch(browser, browserSource)

    const nodePacket = nodeRuntime.processSesliTabTeacherStructuralEdit({
      scoreGraph: nodeSource,
      patchSet: makePatchSet(nodeRuntime, nodeSource, [nodePatch], `node-${item.name}`),
    })
    const browserPacket = browser.processSesliTabTeacherStructuralEdit({
      scoreGraph: browserSource,
      patchSet: makePatchSet(browser, browserSource, [browserPatch], `node-${item.name}`),
    })

    comparePackets(nodePacket, browserPacket)
    assert.equal(
      browserPacket.revalidation?.reversibilityVerified ?? true,
      nodePacket.revalidation?.reversibilityVerified ?? true,
      item.name,
    )
  }
})

test('CE-STRUCT browser runtime matches Node for mixed ordered patch sets and exact rollback proof', async () => {
  const browser = await loadBrowserRuntime()
  const nodeSource = makeGraph(nodeRuntime)
  const browserSource = makeGraph(browser)

  const nodePatches = [
    nodeRuntime.createTeacherStructuralPatch({
      operation: 'CHANGE_EVENT_DURATION',
      measureKey: 'm1', eventId: 'n1', before: 1, after: 0.5,
    }),
    nodeRuntime.createTeacherStructuralPatch({
      operation: 'INSERT_EVENT',
      measureKey: 'm1',
      eventId: 'n2',
      eventIndex: 2,
      before: null,
      after: insertedEvent('n2'),
    }),
  ]
  const browserPatches = nodePatches.map((patch) =>
    browser.createTeacherStructuralPatch(plain(patch)))

  const nodePacket = nodeRuntime.processSesliTabTeacherStructuralEdit({
    scoreGraph: nodeSource,
    patchSet: makePatchSet(nodeRuntime, nodeSource, nodePatches, 'mixed-parity'),
  })
  const browserPacket = browser.processSesliTabTeacherStructuralEdit({
    scoreGraph: browserSource,
    patchSet: makePatchSet(browser, browserSource, browserPatches, 'mixed-parity'),
  })

  comparePackets(nodePacket, browserPacket)
  assert.equal(browserPacket.projection.ok, true)
  assert.equal(browserPacket.revalidation.reversibilityVerified, true)
})

test('CE-STRUCT browser runtime matches Node on stale fingerprint and stale before fail-closed cases', async () => {
  const browser = await loadBrowserRuntime()

  for (const mode of ['fingerprint', 'before']) {
    const nodeSource = makeGraph(nodeRuntime)
    const browserSource = makeGraph(browser)

    const nodePatch = nodeRuntime.createTeacherStructuralPatch({
      operation: 'CHANGE_EVENT_DURATION',
      measureKey: 'm1',
      eventId: 'n1',
      before: mode === 'before' ? 99 : 1,
      after: 0.5,
    })
    const browserPatch = browser.createTeacherStructuralPatch(plain(nodePatch))

    const options = mode === 'fingerprint'
      ? { baseGraphFingerprint: 'b'.repeat(64) }
      : {}

    const nodePacket = nodeRuntime.processSesliTabTeacherStructuralEdit({
      scoreGraph: nodeSource,
      patchSet: makePatchSet(nodeRuntime, nodeSource, [nodePatch], `stale-${mode}`, options),
    })
    const browserPacket = browser.processSesliTabTeacherStructuralEdit({
      scoreGraph: browserSource,
      patchSet: makePatchSet(browser, browserSource, [browserPatch], `stale-${mode}`, options),
    })

    comparePackets(nodePacket, browserPacket)
    assert.equal(browserPacket.projection.ok, false)
    assert.equal(browserPacket.revalidation, null)
    assert.equal(browserPacket.teacherCorrectedRevisionEligible, false)
  }
})

test('CE-STRUCT browser runtime matches Node when independent revalidation fails', async () => {
  const browser = await loadBrowserRuntime()
  const nodeSource = makeGraph(nodeRuntime, { overlap: true })
  const browserSource = makeGraph(browser, { overlap: true })

  const nodePatch = nodeRuntime.createTeacherStructuralPatch({
    operation: 'CHANGE_EVENT_VOICE',
    measureKey: 'm1',
    eventId: 'b',
    before: 2,
    after: 1,
  })
  const browserPatch = browser.createTeacherStructuralPatch(plain(nodePatch))

  const nodePacket = nodeRuntime.processSesliTabTeacherStructuralEdit({
    scoreGraph: nodeSource,
    patchSet: makePatchSet(nodeRuntime, nodeSource, [nodePatch], 'overlap-parity'),
  })
  const browserPacket = browser.processSesliTabTeacherStructuralEdit({
    scoreGraph: browserSource,
    patchSet: makePatchSet(browser, browserSource, [browserPatch], 'overlap-parity'),
  })

  comparePackets(nodePacket, browserPacket)
  assert.equal(browserPacket.projection.ok, true)
  assert.equal(browserPacket.revalidation.integrityDecision, 'FAIL')
  assert.equal(
    browserPacket.revalidation.newFindings.some((finding) => finding.code === 'VOICE_OVERLAP'),
    true,
  )
  assert.equal(browserPacket.teacherCorrectedRevisionEligible, false)
})

test('CE-STRUCT browser runtime matches Node residual/resolved finding classification and hard authority flags', async () => {
  const browser = await loadBrowserRuntime()
  const nodeSource = makeGraph(nodeRuntime, { expectedFindings: true })
  const browserSource = makeGraph(browser, { expectedFindings: true })

  const nodePatch = nodeRuntime.createTeacherStructuralPatch({
    operation: 'CHANGE_EVENT_STAFF',
    measureKey: 'm1',
    eventId: 'n1',
    before: 1,
    after: 2,
  })
  const browserPatch = browser.createTeacherStructuralPatch(plain(nodePatch))

  const nodePacket = nodeRuntime.processSesliTabTeacherStructuralEdit({
    scoreGraph: nodeSource,
    patchSet: makePatchSet(nodeRuntime, nodeSource, [nodePatch], 'findings-parity'),
  })
  const browserPacket = browser.processSesliTabTeacherStructuralEdit({
    scoreGraph: browserSource,
    patchSet: makePatchSet(browser, browserSource, [browserPatch], 'findings-parity'),
  })

  comparePackets(nodePacket, browserPacket)
  assert.equal(browserPacket.revalidation.integrityDecision, 'PASS')
  assert.equal(
    browserPacket.revalidation.residualFindings.some(
      (finding) => finding.code === 'PITCH_EXPLICIT_PITCH_MISMATCH'),
    true,
  )
  assert.equal(
    browserPacket.revalidation.resolvedFindings.some(
      (finding) => finding.code === 'STAFF_EXPLICIT_STAFF_MISMATCH'),
    true,
  )

  for (const field of [
    'automaticApplyAuthority',
    'finalTeacherApproval',
    'studentShareEligible',
    'musicXmlWriteBackAuthority',
    'learningAuthority',
  ]) {
    assert.equal(browserPacket[field], false)
  }
})

test('CE-STRUCT browser and Node constructors reject unsupported structural operations identically', async () => {
  const browser = await loadBrowserRuntime()
  const input = {
    operation: 'UNSUPPORTED_OPERATION',
    measureKey: 'm1',
    before: null,
    after: null,
  }

  let nodeError
  let browserError
  try {
    nodeRuntime.createTeacherStructuralPatch(input)
  } catch (error) {
    nodeError = error
  }
  try {
    browser.createTeacherStructuralPatch(input)
  } catch (error) {
    browserError = error
  }

  assert.equal(browserError?.name, nodeError?.name)
  assert.equal(browserError?.message, nodeError?.message)
  assert.equal(browserError?.message, 'Unsupported teacher structural operation.')
})
