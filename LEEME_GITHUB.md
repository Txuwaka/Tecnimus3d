# TecnimusOnline 3D · Beta 0.17

Copia web completa para subir a tu repositorio de GitHub.
Versión: 19/10/2026.

## Subir los archivos

1. Crea o utiliza un repositorio privado.
2. Descomprime este ZIP en tu ordenador.
3. Sube todo su contenido, manteniendo las carpetas `assets` y `vendor`.
4. `index.html`, los módulos JavaScript y `style.css` deben quedar juntos en la raíz.

Sube los archivos extraídos, no el ZIP como único archivo. Puedes guardar el código en GitHub sin activar GitHub Pages. La copia no incorpora la protección de acceso del alojamiento privado. Mantén Pages desactivado para conservar el alcance privado autorizado.

## Probar en tu ordenador

Desde la carpeta extraída:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Abre http://localhost:8000. Cierra el servidor con Ctrl+C. Abrir el HTML directamente puede bloquear los módulos del navegador.

## Cabecera y pantalla completa

La cabecera dice «Un juego de Tecnología Punta». El botón de pantalla completa amplía toda la página, con la barra superior y el menú incluidos. Pulsa de nuevo el botón o Escape para salir.

## Menú lateral oculto en PC

La mesa utiliza todo el ancho de la pantalla. Pulsa «Menú» en la cabecera para desplegar la columna izquierda. Puedes cerrarla con el mismo botón, con la cruz, al pulsar fuera o con Escape. Elegir una vista o personaje también la cierra.

## Incluye los últimos ajustes

- Cuatro nombres editables, guardados en el navegador. Javiel conserva el suyo.
- Abanicos de cartas y las dos manos del jugador.
- Conteo compacto de las dieciséis cartas y detalle de puntos desplegable.
- Selección de descarte anulada cuando cualquiera corta mus.
- Ocho chascarrillos de Javiel cada dos o tres manos, además de las bromas de apuestas.
- Aviso de seña del compañero sin escribir qué seña ha hecho.
- Señas de IA fuera de turno, con retraso variable y duración de un segundo.
- Mus corrido opcional y toda la primera mano sin señas.
- Motor local de mus, tres jugadores de IA, reenvites, órdago y puntuación a 40 piedras.

## Validación

Esta versión supera cien partidas simuladas, las pruebas de geometría y las de interfaz en DOM simulado. La revisión visual en móvil real está pendiente.

No requiere compilación, claves, servicios externos ni servidor de partidas. Incluye Three.js y su licencia MIT en `vendor`. Esta copia no contiene el proyecto nativo de Godot.

Código de origen: `97d337972a431c88d983c6f4b8995c19ffb6978d`.
