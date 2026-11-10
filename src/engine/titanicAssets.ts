import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const REVISION = '661b58512d0bacd36ba2c5cd9dd060f0f105cb0d';
const MODEL_ROOT = `https://cdn.jsdelivr.net/gh/KantLex/3D-Titanic-Model@${REVISION}/public/models/`;
const DRACO_ROOT = `https://cdn.jsdelivr.net/gh/KantLex/3D-Titanic-Model@${REVISION}/public/draco/`;
const SCALE = 0.025;

const SHIP_FILES = [
  'hull.glb',
  'structure.glb',
  'funnel1.glb',
  'funnel2.glb',
  'funnel3.glb',
  'funnel4.glb',
  'lifeboats.glb',
  'masts.glb',
  'anchors.glb',
  'rudder.glb',
  'propellers.glb',
  'bridge.glb',
  'deckhouses.glb',
];

export interface TitanicAssetScene {
  bow: THREE.Group;
  stern: THREE.Group;
  iceberg: THREE.Group;
  ocean: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>;
  effects: THREE.Group;
  update(time: number): void;
  dispose(): void;
}

function cloneForClipping(source: THREE.Group, side: 'bow' | 'stern'): THREE.Group {
  const clone = source.clone(true);
  const plane = new THREE.Plane(
    side === 'bow' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0),
    0
  );
  clone.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const clipped = materials.map((material) => {
      const copy = material.clone();
      copy.clippingPlanes = [plane];
      copy.clipShadows = true;
      return copy;
    });
    mesh.material = Array.isArray(mesh.material) ? clipped : clipped[0];
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  clone.userData.cutPlane = plane;
  clone.userData.side = side;
  clone.userData.kind = 'titanic-asset-half';
  return clone;
}

function makeOcean(): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial> {
  const geometry = new THREE.PlaneGeometry(420, 220, 160, 80);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshPhysicalMaterial({
    color: '#082b42',
    metalness: 0.32,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    reflectivity: 0.85,
  });
  const ocean = new THREE.Mesh(geometry, material);
  ocean.position.y = 0.2635;
  ocean.userData.originalPositions = (geometry.attributes.position as THREE.BufferAttribute).array.slice();
  ocean.receiveShadow = true;
  ocean.userData.kind = 'titanic-ocean';
  return ocean;
}

