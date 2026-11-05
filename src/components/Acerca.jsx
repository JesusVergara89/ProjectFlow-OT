// Página pública "Acerca del proyecto" — se abre desde el login sin iniciar
// sesión. Resume el README de forma presentable para quien quiere saber cómo
// funciona sin entrar.

const FASES = [
  ["1", "Solicitud y viabilidad", "1–4"],
  ["2", "Levantamiento y alcances", "5–10"],
  ["3", "Cotización y negociación", "11–16"],
  ["4", "Planeación y OT", "17–27"],
  ["5", "Ejecución del servicio", "28–30"],
  ["6", "Reporte y calidad", "31–38.1"],
  ["7", "Facturación", "38.2–39"],
  ["8", "Cobro", "40–42"]
];

const BLOQUES = [
  {
    titulo: "Flujo y operación",
    items: [
      "Flujo de 42 pasos en 8 fases, con pasos de acción y de decisión (sí/no) y ciclos de regreso.",
      "Detección de proyectos detenidos: cada fase tiene un límite de días y las alertas dicen quién es el responsable y cuántos días lleva atrasado.",
      "Bandeja de notificaciones personal: al entrar ves tus atrasos y, al hacer clic, te lleva directo al proyecto.",
      "Bitácora por días: todo lo que cada quien hizo, navegable por fecha, con enlace al proyecto afectado.",
      "Tiempo real: los cambios se reflejan al instante en todas las pantallas; panel de personas «En línea».",
      "Foto de perfil con estado (emoji) para cada usuario."
    ]
  },
  {
    titulo: "Finanzas",
    items: [
      "Dinero clasificado por fase automáticamente: por facturar, facturado y cobrado.",
      "Meta mensual de cobranza con ritmo ideal vs. real: curva acumulada por día y por semana, con la brecha y el ritmo necesario para alcanzarla.",
      "Cierres mensuales congelados: cada mes cerrado queda como foto estática de referencia.",
      "Anticipos, pagos diferidos y marca de «reporte enviado»."
    ]
  },
  {
    titulo: "Análisis con IA",
    items: [
      "Panel de Análisis IA que mide el desempeño por atrasos y responsables (no por promedios que diluyen los retrasos).",
      "Incluye dinero, pipeline, cobranza proyectada, avance vs. meta y el ritmo por día/semana.",
      "Informe listo para imprimir o guardar en PDF."
    ]
  },
  {
    titulo: "Seguridad",
    items: [
      "El login y toda escritura se validan en el servidor; la llave pública solo permite leer.",
      "Las contraseñas se guardan cifradas (scrypt), nunca en texto plano.",
      "Modo demo con datos ficticios en el navegador: no toca la base real.",
      "Bitácora infalsificable: cada acción queda registrada con quién y cuándo."
    ]
  }
];

export default function Acerca({ onVolver }) {
  return (
    <div className="acerca">
      <div className="acerca-card">
        <header className="acerca-hero">
          <p className="acerca-kicker">Acerca del proyecto</p>
          <h1>ProjectFlow-OT · Tablero de Proyectos y OT</h1>
          <p className="acerca-lead">
            ERP ligero y adaptable para empresas medianas con flujos lineales.
            Da seguimiento a cada proyecto desde la solicitud del cliente hasta
            el cobro, con control financiero por fase, alertas de atrasos y
            análisis con inteligencia artificial.
          </p>
          <button type="button" className="btn primary" onClick={onVolver}>← Volver al inicio de sesión</button>
        </header>

        <section className="acerca-sec">
          <h2>¿Qué hace?</h2>
          <div className="acerca-grid">
            {BLOQUES.map(b => (
              <div className="acerca-bloque" key={b.titulo}>
                <h3>{b.titulo}</h3>
                <ul>{b.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="acerca-sec">
          <h2>El flujo, en 8 fases</h2>
          <p className="acerca-sub">Cada proyecto recorre 42 pasos. Estos son los grupos:</p>
          <div className="acerca-fases">
            {FASES.map(([n, nombre, pasos]) => (
              <div className="acerca-fase" key={n}>
                <span className="acerca-fase-n">{n}</span>
                <span className="acerca-fase-nom">{nombre}</span>
                <span className="acerca-fase-pasos">pasos {pasos}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="acerca-sec">
          <h2>Con qué está hecho</h2>
          <div className="acerca-stack">
            <span className="acerca-chip">React + Vite</span>
            <span className="acerca-chip">Supabase · Postgres + Realtime + Storage</span>
            <span className="acerca-chip">Netlify Functions</span>
            <span className="acerca-chip">Google Gemini (IA)</span>
            <span className="acerca-chip">Telegram (avisos)</span>
          </div>
        </section>

        <footer className="acerca-pie">
          <p>Desarrollado por <b>Jesus Manuel Vergara</b>.</p>
          <a href="https://github.com/JesusVergara89/ProjectFlow-OT" target="_blank" rel="noopener noreferrer">
            Ver el repositorio en GitHub ↗
          </a>
          <button type="button" className="btn" onClick={onVolver}>← Volver al inicio de sesión</button>
        </footer>
      </div>
    </div>
  );
}
