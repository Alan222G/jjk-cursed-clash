# 🥋 Jujutsu Kaisen 2D Fighter: Documento de Diseño Técnico Avanzado

Este documento detalla la lógica arquitectónica para programar un juego de peleas competitivo inspirado en Jujutsu Kaisen dentro del motor **Phaser 3**. Está diseñado para ser interpretado tanto por humanos como por inteligencias artificiales futuras que deban extender el juego.

---

## 1. El Núcleo del Peleador (`Fighter.js`)

Todos los personajes extenderán de una clase base. Aquí está la lógica de cómo debe estar construida la entidad principal.

### 1.1. Máquina de Estados (State Machine)
Un personaje de pelea no puede estar atacando y bloqueando a la vez. Implementar un gestor de estados es *crítico*.
- **Estados Válidos:** `IDLE`, `WALK`, `JUMP`, `FALL`, `ATTACK`, `BLOCK`, `HITSTUN` (aturdido por un golpe), `KNOCKDOWN` (tirado en el suelo), `GETUP` (levantándose), `CASTING_DOMAIN`.

> [!IMPORTANT]
> **Gestión del Input:** El `InputManager` solo debe escuchar teclas si el estado actual es `IDLE`, `WALK`, `JUMP` o `FALL`. Si el estado es `HITSTUN` o `CASTING_DOMAIN`, ignorar el input del jugador.

### 1.2. Frames de Invulnerabilidad (iFrames)
Los iFrames son esenciales para los "Wake-Up Attacks" (levantarse atacando) o animaciones cinemáticas como la Expansión de Dominio.
- Requiere un booleano en el Fighter: `this.isInvulnerable = false`.
- En el evento `get_hit`:
  ```javascript
  if (this.isInvulnerable) return; // Ignorar el daño y el knockback
  ```
- **Cuándo activarlo:**
  - Segundos 0.0 a 0.5 al entrar al estado `GETUP`.
  - Durante toda la animación de estado `CASTING_DOMAIN`.

### 1.3. Físicas y Peso
Phaser usa físicas Arcade. En la configuración física del `Fighter`:
- `gravity.y`: 1000 (gravedad por defecto).
- `drag.x`: 800 (Fricción en el eje X para que no resbale al dejar de caminar).
- Atributo propio `weight`: Define qué tanto lo afecta el *Knockback* (ej. Gojo weight=100, Panda weight=150).

---

## 2. Sistema de Combos y Cajas de Colisión

### 2.1. Hitboxes y Hurtboxes Dinámicos
No se recomienda que el cuerpo del personaje (Hurtbox) sea el mismo cuadrado que inflige daño.
- **Hurtbox:** Configurado sobre el `Sprite` del Fighter (el área donde puede recibir daño).
- **Hitbox:** Objetos `Phaser.GameObjects.Zone` invisibles atados al Fighter. Se posicionan dinámicamente según la animación.
  - Al hacer un *Jab* (golpe ligero), una Hitbox pequeña se activa frente al puño durante el *Frame 3 o 4* de la animación.
  - Si colisiona con el Hurtbox rival, se ejecuta `applyDamage()`.

### 2.2. Buffer de Inputs ("Combo System")
Los juegos de pelea perdonan si el jugador presiona botones rápidamente.
- Implementar un **Input Buffer**: Una lista tipo Array/Queue que guarda las últimas tres teclas presionadas y el `timestamp` (tiempo).
- Si el jugador presiona `ATAQUE_LIGERO` (Light) y 100ms después `ATAQUE_MEDIO` (Medium), el motor registra esto como la orden de cancelar la animación final del Light y empezar el Medium tan pronto termine el momento del impacto.

---

## 3. Lógica Profunda: Expansiones de Dominio

La joya de la corona del juego. Esto reemplaza el sistema de "Super Moves" tradicionales por una alteración global de las reglas del combate.

### 3.1. Fase 1: El Casteo
- Si `CursedEnergy == 100`: Al presionar Gatillo R2 (o botón designado).
- Estado del personaje pasa a `CASTING_DOMAIN`.
- `this.isInvulnerable = true`.
- Reproducir Animación Fotográfica/Cinemática (ej. Sello de manos de Sukuna).
- Fondo de la escena actual entra en *Tween* de Fade Out o pantalla oscura temporal.

### 3.2. Fase 2: Choque de Dominios (Domain Clash)
- Se activa una ventana de *1000 a 1500ms*. Si dentro de ese tiempo el *segundo jugador* también tiene al menos 100 y presiona su botón de Dominio:
- La lógica captura un evento `DOMAIN_CLASH`.
- Llama a `scene.scene.pause('GameScene')`.
- Ejecuta `scene.scene.launch('DomainClashScene')` -> Minijuego rítmico.
- Cuando termina, el ganador emite un evento enviando al perdedor a estado `HITSTUN`.

### 3.3. Fase 3: La Resolución y el "Sure-Hit" Effect
- El ganador sobreescribe la variable `scene.currentDomainOwner`.
- Se carga el background fotográfico 4k generado con IA con un **shader procedural** (ej. distorsión WebGL).
- **El Efecto "Sure-Hit" (Golpe Certero):** En el `update()` de la escena principal:
  ```javascript
  if (scene.currentDomainOwner == this.player1) {
       // Lógica del Sure-Hit de Gojo (Vacío Inconmensurable):
       this.player2.currentState = 'STUN';
       this.player2.isStunnedInfinitely = true; // Solo parpadea y la IA o jugador no se puede mover.
  }
  ```
- El dominio drena `CursedEnergy` pasivamente -20 por segundo del usuario, hasta llegar a 0. Al llegar a 0, el Dominio colapsa, el fondo regresa a la normalidad, y el usuario entra en un estado `FATIGUE` (No puede recuperar Cursed Energy durante 10 segundos).

---

## 4. Próximos Pasos para Generación de Arte

Guarda estos parámetros estandarizados para tus generaciones de IA en Midjourney:

*   **Sprites de Personajes:** "2D fighting game sprite sheet, Jujutsu Kaisen character, flat colors, side view, idle animation frames, white background, studio ghibli anime style --v 6.0"
*   **Elementos UI:** "Dark aesthetic UI elements, golden borders with cursed energy smoke, 4k pixel art --v 6.0"

> [!TIP]
> Una vez que tengas tu primer spritesheet (Ej. Yuji Itadori) y un par de texturas limpias para la UI, ya tienes todo listo para empezar a inyectar lógica de Phaser 3.
