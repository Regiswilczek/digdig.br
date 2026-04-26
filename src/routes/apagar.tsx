import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/apagar")({
  component: CanarioPage,
});

interface GeoInfo {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  org: string;
  latitude: number;
  longitude: number;
}

function CanarioPage() {
  const [geo, setGeo] = useState<GeoInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d: GeoInfo) => { setGeo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      {/* Canário */}
      <div style={{ fontSize: 80, marginBottom: 24, lineHeight: 1 }}>🐦</div>

      <h1
        style={{
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 800,
          color: "#f5c800",
          letterSpacing: "-0.02em",
          margin: "0 0 8px",
          lineHeight: 1.1,
        }}
      >
        Meu Brasil do Canário Amarelo!
      </h1>

      <p
        style={{
          fontSize: "clamp(18px, 3vw, 26px)",
          fontWeight: 600,
          color: "#0a0a0a",
          margin: "0 0 48px",
          letterSpacing: "-0.01em",
        }}
      >
        Dig Dig, quem é você?
      </p>

      {/* Geo box */}
      <div
        style={{
          background: "#f5f5f5",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: "32px 40px",
          maxWidth: 480,
          width: "100%",
          textAlign: "left",
        }}
      >
        {loading ? (
          <p style={{ color: "#6b6b6b", margin: 0, fontSize: 15 }}>
            Identificando…
          </p>
        ) : geo ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
            <tbody>
              {[
                ["IP", geo.ip],
                ["Cidade", `${geo.city}, ${geo.region}`],
                ["País", geo.country_name],
                ["Rede", geo.org],
                ["Coord.", `${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td
                    style={{
                      paddingBottom: 12,
                      paddingRight: 20,
                      color: "#6b6b6b",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      verticalAlign: "top",
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      paddingBottom: 12,
                      color: "#0a0a0a",
                      fontWeight: 600,
                      wordBreak: "break-all",
                    }}
                  >
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#6b6b6b", margin: 0, fontSize: 15 }}>
            Não foi possível identificar.
          </p>
        )}
      </div>

      {/* Canary token note */}
      <p
        style={{
          marginTop: 48,
          fontSize: 12,
          color: "#a0a0a0",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        {/* Em segurança, um canário é um token deliberadamente exposto para detectar quem tenta usá-lo.
            O canário canta — e você veio conferir. */}
        Em mineração, canários amarelos morriam primeiro quando o ar ficava ruim.
        Em código, um <em>canary token</em> é uma isca deliberada: quem a usa, se revela.
        <br />
        <span style={{ color: "#c0c0c0" }}>// CANARY:digdig:001</span>
      </p>
    </div>
  );
}
