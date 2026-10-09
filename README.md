# Buscaminas — HTML, CSS y JavaScript puro

Juego completo en español para PC, tablet y celular. Conserva el diseño y el motor de la versión React; esta edición no tiene dependencias de ejecución ni requiere compilación.

## Publicar en GitHub Pages

1. Descomprimí el ZIP.
2. Creá un repositorio en GitHub (por ejemplo, `buscaminas`).
3. Subí **el contenido** de `buscaminas-puro` a la raíz del repositorio: `index.html`, `styles.css`, carpeta `js` y los demás archivos. No subas solamente el ZIP.
4. Entrá a **Settings → Pages**. En **Build and deployment**, seleccioná **Deploy from a branch**, rama **main**, carpeta **/ (root)** y guardá.
5. Cuando termine la publicación, abrí `https://TU-USUARIO.github.io/buscaminas/`.

Las rutas son relativas: funciona tanto en un dominio propio como dentro de un repositorio. `.nojekyll` evita el procesamiento de Jekyll.

## Abrir con doble clic

Extraé el ZIP completo. Abrí `index.html`, manteniendo `styles.css` y `script.js` en la misma carpeta. Ya no se usan módulos en la carga del navegador.

También se incluye `Buscaminas.html`: una versión autónoma con CSS y JavaScript incorporados. Podés abrir ese único archivo con doble clic; no necesita las carpetas ni un servidor. Para publicar solo ese archivo en GitHub Pages, renombralo a `index.html`.

## Ejecutar con servidor (opcional)

No hace falta instalar paquetes. Desde la carpeta del proyecto:

```sh
python3 -m http.server 8000
```

Abrí `http://localhost:8000`. En Windows también podés usar `py -m http.server 8000`. También podés usar Live Server de VS Code. El servidor ya no es necesario para abrir el juego localmente.

## Pruebas

Con Node.js 20 o superior, sin instalar dependencias:

```sh
npm test
```

O directamente:

```sh
node --test tests/*.test.js
```

No hay paso de compilación. Los archivos que se publican son los mismos del proyecto.

## Funciones y controles

- Fácil: 9 × 9, 10 minas. Intermedio: 16 × 16, 40 minas. Experto: 16 × 30, 99 minas.
- Personalizado: 5–30 filas y columnas. Máximo de minas: menor entre el 35 % redondeado hacia abajo y total menos 9.
- Primera apertura y vecinas seguras, generación diferida, expansión iterativa, banderas incorrectas, apertura rápida, victoria y derrota.
- Clic izquierdo: revelar o apertura rápida sobre un número. Derecho: bandera.
- Flechas: navegar; Enter/espacio: revelar; F: bandera. Una sola casilla entra por Tab.
- Toque corto: revelar; pulsación de 400 ms: bandera. Selector de modo táctil siempre visible. Arrastrar cancela el gesto; el tablero permite desplazamiento y zoom.
- Cronómetro independiente de la actualización de las casillas; récords por dificultad y preferencias en localStorage, con recuperación tolerante a errores. Personalizado no registra récords.
- Ayuda, SVG locales, etiquetas accesibles que no revelan minas ocultas, aviso de final y foco visible.

## Organización

- `index.html`: estructura y ayuda.
- `styles.css`: diseño original y adaptación responsive.
- `script.js`: JavaScript completo del juego, cargado como script común (sin imports ni dependencias).
- `Buscaminas.html`: versión autónoma con todo incorporado.
- `js/app.js`: fuente organizada de interfaz, controles y estado de la aplicación.
- `js/game/`: motor puro, validación y reducer sin DOM.
- `js/storage/`: persistencia validada.
- `tests/`: 21 pruebas reproducibles con semillas.

## Verificaciones de esta corrección

Pasaron las 21 pruebas del motor y la persistencia. Se verificó la carga real de los scripts con DOM simulado (jsdom) desde `file://` para `index.html` y `Buscaminas.html`, y por HTTP para `index.html`. En las tres rutas se comprobaron revelación, reinicio, clic derecho, teclado, foco único, cambio de dificultad, validación personalizada, pulsación larga, cancelación por arrastre y cancelación por reinicio. No se encontraron errores JavaScript en esas comprobaciones.

Estas comprobaciones no sustituyen la revisión visual en un navegador real, el desplazamiento táctil físico ni la prueba con lector de pantalla, que siguen pendientes.
