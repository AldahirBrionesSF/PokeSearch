// Mediciones E3 — Pokédex de Entrenadores (Valo Team)
// Ejecuta el script.js REAL del repositorio dentro de jsdom con la API simulada.
// Uso: npm install && node medir.js ../  (ruta a la raíz del repo)
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(process.argv[2] || "..");
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/<script src="script.js"><\/script>/, "");
const JS = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");
const espera = ms => new Promise(r => setTimeout(r, ms));

function crearApp(fetchImpl, almacen = {}) {
  const dom = new JSDOM(HTML, { url: "https://pokedex.local/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  for (const [k, v] of Object.entries(almacen)) w.localStorage.setItem(k, v);
  // los errores de red se crean con el TypeError de la ventana, como en un navegador real
  w.fetch = (...a) => fetchImpl(...a).catch(e => { throw e instanceof TypeError ? new w.TypeError(e.message) : e; });
  w.HTMLElement.prototype.focus = () => {};
  // jsdom no expone form.nombreDeCampo como los navegadores; se agrega ese acceso (no cambia script.js)
  for (const form of w.document.forms) for (const el of form.elements) if (el.name && !(el.name in form)) Object.defineProperty(form, el.name, { get: () => el });
  w.eval(JS);
  return w;
}
function enviar(w, id) { w.document.getElementById(id).dispatchEvent(new w.Event("submit", { cancelable: true })); }
function registrar(w, nombre, correo) {
  const f = w.document.getElementById("form-registro");
  f.nombre.value = nombre; f.correo.value = correo; f.edad.value = "20"; f.equipo.value = "Valor";
  enviar(w, "form-registro");
}
function login(w, correo) { w.document.getElementById("correo-login").value = correo; enviar(w, "form-login"); }
function buscar(w, texto) { w.document.getElementById("pokemon").value = texto; enviar(w, "formulario"); }
const mensaje = w => w.document.getElementById("mensaje").textContent;

function pokemon(o = {}) {
  return {
    id: 25, name: o.name || "pikachu",
    sprites: o.sprites || { front_default: "https://img/x.png", other: { "official-artwork": { front_default: "https://img/a.png" } } },
    types: [{ type: { name: o.tipo || "electric" } }],
    stats: [{ base_stat: 35, stat: { name: o.stat || "hp" } }],
    height: 4, weight: 60,
    game_indices: [{ version: { name: o.juego || "red" } }],
    species: { url: "https://pokeapi.co/api/v2/pokemon-species/25/" }
  };
}
const especie = (txt = "Ratón eléctrico.") => ({ flavor_text_entries: [{ language: { name: "es" }, flavor_text: txt }] });
const resp = (status, body) => Promise.resolve({ status, ok: status >= 200 && status < 300, json: async () => (typeof body === "function" ? body() : body) });
const apiOk = (p = pokemon(), e = especie()) => url => (url.includes("pokemon-species") ? resp(200, e) : resp(200, p));

async function sesion(fetchImpl) {
  const w = crearApp(fetchImpl);
  registrar(w, "Ash Ketchum", "ash@correo.com");
  login(w, "ash@correo.com");
  return w;
}

(async () => {
  const R = {};

  // ---------- R4: mensaje correcto ante cada tipo de falla ----------
  const escenarios = [
    ["404 Pokémon inexistente", () => resp(404, {}), m => m.includes("No existe ningún Pokémon")],
    ["500 error del servidor", () => resp(500, {}), m => m.includes("(500)")],
    ["Sin red", () => Promise.reject(new TypeError("Failed to fetch")), m => m.includes("No se pudo conectar")],
    ["Falla solo la descripción (503)", url => (url.includes("species") ? resp(503, {}) : resp(200, pokemon())), m => m.includes("descripción")],
    ["API cambia estructura (sin sprites.other)", apiOk(pokemon({ sprites: { front_default: "x" } })), m => !m.includes("conexión") && m.length > 0],
    ["Respuesta 200 que no es JSON (mantenimiento)", () => resp(200, () => { throw new SyntaxError("Unexpected token '<'"); }), m => !/unexpected token/i.test(m) && m.length > 0],
  ];
  const r4 = [];
  for (const [nombre, f, correcto] of escenarios) {
    const w = await sesion(f); buscar(w, "pikachu"); await espera(50);
    r4.push({ escenario: nombre, mensaje: mensaje(w), correcto: correcto(mensaje(w)) });
  }
  // Escenario 7: cerrar sesión durante la búsqueda
  {
    let soltar; const w = await sesion(url => (url.includes("species") ? resp(200, especie()) : new Promise(r => { soltar = () => r({ status: 200, ok: true, json: async () => pokemon() }); })));
    buscar(w, "pikachu"); await espera(10);
    w.document.getElementById("cerrar-sesion").click();
    soltar(); await espera(50);
    const m = mensaje(w);
    r4.push({ escenario: "Cerrar sesión durante la búsqueda", mensaje: m, correcto: m === "" });
  }
  R.R4 = { aciertos: r4.filter(x => x.correcto).length, total: r4.length, detalle: r4 };

  // ---------- R5: fichas ya vistas disponibles sin red ----------
  {
    const nombres = ["pikachu", "bulbasaur", "charmander", "squirtle", "eevee"];
    let online = true;
    const f = url => (online ? apiOk(pokemon({ name: url.split("/").filter(Boolean).pop() }))(url) : Promise.reject(new TypeError("Failed to fetch")));
    const w = await sesion(f);
    for (const n of nombres) { buscar(w, n); await espera(30); }
    online = false; let ok = 0;
    for (const n of nombres) { buscar(w, n); await espera(30); if (w.document.querySelector("#resultado h3")?.textContent === n && !mensaje(w).includes("conectar")) ok++; }
    R.R5 = { disponibles: ok, total: nombres.length };
  }

  // ---------- R6: tiempo máximo de espera si la API no responde ----------
  {
    const w = await sesion(() => new Promise(() => {}));
    buscar(w, "pikachu");
    const t0 = Date.now(); const limite = 60000; let liberado = false;
    while (Date.now() - t0 < limite) { await espera(1000); if (!w.document.getElementById("boton").disabled) { liberado = true; break; } }
    R.R6 = { liberado, segundos: Math.round((Date.now() - t0) / 1000), mensaje: mensaje(w) };
  }

  // ---------- R7: accesos solo con correo ----------
  {
    let entran = 0; const N = 10;
    for (let i = 0; i < N; i++) {
      const victima = crearApp(apiOk());
      registrar(victima, "Entrenador Uno", `user${i}@correo.com`);
      const datos = { "pokedex-perfiles-v1": victima.localStorage.getItem("pokedex-perfiles-v1") };
      const atacante = crearApp(apiOk(), datos); // mismo navegador, otra persona
      login(atacante, `user${i}@correo.com`);
      if (!atacante.document.getElementById("busqueda").hidden) entran++;
    }
    R.R7 = { entran, intentos: N };
  }

  // ---------- R8: campos de la API que inyectan HTML ----------
  {
    const carga = '<img src=x data-xss="1">';
    const campos = {
      nombre: pokemon({ name: carga }), tipo: pokemon({ tipo: carga }), estadistica: pokemon({ stat: carga }),
      juego: pokemon({ juego: carga }),
      imagen: pokemon({ sprites: { front_default: "x", other: { "official-artwork": { front_default: 'x" data-xss="1' } } } }),
    };
    const res = {};
    for (const [campo, p] of Object.entries(campos)) {
      const w = await sesion(apiOk(p)); buscar(w, "pikachu"); await espera(50);
      res[campo] = w.document.querySelectorAll("[data-xss]").length > 0;
    }
    { const w = await sesion(apiOk(pokemon(), especie(carga))); buscar(w, "pikachu"); await espera(50); res.descripcion = w.document.querySelectorAll("[data-xss]").length > 0; }
    R.R8 = { inyectables: Object.values(res).filter(Boolean).length, total: Object.keys(res).length, detalle: res };
  }

  // ---------- R9: lo que queda guardado en el navegador ----------
  {
    const w = crearApp(apiOk()); registrar(w, "Ash Ketchum", "ash@correo.com");
    R.R9 = { localStorage: w.localStorage.getItem("pokedex-perfiles-v1") };
  }

  console.log(JSON.stringify(R, null, 2));
  process.exit(0);
})();
