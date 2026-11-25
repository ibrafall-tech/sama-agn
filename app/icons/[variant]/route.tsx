import { ImageResponse } from "next/og";

/** App icons drawn in code: a green tile with a plate seen from above. */
const VARIANTS = {
  "192": { size: 192, radius: 0.22, plate: 0.62 },
  "512": { size: 512, radius: 0.22, plate: 0.62 },
  maskable: { size: 512, radius: 0, plate: 0.5 },
  apple: { size: 180, radius: 0, plate: 0.6 },
} as const;

type Variant = keyof typeof VARIANTS;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const v = VARIANTS[(variant in VARIANTS ? variant : "512") as Variant];
  const s = v.size;
  const plate = Math.round(s * v.plate);
  const food = Math.round(plate * 0.46);
  return new ImageResponse(
    (
      <div style={{ width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a9ba5", borderRadius: Math.round(s * v.radius) }}>
        <div style={{ width: plate, height: plate, borderRadius: plate, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `inset 0 0 0 ${Math.round(plate * 0.08)}px #ffe9e5` }}>
          <div style={{ width: food, height: food, borderRadius: food, background: "#ffb84d" }} />
        </div>
      </div>
    ),
    { width: s, height: s },
  );
}
