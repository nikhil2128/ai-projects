import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { Room, ROOM_COLORS } from '../types';

interface RoomMeshProps {
  room: Room;
  wallHeight: number;
  showLabel: boolean;
  offsetX: number;
  offsetZ: number;
}

const WALL_THICKNESS = 0.15;

export function RoomMesh({ room, wallHeight, showLabel, offsetX, offsetZ }: RoomMeshProps) {
  const color = ROOM_COLORS[room.type];

  const cx = room.x + room.width / 2 + offsetX;
  const cz = room.y + room.length / 2 + offsetZ;

  return (
    <group position={[cx, 0, cz]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[room.width, room.length]} />
        <meshStandardMaterial color={color} opacity={0.55} transparent />
      </mesh>

      {/* Front wall */}
      <mesh position={[0, wallHeight / 2, -room.length / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.width, wallHeight, WALL_THICKNESS]} />
        <meshStandardMaterial color={color} opacity={0.35} transparent />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, wallHeight / 2, room.length / 2]} castShadow receiveShadow>
        <boxGeometry args={[room.width, wallHeight, WALL_THICKNESS]} />
        <meshStandardMaterial color={color} opacity={0.35} transparent />
      </mesh>

      {/* Left wall */}
      <mesh position={[-room.width / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, wallHeight, room.length]} />
        <meshStandardMaterial color={color} opacity={0.35} transparent />
      </mesh>

      {/* Right wall */}
      <mesh position={[room.width / 2, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, wallHeight, room.length]} />
        <meshStandardMaterial color={color} opacity={0.35} transparent />
      </mesh>

      {/* Wall top edges for definition */}
      <lineSegments position={[0, wallHeight, 0]}>
        <edgesGeometry
          args={[new THREE.BoxGeometry(room.width, 0.01, room.length)]}
        />
        <lineBasicMaterial color={color} />
      </lineSegments>

      {/* Label */}
      {showLabel && (
        <Text
          position={[0, wallHeight + 0.8, 0]}
          fontSize={Math.min(room.width, room.length) * 0.12}
          color="#374151"
          anchorX="center"
          anchorY="middle"
          maxWidth={room.width * 0.9}
        >
          {`${room.name}\n${room.width} × ${room.length}`}
        </Text>
      )}
    </group>
  );
}
