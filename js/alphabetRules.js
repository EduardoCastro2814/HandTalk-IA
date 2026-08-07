/**
 * HandTalk IA - Módulo de Reglas del Alfabeto (Heurísticas Geométricas)
 * 
 * Este módulo analiza la configuración de los 21 landmarks de la mano obtenidos
 * por MediaPipe y clasifica la posición de cada dedo para reconocer letras estáticas.
 * 
 * Diseñado de forma modular para permitir una fácil extensión en el futuro.
 */

/**
 * Calcula la distancia euclidiana entre dos puntos en 3D (o 2D si Z no está disponible).
 * @param {Object} p1 - Punto 1 {x, y, z}
 * @param {Object} p2 - Punto 2 {x, y, z}
 * @returns {number} Distancia calculada
 */
function getDistance(p1, p2) {
  if (!p1 || !p2) return 0;
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z !== undefined && p2.z !== undefined) ? (p1.z - p2.z) : 0;
  return Math.hypot(dx, dy, dz);
}

/**
 * Analiza el estado individual de cada uno de los 5 dedos.
 * Retorna si cada dedo está abierto (extendido), cerrado (doblado) o curvo.
 * 
 * @param {Array} landmarks - Los 21 landmarks de la mano detectados por MediaPipe.
 * @returns {Object|null} El estado de los dedos o null si los landmarks no son válidos.
 */
export function analyzeFingers(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  // Escala de la mano: Distancia entre la muñeca (0) y el nudillo del dedo medio (9)
  // Se usa para normalizar las distancias horizontales y hacerlas independientes del tamaño de la mano
  const handScale = getDistance(landmarks[0], landmarks[9]) || 1;

  /**
   * Determina el estado de extensión de los dedos de 4 articulaciones (Índice, Medio, Anular, Meñique).
   * 
   * Calcula el ratio de extensión: Distancia directa (MCP -> TIP) / Longitud total del dedo (MCP->PIP->DIP->TIP).
   * - Un dedo completamente recto tiene un ratio cercano a 1.0.
   * - Un dedo doblado tiene un ratio cercano a 0.3.
   */
  const getFingerState = (mcpIdx, pipIdx, dipIdx, tipIdx) => {
    const mcp = landmarks[mcpIdx];
    const pip = landmarks[pipIdx];
    const dip = landmarks[dipIdx];
    const tip = landmarks[tipIdx];

    const totalLength = getDistance(mcp, pip) + getDistance(pip, dip) + getDistance(dip, tip);
    const directDistance = getDistance(mcp, tip);
    const ratio = totalLength > 0 ? (directDistance / totalLength) : 0;

    // Umbrales calibrados para la apertura de dedos
    const open = ratio > 0.72;
    const closed = ratio < 0.45;
    const curved = ratio >= 0.45 && ratio <= 0.72;

    return { ratio, open, closed, curved };
  };

  // Analizar los 4 dedos principales
  const index = getFingerState(5, 6, 7, 8);
  const middle = getFingerState(9, 10, 11, 12);
  const ring = getFingerState(13, 14, 15, 16);
  const pinky = getFingerState(17, 18, 19, 20);

  // Analizar el Pulgar (Thumb): landmarks 1 (CMC), 2 (MCP), 3 (IP), 4 (TIP)
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const thumbMCP = landmarks[2];
  const thumbCMC = landmarks[1];

  // Ratio del pulgar
  const thumbTotalLength = getDistance(thumbCMC, thumbMCP) + getDistance(thumbMCP, thumbIP) + getDistance(thumbIP, thumbTip);
  const thumbDirectDistance = getDistance(thumbCMC, thumbTip);
  const thumbRatio = thumbTotalLength > 0 ? (thumbDirectDistance / thumbTotalLength) : 0;

  // Medir distancias del pulgar a otros nudillos para detectar plegado e inclinación
  const distThumbToIndexMCP = getDistance(thumbTip, landmarks[5]) / handScale;
  const distThumbToMiddleMCP = getDistance(thumbTip, landmarks[9]) / handScale;
  const distThumbToRingMCP = getDistance(thumbTip, landmarks[13]) / handScale;

  // Definir estados del pulgar
  // 1. Amplio (wide): Extendido lateralmente hacia el exterior (ej. en L, Y)
  const wide = distThumbToIndexMCP > 0.72;

  // 2. Doblado (folded): Cruzando por encima de la palma (ej. en B)
  const folded = distThumbToMiddleMCP < 0.52 || distThumbToRingMCP < 0.52;

  const thumb = {
    ratio: thumbRatio,
    wide,
    folded,
    distToIndexMCP: distThumbToIndexMCP,
    distToMiddleMCP: distThumbToMiddleMCP
  };

  return {
    thumb,
    index,
    middle,
    ring,
    pinky
  };
}

/**
 * Clasifica la pose de la mano en una letra (A, B, C, L, V, Y) basada en heurísticas geométricas.
 * 
 * @param {Array} landmarks - Los 21 landmarks de la mano detectados por MediaPipe.
 * @returns {string|null} La letra detectada (A, B, C, L, V, Y) o null si no se reconoce ninguna.
 */
