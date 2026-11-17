const principal = document.getElementById("principal");
const vistaLogin = document.getElementById("vista-login");
const vistaRegistro = document.getElementById("vista-registro");
const formularioLogin = document.getElementById("form-login");
const formularioRegistro = document.getElementById("form-registro");
const formulario = document.getElementById("formulario");
const boton = document.getElementById("boton");
const mensaje = document.getElementById("mensaje");
const resultado = document.getElementById("resultado");
const busqueda = document.getElementById("busqueda");
const STORAGE_KEY = "pokedex-perfiles-v1";
let entrenadorActual = null;

const validadores = {
  nombre(v) {
    v = v.trim();
    if (!v) return "El nombre es obligatorio.";
    if (v.length < 3) return "El nombre debe tener al menos 3 caracteres.";
    if (v.length > 30) return "El nombre no puede pasar de 30 caracteres.";
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(v)) return "El nombre solo puede tener letras y espacios.";
    return "";
  },
  correo(v) {
    v = v.trim();
    if (!v) return "El correo es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Escribe un correo válido (ej. nombre@dominio.com).";
    return "";
  },
  edad(v) {
    if (v.trim() === "") return "La edad es obligatoria.";
    const n = Number(v);
    if (!Number.isInteger(n)) return "La edad debe ser un número entero.";
    if (n < 10 || n > 99) return "La edad debe estar entre 10 y 99 años.";
    return "";
  },
  equipo(v) {
    if (!v) return "Selecciona un equipo.";
    return "";
  },
  pokemon(v) {
    v = v.trim();
    if (!v) return "Escribe el nombre o número de un Pokémon.";
    if (/^\d+$/.test(v)) {
      const n = Number(v);
      if (n < 1 || n > 1025) return "El número debe estar entre 1 y 1025.";
      return "";
    }
    if (!/^[A-Za-z\-\.']+$/.test(v)) return "Usa solo letras (en inglés) o un número.";
    if (v.length < 3) return "El nombre debe tener al menos 3 letras.";
    return "";
  }
};

function validarCampos(form, nombres, prefijo) {
  const errores = nombres.map(nombre => {
    const campo = form.elements[nombre];
    const error = validadores[nombre](campo.value);
    document.getElementById(`error-${prefijo}${nombre}`).textContent = error;
    campo.classList.toggle("invalido", !!error);
    campo.classList.toggle("valido", !error);
    return error;
  }).filter(Boolean);
  return errores;
}

function agregarValidacionEnVivo(form, nombres, prefijo) {
  nombres.forEach(nombre => {
    form.elements[nombre].addEventListener("blur", () => {
      validarCampos(form, [nombre], prefijo);
    });
  });
}

function mostrarMensajeLogin(texto, tipo) {
  const elemento = document.getElementById("mensaje-login");
  elemento.textContent = texto;
  elemento.className = tipo;
}

function mostrarMensajeRegistro(texto, tipo) {
  const elemento = document.getElementById("mensaje-registro");
  elemento.textContent = texto;
  elemento.className = tipo;
}

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = tipo;
}

function cargarPerfiles() {
  const guardados = localStorage.getItem(STORAGE_KEY);
  if (!guardados) return [];

  let perfiles;
  try {
    perfiles = JSON.parse(guardados);
  } catch {
    throw new Error("No se pudieron leer los perfiles guardados. Borra los datos del sitio e inténtalo de nuevo.");
  }
  if (!Array.isArray(perfiles)) {
    throw new Error("Los perfiles guardados tienen un formato inválido. Borra los datos del sitio e inténtalo de nuevo.");
  }
  return perfiles;
}

function guardarPerfiles(perfiles) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfiles));
  } catch {
    throw new Error("No se pudo guardar el perfil en este navegador. Revisa el espacio disponible y los permisos de almacenamiento.");
  }
}

function entrar(perfil) {
  entrenadorActual = perfil;
  principal.classList.remove("autenticacion");
  limpiarBusqueda();
  vistaLogin.hidden = true;
  vistaRegistro.hidden = true;
  document.getElementById("acceso").hidden = true;
  busqueda.hidden = false;
  document.getElementById("saludo-entrenador").textContent =
    `Entrenador ${perfil.nombre} · Equipo ${perfil.equipo}`;
  document.getElementById("pokemon").focus();
}

