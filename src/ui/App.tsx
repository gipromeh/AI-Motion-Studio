import { useEffect, useRef, useState } from 'react';
import { Activity, AudioLines, CircleHelp, Download, Film, LoaderCircle, Maximize2, Pause, Play, Plus, Settings2, Sparkles, Volume2, X } from 'lucide-react';
import { MotionRenderer } from '../engine/renderer';
import { MotionAudio } from '../engine/audio';
import type { SceneId } from '../engine/scene';
import { upsertKeyframe, removeKeyframe, type Keyframe } from '../engine/keyframes';
import { exportMp4 } from '../engine/exporter';

const projects: { id: SceneId; number: string; title: string; subtitle: string; duration: number; tag: string }[] = [
  { id: 'type', number: '01', title: 'FUTURE / Kinetic type', subtitle: 'Typographic system · kinetic composition', duration: 15, tag: '2D / 3D' },
  { id: 'product', number: '02', title: 'OPTIC / Product film', subtitle: 'Precision object · studio lighting', duration: 20, tag: 'PRODUCT CGI' },
  { id: 'science', number: '03', title: 'ORBIT / Science film', subtitle: 'Earth · orbital mechanics · deep space', duration: 30, tag: 'SCIENCE' },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MotionRenderer | undefined>(undefined);
  const audioRef = useRef(new MotionAudio());
  const [active, setActive] = useState<SceneId>('type');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [ready, setReady] = useState(false);
  const [titleText, setTitleText] = useState('FUTURE');
  const [titleColor, setTitleColor] = useState('#f1eee7');
  const [scaleKeys, setScaleKeys] = useState<Keyframe[]>([{ id: 'title-start', time: 0, value: 0.82 }, { id: 'title-full', time: 1.2, value: 1 }]);
  const [selectedKey, setSelectedKey] = useState('title-full');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState('');
  const exportAbortRef = useRef<AbortController | null>(null);
  const project = projects.find(p => p.id === active)!;

  useEffect(() => { if (!canvasRef.current) return; const renderer = new MotionRenderer(canvasRef.current); rendererRef.current = renderer; setReady(true); return () => { renderer.dispose(); rendererRef.current = undefined; audioRef.current.dispose(); }; }, []);
  useEffect(() => { rendererRef.current?.setScene(active); setTime(0); setPlaying(false); }, [active]);
  useEffect(() => { rendererRef.current?.setTitleText(titleText, titleColor); }, [titleText, titleColor]);
  useEffect(() => { rendererRef.current?.setTitleScaleKeys(scaleKeys); }, [scaleKeys]);
  useEffect(() => { if (!playing) return; let frame = 0; let last = performance.now(); let current = time; const tick = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; current += dt; if (current >= project.duration) { current = project.duration; setPlaying(false); } rendererRef.current?.seek(current); setTime(current); if (current < project.duration) frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [playing, active, project.duration]);
  const seek = (value: number) => { const next = Math.max(0, Math.min(project.duration, value)); setTime(next); rendererRef.current?.seek(next); };
  const addScaleKey = () => {
    const key: Keyframe = { id: crypto.randomUUID(), time: Number(time.toFixed(2)), value: 1 };
    setScaleKeys(current => upsertKeyframe(current, key));
    setSelectedKey(key.id);
  };
  const updateSelectedKey = (patch: Partial<Keyframe>) => setScaleKeys(current => { const selected = current.find(key => key.id === selectedKey); if (!selected) return current; const updated = { ...selected, ...patch }; return patch.time === undefined ? current.map(key => key.id === selectedKey ? updated : key) : upsertKeyframe(current.filter(key => key.id !== selectedKey), updated); });
  const toggleSound = async () => { if (!sound) await audioRef.current.unlock(); setSound(!sound); audioRef.current.playCue(740, 0.16, 'triangle'); };
  const exportFrame = () => { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement('a'); link.download = `ai-motion-${active}-${time.toFixed(2)}s.png`; link.href = canvas.toDataURL('image/png'); link.click(); };
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
      const blob = await exportMp4({ canvas, duration: project.duration, fps: 30, width: 1920, height: 1080, renderFrame: seconds => renderer.seek(seconds), signal: controller.signal, onProgress: setExportProgress });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ai-motion-' + active + '-' + project.duration + 's-1080p.mp4';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setExportError(error instanceof Error ? error.message : 'MP4 export failed.');
    } finally {
      renderer.restoreViewportSize();
      renderer.seek(restoreTime);
      setTime(restoreTime);
      exportAbortRef.current = null;
      setExporting(false);
    }
  };
  const format = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toFixed(2).padStart(5, '0')}`;

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Activity size={18}/></div><div><div className="brand-name">MOTION<span> / </span>STUDIO</div><div className="brand-version">BROWSER ENGINE <i/> BUILD 0.1.0</div></div></div><div className="top-center"><span className="live-dot"/> LOCAL PREVIEW ENGINE <span className="top-separator">/</span> WEBGL</div><div className="top-actions"><button className="icon-button" title="Settings"><Settings2 size={17}/></button><button className="help-button"><CircleHelp size={15}/> Help</button><div className="avatar">AM</div></div></header>
    <section className="workspace"><aside className="sidebar"><div className="side-heading">WORKSPACE <button className="tiny-icon"><Plus size={14}/></button></div><div className="workspace-label"><div className="folder-icon">▰</div><span>Untitled Studio</span><span className="chevron">⌄</span></div><div className="side-heading projects-heading">PROJECTS <span className="count">03</span></div><div className="project-list">{projects.map(p => <button key={p.id} onClick={() => setActive(p.id)} disabled={exporting} className={`project-item ${active === p.id ? 'selected' : ''}`}><span className="project-number">{p.number}</span><span className="project-copy"><strong>{p.title}</strong><small>{p.subtitle}</small></span><span className="project-state">{active === p.id ? '●' : '○'}</span></button>)}</div><div className="sidebar-bottom"><div className="side-heading">PIPELINE STATUS</div><div className="pipeline-row"><span className="pipeline-indicator"/>WebGL renderer <span className="status-ok">READY</span></div><div className="pipeline-row"><span className="pipeline-indicator muted"/>AI orchestrator <span className="status-pending">PLANNED</span></div><div className="pipeline-row"><span className="pipeline-indicator muted"/>MP4 render <span className="status-pending">PLANNED</span></div><div className="storage-card"><Sparkles size={15}/><div><strong>Creative engine</strong><small>Three scenes · one timeline</small></div></div></div></aside>
    <section className="editor"><div className="editor-heading"><div><div className="eyebrow">PROJECT / {project.number} <span>—</span> {project.tag}</div><h1>{project.title}</h1><p>{project.subtitle}</p></div><div className="editor-tools"><span className="resolution">1920 × 1080 <i/> 16:9</span><button className="icon-button" title="Fit canvas"><Maximize2 size={16}/></button><button className="frame-export-button" onClick={exportFrame} disabled={exporting}><Download size={14}/> PNG</button><button className="export-button" onClick={handleExportMp4} disabled={exporting || !ready}>{exporting ? <LoaderCircle size={15} className="spin"/> : <Film size={15}/>} {exporting ? 'Rendering ' + Math.round(exportProgress * 100) + '%' : 'Export MP4'}</button></div></div>
      <div className="preview-stage"><div className="stage-meta"><span><span className="stage-dot"/> RENDER VIEWPORT</span><span>60 FPS TARGET <b>·</b> WEBGL 2.0</span></div><div className="canvas-wrap"><canvas ref={canvasRef} aria-label="Motion design preview"/><div className="canvas-overlay"><span>{project.number} / 03</span><span>AI MOTION STUDY</span></div>{!ready && <div className="loading">INITIALIZING RENDERER…</div>}</div><div className="stage-footer"><span>SCENE: {active.toUpperCase()}</span><span>TIME: {format(time)} / {format(project.duration)}</span><span>DETERMINISTIC SEEK</span></div></div>
      <div className="timeline-panel"><div className="timeline-top"><div className="timeline-label"><Film size={15}/> TIMELINE <span className="timeline-sub">/ MASTER COMPOSITION</span></div><div className="timeline-controls"><button className="icon-button" onClick={() => seek(0)} title="Restart">↺</button><button className="play-button" onClick={() => { if (time >= project.duration) seek(0); setPlaying(!playing); }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>}</button><button className={`icon-button ${sound ? 'active' : ''}`} onClick={toggleSound} title="Sound"><Volume2 size={16}/></button><span className="timecode">{format(time)}</span></div></div><div className="ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>{format(project.duration)}</span></div><div className="track-area"><div className="track-name">SCENE 01 <small>MAIN LAYER</small></div><div className="track-lane"><div className="clip-block" style={{ width: '100%' }}><span>{project.title}</span><span className="clip-tag">SEEKABLE</span></div><input aria-label="Timeline position" type="range" min="0" max={project.duration} step="0.01" value={time} onChange={e => seek(Number(e.target.value))} className="scrubber"/><div className="playhead" style={{ left: `${(time / project.duration) * 100}%` }}/></div></div><div className="timeline-bottom"><span><AudioLines size={13}/> AUDIO BUS <small>PROCEDURAL SFX</small></span><span>{sound ? 'AUDIO UNLOCKED' : 'CLICK SOUND TO ENABLE'}</span></div></div>
      {active === 'type' && <section className="properties-panel">
        <div className="properties-heading"><span>TYPOGRAPHY</span><span>LIVE SCENE PARAMETERS</span></div>
        <div className="property-controls">
          <label>TEXT<input value={titleText} maxLength={40} onChange={e => setTitleText(e.target.value.toUpperCase())}/></label>
          <label>COLOR<input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)}/></label>
          <div className="keyframe-editor">
            <div className="keyframe-head"><span>TRANSFORM / SCALE</span><button onClick={addScaleKey}>＋ Add keyframe at playhead</button></div>
            <div className="keyframe-strip">{scaleKeys.map(key => <button key={key.id} className={selectedKey === key.id ? 'key-chip selected' : 'key-chip'} onClick={() => { setSelectedKey(key.id); seek(key.time); }}><i/> {key.time.toFixed(2)}s · {key.value.toFixed(2)}×</button>)}</div>
            {(() => { const selected = scaleKeys.find(key => key.id === selectedKey); return selected ? <div className="key-edit">
              <label>TIME (S)<input type="number" min="0" max={project.duration} step="0.01" value={selected.time} onChange={e => updateSelectedKey({ time: Number(e.target.value) })}/></label>
              <label>SCALE<input type="number" min="0.1" max="3" step="0.01" value={selected.value} onChange={e => updateSelectedKey({ value: Number(e.target.value) })}/></label>
              <button className="delete-key" disabled={scaleKeys.length <= 1} onClick={() => { setScaleKeys(current => removeKeyframe(current, selected.id)); setSelectedKey(scaleKeys.find(key => key.id !== selected.id)?.id ?? ''); }}>Delete key</button>
            </div> : null; })()}
          </div>
        </div>
      </section>}
      {exporting && <div className="export-progress"><div className="export-progress-copy"><span>RENDERING MP4 · 1920 × 1080 · 30 FPS</span><span>{Math.round(exportProgress * 100)}% <button onClick={() => exportAbortRef.current?.abort()} aria-label="Cancel export"><X size={13}/></button></span></div><div className="export-progress-track"><div style={{ width: (exportProgress * 100) + "%" }}/></div></div>}
      {exportError && <div className="export-error" role="alert">{exportError}<button onClick={() => setExportError("")} aria-label="Dismiss error"><X size={13}/></button></div>}
      <div className="bottom-status"><span><i className="status-green"/> All changes saved</span><span>ENGINE <b>THREE.JS</b></span><span>FRAME <b>{Math.round(time * 60).toString().padStart(4, '0')}</b></span><span>COLOR <b>ACES FILMIC</b></span><span className="bottom-spacer"/><span>AI DIRECTOR <b>NOT CONNECTED</b></span></div>
    </section></section>
  </main>;
}
