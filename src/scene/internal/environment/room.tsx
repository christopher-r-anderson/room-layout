export function Room() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#e5e5e5" />
      </mesh>

      <mesh position={[0, 1.25, -3]}>
        <planeGeometry args={[6, 2.5]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>

      <mesh position={[-3, 1.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6, 2.5]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
    </>
  )
}
