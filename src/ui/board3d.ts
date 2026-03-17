/**
 * Three.js board view: reference-style black/white/orange layout with optional animations.
 * Renders pits and kazans; korgools as spheres. Click handling via raycaster.
 */
import * as THREE from 'three';
import type { GameState } from '../game/types.js';
import { getLegalMoves, getScores } from '../game/engine.js';

const HOLE_COUNT = 9;
const MAX_STONES = 18;

export interface Board3DOptions {
  myPlayer?: 0 | 1;
  onMove: (holeIndex: number) => void;
  animateStones?: boolean;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 6;
const PIT_RADIUS = 0.32;
const KAZAN_WIDTH = 1.2;
const KAZAN_HEIGHT = 0.5;

/** Pit layout: row 0 = opponent (top), row 1 = my side (bottom). Kazans in between. */
function getPitPosition(player: 0 | 1, holeIndex: number): { x: number; z: number } {
  const row = player === 0 ? 1 : -1;
  const z = row * (BOARD_HEIGHT / 2 - 0.6);
  const x = (holeIndex - 4) * 0.95;
  return { x, z };
}

function getKazanPosition(player: 0 | 1): { x: number; z: number } {
  const x = player === 0 ? -KAZAN_WIDTH / 2 - 0.2 : KAZAN_WIDTH / 2 + 0.2;
  return { x, z: 0 };
}

export function attachBoard3D(
  container: HTMLElement,
  getState: () => GameState,
  options: Board3DOptions
): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  const camera = new THREE.OrthographicCamera(
    -BOARD_WIDTH / 2 - 1,
    BOARD_WIDTH / 2 + 1,
    BOARD_HEIGHT / 2 + 1,
    -BOARD_HEIGHT / 2 - 1,
    0.1,
    100
  );
  camera.position.set(0, 8, 0);
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 0, -1);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.4);
  dir.position.set(2, 5, 2);
  scene.add(dir);

  const boardShape = new THREE.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT, 1, 1);
  const boardMat = new THREE.MeshBasicMaterial({
    color: 0x0a0a0a,
    side: THREE.DoubleSide,
  });
  const boardMesh = new THREE.Mesh(boardShape, boardMat);
  boardMesh.rotation.x = -Math.PI / 2;
  scene.add(boardMesh);

  const edgeShape = new THREE.RingGeometry(BOARD_WIDTH / 2 - 0.05, BOARD_WIDTH / 2 + 0.05, 32);
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  const edgeMesh = new THREE.Mesh(edgeShape, edgeMat);
  edgeMesh.rotation.x = -Math.PI / 2;
  scene.add(edgeMesh);

  const pitMeshes: THREE.Mesh[] = [];
  const pitMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  for (let p = 0; p < 2; p++) {
    for (let h = 0; h < HOLE_COUNT; h++) {
      const pos = getPitPosition(p as 0 | 1, h);
      const geom = new THREE.CircleGeometry(PIT_RADIUS, 24);
      const mesh = new THREE.Mesh(geom, pitMaterial.clone());
      mesh.position.set(pos.x, 0.01, pos.z);
      mesh.rotation.x = -Math.PI / 2;
      mesh.userData = { player: p, holeIndex: h };
      scene.add(mesh);
      pitMeshes.push(mesh);
    }
  }

  const kazanGeom = new THREE.PlaneGeometry(KAZAN_WIDTH, KAZAN_HEIGHT, 1, 1);
  const kazanMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  for (let p = 0; p < 2; p++) {
    const pos = getKazanPosition(p as 0 | 1);
    const mesh = new THREE.Mesh(kazanGeom.clone(), kazanMat.clone());
    mesh.position.set(pos.x, 0.02, pos.z);
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);
  }

  const stoneGeometry = new THREE.SphereGeometry(0.08, 12, 12);
  const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0xe85c0a });
  const stoneMeshes: THREE.Mesh[] = [];
  const TOTAL_STONE_SLOTS = 18 * MAX_STONES + 2 * 82;
  for (let i = 0; i < TOTAL_STONE_SLOTS; i++) {
    const stone = new THREE.Mesh(stoneGeometry, stoneMaterial.clone());
    stone.visible = false;
    scene.add(stone);
    stoneMeshes.push(stone);
  }

  function layoutStones(state: GameState): void {
    let idx = 0;
    for (let player = 0; player < 2; player++) {
      for (let h = 0; h < HOLE_COUNT; h++) {
        const count = state.holes[player][h];
        const pos = getPitPosition(player as 0 | 1, h);
        for (let k = 0; k < Math.min(count, MAX_STONES); k++) {
          const row = Math.floor(k / 3);
          const col = k % 3;
          const ox = (col - 1) * 0.06;
          const oz = (row - 1) * 0.06;
          const m = stoneMeshes[idx++];
          if (m) {
            m.position.set(pos.x + ox, 0.15, pos.z + oz);
            m.visible = true;
          }
        }
      }
    }
    for (let p = 0; p < 2; p++) {
      const score = getScores(state)[p];
      const kazanPos = getKazanPosition(p as 0 | 1);
      for (let k = 0; k < Math.min(score, MAX_STONES * 2); k++) {
        const row = Math.floor(k / 6);
        const col = k % 6;
        const ox = (col - 2.5) * 0.1;
        const oz = (row - 0.5) * 0.08;
        const m = stoneMeshes[idx++];
        if (m) {
          m.position.set(kazanPos.x + ox, 0.15, kazanPos.z + oz);
          m.visible = true;
        }
      }
    }
    while (idx < stoneMeshes.length) {
      stoneMeshes[idx++].visible = false;
    }
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerClick(event: MouseEvent): void {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pitMeshes);
    if (hits.length > 0) {
      const obj = hits[0].object as THREE.Mesh;
      const { player, holeIndex } = obj.userData as { player: number; holeIndex: number };
      const state = getState();
      const legal = getLegalMoves(state);
      if (state.phase === 'playing' && legal.includes(holeIndex) && state.currentPlayer === player) {
        options.onMove(holeIndex);
      }
    }
  }

  renderer.domElement.addEventListener('click', onPointerClick);

  layoutStones(getState());

  function resize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  let animId = 0;
  function render(): void {
    animId = requestAnimationFrame(render);
    layoutStones(getState());
    renderer.render(scene, camera);
  }
  render();

  window.addEventListener('resize', resize);

  return () => {
    window.removeEventListener('resize', resize);
    renderer.domElement.removeEventListener('click', onPointerClick);
    cancelAnimationFrame(animId);
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.remove();
  };
}