function volverAlLogin() {
  entrenadorActual = null;
  principal.classList.add("autenticacion");
  limpiarBusqueda();
  document.getElementById("acceso").hidden = false;
  busqueda.hidden = true;
  vistaLogin.hidden = false;
  vistaRegistro.hidden = true;
  mostrarMensajeLogin("", "");
}

function limpiarBusqueda() {
  formulario.reset();
  const campoPokemon = formulario.elements.pokemon;
  campoPokemon.classList.remove("invalido", "valido");
  document.getElementById("error-pokemon").textContent = "";
  resultado.innerHTML = `
    <h2>Ficha Pokémon</h2>
    <p class="vacio">Escribe el nombre o número de un Pokémon para ver su ficha.</p>`;
  document.getElementById("juegos").innerHTML = `
    <h2>Juegos en los que aparece</h2>
    <p class="vacio">Los juegos aparecerán cuando busques un Pokémon.</p>`;
  mostrarMensaje("", "");
}

agregarValidacionEnVivo(formularioLogin, ["correo"], "login-");
agregarValidacionEnVivo(formularioRegistro, ["nombre", "correo", "edad", "equipo"], "registro-");
agregarValidacionEnVivo(formulario, ["pokemon"], "");

document.getElementById("ir-registro").addEventListener("click", () => {
  vistaLogin.hidden = true;
  vistaRegistro.hidden = false;
  mostrarMensajeLogin("", "");
});

document.getElementById("ir-login").addEventListener("click", () => {
  vistaRegistro.hidden = true;
  vistaLogin.hidden = false;
  mostrarMensajeRegistro("", "");
});

formularioRegistro.addEventListener("submit", event => {
  event.preventDefault();
  const campos = ["nombre", "correo", "edad", "equipo"];
  if (validarCampos(formularioRegistro, campos, "registro-").length > 0) {
    mostrarMensajeRegistro("Revisa los campos marcados antes de guardar tu perfil.", "error-msg");
    return;
  }

  const perfil = {
    nombre: formularioRegistro.nombre.value.trim(),
    correo: formularioRegistro.correo.value.trim().toLowerCase(),
    edad: Number(formularioRegistro.edad.value),
    equipo: formularioRegistro.equipo.value
  };

  try {
    const perfiles = cargarPerfiles();
    if (perfiles.some(guardado => guardado.correo === perfil.correo)) {
      mostrarMensajeRegistro("Ya existe un perfil con ese correo. Inicia sesión o usa otro correo.", "error-msg");
      return;
    }
    perfiles.push(perfil);
    guardarPerfiles(perfiles);
    formularioLogin.correo.value = perfil.correo;
    vistaRegistro.hidden = true;
    vistaLogin.hidden = false;
    mostrarMensajeLogin("Perfil guardado. Ahora inicia sesión con tu correo.", "ok-msg");
  } catch (error) {
    mostrarMensajeRegistro(error.message, "error-msg");
  }
});

formularioLogin.addEventListener("submit", event => {
  event.preventDefault();
  if (validarCampos(formularioLogin, ["correo"], "login-").length > 0) {
    mostrarMensajeLogin("Escribe un correo válido para iniciar sesión.", "error-msg");
    return;
  }

  try {
    const correo = formularioLogin.correo.value.trim().toLowerCase();
    const perfil = cargarPerfiles().find(guardado => guardado.correo === correo);
    if (!perfil) {
      mostrarMensajeLogin("No encontramos un perfil con ese correo. Crea uno primero.", "error-msg");
      return;
    }
    entrar(perfil);
  } catch (error) {
    mostrarMensajeLogin(error.message, "error-msg");
  }
});

document.getElementById("cerrar-sesion").addEventListener("click", volverAlLogin);

