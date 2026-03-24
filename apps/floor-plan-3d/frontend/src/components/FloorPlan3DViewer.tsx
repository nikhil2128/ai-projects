import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { FloorPlan } from '../types';
import { RoomMesh } from './RoomMesh';

interface FloorPlan3DViewerProps {
  floorPlan: FloorPlan;
  wallHeight: number;
  showLabels: boolean;
  showGrid: boolean;
}

export function FloorPlan3DViewer({
  floorPlan,
  wallHeight,
  showLabels,
  showGrid,
}: FloorPlan3DViewerProps) {
  const offsetX = -floorPlan.totalWidth / 2;
  const offsetZ = -floorPlan.totalLength / 2;

  const cameraDistance = useMemo(() => {
    const maxDim = Math.max(floorPlan.totalWidth, floorPlan.totalLength);
    return maxDim * 1.2;
  }, [floorPlan]);

  return (
    <Canvas
      shadows
      camera={{
        position: [cameraDistance * 0.7, cameraDistance * 0.8, cameraDistance * 0.7],
        fov: 50,
        near: 0.1,
        far: cameraDistance * 10,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#f3f4f6']} />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[cameraDistance * 0.5, cameraDistance, cameraDistance * 0.3]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight
        position={[-cameraDistance * 0.3, cameraDistance * 0.5, -cameraDistance * 0.2]}
        intensity={0.3}
      />

      <Environment preset="city" />

      {showGrid && (
        <Grid
          args={[200, 200]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#d1d5db"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#9ca3af"
          fadeDistance={cameraDistance * 2}
          fadeStrength={1}
          position={[0, 0, 0]}
          infiniteGrid
        />
      )}

      {floorPlan.rooms.map((room, i) => (
        <RoomMesh
          key={i}
          room={room}
          wallHeight={wallHeight}
          showLabel={showLabels}
          offsetX={offsetX}
          offsetZ={offsetZ}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={cameraDistance * 3}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
