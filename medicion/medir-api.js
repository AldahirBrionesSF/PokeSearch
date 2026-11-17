// Mediciones E3 contra la PokeAPI real (R1, R2, R3 y tiempo de búsqueda).
// Uso: abrir https://pokeapi.co/api/v2/pokemon-species?limit=1 en Chrome,
// DevTools > Console, pegar este archivo completo y presionar Enter.
// Usa la misma regla de validación que script.js l. 40-51 (copiada tal cual).
(async () => {
  const valido = v => { v = v.trim(); if (!v) return false;
    if (/^\d+$/.test(v)) { const n = Number(v); return !(n < 1 || n > 1025); }
    if (!/^[A-Za-z\-\.']+$/.test(v)) return false; if (v.length < 3) return false; return true; };

  const especies = await fetch("/api/v2/pokemon-species?limit=100000").then(r => r.json());
  const todos = new Set((await fetch("/api/v2/pokemon?limit=100000").then(r => r.json())).results.map(r => r.name));
  const query = `{pokemonspecies(order_by:{id:asc}){id name pokemonspeciesnames(where:{language_id:{_eq:9}}){name} pokemons(where:{is_default:{_eq:true}}){name pokemonstats{base_stat stat{name}}}}}`;
  const g = (await fetch("https://graphql.pokeapi.co/v1beta2", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) }).then(r => r.json())).data.pokemonspecies;

  // R1: nombre oficial en inglés -> ¿la app llega al Pokémon? (valida y luego pide /pokemon/<nombre en minúsculas>)
  const fallanR1 = g.filter(s => { const en = s.pokemonspeciesnames[0].name; return !(valido(en) && todos.has(en.trim().toLowerCase())); }).map(s => s.pokemonspeciesnames[0].name);
  // R2: nombre de especie de la API -> ¿pasa la validación?
  const fallanR2 = especies.results.map(r => r.name).filter(n => !valido(n));
  // R3: fichas con alguna estadística base > 200 (la barra se satura en 200, script.js l. 282)
  const saturadas = g.filter(s => s.pokemons[0].pokemonstats.some(x => x.base_stat > 200)).map(s => s.name);

  // Tiempo de una búsqueda completa (2 peticiones en serie, como script.js l. 236 y 244), 20 corridas sin caché
  const ids = [25, 6, 150, 445, 887, 1, 133, 248, 384, 493, 649, 718, 800, 898, 1000, 94, 143, 658, 722, 1025], t = [];
  for (const id of ids) { const t0 = performance.now();
    const a = await fetch(`/api/v2/pokemon/${id}`, { cache: "no-store" }).then(r => r.json());
    await fetch(a.species.url, { cache: "no-store" }).then(r => r.json()); t.push(Math.round(performance.now() - t0)); }
  const s = [...t].sort((a, b) => a - b), p = q => s[Math.ceil(q * s.length) - 1];

  console.table({
    R1: `${g.length - fallanR1.length}/${g.length} encontrables por nombre oficial`,
    R2: `${especies.count - fallanR2.length}/${especies.count} nombres de API aceptados`,
    R3: `${g.length - saturadas.length}/${g.length} fichas con barras proporcionales`,
    tiempo: `p50 ${p(0.5)} ms · p95 ${p(0.95)} ms`,
  });
  console.log({ fallanR1, fallanR2, saturadas, tiempos: t });
})();
