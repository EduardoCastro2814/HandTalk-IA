/**
 * HandTalk IA - Módulo de Control de la Cámara
 * 
 * Este módulo encapsula la lógica de acceso al hardware de la cámara utilizando
 * la API de MediaDevices del navegador.
 */

export class CameraController {
  /**
   * @param {HTMLVideoElement} videoElement - El elemento <video> de HTML donde se reproducirá el stream.
   */
  constructor(videoElement) {
    if (!videoElement) {
      throw new Error("Se requiere un elemento HTMLVideoElement para inicializar CameraController.");
    }
    this.video = videoElement;
    this.stream = null;
    this.isActive = false;
    this.facingMode = "environment"; // Por defecto cámara trasera (ideal en dispositivos móviles)
  }

  /**
   * Verifica si el navegador soporta el acceso a medios y si hay dispositivos de video disponibles.
   * @returns {Promise<boolean>}
   */
  static async isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Solicita permisos de cámara e inicia la transmisión de video.
   * @returns {Promise<MediaStream>} El flujo de video de la cámara.
   */
  async start() {
    if (this.isActive) return this.stream;

    // Configuración recomendada para reconocimiento en tiempo real:
    // - facingMode ideal configurable para alternar entre trasera (environment) y frontal (user)
    // - Resolución ideal HD (1280x720) que equilibra precisión de detección y rendimiento
    // - Audio desactivado por privacidad y menor consumo de recursos
    const constraints = {
      video: {
        facingMode: { ideal: this.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: 1.7777777778 // 16:9
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      
      // Esperar a que los metadatos del vídeo se carguen antes de reproducir
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          resolve();
        };
      });

      await this.video.play();
      this.isActive = true;

      /* ========================================================================
         🔮 PUNTO DE INTEGRACIÓN FUTURA: MEDIAPIPE HANDS / TENSORFLOW.JS (Detección de Cuadros)
         ========================================================================
         Aquí es donde se debe iniciar el bucle de captura de cuadros (Frame Loop).
         
         Instrucciones de integración:
         1. Cuando la cámara esté activa (this.isActive === true), inicia un bucle
            usando requestAnimationFrame(tuFuncionDeBucle).
         2. En cada iteración, captura la imagen del vídeo y envíala al detector:
            
            ejemplo:
            const onFrame = async () => {
              if (!this.isActive) return;
              
              // Enviar el elemento de video directamente a MediaPipe Hands:
              await handsModel.send({ image: this.video });
              
              // O dibujar el frame en un canvas de procesamiento intermedio:
              // ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
              
              requestAnimationFrame(onFrame);
            };
            requestAnimationFrame(onFrame);
         ======================================================================== */

      return this.stream;
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  /**
   * Detiene la transmisión de video, apaga la cámara del hardware y limpia los recursos.
   */
  stop() {
    if (this.stream) {
      // Detener cada pista individual para apagar físicamente el indicador LED de la cámara
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }

    this.video.srcObject = null;
    this.isActive = false;

    /* ========================================================================
       🔮 PUNTO DE INTEGRACIÓN FUTURA: DETENER PROCESAMIENTO IA
       ========================================================================
       1. Aquí se debe cancelar el bucle de requestAnimationFrame (usando cancelAnimationFrame).
       2. Liberar memoria si el modelo de TensorFlow.js/MediaPipe requiere limpieza explícita.
       ======================================================================== */
  }

  /**
   * Alterna entre cámara frontal ('user') y cámara trasera ('environment').
   * @returns {string} El nuevo modo de la cámara establecido.
   */
  switchFacingMode() {
    this.facingMode = this.facingMode === "user" ? "environment" : "user";
    return this.facingMode;
  }

  /**
   * Verifica si el dispositivo actual posee múltiples cámaras de video disponibles.
   * @returns {Promise<boolean>}
   */
  async hasMultipleCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
      return videoDevices.length > 1;
    } catch (error) {
      console.warn("No fue posible consultar la lista de cámaras del hardware:", error);
      return false;
    }
  }
}
