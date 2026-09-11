import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { guideForChallenge } from '../challengeGuides'

const solvingModes: Record<string, string[]> = {
  WEB: ['소스·DOM 분석', '쿠키·헤더·요청 분석', 'URL·Base64 디코딩'],
  FORENSIC: ['메타데이터·문자열 추출', '로그·패킷 흐름 분석', '파일 시그니처·복구'],
  REVERSING: ['문자열·검증 코드 분석', '연산 역추적', '바이트·키 분석'],
  CRYPTO: ['인코딩·고전 암호', 'XOR·키 반복', '치환·규칙 분석'],
  MISC: ['다중 디코딩', '조각·패턴 결합', '복합 단서 추론'],
}

const sandboxWorkerSource = `
self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.WebSocket = undefined;
self.importScripts = undefined;
self.onmessage = async (event) => {
  const logs = [];
  const safeConsole = {
    log: (...values) => logs.push(values.map((value) => typeof value === 'string' ? value : JSON.stringify(value)).join(' '))
  };
  try {
    const execute = new Function('console', '"use strict"; return (async () => {\\n' + event.data + '\\n})()');
    const result = await execute(safeConsole);
    if (result !== undefined) logs.push(typeof result === 'string' ? result : JSON.stringify(result));
    self.postMessage({ ok: true, output: logs.join('\\n') || '(출력 없음)' });
  } catch (error) {
    self.postMessage({ ok: false, output: error instanceof Error ? error.message : String(error) });
  }
};`

type ArtifactPreview = Awaited<ReturnType<typeof api.previewArtifact>>
type ToolKind = 'base64' | 'base64url' | 'hex' | 'url' | 'html' | 'ascii' | 'binary' | 'rot13' | 'reverse' | 'caesar' | 'xor' | 'strings' | 'spaces'

const fallbackTools: Record<string, Partial<Record<string, ToolKind[]>>> = {
  WEB: {
    BEGINNER: ['base64', 'url', 'html', 'strings'],
    EASY: ['base64', 'base64url', 'hex', 'url', 'html', 'strings'],
    NORMAL: ['base64', 'base64url', 'hex', 'url', 'html', 'reverse', 'strings'],
    ADVANCED: ['base64', 'base64url', 'hex', 'url', 'html', 'rot13', 'reverse', 'xor', 'strings'],
    EXPERT: ['base64', 'base64url', 'hex', 'url', 'html', 'ascii', 'binary', 'rot13', 'reverse', 'caesar', 'xor', 'strings'],
  },
  FORENSIC: {
    BEGINNER: ['hex', 'ascii', 'strings'],
    EASY: ['base64', 'hex', 'ascii', 'strings'],
    NORMAL: ['base64', 'hex', 'ascii', 'binary', 'strings', 'spaces'],
    ADVANCED: ['base64', 'hex', 'ascii', 'binary', 'xor', 'strings', 'spaces'],
    EXPERT: ['base64', 'base64url', 'hex', 'ascii', 'binary', 'reverse', 'xor', 'strings', 'spaces'],
  },
  REVERSING: {
    BEGINNER: ['base64', 'hex', 'rot13', 'reverse', 'strings'],
    EASY: ['base64', 'hex', 'rot13', 'reverse', 'xor', 'strings'],
    NORMAL: ['base64', 'hex', 'ascii', 'rot13', 'reverse', 'caesar', 'xor', 'strings'],
    ADVANCED: ['base64', 'hex', 'ascii', 'binary', 'reverse', 'caesar', 'xor', 'strings'],
    EXPERT: ['base64', 'hex', 'ascii', 'binary', 'reverse', 'caesar', 'xor', 'strings'],
  },
  CRYPTO: {
    BEGINNER: ['base64', 'hex', 'rot13', 'reverse', 'caesar'],
    EASY: ['base64', 'hex', 'html', 'ascii', 'binary', 'rot13', 'reverse', 'caesar', 'xor'],
    NORMAL: ['base64', 'base64url', 'hex', 'html', 'ascii', 'binary', 'rot13', 'reverse', 'caesar', 'xor'],
    ADVANCED: ['base64', 'base64url', 'hex', 'html', 'ascii', 'binary', 'rot13', 'reverse', 'caesar', 'xor', 'strings'],
    EXPERT: ['base64', 'base64url', 'hex', 'html', 'ascii', 'binary', 'rot13', 'reverse', 'caesar', 'xor', 'strings'],
  },
  MISC: {
    BEGINNER: ['base64', 'url', 'html', 'strings'],
    EASY: ['base64', 'hex', 'url', 'html', 'ascii', 'strings'],
    NORMAL: ['base64', 'base64url', 'hex', 'url', 'html', 'ascii', 'binary', 'rot13', 'reverse', 'strings', 'spaces'],
    ADVANCED: ['base64', 'base64url', 'hex', 'url', 'html', 'ascii', 'binary', 'rot13', 'reverse', 'caesar', 'xor', 'strings', 'spaces'],
    EXPERT: ['base64', 'base64url', 'hex', 'url', 'html', 'ascii', 'binary', 'rot13', 'reverse', 'caesar', 'xor', 'strings', 'spaces'],
  },
}

