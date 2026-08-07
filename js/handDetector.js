/**
 * HandTalk IA - Módulo del Detector de Manos (MediaPipe Tasks Vision)
 * 
 * Este módulo carga el modelo de detección de manos de Google MediaPipe
 * y procesa frames de video para extraer la pose de la mano en tiempo real.
 */

import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/+esm";

// Definición de conexiones para dibujar el esqueleto de la mano
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Pulgar
  [0, 5], [5, 6], [6, 7], [7, 8],       // Índice
  [5, 9], [9, 10], [10, 11], [11, 12],   // Medio
  [9, 13], [13, 14], [14, 15], [15, 16], // Anular
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Meñique
];

export class HandDetector {
  constructor() {
    this.handLandmarker = null;
    this.isLoaded = false;
  }

  /**
   * Inicializa el FilesetResolver y descarga el modelo HandLandmarker.
   */
  async initialize() {
    if (this.isLoaded) return;

    try {
      // 1. Obtener la resolución de archivos WebAssembly del CDN
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
      );

      // 2. Crear el detector con configuraciones optimizadas
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU" // Utilizar aceleración por GPU si está disponible
        },
        runningMode: "VIDEO", // Modo VIDEO optimizado para bucles de frames
        numHands: 1 // Enfocado en detectar 1 mano principal según requerimientos de v0.2
      });

      this.isLoaded = true;
    } catch (error) {
      console.error("Error al inicializar MediaPipe HandLandmarker:", error);
      throw error;
    }
  }

  /**
   * Ejecuta la detección de landmarks en un cuadro (frame) de vídeo.
   * @param {HTMLVideoElement} videoElement - Transmisión de cámara activa.
   * @param {number} timestamp - Marca de tiempo incremental (performance.now()).
   * @returns {Object} Los resultados devueltos por MediaPipe.
   */
  detect(videoElement, timestamp) {
    if (!this.isLoaded || !this.handLandmarker) {
      console.warn("El detector de manos no se ha inicializado todavía.");
      return null;
    }
    return this.handLandmarker.detectForVideo(videoElement, timestamp);
  }

  /**
   * Dibuja los landmarks detectados y sus conexiones sobre un canvas.
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D del canvas.
   * @param {Array} landmarks - Coordenadas normalizadas (x, y, z) de la mano.
   * @param {number} width - Ancho del canvas.
   * @param {number} height - Alto del canvas.
   */
  drawHand(ctx, landmarks, width, height) {
    if (!landmarks) return;

    // 1. Dibujar las líneas de conexión (esqueleto)
    ctx.strokeStyle = "rgba(15, 82, 186, 0.7)"; // Azul HandTalk con opacidad
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });

    // 2. Dibujar los puntos clave (articulaciones)
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * width;
      const y = landmark.y * height;

      // Puntos finales de los dedos (yemas) tienen un estilo más grande y destacado
      const isFingertip = [4, 8, 12, 16, 20].includes(index);

      ctx.beginPath();
      if (isFingertip) {
        // Yemas de los dedos
        ctx.arc(x, y, 6.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#0F52BA"; // Azul principal sólido
        ctx.strokeStyle = "#FFFFFF"; // Borde blanco
        ctx.lineWidth = 2;
      } else {
        // Articulaciones normales
        ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFFFF"; // Blanco
        ctx.strokeStyle = "#0F52BA"; // Borde azul
        ctx.lineWidth = 1.8;
      }
      ctx.fill();
      ctx.stroke();
    });
  }
}
