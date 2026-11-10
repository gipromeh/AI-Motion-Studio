import { useEffect, useRef, useState } from 'react';
import {
  Activity, AudioLines, Box, Check, ChevronDown, CircleHelp, Download, Film,
  FolderPlus, Layers3, LoaderCircle, Maximize2, Pause, Play, Plus, RotateCcw,
  Save, Settings2, Sparkles, SlidersHorizontal, Volume2, X
} from 'lucide-react';
import { MotionRenderer } from '../engine/renderer';
import { MotionAudio } from '../engine/audio';
import type { SceneId } from '../engine/scene';
import { upsertKeyframe, removeKeyframe, type Keyframe } from '../engine/keyframes';
import { exportMp4 } from '../engine/exporter';
import { discoverLmStudioModels, generateSceneFromPrompt } from '../engine/lmStudio';
import { generateProceduralScene } from '../engine/proceduralDirector';
import { validateGeneratedScene, type GeneratedSceneSpec } from '../engine/generatedScene';

const projects: { id: SceneId; title: string; subtitle: string; duration: number; category: string; number: string }[] = [
  { id: 'type', title: 'FUTURE', subtitle: 'Kinetic typography', duration: 15, category: 'Typography', number: '01' },
  { id: 'product', title: 'OPTIC', subtitle: 'Precision product film', duration: 20, category: 'Product', number: '02' },
  { id: 'science', title: 'ORBIT', subtitle: 'Scientific visualization', duration: 30, category: 'Science', number: '03' },
  { id: 'genesis', title: 'NEON GENESIS', subtitle: 'Abstract cinematic sequence', duration: 15, category: 'Experimental', number: '04' },
  { id: 'titanic', title: 'TITANIC', subtitle: 'Cinematic title sequence', duration: 18, category: 'Film', number: '05' },
  { id: 'generated', title: 'UNTITLED SCENE', subtitle: 'AI-generated composition', duration: 15, category: 'Generated', number: 'AI' }
];

const initialPrompt = 'Create a cinematic 18-second title sequence for TITANIC. Midnight-blue North Atlantic, detailed 1912 ocean liner, distant iceberg, cold moonlight, restrained gold accents. Elegant serif title, dramatic reveal, slow camera approach, 16:9.';

type StudioDraft = {
  projectName: string;
  active: SceneId;
  prompt: string;
  directorMode: 'procedural' | 'ai';
  lmBaseUrl: string;
  lmModel: string;
  titleText: string;
  titleColor: string;
  scaleKeys: Keyframe[];
  generatedScene: GeneratedSceneSpec | null;
};

function readDraft(): Partial<StudioDraft> {
  try {
    const raw = localStorage.getItem('ai-motion-studio:draft');
    if (!raw) return {};
    const value = JSON.parse(raw) as Record<string, unknown>;
    const activeIds: SceneId[] = ['type', 'product', 'science', 'genesis', 'titanic', 'generated'];
    let generatedScene: GeneratedSceneSpec | null = null;
    if (value.generatedScene) generatedScene = validateGeneratedScene(value.generatedScene);
    return {
      projectName: typeof value.projectName === 'string' ? value.projectName.slice(0, 80) : undefined,
      active: activeIds.includes(value.active as SceneId) ? value.active as SceneId : undefined,
      prompt: typeof value.prompt === 'string' ? value.prompt.slice(0, 2000) : undefined,
      directorMode: value.directorMode === 'ai' ? 'ai' : value.directorMode === 'procedural' ? 'procedural' : undefined,
      lmBaseUrl: typeof value.lmBaseUrl === 'string' ? value.lmBaseUrl : undefined,
      lmModel: typeof value.lmModel === 'string' ? value.lmModel : undefined,
      titleText: typeof value.titleText === 'string' ? value.titleText.slice(0, 40) : undefined,
      titleColor: typeof value.titleColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.titleColor) ? value.titleColor : undefined,
      scaleKeys: Array.isArray(value.scaleKeys) ? value.scaleKeys as Keyframe[] : undefined,
      generatedScene
    };
  } catch {
    return {};
  }
}

