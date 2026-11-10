import * as THREE from 'three';
import type { SceneId } from './scene';
import type { GeneratedSceneSpec, GeneratedObject, SceneAnimation } from './generatedScene';
import { clamp, easeOutCubic, seededRandom, smoothstep } from './scene';
import { spring } from './spring';
import { evaluateTrack, type Keyframe } from './keyframes';
import { loadTitanicAssetScene, type TitanicAssetScene } from './titanicAssets';

export class MotionRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100);
  private readonly objects: THREE.Object3D[] = [];
  private active: SceneId = 'type';
  private currentTime = 0;
  private outputSizeLocked = false;
  private titleCanvas?: HTMLCanvasElement;
  private titleTexture?: THREE.CanvasTexture;
  private titleText = 'FUTURE';
  private titleColor = '#f1eee7';
  private titleScaleKeys: Keyframe[] = [{ id: 'title-start', time: 0, value: 0.82 }, { id: 'title-full', time: 1.2, value: 1 }];
  private generatedSpec?: GeneratedSceneSpec;
  private titanicAssets?: TitanicAssetScene;
  private sceneEpoch = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.localClippingEnabled = true;
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
    if (this.outputSizeLocked) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const rect = this.canvas.getBoundingClientRect();
    this.renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)), false);
    this.camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    this.camera.updateProjectionMatrix();
  };

  setScene(id: SceneId): void {
    this.active = id;
    const epoch = ++this.sceneEpoch;
    this.titanicAssets?.dispose();
    this.titanicAssets = undefined;
    for (const object of this.objects) { this.scene.remove(object); if (!object.userData.assetManaged) this.disposeObject(object); }
    this.objects.length = 0;
    if (id === 'type') this.buildTypeScene();
    if (id === 'product') this.buildProductScene();
    if (id === 'science') this.buildScienceScene();
    if (id === 'genesis') this.buildGenesisScene();
    if (id === 'titanic') this.buildTitanicScene();
    if (id === 'generated' && this.generatedSpec) this.buildGeneratedScene(this.generatedSpec);
    this.seek(0);
  }

  setOutputSize(width: number, height: number): void {
    this.outputSizeLocked = true;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  restoreViewportSize(): void {
    this.outputSizeLocked = false;
    this.resize();
    this.seek(this.currentTime);
  }

  private add(object: THREE.Object3D): void { this.scene.add(object); this.objects.push(object); }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse(child => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const material of materials) {
        const textured = material as THREE.Material & { map?: THREE.Texture | null };
        textured.map?.dispose();
        material.dispose();
      }
    });
  }

  private buildTypeScene(): void {
    const bars = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3 + (i % 3) * 0.25, 0.12), new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? '#f47b55' : '#e9e5dc', roughness: 0.35, metalness: 0.25 }));
      mesh.position.set((i - 4) * 0.42, -0.7, -0.2); bars.add(mesh);
    }
    bars.userData.kind = 'bars'; this.add(bars);

    const titleCanvas = document.createElement('canvas');
    this.titleCanvas = titleCanvas;
    titleCanvas.width = 1600; titleCanvas.height = 360;
    const ctx = titleCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 250px Arial, Helvetica, sans-serif';
      ctx.fillStyle = this.titleColor; ctx.fillText(this.titleText, 800, 176);
      ctx.fillStyle = '#f47b55'; ctx.fillRect(180, 310, 1240, 9);
    }
    const texture = new THREE.CanvasTexture(titleCanvas);
    this.titleTexture = texture;
    texture.colorSpace = THREE.SRGBColorSpace;
    const title = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.485), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    title.position.set(0, 0.55, 0.55); title.userData.kind = 'title'; this.add(title);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.018, 8, 160), new THREE.MeshBasicMaterial({ color: '#f47b55' }));
    ring.rotation.x = 0.7; ring.position.z = -0.6; ring.userData.kind = 'ring'; this.add(ring);
  }

  private buildProductScene(): void {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 2.9, 96, 1, false), new THREE.MeshPhysicalMaterial({ color: '#c5cbd4', metalness: 0.92, roughness: 0.19, clearcoat: 1, clearcoatRoughness: 0.08 }));
    body.rotation.z = Math.PI / 2; group.add(body);
    for (let i = 0; i < 7; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84 + i * 0.012, 0.035, 12, 96), new THREE.MeshStandardMaterial({ color: i % 2 ? '#aeb8c8' : '#f47b55', metalness: 0.85, roughness: 0.22 }));
      ring.rotation.y = Math.PI / 2; ring.position.x = -1.1 + i * 0.36; group.add(ring);
    }
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.12, 96), new THREE.MeshPhysicalMaterial({ color: '#7894d6', transmission: 0.72, thickness: 0.5, roughness: 0.08, metalness: 0.05 }));
    glass.rotation.z = Math.PI / 2; glass.position.x = 1.48; group.add(glass);
    group.userData.kind = 'product'; this.add(group);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: '#627ed7', transparent: true, opacity: 0.7 }));
    halo.rotation.x = 1.15; halo.position.z = -0.5; this.add(halo);
  }

  private buildScienceScene(): void {
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1.65, 96, 64), new THREE.MeshStandardMaterial({ color: '#245a91', roughness: 0.78, metalness: 0.05, emissive: '#071a35', emissiveIntensity: 0.4 }));
    earth.userData.kind = 'earth'; this.add(earth);
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(1.69, 96, 64), new THREE.MeshBasicMaterial({ color: '#8ab9ec', transparent: true, opacity: 0.12, wireframe: true }));
    cloud.userData.kind = 'cloud'; this.add(cloud);
    const random = seededRandom(42); const vertices: number[] = [];
    for (let i = 0; i < 1100; i++) {
      const u = random() * 2 - 1, a = random() * Math.PI * 2, r = 4.5 + random() * 8, s = Math.sqrt(1 - u * u);
      vertices.push(Math.cos(a) * s * r, u * r * 0.65, Math.sin(a) * s * r - 2);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#d9e5ff', size: 0.025, sizeAttenuation: true })));
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.012, 8, 180), new THREE.MeshBasicMaterial({ color: '#f47b55', transparent: true }));
    orbit.rotation.x = 1.15; orbit.userData.kind = 'orbit'; this.add(orbit);
  }



  private buildTitanicScene(): void {
    const epoch = this.sceneEpoch;
    const makeTitle = (text: string, font: string, color: string, width: number, height: number, y: number, layer: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1800; canvas.height = 420;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 1800, 420);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = font; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 24;
        ctx.fillText(text, 900, 210, 1720);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      mesh.position.set(0, y, 1.3); mesh.userData.kind = 'titanic-title'; mesh.userData.layer = layer;
      this.add(mesh);
    };

    const random = seededRandom(1912);
    const starPositions: number[] = [];
    for (let i = 0; i < 260; i++) starPositions.push((random() - 0.5) * 18, random() * 6 - 0.1, -1.8 - random() * 2);
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#b7d7e8', size: 0.025, transparent: true, opacity: 0.7 }));
    stars.userData.kind = 'titanic-stars'; this.add(stars);

    // The ship, iceberg and animated ocean are loaded from the licensed GLTF asset set below.
    makeTitle('A STORY THAT CROSSED THE OCEAN', '500 42px Georgia, serif', '#b7c7ce', 7, 0.42, 1.8, 'overline');
    makeTitle('TITANIC', 'italic 900 300px Georgia, serif', '#f2e4c7', 7.8, 1.8, 0.72, 'main');
    makeTitle('THE LEGEND NEVER SINKS', '600 48px Arial, sans-serif', '#9ebdca', 6.5, 0.48, -0.35, 'subtitle');
    makeTitle('14 APRIL 1912  /  THE NORTH ATLANTIC', '500 30px Arial, sans-serif', '#7895a5', 6.8, 0.36, -1.15, 'date');

    const divider = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 1.2), new THREE.MeshBasicMaterial({ color: '#c6a879', transparent: true, opacity: 0 }));
    divider.position.set(-3.6, 0.72, 1.25); divider.userData.kind = 'titanic-divider'; this.add(divider);
    const glow = new THREE.PointLight(0x8dbbd0, 0, 16);
    glow.position.set(-2, 2.4, 2.5); glow.userData.kind = 'titanic-light'; this.add(glow);

    loadTitanicAssetScene().then(assets => {
      if (this.active !== 'titanic' || this.sceneEpoch !== epoch) {
        assets.dispose();
        return;
      }
      this.titanicAssets = assets;
      for (const object of [assets.ocean, assets.bow, assets.stern, assets.iceberg]) {
        object.userData.assetManaged = true;
        this.add(object);
      }
      this.seek(this.currentTime);
    }).catch(error => {
      console.error('[Titanic] Could not load cinematic GLTF assets:', error);
    });
  }

  private buildGenesisScene(): void {
    const core = new THREE.Group();
    const nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.88, 2),
      new THREE.MeshPhysicalMaterial({
        color: '#102c50',
        metalness: 0.72,
        roughness: 0.16,
        clearcoat: 1,
        emissive: '#087da8',
        emissiveIntensity: 1.15
      })
    );
    core.add(nucleus);
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.12, 1),
      new THREE.MeshBasicMaterial({ color: '#42e8ff', wireframe: true, transparent: true, opacity: 0.58 })
    );
    core.add(wire);
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 48, 32),
      new THREE.MeshBasicMaterial({ color: '#a5f7ff', transparent: true, opacity: 0.18 })
    );
    core.add(inner);
    core.userData.kind = 'genesis-core';
    this.add(core);

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.48 + i * 0.28, i === 1 ? 0.012 : 0.022, 10, 180),
        new THREE.MeshStandardMaterial({
          color: i === 1 ? '#ff895f' : '#39dff5',
          emissive: i === 1 ? '#8c2b18' : '#075b78',
          emissiveIntensity: 1.2,
          metalness: 0.7,
          roughness: 0.24,
          transparent: true,
          opacity: 0.8
        })
      );
      ring.rotation.set(0.55 + i * 0.42, 0.2 + i * 0.3, i * 0.65);
      ring.userData.kind = 'genesis-ring';
      ring.userData.index = i;
      this.add(ring);
    }

    const random = seededRandom(20261110);
    const particleCount = 1600;
    const start = new Float32Array(particleCount * 3);
    const targets = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const u = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const radius = 3.1 + random() * 4.2;
      const planar = Math.sqrt(1 - u * u);
      start[i * 3] = (random() - 0.5) * 0.08;
      start[i * 3 + 1] = (random() - 0.5) * 0.08;
      start[i * 3 + 2] = (random() - 0.5) * 0.08;
      targets[i * 3] = Math.cos(angle) * planar * radius;
      targets[i * 3 + 1] = u * radius * 0.68;
      targets[i * 3 + 2] = Math.sin(angle) * planar * radius * 0.42 - 0.8;
    }
    const particleGeometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(start, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    particleGeometry.setAttribute('position', positionAttribute);
    particleGeometry.setAttribute('targetPosition', new THREE.Float32BufferAttribute(targets, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: '#8deeff',
        size: 0.032,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    particles.userData.kind = 'genesis-particles';
    this.add(particles);

    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 1800;
    titleCanvas.height = 620;
    const ctx = titleCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 34;
      ctx.shadowColor = '#16dfff';
      ctx.font = '900 248px Arial, Helvetica, sans-serif';
      const cyan = ctx.createLinearGradient(380, 0, 1420, 0);
      cyan.addColorStop(0, '#b5fbff');
      cyan.addColorStop(0.52, '#39dcf4');
      cyan.addColorStop(1, '#f4a27c');
      ctx.fillStyle = cyan;
      ctx.fillText('NEON', 900, 230);
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#ff7652';
      ctx.font = '900 206px Arial, Helvetica, sans-serif';
      ctx.fillStyle = '#f4f0eb';
      ctx.fillText('GENESIS', 900, 470);
      ctx.shadowBlur = 0;
      const line = ctx.createLinearGradient(260, 0, 1540, 0);
      line.addColorStop(0, 'rgba(57,220,244,0)');
      line.addColorStop(0.5, 'rgba(57,220,244,0.95)');
      line.addColorStop(1, 'rgba(255,118,82,0)');
      ctx.fillStyle = line;
      ctx.fillRect(280, 574, 1240, 4);
    }
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    titleTexture.colorSpace = THREE.SRGBColorSpace;
    const title = new THREE.Mesh(
      new THREE.PlaneGeometry(7.3, 2.52),
      new THREE.MeshBasicMaterial({ map: titleTexture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    );
    title.position.set(0, -0.05, 1.42);
    title.userData.kind = 'genesis-title';
    this.add(title);

    const glow = new THREE.PointLight(0x20dfff, 0, 22);
    glow.position.set(0, 0, 2.2);
    glow.userData.kind = 'genesis-light';
    this.add(glow);
  }


  setGeneratedScene(spec: GeneratedSceneSpec): void {
    this.generatedSpec = spec;
    this.active = 'generated';
    this.sceneEpoch++;
    this.titanicAssets?.dispose();
    this.titanicAssets = undefined;
    for (const object of this.objects) {
      this.scene.remove(object);
      if (!object.userData.assetManaged) this.disposeObject(object);
    }
    this.objects.length = 0;
    this.buildGeneratedScene(spec);
    this.seek(0);
  }

  private buildGeneratedScene(spec: GeneratedSceneSpec): void {
    for (const definition of spec.objects) {
      let geometry: THREE.BufferGeometry;
      if (definition.type === 'sphere') geometry = new THREE.SphereGeometry(1, 48, 32);
      else if (definition.type === 'box') geometry = new THREE.BoxGeometry(1, 1, 1);
      else if (definition.type === 'torus') geometry = new THREE.TorusGeometry(0.8, 0.16, 16, 96);
      else if (definition.type === 'cylinder') geometry = new THREE.CylinderGeometry(0.75, 0.75, 1, 64);
      else {
        const canvas = document.createElement('canvas');
        canvas.width = 1400;
        canvas.height = 360;
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.font = '800 190px Arial, Helvetica, sans-serif';
          context.shadowColor = definition.emissive ?? definition.color;
          context.shadowBlur = 24;
          context.fillStyle = definition.color;
          context.fillText(definition.text ?? '', 700, 180, 1320);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        geometry = new THREE.PlaneGeometry(4.8, 1.24);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: definition.opacity ?? 1,
          depthWrite: false,
          toneMapped: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        this.configureGeneratedObject(mesh, definition);
        this.add(mesh);
        continue;
      }
      const material = new THREE.MeshStandardMaterial({
        color: definition.color,
        emissive: definition.emissive ?? '#000000',
        metalness: definition.metalness ?? 0.35,
        roughness: definition.roughness ?? 0.35,
        transparent: (definition.opacity ?? 1) < 1,
        opacity: definition.opacity ?? 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.configureGeneratedObject(mesh, definition);
      this.add(mesh);
    }
  }

  private configureGeneratedObject(object: THREE.Object3D, definition: GeneratedObject): void {
    object.name = definition.id;
    object.position.set(...definition.position);
    object.rotation.set(...definition.rotation);
    object.scale.set(...definition.scale);
    object.userData.kind = 'generated-object';
    object.userData.animations = definition.animations ?? [];
  }

  seek(seconds: number): void {
    const t = clamp(seconds, 0, 30);
    this.currentTime = t;
    this.scene.background = new THREE.Color(this.active === 'generated' && this.generatedSpec ? this.generatedSpec.background : this.active === 'type' ? '#101116' : this.active === 'product' ? '#090d16' : this.active === 'genesis' ? '#030711' : this.active === 'titanic' ? '#020b13' : '#050914');
    for (const object of this.objects) {
      const kind = object.userData.kind;

      if (kind === 'titanic-title') {
        const mesh = object as THREE.Mesh;
        const layer = object.userData.layer as string;
        const timing: Record<string, [number, number]> = { overline: [0.45, 2.1], main: [2.1, 5.1], subtitle: [4.2, 6.8], date: [6.2, 8.2] };
        const [start, end] = timing[layer] ?? [0, 1];
        const reveal = smoothstep(start, end, t) * (1 - smoothstep(16.1, 18, t));
        (mesh.material as THREE.MeshBasicMaterial).opacity = reveal;
        mesh.scale.setScalar(layer === 'main' ? 0.82 + 0.18 * easeOutCubic((t - start) / (end - start)) : 0.96 + reveal * 0.04);
        mesh.position.x = layer === 'main' ? (1 - reveal) * -0.32 : 0;
      }
      if (kind === 'titanic-stars') object.rotation.z = t * 0.003;
      if (kind === 'titanic-divider') {
        const reveal = smoothstep(3.5, 5.2, t);
        (object as THREE.Mesh).material && (((object as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = reveal);
        object.scale.y = reveal;
      }
      if (kind === 'titanic-light') (object as THREE.PointLight).intensity = 8 * smoothstep(2, 5, t) * (1 - 0.35 * smoothstep(15, 18, t));
      if (kind === 'generated-object') {
        const animations = object.userData.animations as SceneAnimation[];
        for (const animation of animations) {
          const raw = clamp((t - animation.start) / (animation.end - animation.start));
          const progress = animation.easing === 'easeOut'
            ? 1 - Math.pow(1 - raw, 3)
            : animation.easing === 'easeInOut'
              ? raw * raw * (3 - 2 * raw)
              : raw;
          const value = animation.from + (animation.to - animation.from) * progress;
          if (animation.property === 'opacity') {
            const material = (object as THREE.Mesh).material as THREE.Material & { opacity: number; transparent: boolean };
            material.transparent = true;
            material.opacity = value;
          } else {
            const [target, axis] = animation.property.split('.');
            const vector = (object as unknown as Record<string, THREE.Vector3>)[target];
            if (vector && ['x', 'y', 'z'].includes(axis)) vector[axis as 'x' | 'y' | 'z'] = value;
          }
        }
      }
      if (kind === 'genesis-core') {
        const reveal = clamp(spring(t - 0.28, 150, 23));
        object.scale.setScalar(0.025 + reveal * 0.975);
        object.rotation.set(t * 0.12, t * 0.34, Math.sin(t * 0.3) * 0.08);
      }
      if (kind === 'genesis-ring') {
        const index = Number(object.userData.index ?? 0);
        const reveal = clamp(spring(t - 1.9 - index * 0.42, 125, 20));
        object.scale.setScalar(0.08 + reveal * (0.92 + index * 0.08));
        object.rotation.x = 0.55 + index * 0.42 + Math.sin(t * 0.2 + index) * 0.12;
        object.rotation.y = t * (0.12 + index * 0.035);
        object.rotation.z = t * (index % 2 === 0 ? 0.16 : -0.13);
        const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        material.opacity = 0.12 + reveal * 0.72;
      }
      if (kind === 'genesis-particles') {
        const geometry = (object as THREE.Points).geometry;
        const position = geometry.getAttribute('position') as THREE.BufferAttribute;
        const target = geometry.getAttribute('targetPosition') as THREE.BufferAttribute;
        const burst = smoothstep(5.85, 8.25, t);
        const angle = t * 0.16;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        for (let i = 0; i < target.count; i++) {
          const tx = target.getX(i);
          const ty = target.getY(i);
          const tz = target.getZ(i);
          const pulse = Math.sin(t * 0.9 + i * 0.17) * 0.018 * burst;
          position.setXYZ(
            i,
            (tx * cos - tz * sin) * burst,
            ty * burst + pulse,
            (tx * sin + tz * cos) * burst
          );
        }
        position.needsUpdate = true;
        const material = (object as THREE.Points).material as THREE.PointsMaterial;
        material.opacity = 0.18 + 0.82 * smoothstep(4.8, 7.4, t);
      }
      if (kind === 'genesis-title') {
        const mesh = object as THREE.Mesh;
        const reveal = smoothstep(8.15, 9.45, t);
        const settle = 0.88 + 0.12 * easeOutCubic((t - 9.2) / 2.2);
        mesh.scale.setScalar((0.72 + reveal * 0.28) * settle);
        mesh.position.y = -0.05 + (1 - reveal) * -0.18;
        (mesh.material as THREE.MeshBasicMaterial).opacity = reveal * (1 - 0.18 * smoothstep(14.35, 15, t));
      }
      if (kind === 'genesis-light') {
        (object as THREE.PointLight).intensity = 5 + 42 * smoothstep(2.2, 4.5, t) - 18 * smoothstep(13.8, 15, t);
      }
      if (kind === 'bars') {
        const group = object as THREE.Group;
        group.children.forEach((child, i) => { const reveal = spring(t - 0.35 - i * 0.09, 190, 25); child.scale.y = 0.05 + reveal * (1.1 + (i % 3) * 0.25); child.position.y = -0.7 + child.scale.y * 0.5; });
        group.rotation.y = Math.sin(t * 0.55) * 0.12;
      }
      if (kind === 'title') {
        const mesh = object as THREE.Mesh;
        const reveal = spring(t - 0.25, 210, 25);
        const animatedScale = evaluateTrack(t, this.titleScaleKeys, 1);
        mesh.scale.set(animatedScale, animatedScale, 1);
        (mesh.material as THREE.MeshBasicMaterial).opacity = clamp(reveal);
        mesh.position.y = 0.3 + reveal * 0.25;
      }
      if (kind === 'ring') { object.rotation.z = t * 0.18; (object as THREE.Mesh).scale.setScalar(0.65 + easeOutCubic(t / 2) * 0.35); }
      if (kind === 'product') { object.rotation.set(0.18 + Math.sin(t * 0.38) * 0.08, t * 0.42, -0.12 + Math.sin(t * 0.6) * 0.035); object.position.y = Math.sin(t * 0.8) * 0.12; }
      if (kind === 'earth' || kind === 'cloud') { object.rotation.y = t * (kind === 'earth' ? 0.12 : 0.15); const reveal = smoothstep(0, 2.2, t); object.scale.setScalar(0.15 + reveal * 0.85); }
      if (kind === 'orbit') { object.rotation.z = t * 0.13; (object as THREE.Mesh).material && (((object as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.75 * smoothstep(0, 3, t)); }
    }
    if (this.active === 'generated' && this.generatedSpec) {
      const camera = this.generatedSpec.camera;
      const progress = clamp((t - camera.start) / (camera.end - camera.start));
      const eased = progress * progress * (3 - 2 * progress);
      this.camera.position.set(
        camera.from[0] + (camera.to[0] - camera.from[0]) * eased,
        camera.from[1] + (camera.to[1] - camera.from[1]) * eased,
        camera.from[2] + (camera.to[2] - camera.from[2]) * eased
      );
      this.camera.lookAt(0, 0, 0);
    } else if (this.active === 'genesis') {
      this.camera.position.set(Math.sin(t * 0.18) * 0.22, Math.sin(t * 0.31) * 0.1, 9.2 - 1.05 * smoothstep(9.4, 13, t));
      this.camera.lookAt(0, 0, 0);
    } else if (this.active === 'titanic') {
      this.titanicAssets?.update(t);
      const shots = [
        { time: 0, position: new THREE.Vector3(0.1, 2.25, 10.8), target: new THREE.Vector3(0, 0.42, 0) },
        { time: 5.2, position: new THREE.Vector3(2.35, 1.45, 6.3), target: new THREE.Vector3(2.25, 0.34, 0.12) },
        { time: 8.0, position: new THREE.Vector3(1.55, 1.1, 5.25), target: new THREE.Vector3(2.55, 0.3, 0.12) },
        { time: 11.5, position: new THREE.Vector3(0.2, 2.1, 10.2), target: new THREE.Vector3(0, 0.28, 0) },
        { time: 18, position: new THREE.Vector3(-0.2, 2.5, 11.4), target: new THREE.Vector3(0, 0.1, 0) }
      ];
      let index = 0;
      while (index < shots.length - 2 && t > shots[index + 1].time) index++;
      const a = shots[index];
      const b = shots[index + 1];
      const progress = smoothstep(a.time, b.time, t);
      this.camera.position.lerpVectors(a.position, b.position, progress);
      const target = a.target.clone().lerp(b.target, progress);
      this.camera.lookAt(target);
    } else {
      this.camera.position.x = this.active === 'science' ? Math.sin(t * 0.16) * 0.18 : Math.sin(t * 0.22) * 0.12;
      this.camera.position.y = this.active === 'product' ? Math.sin(t * 0.3) * 0.1 : 0;
      this.camera.position.z = 9;
      this.camera.lookAt(0, 0, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }

  setTitleText(text: string, color = this.titleColor): void {
    this.titleText = text.slice(0, 40);
    this.titleColor = color;
    const ctx = this.titleCanvas?.getContext('2d');
    if (!ctx || !this.titleTexture) return;
    ctx.clearRect(0, 0, 1600, 360);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 250px Arial, Helvetica, sans-serif';
    ctx.fillStyle = this.titleColor; ctx.fillText(this.titleText, 800, 176, 1500);
    ctx.fillStyle = '#f47b55'; ctx.fillRect(180, 310, 1240, 9);
    this.titleTexture.needsUpdate = true;
    this.seek(this.currentTime);
  }

  setTitleScaleKeys(keys: Keyframe[]): void { this.titleScaleKeys = [...keys]; }

  dispose(): void {
    this.titleTexture?.dispose();
    window.removeEventListener('resize', this.resize);
    this.titanicAssets?.dispose();
    this.titanicAssets = undefined;
    for (const object of this.objects) if (!object.userData.assetManaged) this.disposeObject(object);
    this.renderer.dispose();
  }
}
