# Mediciones E3 — Valo Team

Todas las mediciones del E3 se hicieron sobre el commit `f4cd9a3`, el 16-nov-2026.

## 1. Contra la PokeAPI real (R1, R2, R3 y tiempo de búsqueda)

1. Abre en Chrome `https://pokeapi.co/api/v2/pokemon-species?limit=1`.
2. Abre DevTools y ve a la pestaña Console.
3. Pega el contenido completo de `medir-api.js` y presiona Enter.

La tabla final da R1, R2, R3 y el p50 y p95 del tiempo de búsqueda. Las 20 búsquedas se hacen sin caché.

## 2. Con la API simulada (R4 a R9)

Necesitas Node 18 o superior.

```
cd medicion
npm install
node medir.js ..
```

`medir.js` carga el `index.html` y el `script.js` del repositorio en jsdom, sin modificarlos. Después simula la API para provocar cada falla. La salida es un JSON con el resultado de cada requisito.

R6 tarda 60 segundos a propósito, porque espera para ver si la app libera el botón cuando la API no responde.
