/**
 * ThumbIKTest.tsx
 *
 * Test component for thumb IK using CCDIKSolver
 * Displays skeleton with draggable target sphere
 */

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildSkeletonFromSpec } from "../builders/skeleton-builder";
import { linkerhand_l10_left_thumb } from "../specs/linkerhand_l10_left";

/**
 * Helper component to visualize bones
 */
function BoneHelper({ bone }: { bone: THREE.Bone }) {
  useFrame(() => {
    // Force update to track bone movements
  });

  return (
    <primitive object={bone}>
      {/* Visualize bone with small sphere */}
      <mesh>
        <sphereGeometry args={[0.003, 8, 8]} />
        <meshBasicMaterial color="red" />
      </mesh>

      {/* Draw line to child bones */}
      {bone.children.map((child, idx) => {
        if (child instanceof THREE.Bone) {
          const distance = child.position.length();
          return (
            <group key={idx}>
              <mesh rotation={[0, 0, -Math.PI / 2]} position={[distance / 2, 0, 0]}>
                <cylinderGeometry args={[0.001, 0.001, distance, 4]} />
                <meshBasicMaterial color="white" />
              </mesh>
            </group>
          );
        }
        return null;
      })}
    </primitive>
  );
}

/**
 * Draggable target sphere for IK testing
 */
function DraggableTarget({ bone }: { bone: THREE.Bone }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);

  useFrame(({ mouse, camera }) => {
    if (isDragging && meshRef.current) {
      // Simple drag behavior: move in camera plane
      const distance = camera.position.z - bone.position.z;
      const vec = new THREE.Vector3(mouse.x, mouse.y, 0.5);
      vec.unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const newPos = camera.position.clone().add(dir.multiplyScalar(distance));

      bone.position.copy(newPos);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={bone.position}
      // onPointerDown={() => setIsDragging(true)}
      // onPointerUp={() => setIsDragging(false)}
      // onPointerLeave={() => setIsDragging(false)}
    >
      <sphereGeometry args={[0.01, 16, 16]} />
      <meshStandardMaterial color={isDragging ? "yellow" : "cyan"} emissive="cyan" />
    </mesh>
  );
}

/**
 * Main thumb IK test component
 */
export default function ThumbIKTest() {
  const groupRef = useRef(null);
  const [buildResult, setBuildResult] = useState(null);

  // Build skeleton on mount
  useEffect(() => {
    try {
      const result = buildSkeletonFromSpec(linkerhand_l10_left_thumb);

      // Position target in a reasonable starting position
      const target = result.targets.get("thumb_target");
      if (target) {
        target.position.set(0.03, 0.02, 0.12);
      }

      // Update world matrices
      result.root.updateWorldMatrix(true, true);

      setBuildResult(result);

      console.log("✅ Thumb IK skeleton built successfully");
      console.log("Bones:", Array.from(result.bones.keys()));
      console.log("Targets:", Array.from(result.targets.keys()));
    } catch (error) {
      console.error("❌ Failed to build thumb IK skeleton:", error);
    }
  }, []);

  // IK solve loop
  useFrame(() => {
    if (!buildResult) return;

    try {
      // Update IK solver
      buildResult.solver.update();

      // Apply constraints
      buildResult.applyAxisConstraints();
      buildResult.applyMimicConstraints();
    } catch (error) {
      console.error("IK solver error:", error);
    }
  });

  if (!buildResult) {
    return null; // Loading
  }

  const target = buildResult.targets.get("thumb_target");

  return (
    <group ref={groupRef}>
      {/* Render skeleton */}
      <primitive object={buildResult.root} />

      {/* Visualize all bones */}
      {Array.from(buildResult.bones.values()).map((bone) => (
        <BoneHelper key={bone.uuid} bone={bone} />
      ))}

      {/* Draggable target sphere */}
      {target && <DraggableTarget bone={target} />}

      {/* Optional: visualize targets as well */}
      {Array.from(buildResult.targets.values()).map((bone) => (
        <BoneHelper key={bone.uuid} bone={bone} />
      ))}

      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial color="#444" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
