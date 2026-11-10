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
  ocean.position.y = 0.255;
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
  bow.position.y = -0.255;
  stern.position.y = -0.255;

  const iceberg = icebergSource.clone(true);
  iceberg.scale.setScalar(SCALE);
  iceberg.position.set(3.48, -0.05, 0.44);
  iceberg.userData.kind = 'titanic-asset-iceberg';

  const ocean = makeOcean();

  const update = (time: number): void => {
    const approach = THREE.MathUtils.smoothstep(time, 5.2, 8.1);
    const impact = THREE.MathUtils.smoothstep(time, 7.65, 8.35);
    const separation = THREE.MathUtils.smoothstep(time, 8.0, 10.2);
    const sinking = THREE.MathUtils.smoothstep(time, 11.4, 18);
    const bowOffset = 0.28 * separation;
    const sternOffset = -0.24 * separation;

    bow.position.x = 0.06 * approach + bowOffset;
    stern.position.x = 0.06 * approach + sternOffset;
    bow.position.y = -0.255 - 0.16 * impact - 1.18 * sinking;
    stern.position.y = -0.255 + 0.08 * impact - 0.78 * sinking;
    bow.rotation.z = -0.035 * impact - 0.38 * separation - 0.24 * sinking;
    stern.rotation.z = 0.02 * impact + 0.25 * separation + 0.16 * sinking;
    bow.rotation.y = 0.02 * impact;
    stern.rotation.y = -0.015 * impact;

    const bowPlane = bow.userData.cutPlane as THREE.Plane;
    const sternPlane = stern.userData.cutPlane as THREE.Plane;
    bowPlane.constant = -bowOffset;
    sternPlane.constant = sternOffset;

    iceberg.position.x = 3.48 - 0.12 * approach;
    iceberg.position.z = 0.44 - 0.06 * approach;
    iceberg.rotation.y = Math.sin(time * 0.18) * 0.012;

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
    for (const root of [bow, stern, iceberg, ocean]) {
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

  return { bow, stern, iceberg, ocean, update, dispose };
}
