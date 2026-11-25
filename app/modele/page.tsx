import resultats from "../../lib/resultats_modeles.json";

type Noeud =
  | { classe: number }
  | {
      variable: string;
      seuil: number;
      si_inferieur_ou_egal: Noeud;
      sinon: Noeud;
    };

const NOMS: Record<string, string> = resultats.classes;

function lignesArbre(n: Noeud, niveau = 0): string[] {
  const marge = "    ".repeat(niveau);
  if ("classe" in n) {
    return [`${marge}→ ${NOMS[String(n.classe)] ?? n.classe}`];
  }
  return [
    `${marge}si ${n.variable} ≤ ${n.seuil} :`,
    ...lignesArbre(n.si_inferieur_ou_egal, niveau + 1),
    `${marge}sinon :`,
    ...lignesArbre(n.sinon, niveau + 1),
  ];
}

const cell = {
  padding: "8px 12px",
  borderBottom: "1px solid #1e293b",
  textAlign: "left" as const,
};

export default function ModelePage() {
  const meilleur = resultats.modeles.reduce((a, b) =>
    b.precision > a.precision ? b : a,
  );
  const corr = resultats.correlation as Record<string, Record<string, number>>;
  const noms = Object.keys(corr);
  const arbre = resultats.arbre as unknown as Noeud;

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "32px 20px",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: 4 }}>Modèles de détection</h1>
      {resultats.dataset.simule && (
        <p style={{ color: "#fbbf24", marginTop: 0 }}>
          Données simulées ({resultats.dataset.lignes} lignes) : résultats à
          titre de démonstration.
        </p>
      )}

      <h2>Comparaison des modèles</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={cell}>Modèle</th>
            <th style={cell}>Précision</th>
            <th style={cell}>F1-score</th>
            <th style={cell}>MAE</th>
            <th style={cell}>R²</th>
          </tr>
        </thead>
        <tbody>
          {resultats.modeles.map((m) => (
            <tr key={m.nom}>
              <td style={cell}>{m.nom}</td>
              <td style={cell}>{m.precision}</td>
              <td style={cell}>{m.f1_macro}</td>
              <td style={cell}>{m.mae}</td>
              <td style={cell}>{m.r2}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Meilleur modèle : <strong>{meilleur.nom}</strong> (précision{" "}
        {meilleur.precision})
      </p>

      <h2>Matrice de corrélation</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={cell}></th>
            {noms.map((n) => (
              <th key={n} style={cell}>
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {noms.map((a) => (
            <tr key={a}>
              <td style={cell}>
                <strong>{a}</strong>
              </td>
              {noms.map((b) => (
                <td key={b} style={cell}>
                  {corr[a][b].toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/matrice_correlation.png"
        alt="Matrice de corrélation"
        style={{ maxWidth: "100%", marginTop: 16, borderRadius: 8 }}
      />

      <h2>Règles apprises par l&apos;arbre</h2>
      <pre
        style={{
          background: "#0f172a",
          padding: 16,
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        {lignesArbre(arbre).join("\n")}
      </pre>
    </main>
  );
}