export function classifyLetter(landmarks) {
  const fingers = analyzeFingers(landmarks);
  if (!fingers) return null;

  const { thumb, index, middle, ring, pinky } = fingers;

  // ========================================================================
  // REGLAS PARA CADA LETRA (A, B, C, L, V, Y)
  // ========================================================================

  // LETRA A: Puño cerrado con pulgar al lado
  // - Dedos índice, medio, anular y meñique están CERRADOS.
  // - El pulgar NO está doblado sobre la palma (está al lado/upright).
  if (index.closed && middle.closed && ring.closed && pinky.closed) {
    if (!thumb.folded) {
      return "A";
    }
  }

  // LETRA B: Mano plana vertical con pulgar doblado
  // - Dedos índice, medio, anular y meñique están ABIERTOS (extendidos).
  // - El pulgar está DOBLADO (cruzando sobre la palma).
  if (index.open && middle.open && ring.open && pinky.open) {
    if (thumb.folded) {
      return "B";
    }
  }

  // LETRA C: Forma de "C" (mano en forma de copa curva)
  // - Dedos índice, medio, anular y meñique están CURVOS.
  // - El pulgar está curvado hacia adelante (no plegado a la palma ni super extendido lateralmente).
  if (index.curved && middle.curved && ring.curved && pinky.curved) {
    if (!thumb.folded && thumb.distToIndexMCP > 0.35) {
      return "C";
    }
  }

  // LETRA D: Índice levantado, otros cerrados (a diferencia de L, el pulgar no está extendido)
  // - Dedo índice está ABIERTO.
  // - Dedos medio, anular y meñique están CERRADOS.
  // - Pulgar NO está extendido lateralmente (wide).
  if (index.open && middle.closed && ring.closed && pinky.closed) {
    if (!thumb.wide) {
      return "D";
    }
  }

  // LETRA F: Gesto de OK (pulgar e índice se tocan, medio/anular/meñique abiertos)
  // - Dedos medio, anular y meñique están ABIERTOS.
  // - Índice y pulgar se tocan (distancia normalizada corta).
  if (middle.open && ring.open && pinky.open) {
    const handScale = getDistance(landmarks[0], landmarks[9]) || 1;
    const distThumbToIndexTip = getDistance(landmarks[4], landmarks[8]) / handScale;
    if (distThumbToIndexTip < 0.25) {
      return "F";
    }
  }

  // LETRA I: Meñique levantado, otros cerrados (a diferencia de Y, el pulgar no está extendido)
  // - Dedo meñique está ABIERTO.
  // - Dedos índice, medio y anular están CERRADOS.
  // - Pulgar NO está extendido lateralmente (wide).
  if (pinky.open && index.closed && middle.closed && ring.closed) {
    if (!thumb.wide) {
      return "I";
    }
  }

  // LETRA L: Forma de L
  // - Dedo índice está ABIERTO.
  // - Dedos medio, anular y meñique están CERRADOS.
  // - Pulgar está ABIERTO lateralmente (wide).
  if (index.open && middle.closed && ring.closed && pinky.closed) {
    if (thumb.wide) {
      return "L";
    }
  }

  // LETRA V: Forma de V (seña de victoria)
  // - Dedos índice y medio están ABIERTOS.
  // - Dedos anular y meñique están CERRADOS.
  // - El pulgar no está extendido lateralmente.
  if (index.open && middle.open && ring.closed && pinky.closed) {
    if (!thumb.wide) {
      return "V";
    }
  }

  // LETRA W: Tres dedos extendidos (índice, medio, anular)
  // - Dedos índice, medio y anular están ABIERTOS.
  // - Dedo meñique está CERRADO.
  if (index.open && middle.open && ring.open && pinky.closed) {
    return "W";
  }

  // LETRA Y: Pulgar y meñique extendidos (gesto Shaka/teléfono)
  // - Dedo meñique está ABIERTO.
  // - Dedos índice, medio y anular están CERRADOS.
  // - Pulgar está ABIERTO lateralmente (wide).
  if (pinky.open && index.closed && middle.closed && ring.closed) {
    if (thumb.wide) {
      return "Y";
    }
  }

  /* ========================================================================
     🔮 INTEGRACIONES FUTURAS Y EXTENSIONES DEL ALFABETO
     ========================================================================
     Para ampliar la cobertura a todo el alfabeto dactilológico (LSM/ASL):
     
     1. Reconocimiento completo del alfabeto:
        - Agregar condiciones geométricas para el resto de letras:
          * D: Índice abierto, pulgar toca la yema de medio, anular y meñique.
          * E: Todos los dedos semi-doblados (garras) tocando el pulgar.
          * F: Índice y pulgar tocándose en círculo, medio, anular y meñique extendidos.
          * I: Meñique abierto, otros dedos cerrados, pulgar cerrado.
          * K: Índice y medio abiertos, pulgar toca la articulación PIP del índice.
          * W: Índice, medio y anular abiertos, meñique y pulgar cerrados.
        - Para letras dinámicas (J, Z): Requieren análisis temporal de frames (trayectorias).

     2. Reconocimiento de palabras (Deletreo):
        - Implementar gestos de control como "Espacio" (por ejemplo, mano abierta boca abajo).
        - Acumular letras consecutivas en un buffer de palabras cuando cambien.
        - Implementar detección de transiciones (cuando la mano vuelve temporalmente a una pose neutral
          para separar letras repetidas como "LL" o "EE").

     3. Traducción de frases a nivel gramatical:
        - Agregar procesamiento de lenguaje natural (NLP) o integrarse con LLM locales
          para corregir deletreos (auto-corrección ortográfica) y estructurar enunciados fluidos.

     4. IA basada en Machine Learning y TensorFlow.js:
        - Sustituir las heurísticas manuales con un modelo de clasificación neuronal multicapa.
        - Entrenar un modelo Dense Classifier en TensorFlow.js utilizando vectores de 63 características
          (21 landmarks * 3 coordenadas x,y,z normalizadas respecto a la muñeca).
        - Ejemplo:
          const prediction = model.predict(tf.tensor2d([flatLandmarks]));
          const letter = ALPHABET[prediction.argMax(-1).dataSync()[0]];
     ======================================================================== */

  return null;
}
