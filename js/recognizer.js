import { classifyLetter, analyzeFingers } from "./alphabetRules.js";

export class SignRecognizer {
  constructor() {
    this.isModelLoaded = true; // Heurísticas cargadas inmediatamente
    
    // Sistema de estabilización
    this.currentCandidate = null;
    this.candidateCount = 0;
    this.lastAcceptedLetter = null;
    
    // Sistema de construcción de palabras (v0.3)
    this.constructedText = "";
    this.lastAppendedLetter = null;
    
    /* ========================================================================
       🔮 PUNTO DE INTEGRACIÓN FUTURA: CARGA DE MODELOS DE INFERENCIA
       ========================================================================
       En el constructor o en un método initialize() se deben cargar los pesos y
       estructuras de red neuronal si se decide usar un modelo entrenado.
       
       Ejemplo:
       this.model = await tf.loadLayersModel('./models/alphabet_classifier/model.json');
       ======================================================================== */
  }

  /**
   * Restablece el estado del buffer de estabilización cuando se pierde la mano.
   */
  reset() {
    this.currentCandidate = null;
    this.candidateCount = 0;
    this.lastAcceptedLetter = null;
    // OJO: No limpiamos constructedText al perder la mano para permitir deletrear con pausas,
    // pero sí limpiamos lastAppendedLetter para poder repetir letras consecutivas tras pausa.
    this.lastAppendedLetter = null;
  }

  /**
   * Obtiene la información de depuración detallada para el frame actual.
   * @param {Array} landmarks - Los 21 landmarks de la mano.
   * @param {Object} results - Los resultados completos de MediaPipe.
   * @returns {Object} Información de depuración.
   */
  getDebugInfo(landmarks, results) {
    if (!landmarks || landmarks.length === 0) {
      return {
        detected: false,
        handedness: "Ninguna",
        pulgar: "Abajo",
        index: "Abajo",
        middle: "Abajo",
        ring: "Abajo",
        pinky: "Abajo",
        pattern: [0, 0, 0, 0, 0],
        candidate: "Ninguna",
        confidence: 0
      };
    }

    const fingers = analyzeFingers(landmarks);
    if (!fingers) {
      return { detected: false };
    }

    const { thumb, index, middle, ring, pinky } = fingers;

    // Traducir lateralidad (handedness)
    const handednessArray = results.handednesses || results.handedness;
    let rawHandedness = "Desconocido";
    let score = 0;
    if (handednessArray && handednessArray[0] && handednessArray[0][0]) {
      rawHandedness = handednessArray[0][0].categoryName;
      score = handednessArray[0][0].score;
    }

    const handedness = rawHandedness === "Left" ? "Izquierda" : (rawHandedness === "Right" ? "Derecha" : "Ninguna");
    const confidence = Math.round(score * 100);

    // Mapear estado de los dedos principales
    const mapFinger = (f) => {
      if (f.open) return "Arriba";
      if (f.closed) return "Abajo";
      return "Curvo";
    };

    const mapPattern = (f) => {
      if (f.open) return 1;
      if (f.closed) return 0;
      return 0.5;
    };

    const pulgarState = thumb.folded ? "Abajo" : "Arriba";
    const pulgarPattern = thumb.folded ? 0 : 1;

    const pattern = [
      pulgarPattern,
      mapPattern(index),
      mapPattern(middle),
      mapPattern(ring),
      mapPattern(pinky)
    ];

    const candidate = classifyLetter(landmarks) || "Ninguna";

    return {
      detected: true,
      handedness,
      pulgar: pulgarState,
      index: mapFinger(index),
      middle: mapFinger(middle),
      ring: mapFinger(ring),
      pinky: mapFinger(pinky),
      pattern,
      candidate,
      confidence
    };
  }

  /**
   * Procesa las coordenadas tridimensionales de la mano para traducir señas.
   * @param {Array} landmarks - Los 21 puntos clave (x, y, z) detectados por MediaPipe.
   * @returns {string|null} La seña predicha (letra, palabra) o null si no hay predicción confiable.
   */
  recognize(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      this.reset();
      return null;
    }

    // Clasificar seña usando reglas geométricas del módulo alphabetRules
    const rawLetter = classifyLetter(landmarks);