export async function loadTitanicAssetScene(): Promise<TitanicAssetScene> {
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_ROOT);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  const loaded = await Promise.all(
    [...SHIP_FILES, 'iceberg.glb'].map(async (file) => {
      const gltf = await loader.loadAsync(MODEL_ROOT + file);
      gltf.scene.updateMatrixWorld(true);
      return { file, scene: gltf.scene };
    })
  );

  const sourceShip = new THREE.Group();
  sourceShip.name = 'titanic-source-ship';
  let icebergSource: THREE.Group | undefined;
  for (const asset of loaded) {
    if (asset.file === 'iceberg.glb') icebergSource = asset.scene;
    else sourceShip.add(asset.scene);
  }
  if (!icebergSource) throw new Error('Titanic iceberg asset was not loaded.');

  sourceShip.updateMatrixWorld(true);
  const bow = cloneForClipping(sourceShip, 'bow');
  const stern = cloneForClipping(sourceShip, 'stern');
  bow.scale.setScalar(SCALE);
  stern.scale.setScalar(SCALE);


  const iceberg = icebergSource.clone(true);
  iceberg.scale.setScalar(SCALE);
  // The source model is authored in Titanic ship coordinates; offset it from its historical placement to the collision mark.
  iceberg.position.set(3.09, 0, -0.86);
  iceberg.userData.kind = 'titanic-asset-iceberg';

  const ocean = makeOcean();
  const effects = new THREE.Group();
  effects.name = 'titanic-impact-effects';

  const particleCount = 220;
  const sprayCount = 360;
  const debrisOrigin = new Float32Array(particleCount * 3);
  const debrisVelocity = new Float32Array(particleCount * 3);
  const sprayOrigin = new Float32Array(sprayCount * 3);
  const sprayVelocity = new Float32Array(sprayCount * 3);
  const debrisPositions = new Float32Array(particleCount * 3);
  const sprayPositions = new Float32Array(sprayCount * 3);
  let seed = 1912;
  const random = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < particleCount; i++) {
    const angle = random() * Math.PI * 2;
    const speed = 0.28 + random() * 1.05;
    debrisOrigin[i * 3] = 2.65 + (random() - 0.5) * 0.42;
    debrisOrigin[i * 3 + 1] = 0.32 + random() * 0.25;
    debrisOrigin[i * 3 + 2] = (random() - 0.5) * 0.7;
    debrisVelocity[i * 3] = Math.cos(angle) * speed;
    debrisVelocity[i * 3 + 1] = 0.35 + random() * 1.15;
    debrisVelocity[i * 3 + 2] = Math.sin(angle) * speed * 0.72;
  }
  for (let i = 0; i < sprayCount; i++) {
    const angle = random() * Math.PI * 2;
    const speed = 0.35 + random() * 1.35;
    sprayOrigin[i * 3] = 2.6 + (random() - 0.5) * 0.24;
    sprayOrigin[i * 3 + 1] = 0.27;
    sprayOrigin[i * 3 + 2] = (random() - 0.5) * 0.45;
    sprayVelocity[i * 3] = Math.cos(angle) * speed;
    sprayVelocity[i * 3 + 1] = 0.45 + random() * 1.55;
    sprayVelocity[i * 3 + 2] = Math.sin(angle) * speed;
  }

  const debrisGeometry = new THREE.BufferGeometry();
  const debrisAttribute = new THREE.BufferAttribute(debrisPositions, 3);
  debrisAttribute.setUsage(THREE.DynamicDrawUsage);
  debrisGeometry.setAttribute('position', debrisAttribute);
  const debris = new THREE.Points(debrisGeometry, new THREE.PointsMaterial({
    color: '#d8e6ec', size: 0.038, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false
  }));
  debris.name = 'ice-and-hull-debris';
  effects.add(debris);

  const sprayGeometry = new THREE.BufferGeometry();
  const sprayAttribute = new THREE.BufferAttribute(sprayPositions, 3);
  sprayAttribute.setUsage(THREE.DynamicDrawUsage);
  sprayGeometry.setAttribute('position', sprayAttribute);
  const spray = new THREE.Points(sprayGeometry, new THREE.PointsMaterial({
    color: '#b9e4f3', size: 0.027, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false
  }));
  spray.name = 'impact-spray';
  effects.add(spray);

  const smokePositions = new Float32Array(90 * 3);
  const smokeGeometry = new THREE.BufferGeometry();
  const smokeAttribute = new THREE.BufferAttribute(smokePositions, 3);
  smokeAttribute.setUsage(THREE.DynamicDrawUsage);
  smokeGeometry.setAttribute('position', smokeAttribute);
  const smoke = new THREE.Points(smokeGeometry, new THREE.PointsMaterial({
    color: '#53616b', size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false
  }));
  smoke.name = 'impact-smoke';
  effects.add(smoke);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 20, 16),
    new THREE.MeshBasicMaterial({ color: '#e5f8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flash.position.set(2.65, 0.43, 0);
  effects.add(flash);
  const flashLight = new THREE.PointLight(0x9edfff, 0, 5);
  flashLight.position.copy(flash.position);
  effects.add(flashLight);

  const update = (time: number): void => {
    const approach = THREE.MathUtils.smoothstep(time, 5.2, 8.1);
    const impact = THREE.MathUtils.smoothstep(time, 7.65, 8.35);
    const separation = THREE.MathUtils.smoothstep(time, 8.0, 10.2);
    const sinking = THREE.MathUtils.smoothstep(time, 11.4, 18);
    const bowOffset = 0.28 * separation;
    const sternOffset = -0.24 * separation;

    bow.position.x = 0.06 * approach + bowOffset;
    stern.position.x = 0.06 * approach + sternOffset;
    bow.position.y = -0.16 * impact - 1.18 * sinking;
    stern.position.y = 0.08 * impact - 0.78 * sinking;
    bow.rotation.z = -0.035 * impact - 0.38 * separation - 0.24 * sinking;
    stern.rotation.z = 0.02 * impact + 0.25 * separation + 0.16 * sinking;
    bow.rotation.y = 0.02 * impact;
    stern.rotation.y = -0.015 * impact;

    const bowPlane = bow.userData.cutPlane as THREE.Plane;
    const sternPlane = stern.userData.cutPlane as THREE.Plane;
    bowPlane.constant = -bowOffset;
    sternPlane.constant = sternOffset;

    iceberg.position.x = 3.09 - 0.12 * approach;
    iceberg.position.z = -0.86 - 0.06 * approach;
    iceberg.rotation.y = Math.sin(time * 0.18) * 0.012;

    const elapsed = Math.max(0, time - 8.05);
    const impactEnvelope = THREE.MathUtils.smoothstep(time, 7.8, 8.12)
      * (1 - THREE.MathUtils.smoothstep(time, 8.55, 9.15));
    const debrisFade = THREE.MathUtils.smoothstep(time, 7.95, 8.25)
      * (1 - THREE.MathUtils.smoothstep(time, 11.8, 13.2));
    const sprayFade = THREE.MathUtils.smoothstep(time, 7.95, 8.18)
      * (1 - THREE.MathUtils.smoothstep(time, 9.35, 10.2));
    const smokeFade = THREE.MathUtils.smoothstep(time, 8.05, 8.7)
      * (1 - THREE.MathUtils.smoothstep(time, 15.2, 18));
    const gravity = 0.48;
    for (let i = 0; i < particleCount; i++) {
      const age = elapsed * (0.62 + (i % 11) * 0.035);
      debrisPositions[i * 3] = debrisOrigin[i * 3] + debrisVelocity[i * 3] * age;
      debrisPositions[i * 3 + 1] = debrisOrigin[i * 3 + 1] + debrisVelocity[i * 3 + 1] * age - gravity * age * age;
      debrisPositions[i * 3 + 2] = debrisOrigin[i * 3 + 2] + debrisVelocity[i * 3 + 2] * age;
    }
    debrisAttribute.needsUpdate = true;
    (debris.material as THREE.PointsMaterial).opacity = 0.92 * debrisFade;
    for (let i = 0; i < sprayCount; i++) {
      const age = elapsed * (0.82 + (i % 13) * 0.025);
      sprayPositions[i * 3] = sprayOrigin[i * 3] + sprayVelocity[i * 3] * age;
      sprayPositions[i * 3 + 1] = sprayOrigin[i * 3 + 1] + sprayVelocity[i * 3 + 1] * age - 0.7 * age * age;
      sprayPositions[i * 3 + 2] = sprayOrigin[i * 3 + 2] + sprayVelocity[i * 3 + 2] * age;
    }
    sprayAttribute.needsUpdate = true;
    (spray.material as THREE.PointsMaterial).opacity = 0.72 * sprayFade;
    for (let i = 0; i < 30; i++) {
      const age = Math.max(0, time - (8.25 + i * 0.11));
      const phase = i * 2.399;
      smokePositions[i * 3] = 2.58 + Math.cos(phase) * (0.12 + age * 0.1);
      smokePositions[i * 3 + 1] = 0.48 + age * (0.23 + (i % 5) * 0.018);
      smokePositions[i * 3 + 2] = Math.sin(phase) * (0.12 + age * 0.08);
    }
    for (let i = 30; i < 90; i++) {
      const j = i - 30;
      const age = Math.max(0, time - (9.3 + j * 0.085));
      const phase = j * 2.399;
      smokePositions[i * 3] = 2.2 + Math.cos(phase) * (0.16 + age * 0.12);
      smokePositions[i * 3 + 1] = 0.55 + age * (0.19 + (j % 4) * 0.025);
      smokePositions[i * 3 + 2] = Math.sin(phase) * (0.14 + age * 0.09);
    }
    smokeAttribute.needsUpdate = true;
    (smoke.material as THREE.PointsMaterial).opacity = 0.32 * smokeFade;
    flash.scale.setScalar(0.35 + impactEnvelope * 5.5);
    (flash.material as THREE.MeshBasicMaterial).opacity = 0.9 * impactEnvelope;
    flashLight.intensity = 42 * impactEnvelope;

    const positions = ocean.geometry.attributes.position as THREE.BufferAttribute;
    const original = ocean.userData.originalPositions as Float32Array;
    for (let i = 0; i < positions.count; i++) {
      const x = original[i * 3];
      const z = original[i * 3 + 2];
      const wave = Math.sin(x * 0.055 + time * 0.85) * 0.035
        + Math.cos(z * 0.09 - time * 0.68) * 0.022
        + Math.sin((x + z) * 0.027 + time * 0.42) * 0.018;
      positions.setY(i, wave);
    }
    positions.needsUpdate = true;
    ocean.geometry.computeVertexNormals();
  };

  const dispose = (): void => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    for (const root of [bow, stern, iceberg, ocean, effects]) {
      root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        const list = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const material of list) {
          materials.add(material);
          for (const value of Object.values(material)) {
            if (value && typeof value === 'object' && (value as THREE.Texture).isTexture) textures.add(value as THREE.Texture);
          }
        }
      });
    }
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    draco.dispose();
  };

  return { bow, stern, iceberg, ocean, effects, update, dispose };
}