function toolsForChallenge(category: string, difficulty: string, title: string, description: string, artifact: string) {
  const source = `${title} ${description} ${artifact}`.toLowerCase()
  const detected: ToolKind[] = []
  const add = (tool: ToolKind, pattern: RegExp) => { if (pattern.test(source)) detected.push(tool) }
  add('base64url', /base64url|jwt/)
  add('base64', /base64(?!url)|padding|(?:^|[=:\s])[a-z0-9+/]{20,}={0,2}(?:\s|$)/im)
  add('hex', /\bhex\b|payload_hex|expected_hex|cipher_hex|16진수|헥사/)
  add('url', /url 인코딩|percent encoding|퍼센트 인코딩/)
  add('html', /html entity|html 엔터티|문자 엔터티|payload_entity/)
  add('ascii', /ascii|아스키|문자 코드|character_codes/)
  add('binary', /2진수|binary encoding|바이너리 코드/)
  add('rot13', /rot13|text still looks shifted/)
  add('reverse', /뒤집|reverse|역순 문자열|wrong end|reads backwards/)
  add('caesar', /caesar|시저|알파벳.*밀/)
  add('xor', /xor|key\s*=/)
  add('strings', /문자열 추출|strings|메모리 덤프/)
  add('spaces', /줄 끝 공백|공백 스테가노|trailing space| +$/m)
  const unique = [...new Set(detected)]
  return source.trim() ? unique : fallbackTools[category]?.[difficulty] ?? fallbackTools.MISC.BEGINNER ?? []
}

function decodeBase64(value: string) {
  const normalized = value.trim().replace(/\s+/g, '')
  const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function decodeBase64Url(value: string) {
  const part = value.trim().includes('.') ? value.trim().split('.')[1] ?? '' : value.trim()
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/')
  return decodeBase64(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
}

function decodeHex(value: string) {
  const normalized = value.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '')
  if (!normalized || normalized.length % 2 !== 0) throw new Error('HEX 값은 두 글자씩 입력해야 합니다.')
  const bytes = Uint8Array.from(normalized.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16))
  return new TextDecoder().decode(bytes)
}

function rot13(value: string) {
  return value.replace(/[a-z]/gi, (character) => {
    const start = character <= 'Z' ? 65 : 97
    return String.fromCharCode(((character.charCodeAt(0) - start + 13) % 26) + start)
  })
}

