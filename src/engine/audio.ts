export class MotionAudio {
  private context?: AudioContext;
  private master?: GainNode;
  async unlock(): Promise<void> { if (!this.context) { this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = 0.16; this.master.connect(this.context.destination); } if (this.context.state === 'suspended') await this.context.resume(); }
  playCue(frequency = 520, duration = 0.12, type: OscillatorType = 'sine'): void { if (!this.context || !this.master) return; const now = this.context.currentTime; const osc = this.context.createOscillator(); const gain = this.context.createGain(); osc.type = type; osc.frequency.setValueAtTime(frequency, now); osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.45), now + duration); gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.65, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration); osc.connect(gain); gain.connect(this.master); osc.start(now); osc.stop(now + duration + 0.02); }
  dispose(): void { void this.context?.close(); this.context = undefined; }
}