export default function App() {
  const [draft] = useState<Partial<StudioDraft>>(readDraft);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MotionRenderer | undefined>(undefined);
  const audioRef = useRef(new MotionAudio());
  const exportAbortRef = useRef<AbortController | null>(null);

  const [active, setActive] = useState<SceneId>(draft.active ?? 'type');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [ready, setReady] = useState(false);
  const [titleText, setTitleText] = useState(draft.titleText ?? 'FUTURE');
  const [titleColor, setTitleColor] = useState(draft.titleColor ?? '#f1eee7');
  const [scaleKeys, setScaleKeys] = useState<Keyframe[]>([
    { id: 'title-start', time: 0, value: 0.82 },
    { id: 'title-full', time: 1.2, value: 1 }
  ]);
  const [selectedKey, setSelectedKey] = useState('title-full');
  const [prompt, setPrompt] = useState(draft.prompt ?? initialPrompt);
  const [directorMode, setDirectorMode] = useState<'procedural' | 'ai'>(draft.directorMode ?? 'procedural');
  const [lmBaseUrl, setLmBaseUrl] = useState(draft.lmBaseUrl ?? 'http://localhost:1234/v1');
  const [lmModel, setLmModel] = useState(draft.lmModel ?? '');
  const [lmStatus, setLmStatus] = useState('Not connected');
  const [connecting, setConnecting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedScene, setGeneratedScene] = useState<GeneratedSceneSpec | null>(draft.generatedScene ?? null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState('');
  const [briefOpen, setBriefOpen] = useState(true);
  const [projectName, setProjectName] = useState(draft.projectName ?? 'Untitled project');
  const [savedAt, setSavedAt] = useState(Object.keys(draft).length ? 'Local draft restored' : 'New local project');

  const baseProject = projects.find(project => project.id === active) ?? projects[0];
  const project = active === 'generated' && generatedScene
    ? { ...baseProject, title: generatedScene.title, subtitle: generatedScene.description, duration: generatedScene.duration }
    : baseProject;

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new MotionRenderer(canvasRef.current);
    rendererRef.current = renderer;
    setReady(true);
    return () => {
      renderer.dispose();
      rendererRef.current = undefined;
      audioRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    if (active === 'generated' && generatedScene) rendererRef.current?.setGeneratedScene(generatedScene);
    else rendererRef.current?.setScene(active);
    setTime(0);
    setPlaying(false);
  }, [active, generatedScene]);

  useEffect(() => { rendererRef.current?.setTitleText(titleText, titleColor); }, [titleText, titleColor]);
  useEffect(() => { rendererRef.current?.setTitleScaleKeys(scaleKeys); }, [scaleKeys]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    let current = time;
    const tick = (now: number) => {
      current += Math.min(0.05, (now - last) / 1000);
      last = now;
      if (current >= project.duration) {
        current = project.duration;
        setPlaying(false);
      }
      rendererRef.current?.seek(current);
      setTime(current);
      if (current < project.duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, active, project.duration]);

  useEffect(() => {
    setSavedAt('Saving…');
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem('ai-motion-studio:draft', JSON.stringify({
          projectName, active, prompt, directorMode, lmBaseUrl, lmModel,
          titleText, titleColor, scaleKeys, generatedScene
        }));
        setSavedAt('Saved locally');
      } catch {
        setSavedAt('Local save unavailable');
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [projectName, active, prompt, directorMode, lmBaseUrl, lmModel, titleText, titleColor, scaleKeys, generatedScene]);

  const seek = (value: number) => {
    const next = Math.max(0, Math.min(project.duration, value));
    setTime(next);
    rendererRef.current?.seek(next);
  };

  const addScaleKey = () => {
    const key: Keyframe = { id: crypto.randomUUID(), time: Number(time.toFixed(2)), value: 1 };
    setScaleKeys(current => upsertKeyframe(current, key));
    setSelectedKey(key.id);
  };

  const updateSelectedKey = (patch: Partial<Keyframe>) => setScaleKeys(current => {
    const selected = current.find(key => key.id === selectedKey);
    if (!selected) return current;
    const updated = { ...selected, ...patch };
    return patch.time === undefined
      ? current.map(key => key.id === selectedKey ? updated : key)
      : upsertKeyframe(current.filter(key => key.id !== selectedKey), updated);
  });

  const toggleSound = async () => {
    if (!sound) await audioRef.current.unlock();
    setSound(!sound);
    audioRef.current.playCue(740, 0.16, 'triangle');
  };

  const exportFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `motion-${active}-${time.toFixed(2)}s.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleExportMp4 = async () => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer || exporting) return;
    const restoreTime = time;
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setPlaying(false);
    setExporting(true);
    setExportProgress(0);
    setExportError('');
    try {
      renderer.setOutputSize(1920, 1080);
      const blob = await exportMp4({
        canvas, duration: project.duration, fps: 30, width: 1920, height: 1080,
        renderFrame: seconds => renderer.seek(seconds),
        signal: controller.signal,
        onProgress: setExportProgress
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `motion-${active}-${project.duration}s-1080p.mp4`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setExportError(cause instanceof Error ? cause.message : 'MP4 export failed.');
      }
    } finally {
      renderer.restoreViewportSize();
      renderer.seek(restoreTime);
      setTime(restoreTime);
      exportAbortRef.current = null;
      setExporting(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    setMessage('');
    try {
      const models = await discoverLmStudioModels(lmBaseUrl);
      setLmModel(models[0].id);
      setLmStatus(`Connected · ${models.length} model${models.length === 1 ? '' : 's'}`);
      setMessage(`LM Studio ready: ${models[0].id}`);
    } catch (cause) {
      setLmStatus('Connection failed');
      setError(cause instanceof Error ? cause.message : 'Could not connect to LM Studio.');
    } finally {
      setConnecting(false);
    }
  };

  const activateGeneratedScene = (scene: GeneratedSceneSpec, notice: string) => {
    setGeneratedScene(scene);
    setActive('generated');
    setTime(0);
    setPlaying(false);
    setMessage(notice);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setMessage('');
    try {
      let model = lmModel.trim();
      if (!model) {
        const models = await discoverLmStudioModels(lmBaseUrl);
        if (!models.length) throw new Error('No model is loaded in LM Studio.');
        model = models[0].id;
        setLmModel(model);
        setLmStatus(`Connected · ${model}`);
      }
      const scene = await generateSceneFromPrompt({ baseUrl: lmBaseUrl, model, prompt });
      activateGeneratedScene(scene, `Scene generated · ${scene.objects.length} objects · ${scene.duration}s`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Scene generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateOffline = () => {
    setError('');
    setMessage('');
    try {
      const scene = generateProceduralScene(prompt);
      activateGeneratedScene(scene, `Offline composition created · ${scene.objects.length} objects · ${scene.duration}s`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Procedural generation failed.');
    }
  };

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;

  const selectedKeyframe = scaleKeys.find(key => key.id === selectedKey);

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-brand">
          <div className="brand-symbol"><Activity size={17}/></div>
          <div><strong>FRAME<span>/</span>FORGE</strong><small>AI MOTION STUDIO</small></div>
        </div>
        <div className="project-title-field">
          <span>PROJECT</span>
          <input aria-label="Project name" value={projectName} onChange={event => setProjectName(event.target.value)} />
          <ChevronDown size={13}/>
        </div>
        <div className="topbar-right">
          <span className="save-state"><span className="save-dot"/>{savedAt}</span>
          <button className="top-icon" title="Settings"><Settings2 size={16}/></button>
          <button className="top-icon" title="Help"><CircleHelp size={16}/></button>
          <button className="top-export" onClick={handleExportMp4} disabled={exporting || !ready}>
            {exporting ? <LoaderCircle className="spin" size={15}/> : <Film size={15}/>}
            {exporting ? `${Math.round(exportProgress * 100)}%` : 'Render video'}
          </button>
        </div>
      </header>

      <div className="studio-layout">
        <aside className="project-sidebar">
          <div className="sidebar-section-head"><span>YOUR WORKSPACE</span><button title="New project" onClick={() => { setProjectName('Untitled project'); setActive('type'); }}><FolderPlus size={15}/></button></div>
          <div className="workspace-card"><div className="workspace-avatar">FF</div><div><strong>Local workspace</strong><small>Saved on this device</small></div><ChevronDown size={13}/></div>
          <div className="sidebar-section-head project-head"><span>COMPOSITIONS</span><span>{String(projects.length).padStart(2, '0')}</span></div>
          <div className="composition-list">
            {projects.map(item => (
              <button key={item.id} className={active === item.id ? 'composition-item active' : 'composition-item'}
                onClick={() => { setActive(item.id); setProjectName(item.title === 'UNTITLED SCENE' ? 'Generated composition' : item.title + ' — Motion study'); }}
                disabled={exporting}>
                <span className="composition-index">{item.number}</span>
                <span className="composition-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                {active === item.id && <span className="active-mark"/>}
              </button>
            ))}
          </div>
          <div className="sidebar-spacer"/>
          <div className="engine-card">
            <div className="engine-card-title"><Activity size={14}/> RENDER ENGINE</div>
            <div className="engine-line"><span>Viewport</span><b className={ready ? 'status-good' : ''}>{ready ? 'Ready' : 'Starting'}</b></div>
            <div className="engine-line"><span>Director</span><b>{directorMode === 'ai' ? lmStatus : 'Offline'}</b></div>
            <div className="engine-line"><span>Output</span><b>H.264 · 1080p</b></div>
          </div>
          <div className="sidebar-foot"><span>FRAME/FORGE</span><span>BUILD 0.2</span></div>
        </aside>

        <section className="studio-main">
          <div className="editor-toolbar">
            <div className="breadcrumb"><span>WORKSPACE</span><b>/</b><strong>{project.title}</strong></div>
            <div className="toolbar-actions">
              <span className="format-chip">16:9 <i/> 1920 × 1080</span>
              <button className="quiet-button" onClick={exportFrame} disabled={exporting}><Download size={14}/> Frame</button>
              <button className="quiet-button" onClick={() => setBriefOpen(value => !value)}><Sparkles size={14}/> Director brief</button>
            </div>
          </div>

          {briefOpen && (
            <section className="director-panel">
              <div className="director-head">
                <div className="director-heading">
                  <div className="director-icon"><Sparkles size={16}/></div>
                  <div><span>AI DIRECTOR</span><h2>Describe the film. Shape the result.</h2></div>
                </div>
                <button className="collapse-button" onClick={() => setBriefOpen(false)} aria-label="Collapse director brief"><X size={15}/></button>
              </div>
              <textarea value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={2000}
                placeholder="Describe the subject, mood, camera, movement, typography and ending…" disabled={generating}/>
              <div className="director-controls">
                <div className="mode-toggle" role="group" aria-label="Generation mode">
                  <button className={directorMode === 'procedural' ? 'selected' : ''} onClick={() => { setDirectorMode('procedural'); setError(''); setMessage(''); }}>Offline</button>
                  <button className={directorMode === 'ai' ? 'selected' : ''} onClick={() => { setDirectorMode('ai'); setError(''); setMessage(''); }}>LM Studio</button>
                </div>
                {directorMode === 'ai' && <>
                  <input className="endpoint-input" value={lmBaseUrl} onChange={event => setLmBaseUrl(event.target.value)} aria-label="LM Studio endpoint" disabled={generating || connecting}/>
                  <input className="model-input" value={lmModel} onChange={event => setLmModel(event.target.value)} placeholder="Model ID" aria-label="Model ID" disabled={generating}/>
                  <button className="connect-button" onClick={handleConnect} disabled={connecting || generating}>{connecting ? <LoaderCircle size={14} className="spin"/> : <Activity size={14}/>}Connect</button>
                </>}
                <button className="generate-button" onClick={directorMode === 'ai' ? handleGenerate : handleGenerateOffline}
                  disabled={generating || connecting || prompt.trim().length < 8 || exporting}>
                  {generating ? <LoaderCircle size={15} className="spin"/> : <Sparkles size={15}/>}
                  {generating ? 'Generating…' : 'Generate composition'}
                </button>
              </div>
              <div className="director-feedback">
                <span className="director-status"><i className={directorMode === 'ai' && !lmModel ? 'status-wait' : 'status-good'}/>{directorMode === 'ai' ? lmStatus : 'Local procedural director · no network'}</span>
                {message && <span className="feedback-success"><Check size={12}/>{message}</span>}
                {error && <span className="feedback-error" role="alert">{error}</span>}
              </div>
            </section>
          )}

          <div className="canvas-toolbar">
            <div><span className="live-indicator"/><strong>PREVIEW</strong><small>REAL-TIME · WEBGL</small></div>
            <div className="canvas-tools"><span>FRAME 16:9</span><button title="Fit preview"><Maximize2 size={14}/></button></div>
          </div>
          <div className="preview-area">
            <div className="preview-inner">
              <canvas ref={canvasRef} aria-label="Motion design composition preview"/>
              {!ready && <div className="preview-loading">INITIALIZING RENDER ENGINE…</div>}
              <div className="preview-corner top-left">{project.number} / COMPOSITION</div>
              <div className="preview-corner top-right">1920 × 1080</div>
              <div className="preview-corner bottom-left">{project.category.toUpperCase()} · {project.duration.toFixed(1)} SEC</div>
              <div className="preview-corner bottom-right">FRAME/FORGE</div>
            </div>
          </div>

          <section className="timeline">
            <div className="timeline-header">
              <div className="timeline-name"><Layers3 size={15}/><strong>TIMELINE</strong><span>MASTER COMPOSITION</span></div>
              <div className="transport">
                <button title="Go to start" onClick={() => seek(0)} disabled={exporting}><RotateCcw size={14}/></button>
                <button className="transport-play" title={playing ? 'Pause' : 'Play'} onClick={() => { if (time >= project.duration) seek(0); setPlaying(value => !value); }} disabled={exporting}>
                  {playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>}
                </button>
                <button className={sound ? 'sound-button active' : 'sound-button'} title="Preview sound cue" onClick={toggleSound}><Volume2 size={14}/></button>
                <span className="transport-time">{formatTime(time)} <small>/ {formatTime(project.duration)}</small></span>
              </div>
            </div>
            <div className="timeline-ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>{formatTime(project.duration)}</span></div>
            <div className="timeline-track-row">
              <div className="track-label"><Film size={13}/><span>MASTER</span></div>
              <div className="track-content">
                <div className="timeline-clip"><span>{project.title}</span><small>{project.duration.toFixed(1)}s</small></div>
                <input className="timeline-scrubber" type="range" min="0" max={project.duration} step="0.01" value={time}
                  onChange={event => seek(Number(event.target.value))} aria-label="Timeline playhead" disabled={exporting}/>
                <div className="timeline-playhead" style={{ left: `${(time / project.duration) * 100}%` }}/>
              </div>
            </div>
            {active === 'type' && (
              <div className="timeline-track-row key-track-row">
                <div className="track-label"><SlidersHorizontal size={13}/><span>SCALE</span></div>
                <div className="key-track-content">
                  {scaleKeys.map(key => <button key={key.id} className={selectedKey === key.id ? 'timeline-key selected' : 'timeline-key'}
                    style={{ left: `${(key.time / project.duration) * 100}%` }} title={`Scale ${key.value} at ${key.time}s`}
                    onClick={() => { setSelectedKey(key.id); seek(key.time); }}><i/></button>)}
                </div>
              </div>
            )}
            <div className="timeline-footer"><span><AudioLines size={13}/> AUDIO PREVIEW <small>PROCEDURAL CUE</small></span><span>DETERMINISTIC TIMELINE</span></div>
          </section>

          {exporting && <div className="export-progress-panel">
            <div><span>RENDERING H.264 · 1920 × 1080 · 30 FPS</span><b>{Math.round(exportProgress * 100)}%</b><button onClick={() => exportAbortRef.current?.abort()} aria-label="Cancel render"><X size={13}/></button></div>
            <div className="progress-track"><i style={{ width: `${exportProgress * 100}%` }}/></div>
          </div>}
          {exportError && <div className="export-error-panel" role="alert">{exportError}<button onClick={() => setExportError('')}><X size={13}/></button></div>}
        </section>

        <aside className="inspector">
          <div className="inspector-heading"><div><SlidersHorizontal size={15}/><strong>INSPECTOR</strong></div><span>PROPERTIES</span></div>
          <section className="inspector-section">
            <div className="inspector-section-title"><span>COMPOSITION</span><span className="section-state">ACTIVE</span></div>
            <div className="composition-preview-icon"><div className="mini-frame"><Box size={23}/></div><div><strong>{project.title}</strong><small>{project.category}</small></div></div>
            <label className="inspector-field">DURATION<input type="text" value={`${project.duration.toFixed(1)} seconds`} readOnly/></label>
            <label className="inspector-field">FRAME RATE<input type="text" value="30 FPS" readOnly/></label>
            <label className="inspector-field">OUTPUT<input type="text" value="1920 × 1080 · H.264" readOnly/></label>
          </section>

          {active === 'type' ? (
            <section className="inspector-section">
              <div className="inspector-section-title"><span>SELECTED LAYER</span><span className="section-state">TITLE</span></div>
              <label className="inspector-field">TEXT CONTENT<input value={titleText} maxLength={40} onChange={event => setTitleText(event.target.value.toUpperCase())} disabled={exporting}/></label>
              <label className="inspector-field color-field">FILL COLOR<input type="color" value={titleColor} onChange={event => setTitleColor(event.target.value)} disabled={exporting}/></label>
              <div className="inspector-subhead">TRANSFORM · SCALE</div>
              <div className="keyframe-list">
                {scaleKeys.map(key => <button key={key.id} className={selectedKey === key.id ? 'inspector-key selected' : 'inspector-key'}
                  onClick={() => { setSelectedKey(key.id); seek(key.time); }}>
                  <i/><span>{key.time.toFixed(2)}s</span><b>{key.value.toFixed(2)}×</b>
                </button>)}
              </div>
              <button className="add-key-button" onClick={addScaleKey} disabled={exporting}><Plus size={13}/> Add key at playhead</button>
              {selectedKeyframe && <div className="keyframe-edit-fields">
                <label className="inspector-field">KEY TIME<input type="number" min="0" max={project.duration} step="0.01" value={selectedKeyframe.time}
                  onChange={event => updateSelectedKey({ time: Number(event.target.value) })} disabled={exporting}/></label>
                <label className="inspector-field">SCALE VALUE<input type="number" min="0.1" max="3" step="0.01" value={selectedKeyframe.value}
                  onChange={event => updateSelectedKey({ value: Number(event.target.value) })} disabled={exporting}/></label>
                <button className="delete-key-button" onClick={() => { setScaleKeys(current => removeKeyframe(current, selectedKeyframe.id)); setSelectedKey(scaleKeys.find(key => key.id !== selectedKeyframe.id)?.id ?? ''); }}
                  disabled={exporting || scaleKeys.length <= 1}><X size={12}/> Remove keyframe</button>
              </div>}
            </section>
          ) : (
            <section className="inspector-section">
              <div className="inspector-section-title"><span>SCENE CONTENT</span><span className="section-state">READ ONLY</span></div>
              {active === 'generated' && generatedScene ? (
                <><div className="object-count">{generatedScene.objects.length}<small>OBJECTS IN SCENE</small></div>
                  {generatedScene.objects.slice(0, 12).map(object => <div className="object-row" key={object.id}><Box size={13}/><span>{object.id}</span><small>{object.type}</small></div>)}
                </>
              ) : <div className="inspector-empty"><Layers3 size={20}/><p>This composition uses a dedicated scene rig.</p><small>Detailed layer controls are being added to the unified scene graph.</small></div>}
            </section>
          )}

          <div className="inspector-bottom">
            <div className="inspector-subhead">PROJECT STATUS</div>
            <div className="inspector-status"><span>Autosave</span><b><Check size={12}/> {savedAt}</b></div>
            <div className="inspector-status"><span>AI provider</span><b>{directorMode === 'ai' ? (lmModel || 'Not connected') : 'Offline'}</b></div>
          </div>
        </aside>
      </div>
      <footer className="studio-footer"><span><i/> {savedAt}</span><span>THREE.JS ENGINE</span><span>ABSOLUTE-TIME RENDERING</span><span>LOCAL-FIRST WORKSPACE</span></footer>
    </main>
  );
}