function decodeHtmlEntities(value: string) {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function decodeAscii(value: string) {
  const numbers = value.match(/\d+/g)?.map(Number) ?? []
  if (!numbers.length || numbers.some((number) => number > 255)) throw new Error('Invalid ASCII')
  return String.fromCharCode(...numbers)
}

function decodeBinary(value: string) {
  const groups = value.match(/[01]{8}/g) ?? []
  if (!groups.length) throw new Error('Invalid binary')
  return String.fromCharCode(...groups.map((group) => Number.parseInt(group, 2)))
}

function caesarDecode(value: string, shift: number) {
  return value.replace(/[a-z]/gi, (character) => {
    const start = character <= 'Z' ? 65 : 97
    return String.fromCharCode(((character.charCodeAt(0) - start - shift) % 26 + 26) % 26 + start)
  })
}

function xorHexWithKey(value: string, key: string) {
  const normalized = value.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '')
  if (!normalized || normalized.length % 2 !== 0 || !key) throw new Error('Invalid XOR input')
  const bytes = Uint8Array.from(normalized.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16))
  const keyBytes = new TextEncoder().encode(key)
  const decoded = bytes.map((byte, index) => byte ^ keyBytes[index % keyBytes.length])
  return new TextDecoder().decode(decoded)
}

function extractStrings(value: string) {
  const normalized = value.replace(/0x/gi, '').replace(/\s+/g, '')
  const source = normalized.length >= 8 && normalized.length % 2 === 0 && /^[0-9a-f]+$/i.test(normalized)
    ? decodeHex(normalized)
    : value
  const strings = source.match(/[\x20-\x7e]{4,}/g) ?? []
  if (!strings.length) throw new Error('No strings')
  return strings.join('\n')
}

function decodeTrailingSpaces(value: string) {
  const codes = value.split(/\r?\n/)
    .map((line) => line.match(/ +$/)?.[0].length ?? 0)
    .filter((count) => count > 0 && count <= 255)
  if (!codes.length) throw new Error('No trailing-space data')
  return String.fromCharCode(...codes)
}