    // Sistema de estabilización: una letra debe permanecer durante al menos 15 frames
    if (rawLetter === this.currentCandidate) {
      this.candidateCount++;
      if (this.candidateCount >= 15) {
        // Estabilización alcanzada
        this.lastAcceptedLetter = this.currentCandidate;

        // Construcción de palabras (v0.3):
        // Si detectamos una letra estabilizada y es diferente de la última agregada
        if (this.lastAcceptedLetter !== null) {
          if (this.lastAcceptedLetter !== this.lastAppendedLetter) {
            this.constructedText += this.lastAcceptedLetter;
            this.lastAppendedLetter = this.lastAcceptedLetter;
          }
        } else {
          // Si estabilizamos "nada" (ninguna letra), reseteamos lastAppendedLetter
          // Esto permite deletrear la misma letra después de una breve pausa
          this.lastAppendedLetter = null;
        }
      }
    } else {
      // Cambio de letra candidata detectada, reiniciar contador
      this.currentCandidate = rawLetter;
      this.candidateCount = 1;
    }

    /* ========================================================================
       🔮 PUNTO DE INTEGRACIÓN FUTURA: CLASIFICACIÓN DE SEÑAS EN TIEMPO REAL
       ========================================================================
       Aquí es donde se implementará la lógica de clasificación dividida en fases:

       --- FASE 1: RECONOCIMIENTO DE LETRAS (Alfabeto Dactilológico Estático) ---
       Para señas estáticas (donde la mano no requiere movimiento continuo como la A, B, C, L, V):
       
       1. Preprocesar las coordenadas:
          - Centrar la mano restando la coordenada de la muñeca (landmark 0) de todos los demás puntos.
          - Normalizar la escala dividiendo por la distancia máxima (ej. distancia muñeca-nudillo medio).
          - Esto hace que el modelo sea independiente de la distancia a la cámara o el tamaño de la mano.
          
       2. Ejecución heurística o inferencia de modelo:
          - Enfoque Heurístico (Fácil e inmediato): Medir ángulos entre falanges y distancia relativa
            entre la yema de los dedos y la palma para determinar si están extendidos o doblados.
          - Enfoque Machine Learning (Precisión alta): Pasar el vector unidimensional de 63 valores
            (21 landmarks * 3 coordenadas) a un clasificador de red neuronal de TensorFlow.js:
            
            const tensor = tf.tensor2d([flatLandmarks]);
            const prediction = this.model.predict(tensor);
            const classIndex = prediction.argMax(-1).dataSync()[0];
            return ALFABETO[classIndex];

       --- FASE 2: RECONOCIMIENTO DE PALABRAS DINÁMICAS (Señas con Movimiento) ---
       Para señas dinámicas (como "Hola", "Gracias", "Por favor", que involucran trayectoria temporal):
       
       1. Almacenar un búfer circular de frames (por ejemplo, los últimos 30 frames a 30fps).
       2. Extraer características temporales (velocidad de los dedos, trayectoria del centroide de la mano).
       3. Alimentar una red recurrente (LSTM) o un clasificador de series de tiempo para identificar
          el gesto dinámico completo al finalizar el movimiento.

       --- FASE 3: SISTEMA DE SUBTÍTULOS E INTEGRADOR DE TRADUCCIÓN ---
       Para dar salida a oraciones gramaticales y fluidas:
       
       1. Aplicar un filtro de estabilización de palabras: Una letra o palabra solo se confirma
          si se detecta consecutivamente en N frames (por ejemplo, 10 frames), evitando parpadeos de subtítulos.
       2. Para traducir deletreo a palabras, agrupar las letras. Detectar un gesto especial
          (como mano abierta quieta o puño cerrado temporal) para representar el caracter de espacio (" ").
       3. Futura integración opcional de un micro-modelo de lenguaje (LLM ligero local o API externa)
          para ordenar semánticamente las palabras sueltas interpretadas y darles coherencia gramatical.
       ======================================================================== */

    // Si hay una letra aceptada por el buffer de estabilización, la mostramos con el formato solicitado
    if (this.lastAcceptedLetter) {
      return `Letra detectada: ${this.lastAcceptedLetter}`;
    }

    return null;
  }

  /**
   * Limpia el texto acumulado construido.
   */
  clearText() {
    this.constructedText = "";
    this.lastAppendedLetter = null;
  }

  /**
   * Inserta un espacio en el texto construido para separar palabras.
   * @returns {boolean} Si se insertó el espacio con éxito.
   */
  insertSpace() {
    if (this.constructedText.length > 0 && !this.constructedText.endsWith(" ")) {
      this.constructedText += " ";
      this.lastAppendedLetter = null;
      return true;
    }
    return false;
  }

  /**
   * Obtiene el texto construido actual.
   * @returns {string} El texto deletreado acumulado.
   */
  getConstructedText() {
    return this.constructedText;
  }
}
