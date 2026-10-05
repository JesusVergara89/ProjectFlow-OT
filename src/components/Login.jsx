import { useState } from "react";
import { supabase } from "../db.js";


export default function Login() {
  const [correo, setCorreo] = useState("");
  const [estado, setEstado] = useState({ tipo: "", texto: "" });

  async function enviar(e) {
    e.preventDefault();
    setEstado({ tipo: "", texto: "Enviando…" });
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    setEstado(
      error
        ? { tipo: "error", texto: "No se pudo enviar el enlace: " + error.message }
        : { tipo: "ok", texto: "Te enviamos un enlace. Ábrelo desde este mismo navegador para entrar." }
    );
  }

  return (
    <div className="login">
      <h1>Tablero de Proyectos y OT</h1>
      <p>Escribe tu correo y te enviamos un enlace para entrar.</p>
      <form onSubmit={enviar}>
        <label className="sr" htmlFor="l-correo">Correo</label>
        <input id="l-correo" type="email" required placeholder="nombre@empresa.com" value={correo} onChange={e => setCorreo(e.target.value)} />
        <button type="submit" className="btn primary">Enviar enlace</button>
      </form>
      <p className={estado.tipo === "error" ? "error" : ""} role="status">{estado.texto}</p>
    </div>
  );
}