export default function ChallengeWorkbench({
  challengeId,
  category,
  artifactAvailable,
  onError,
}: {
  challengeId: number
  category: string
  artifactAvailable: boolean
  onError: (message: string) => void
}) {
  const [preview, setPreview] = useState<ArtifactPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [caesarShift, setCaesarShift] = useState('3')
  const [xorKey, setXorKey] = useState('K')
  const [script, setScript] = useState("// console.log()로 중간 값을 확인할 수 있어요.\nconst cipher = [72, 69, 76, 76, 79];\nconsole.log(String.fromCharCode(...cipher));")
  const [scriptOutput, setScriptOutput] = useState('')
  const [scriptRunning, setScriptRunning] = useState(false)
  const [challengeContext, setChallengeContext] = useState({ title: '', description: '', difficulty: 'BEGINNER' })
  const [contextReady, setContextReady] = useState(false)
  const modes = solvingModes[category] ?? solvingModes.MISC
  const previewContent = useMemo(() => preview ? (preview.binary ? preview.hexDump : preview.text) : '', [preview])
  const enabledTools = useMemo(
    () => contextReady ? toolsForChallenge(category, challengeContext.difficulty, challengeContext.title, challengeContext.description, previewContent) : [],
    [category, challengeContext, contextReady, previewContent],
  )
  const toolEnabled = (tool: ToolKind) => enabledTools.includes(tool)
  const showScriptWorkspace = contextReady && (['ADVANCED', 'EXPERT'].includes(challengeContext.difficulty)
    || /lcg|vm|검증기|역산|스크립트|program|nibble|니블|positional|위치별|custom base64|커스텀 base64|치환표/i.test(`${challengeContext.title} ${challengeContext.description}`)
  )

  useEffect(() => {
    let active = true
    api.challenge(challengeId).then((challenge) => {
      const guide = guideForChallenge(challenge.title, challenge.category, challenge.difficulty)
      const analysisText = ['BEGINNER', 'EASY'].includes(challenge.difficulty)
        ? [challenge.description, guide.concept, ...guide.tools].join(' ')
        : challenge.description
      if (active) {
        setChallengeContext({ title: challenge.title, description: analysisText, difficulty: challenge.difficulty })
        setContextReady(true)
      }
    }).catch(() => undefined)
    return () => { active = false }
  }, [challengeId])

  const openArtifact = async () => {
    try {
      setLoading(true)
      onError('')
      const next = await api.previewArtifact(challengeId)
      setPreview(next)
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : '문제 파일을 열지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadArtifact = async () => {
    try {
      onError('')
      await api.downloadArtifact(challengeId)
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : '문제 파일을 다운로드하지 못했습니다.')
    }
  }

  const transform = (kind: ToolKind) => {
    try {
      const transforms = {
        base64: () => decodeBase64(input),
        base64url: () => decodeBase64Url(input),
        hex: () => decodeHex(input),
        url: () => decodeURIComponent(input.replace(/\+/g, ' ')),
        html: () => decodeHtmlEntities(input),
        ascii: () => decodeAscii(input),
        binary: () => decodeBinary(input),
        rot13: () => rot13(input),
        reverse: () => [...input].reverse().join(''),
        caesar: () => caesarDecode(input, Number.parseInt(caesarShift, 10) || 0),
        xor: () => xorHexWithKey(input, xorKey),
        strings: () => extractStrings(input),
        spaces: () => decodeTrailingSpaces(input),
      }
      const result = transforms[kind]()
      setOutput(result)
      onError('')
    } catch {
      onError('입력 형식을 확인해 주세요. 선택한 방식으로 변환할 수 없습니다.')
    }
  }

  const runScript = () => {
    if (!script.trim() || script.length > 10_000) {
      onError('스크립트는 1자 이상 10,000자 이하로 입력해 주세요.')
      return
    }
    const url = URL.createObjectURL(new Blob([sandboxWorkerSource], { type: 'text/javascript' }))
    const worker = new Worker(url)
    setScriptRunning(true)
    setScriptOutput('실행 중…')
    onError('')
    const finish = (output: string) => {
      window.clearTimeout(timer)
      worker.terminate()
      URL.revokeObjectURL(url)
      setScriptOutput(output)
      setScriptRunning(false)
    }
    const timer = window.setTimeout(() => finish('실행 시간이 2초를 초과해 중단했습니다.'), 2_000)
    worker.onmessage = (event: MessageEvent<{ ok: boolean; output: string }>) => finish(event.data.output)
    worker.onerror = () => finish('스크립트를 실행하지 못했습니다.')
    worker.postMessage(script)
  }

  return <section className="panel challenge-workbench">
    <div className="panel-heading"><span>FLAGBOX WORKBENCH</span></div>
    <div className="workbench-heading">
      <div><h2>이 문제의 풀이 방식</h2><p>외부 프로그램으로 이동하지 않고 기본 분석과 디코딩을 진행할 수 있어요.</p></div>
      <div className="solving-mode-list">{modes.map((mode) => <span key={mode}>{mode}</span>)}</div>
    </div>
    {artifactAvailable && <div className="artifact-preview-block">
      <div className="workbench-row"><strong>문제 파일 미리보기</strong><div className="workbench-file-actions"><button className="button primary" type="button" disabled={loading} onClick={() => void openArtifact()}>{loading ? '불러오는 중…' : preview ? '다시 열기' : '브라우저에서 열기'}</button><button className="button secondary" type="button" onClick={() => void downloadArtifact()}>다운로드</button></div></div>
      {preview && <><small>{preview.filename} · {preview.sizeBytes.toLocaleString()} bytes{preview.truncated ? ' · 일부만 표시' : ''} · {preview.binary ? 'HEX 보기' : '텍스트 보기'}</small><textarea className="artifact-preview" value={previewContent} readOnly aria-label="문제 파일 내용" /></>}
    </div>}
    {enabledTools.length > 0 && <div className="decoder-workspace">
      <div><label htmlFor={`decoder-input-${challengeId}`}>분석할 문자열</label><textarea id={`decoder-input-${challengeId}`} value={input} onChange={(event) => setInput(event.target.value)} placeholder="파일에서 찾은 문자열을 붙여 넣으세요." /></div>
      <div className="decoder-actions" aria-label="문자열 변환 방식">
        {toolEnabled('base64') && <button type="button" onClick={() => transform('base64')}>Base64</button>}
        {toolEnabled('base64url') && <button type="button" onClick={() => transform('base64url')}>Base64URL·JWT</button>}
        {toolEnabled('hex') && <button type="button" onClick={() => transform('hex')}>HEX</button>}
        {toolEnabled('url') && <button type="button" onClick={() => transform('url')}>URL</button>}
        {toolEnabled('html') && <button type="button" onClick={() => transform('html')}>HTML Entity</button>}
        {toolEnabled('ascii') && <button type="button" onClick={() => transform('ascii')}>ASCII</button>}
        {toolEnabled('binary') && <button type="button" onClick={() => transform('binary')}>Binary</button>}
        {toolEnabled('rot13') && <button type="button" onClick={() => transform('rot13')}>ROT13</button>}
        {toolEnabled('reverse') && <button type="button" onClick={() => transform('reverse')}>뒤집기</button>}
        {toolEnabled('caesar') && <span className="decoder-option"><input type="number" min="-25" max="25" value={caesarShift} onChange={(event) => setCaesarShift(event.target.value)} aria-label="Caesar 이동값" /><button type="button" onClick={() => transform('caesar')}>Caesar</button></span>}
        {toolEnabled('xor') && <span className="decoder-option"><input value={xorKey} maxLength={32} onChange={(event) => setXorKey(event.target.value)} aria-label="XOR 키" placeholder="key" /><button type="button" onClick={() => transform('xor')}>XOR</button></span>}
        {toolEnabled('strings') && <button type="button" onClick={() => transform('strings')}>문자열 추출</button>}
        {toolEnabled('spaces') && <button type="button" onClick={() => transform('spaces')}>공백 분석</button>}
        <button className="decoder-pipeline" type="button" disabled={!output} onClick={() => { setInput(output); setOutput('') }}>결과 → 입력</button>
      </div>
      <div><label htmlFor={`decoder-output-${challengeId}`}>변환 결과</label><textarea id={`decoder-output-${challengeId}`} value={output} onChange={(event) => setOutput(event.target.value)} placeholder="변환 결과가 여기에 표시됩니다." /></div>
    </div>}
    {showScriptWorkspace && <div className="script-workspace">
      <div className="script-workspace-heading"><div><strong>브라우저 코드 연습장</strong><p>LCG, 미니 VM, 반복 연산처럼 직접 역산해야 하는 문제를 JavaScript로 풀어보세요.</p></div><button className="button primary" type="button" disabled={scriptRunning} onClick={runScript}>{scriptRunning ? '실행 중…' : '코드 실행'}</button></div>
      <div className="script-workspace-grid"><div><label htmlFor={`script-input-${challengeId}`}>JavaScript 코드</label><textarea id={`script-input-${challengeId}`} value={script} maxLength={10_000} spellCheck={false} onChange={(event) => setScript(event.target.value)} /></div><div><label htmlFor={`script-output-${challengeId}`}>실행 결과</label><textarea id={`script-output-${challengeId}`} value={scriptOutput} readOnly placeholder="console.log 결과가 여기에 표시됩니다." /></div></div>
      <small>메인 페이지 및 로그인 저장소와 분리된 Web Worker에서 실행되며 2초 후 자동 종료됩니다. 개인 정보나 실제 서비스 코드는 입력하지 마세요.</small>
    </div>}
  </section>
}