formulario.addEventListener("submit", async event => {
  event.preventDefault();

  if (validarCampos(formulario, ["pokemon"], "").length > 0) {
    mostrarMensaje("Escribe un nombre o número de Pokémon válido.", "error-msg");
    return;
  }

  const pokemon = formulario.pokemon.value.trim().toLowerCase();
  mostrarMensaje("Buscando Pokémon…", "info-msg");
  boton.disabled = true;

  try {
    const respuesta = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemon)}`);
    if (respuesta.status === 404) {
      throw new Error(`No existe ningún Pokémon llamado "${pokemon}". Revisa la ortografía (en inglés) o usa su número.`);
    }
    if (!respuesta.ok) {
      throw new Error("La API respondió con un error (" + respuesta.status + "). Intenta de nuevo.");
    }
    const datos = await respuesta.json();
    const respuestaEspecie = await fetch(datos.species.url);
    if (!respuestaEspecie.ok) {
      throw new Error("No se pudo obtener la descripción de la Pokédex. Intenta de nuevo.");
    }
    const especie = await respuestaEspecie.json();
    const entrada = especie.flavor_text_entries.find(e => e.language.name === "es")
      || especie.flavor_text_entries.find(e => e.language.name === "en");
    const descripcion = entrada
      ? entrada.flavor_text.replace(/[\n\f\r]+/g, " ").replace(/\s+/g, " ").trim()
      : "Descripción no disponible.";
    mostrarPokemon(datos, entrenadorActual, descripcion);
    mostrarMensaje(`¡Qué gusto verte, ${entrenadorActual.nombre}! Aquí está la ficha de ${datos.name}.`, "ok-msg");
  } catch (error) {
    const sinRed = error instanceof TypeError;
    mostrarMensaje(sinRed ? "No se pudo conectar con la API. Revisa tu conexión a internet." : error.message, "error-msg");
  } finally {
    boton.disabled = false;
  }
});

const tiposES = {
  normal: "Normal", fire: "Fuego", water: "Agua", electric: "Eléctrico", grass: "Planta",
  ice: "Hielo", fighting: "Lucha", poison: "Veneno", ground: "Tierra", flying: "Volador",
  psychic: "Psíquico", bug: "Bicho", rock: "Roca", ghost: "Fantasma", dragon: "Dragón",
  dark: "Siniestro", steel: "Acero", fairy: "Hada"
};
const statsES = {
  hp: "PS", attack: "Ataque", defense: "Defensa",
  "special-attack": "Ataque esp.", "special-defense": "Defensa esp.", speed: "Velocidad"
};

function mostrarPokemon(p, entrenador, descripcion) {
  const imagen = p.sprites.other["official-artwork"].front_default || p.sprites.front_default;
  const tipos = p.types.map(t => `<span class="tipo">${tiposES[t.type.name] || t.type.name}</span>`).join("");
  const juegos = [...new Set(p.game_indices.map(juego => juego.version.name))];
  const stats = p.stats.map(s => `
    <div class="stat">
      <span>${statsES[s.stat.name] || s.stat.name}</span>
      <div class="barra"><span style="width:${Math.min(s.base_stat / 200 * 100, 100)}%"></span></div>
      <strong>${s.base_stat}</strong>
    </div>`).join("");

  resultado.innerHTML = `
    <h2>Ficha Pokémon</h2>
    <p class="saludo">Entrenador ${escapar(entrenador.nombre)} · Equipo ${escapar(entrenador.equipo)}</p>
    <div class="ficha">
      <img src="${imagen}" alt="${escapar(p.name)}">
      <h3>${escapar(p.name)}</h3>
      <div class="num">N.º ${String(p.id).padStart(4, "0")}</div>
      <div class="tipos">${tipos}</div>
      <p class="descripcion">${escapar(descripcion)}</p>
      <div class="medidas">
        <span>Altura: <strong>${p.height / 10} m</strong></span>
        <span>Peso: <strong>${p.weight / 10} kg</strong></span>
      </div>
      <div class="stats">${stats}</div>
    </div>`;
  document.getElementById("juegos").innerHTML = `
    <h2>Juegos en los que aparece</h2>
    ${juegos.length
      ? `<ul class="lista-juegos">${juegos.map(juego => `<li>${escapar(formatearNombreJuego(juego))}</li>`).join("")}</ul>`
      : '<p class="vacio">No hay juegos registrados para este Pokémon.</p>'}`;
}

function formatearNombreJuego(nombre) {
  return nombre.replace(/-/g, " ").replace(/\b\w/g, letra => letra.toUpperCase());
}

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
