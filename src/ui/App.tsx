import { useEffect, useRef, useState } from 'react';
import { Activity, AudioLines, CircleHelp, Clapperboard, Download, Film, Maximize2, Pause, Play, Plus, Settings2, Sparkles, Volume2 } from 'lucide-react';
import { MotionRenderer } from '../engine/renderer';
import { MotionAudio } from '../engine/audio';
import type { SceneId } from '../engine/scene';

const projects: { id: SceneId; number: string; title: string; subtitle: string; duration: number; tag: string }[] = [
  { id: 'type', number: '01', title: 'FUTURE / Kinetic type', subtitle: 'Typographic system · kinetic composition', duration: 15, tag: '2D / 3D' },
  { id: 'product', number: '02', title: 'OPTIC / Product film', subtitle: 'Precision object · studio lighting', duration: 20, tag: 'PRODUCT CGI' },
  { id: 'science', number: '03', title: 'ORBIT / Science film', subtitle: 'Earth · orbital mechanics · deep space', duration: 30, tag: 'SCIENCE' },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MotionRenderer>();
  const audioRef = useRef(new MotionAudio());
  const [active, setActive] = useState<SceneId>('type');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [ready, setReady] = useState(false);
  const project = projects.find(p => p.id === active)!;

  useEffect(() => { if (!canvasRef.current) return; const renderer = new MotionRenderer(canvasRef.current); rendererRef.current = renderer; setReady(true); return () => { renderer.dispose(); rendererRef.current = undefined; audioRef.current.dispose(); }; }, []);
  useEffect(() => { rendererRef.current?.setScene(active); setTime(0); setPlaying(false); }, [active]);
  useEffect(() => { if (!playing) return; let frame = 0; let last = performance.now(); let current = time; const tick = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; current += dt; if (current >= project.duration) { current = project.duration; setPlaying(false); } rendererRef.current?.seek(current); setTime(current); if (current < project.duration) frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [playing, active, project.duration]);
  const seek = (value: number) => { const next = Math.max(0, Math.min(project.duration, value)); setTime(next); rendererRef.current?.seek(next); };
  const toggleSound = async () => { if (!sound) await audioRef.current.unlock(); setSound(!sound); audioRef.current.playCue(740, 0.16, 'triangle'); };
  const exportFrame = () => { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement('a'); link.download = `ai-motion-${active}-${time.toFixed(2)}s.png`; link.href = canvas.toDataURL('image/png'); link.click(); };
  const format = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toFixed(2).padStart(5, '0')}`;

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Activity size={18}/></div><div><div className="brand-name">MOTION<span> / </span>STUDIO</div><div className="brand-version">BROWSER ENGINE <i/> BUILD 0.1.0</div></div></div><div className="top-center"><span className="live-dot"/> LOCAL PREVIEW ENGINE <span className="top-separator">/</span> WEBGL</div><div className="top-actions"><button className="icon-button" title="Settings"><Settings2 size={17}/></button><button className="help-button"><CircleHelp size={15}/> Help</button><div className="avatar">AM</div></div></header>
    <section className="workspace"><aside className="sidebar"><div className="side-heading">WORKSPACE <button className="tiny-icon"><Plus size={14}/></button></div><div className="workspace-label"><div className="folder-icon">▰</div><span>Untitled Studio</span><span className="chevron">⌄</span></div><div className="side-heading projects-heading">PROJECTS <span className="count">03</span></div><div className="project-list">{projects.map(p => <button key={p.id} onClick={() => setActive(p.id)} className={`project-item ${active === p.id ? 'selected' : ''}`}><span className="project-number">{p.number}</span><span className="project-copy"><strong>{p.title}</strong><small>{p.subtitle}</small></span><span className="project-state">{active === p.id ? '●' : '○'}</span></button>)}</div><div className="sidebar-bottom"><div className="side-heading">PIPELINE STATUS</div><div className="pipeline-row"><span className="pipeline-indicator"/>WebGL renderer <span className="status-ok">READY</span></div><div className="pipeline-row"><span className="pipeline-indicator muted"/>AI orchestrator <span className="status-pending">PLANNED</span></div><div className="pipeline-row"><span className="pipeline-indicator muted"/>MP4 render <span className="status-pending">PLANNED</span></div><div className="storage-card"><Sparkles size={15}/><div><strong>Creative engine</strong><small>Three scenes · one timeline</small></div></div></div></aside>
    <section className="editor"><div className="editor-heading"><div><div className="eyebrow">PROJECT / {project.number} <span>—</span> {project.tag}</div><h1>{project.title}</h1><p>{project.subtitle}</p></div><div className="editor-tools"><span className="resolution">1920 × 1080 <i/> 16:9</span><button className="icon-button" title="Fit canvas"><Maximize2 size={16}/></button><button className="export-button" onClick={exportFrame}><Download size={15}/> Export frame</button></div></div>
      <div className="preview-stage"><div className="stage-meta"><span><span className="stage-dot"/> RENDER VIEWPORT</span><span>60 FPS TARGET <b>·</b> WEBGL 2.0</span></div><div className="canvas-wrap"><canvas ref={canvasRef} aria-label="Motion design preview"/><div className="canvas-overlay"><span>{project.number} / 03</span><span>AI MOTION STUDY</span></div>{!ready && <div className="loading">INITIALIZING RENDERER…</div>}</div><div className="stage-footer"><span>SCENE: {active.toUpperCase()}</span><span>TIME: {format(time)} / {format(project.duration)}</span><span>DETERMINISTIC SEEK</span></div></div>
      <div className="timeline-panel"><div className="timeline-top"><div className="timeline-label"><Film size={15}/> TIMELINE <span className="timeline-sub">/ MASTER COMPOSITION</span></div><div className="timeline-controls"><button className="icon-button" onClick={() => seek(0)} title="Restart">↺</button><button className="play-button" onClick={() => { if (time >= project.duration) seek(0); setPlaying(!playing); }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>}</button><button className={`icon-button ${sound ? 'active' : ''}`} onClick={toggleSound} title="Sound"><Volume2 size={16}/></button><span className="timecode">{format(time)}</span></div></div><div className="ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>{format(project.duration)}</span></div><div className="track-area"><div className="track-name">SCENE 01 <small>MAIN LAYER</small></div><div className="track-lane"><div className="clip-block" style={{ width: '100%' }}><span>{project.title}</span><span className="clip-tag">SEEKABLE</span></div><input aria-label="Timeline position" type="range" min="0" max={project.duration} step="0.01" value={time} onChange={e => seek(Number(e.target.value))} className="scrubber"/><div className="playhead" style={{ left: `${(time / project.duration) * 100}%` }}/></div></div><div className="timeline-bottom"><span><AudioLines size={13}/> AUDIO BUS <small>PROCEDURAL SFX</small></span><span>{sound ? 'AUDIO UNLOCKED' : 'CLICK SOUND TO ENABLE'}</span></div></div>
      <div className="bottom-status"><span><i className="status-green"/> All changes saved</span><span>ENGINE <b>THREE.JS</b></span><span>FRAME <b>{Math.round(time * 60).toString().padStart(4, '0')}</b></span><span>COLOR <b>ACES FILMIC</b></span><span className="bottom-spacer"/><span>AI DIRECTOR <b>NOT CONNECTED</b></span></div>
    </section></section>
  </main>;
}
