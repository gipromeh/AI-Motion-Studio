import * as THREE from 'three';
import type { SceneId } from './scene';
import { clamp, easeOutCubic, seededRandom, smoothstep } from './scene';
import { spring } from './spring';

export class MotionRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100);
  private readonly clock = new THREE.Clock();
  private readonly objects: THREE.Object3D[] = [];
  private active: SceneId = 'type';
  private width = 1280;
  private height = 720;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.camera.position.set(0, 0, 9);
    this.scene.background = new THREE.Color('#0b0d12');
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const key = new THREE.DirectionalLight(0xffe4c2, 3.2); key.position.set(4, 6, 8); this.scene.add(key);
    const rim = new THREE.PointLight(0x6d8dff, 32, 20); rim.position.set(-5, 1, 3); this.scene.add(rim);
    this.resize();
    window.addEventListener('resize', this.resize);
    this.setScene('type');
  }

  private resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width)); this.height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height; this.camera.updateProjectionMatrix();
  };

  setScene(id: SceneId): void {
    this.active = id;
    for (const object of this.objects) { this.scene.remove(object); this.disposeObject(object); }
    this.objects.length = 0;
    if (id === 'type') this.buildTypeScene();
    if (id === 'product') this.buildProductScene();
    if (id === 'science') this.buildScienceScene();
    this.seek(0);
  }

  private add(object: THREE.Object3D): void { this.scene.add(object); this.objects.push(object); }
  private disposeObject(object: THREE.Object3D): void { object.traverse(child => { const mesh = child as THREE.Mesh; mesh.geometry?.dispose(); if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose()); else mesh.material?.dispose(); }); }

  private buildTypeScene(): void {
    const group = new THREE.Group();
    const bars = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3 + (i % 3) * 0.25, 0.12), new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? '#f47b55' : '#e9e5dc', roughness: 0.35, metalness: 0.25 }));
      mesh.position.set((i - 4) * 0.42, 0, 0); bars.add(mesh);
    }
    group.add(bars); group.userData.kind = 'bars'; this.add(group);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.018, 8, 160), new THREE.MeshBasicMaterial({ color: '#f47b55' })); ring.rotation.x = 0.7; ring.position.z = -0.6; ring.userData.kind = 'ring'; this.add(ring);
  }

  private buildProductScene(): void {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 2.9, 96, 1, false), new THREE.MeshPhysicalMaterial({ color: '#c5cbd4', metalness: 0.92, roughness: 0.19, clearcoat: 1, clearcoatRoughness: 0.08 }));
    body.rotation.z = Math.PI / 2; group.add(body);
    for (let i = 0; i < 7; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84 + i * 0.012, 0.035, 12, 96), new THREE.MeshStandardMaterial({ color: i % 2 ? '#aeb8c8' : '#f47b55', metalness: 0.85, roughness: 0.22 })); ring.rotation.y = Math.PI / 2; ring.position.x = -1.1 + i * 0.36; group.add(ring); }
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.12, 96), new THREE.MeshPhysicalMaterial({ color: '#7894d6', transmission: 0.72, thickness: 0.5, roughness: 0.08, metalness: 0.05 })); glass.rotation.z = Math.PI / 2; glass.position.x = 1.48; group.add(glass);
    group.userData.kind = 'product'; this.add(group);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: '#627ed7', transparent: true, opacity: 0.7 })); halo.rotation.x = 1.15; halo.position.z = -0.5; this.add(halo);
  }

  private buildScienceScene(): void {
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1.65, 96, 64), new THREE.MeshStandardMaterial({ color: '#245a91', roughness: 0.78, metalness: 0.05, emissive: '#071a35', emissiveIntensity: 0.4 })); earth.userData.kind = 'earth'; this.add(earth);
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(1.69, 96, 64), new THREE.MeshBasicMaterial({ color: '#8ab9ec', transparent: true, opacity: 0.12, wireframe: true })); cloud.userData.kind = 'cloud'; this.add(cloud);
    const random = seededRandom(42); const vertices: number[] = [];
    for (let i = 0; i < 1100; i++) { const u = random() * 2 - 1, a = random() * Math.PI * 2, r = 4.5 + random() * 8, s = Math.sqrt(1 - u * u); vertices.push(Math.cos(a) * s * r, u * r * 0.65, Math.sin(a) * s * r - 2); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#d9e5ff', size: 0.025, sizeAttenuation: true })); this.add(stars);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.012, 8, 180), new THREE.MeshBasicMaterial({ color: '#f47b55' })); orbit.rotation.x = 1.15; orbit.userData.kind = 'orbit'; this.add(orbit);
  }

  seek(seconds: number): void {
    const t = clamp(seconds, 0, 30);
    this.scene.background = new THREE.Color(this.active === 'type' ? '#101116' : this.active === 'product' ? '#090d16' : '#050914');
    for (const object of this.objects) {
      const kind = object.userData.kind;
      if (kind === 'bars') { const group = object as THREE.Group; group.children.forEach((child, i) => { const reveal = spring(t - 0.35 - i * 0.09, 190, 25); child.scale.y = 0.05 + reveal * (1.1 + (i % 3) * 0.25); child.position.y = -0.5 + child.scale.y * 0.5; }); group.rotation.y = Math.sin(t * 0.55) * 0.12; }
      if (kind === 'ring') { object.rotation.z = t * 0.18; (object as THREE.Mesh).scale.setScalar(0.65 + easeOutCubic(t / 2) * 0.35); }
      if (kind === 'product') { object.rotation.set(0.18 + Math.sin(t * 0.38) * 0.08, t * 0.42, -0.12 + Math.sin(t * 0.6) * 0.035); object.position.y = Math.sin(t * 0.8) * 0.12; }
      if (kind === 'earth' || kind === 'cloud') { object.rotation.y = t * (kind === 'earth' ? 0.12 : 0.15); const reveal = smoothstep(0, 2.2, t); object.scale.setScalar(0.15 + reveal * (kind === 'earth' ? 0.85 : 0.85)); }
      if (kind === 'orbit') { object.rotation.z = t * 0.13; object.material && ((object.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.75 * smoothstep(0, 3, t)); }
    }
    this.camera.position.x = this.active === 'science' ? Math.sin(t * 0.16) * 0.18 : Math.sin(t * 0.22) * 0.12;
    this.camera.position.y = this.active === 'product' ? Math.sin(t * 0.3) * 0.1 : 0;
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }

  renderFrame(): void { this.seek(this.clock.getElapsedTime()); }
  dispose(): void { window.removeEventListener('resize', this.resize); for (const object of this.objects) this.disposeObject(object); this.renderer.dispose(); }
}
