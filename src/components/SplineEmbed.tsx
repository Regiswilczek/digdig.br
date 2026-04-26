interface SplineEmbedProps {
  /** Override default celestial flow scene */
  src?: string;
  /** Width in CSS units (e.g. "100%", 280) */
  width?: string | number;
  /** Height in CSS units */
  height?: string | number;
  className?: string;
  /** Border radius (px) */
  radius?: number;
  /** Show subtle border */
  bordered?: boolean;
}

/**
 * Lightweight wrapper around a Spline scene served via my.spline.design.
 * Uses an iframe so we don't ship the runtime bundle.
 */
export function SplineEmbed({
  src = "https://my.spline.design/celestialflowabstractdigitalform-cyYL95n5wAKMKyu3nCKryb3b/",
  width = "100%",
  height = 280,
  className,
  radius = 0,
  bordered = false,
}: SplineEmbedProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        border: bordered ? "1px solid #ebe8e0" : "none",
        background: "#fff",
        position: "relative",
      }}
    >
      <iframe
        src={src}
        title="Dig Dig · Celestial Flow"
        loading="lazy"
        frameBorder={0}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          border: 0,
        }}
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

export default SplineEmbed;
