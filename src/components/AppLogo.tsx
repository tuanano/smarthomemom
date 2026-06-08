export default function AppLogo({ size = 80 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}pwa-192x192.png`}
      width={size}
      height={size}
      alt="SmartHomeMom"
      style={{ display: 'block' }}
    />
  );
}
