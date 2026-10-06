import { useState } from "react";
import { entrar } from "../auth.js";

export default function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [estado, setEstado] = useState({ cargando: false, error: "" });

  async function enviar(e) {
    e.preventDefault();
    if (estado.cargando) return;
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
    </div>
  );
}
