import { useState } from "react";
import { entrar, entrarDemo } from "../auth.js";

export default function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [estado, setEstado] = useState({ cargando: false, error: "" });

  function demo() {
    onEntrar(entrarDemo());
  }

  async function enviar(e) {
    e.preventDefault();
    if (estado.cargando) return;
    // Usuario de prueba: entra en modo demo (datos ficticios, sin tocar la base).
    if (usuario.trim().toLowerCase() === "prueba") { demo(); return; }
    setEstado({ cargando: true, error: "" });
    try {
      const s = await entrar(usuario.trim(), contrasena);
      onEntrar(s);
    } catch (err) {
      setEstado({ cargando: false, error: err.message });
      setContrasena("");
    }
  }

  return (
    <div className="login">
      <h1>Tablero de Proyectos y OT</h1>
      <p>Entra con tu usuario para acceder al tablero.</p>
      <form onSubmit={enviar}>
        <label className="sr" htmlFor="l-usuario">Usuario</label>
        <input
          id="l-usuario"
          type="text"
          autoComplete="username"
          required
          placeholder="usuario"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
        />
        <label className="sr" htmlFor="l-contra">Contraseña</label>
        <input
          id="l-contra"
          type="password"
          autoComplete="current-password"
          required
          placeholder="contraseña"
          value={contrasena}
          onChange={e => setContrasena(e.target.value)}
        />
        <button type="submit" className="btn primary" disabled={estado.cargando}>
          {estado.cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      {estado.error && <p className="error" role="alert">{estado.error}</p>}

      <button type="button" className="btn" style={{ marginTop: 10 }} onClick={demo}>
        Ver demo (datos de prueba)
      </button>
      <p className="sig" style={{ marginTop: 6 }}>
        El modo demo usa datos ficticios en tu navegador.
      </p>

      <footer className="login-creditos">
        <p>Desarrollado por Jesus Manuel Vergara.</p>
        <p>ERP adaptable a empresas medianas con flujos lineales.</p>
        <a
          href="https://github.com/JesusVergara89/ProjectFlow-OT"
          target="_blank"
          rel="noopener noreferrer"
        >
          Repositorio en GitHub
        </a>
      </footer>
    </div>
  );
}