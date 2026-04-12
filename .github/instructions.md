Actúa como un desarrollador de software Senior. Tu objetivo es inicializar y desarrollar una aplicación interna llamada 'PingPongZS' para registrar y rankear partidos de ping pong entre amigos. 

La aplicación debe ser gestionada por un único administrador (un solo menú/sesión) que cargará todos los datos, por lo que no es necesario un sistema de login complejo por ahora, pero sí una interfaz clara y fácil de navegar.

A continuación, detallo los requerimientos funcionales y la lógica de negocio que debes implementar:

1. GESTIÓN DE JUGADORES:
- Crear un CRUD básico para agregar, editar o dar de baja jugadores.
- Cada jugador debe tener un nombre, un "MMR" (Matchmaking Rating) inicial (ej: 1000 puntos), historial de victorias/derrotas, y el registro de puntos a favor y en contra totales.

2. REGISTRO DE PARTIDOS:
- Interfaz para registrar un nuevo partido seleccionando: Jugador A, Jugador B, Puntos anotados por el Jugador A y Puntos anotados por el Jugador B.
- Al guardar el partido, el sistema debe actualizar automáticamente el MMR de ambos jugadores y sus historiales.

3. ALGORITMO DE RANGO (MMR/ELO):
- Implementar un sistema de puntuación similar al sistema Elo de ajedrez.
- Lógica requerida: Si un jugador con bajo MMR le gana a uno con alto MMR, el ganador suma muchos puntos y el perdedor pierde muchos. Si el jugador con alto MMR gana, suma pocos puntos y el perdedor pierde pocos.
- Usa una constante K razonable (por ejemplo, K=32) para calcular la variación de puntos después de cada partido.

4. DASHBOARD Y RANKING:
- Mostrar una tabla de clasificación ordenada por MMR actual.
- Incluir indicadores visuales (badges/marcas) en la tabla para:
  a) "El Muro/Mejor Diferencial": El jugador con la mejor diferencia histórica entre puntos anotados a favor y puntos recibidos en contra.
  b) "En Racha (On Fire)": El jugador con la mayor racha de victorias consecutivas actual.
  c) "Mala Racha": El jugador con la mayor racha de derrotas consecutivas actual.

5. PERFIL E HISTORIAL (H2H):
- Al seleccionar un jugador individual, mostrar su historial completo de partidos jugados (fecha, rival, resultado y variación de MMR).
- Implementar una vista "Head-to-Head" (Cara a Cara): Poder seleccionar dos jugadores específicos y ver el historial exclusivo de partidos entre ellos, quién ha ganado más veces y la diferencia de puntos directa.

Por favor, comienza proponiendo la estructura del proyecto, el modelo de datos (entidades) y cómo estructurarás la lógica del cálculo de MMR antes de escribir el código completo.
