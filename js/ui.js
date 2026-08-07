/**
 * HandTalk IA - Módulo de Interfaz de Usuario (UI)
 * 
 * Este módulo gestiona los cambios de estado visuales, la manipulación del DOM,
 * las clases CSS y la accesibilidad (ARIA) de la aplicación.
 */

export class UIController {
  constructor() {
    // Referencias a los elementos del DOM
    this.video = document.getElementById("webcamVideo");
    this.container = document.getElementById("cameraContainer");
    this.placeholder = document.getElementById("cameraPlaceholder");
    this.placeholderText = document.getElementById("placeholderText");
    this.statusBadge = document.getElementById("cameraStatusBadge");
    
    // Elementos del canvas y estado de la mano (v0.2)
    this.canvas = document.getElementById("overlayCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.handBadge = document.getElementById("handStatusBadge");
    this.handLabel = document.getElementById("handStatusLabel");
    
    this.btn = document.getElementById("toggleCameraButton");
    this.btnText = document.getElementById("btnText");
    
    this.subtitlesContainer = document.getElementById("subtitlesContainer");
    this.subtitlesText = document.getElementById("subtitlesText");
  }

  /**
   * Restablece la interfaz al estado inicial con la cámara desactivada.
   */
  setInitialState() {
    // 1. Mostrar/Ocultar elementos de video, canvas y placeholder
    this.video.classList.add("hidden");
    this.canvas.classList.add("hidden");
    this.placeholder.classList.remove("hidden");
    this.statusBadge.classList.add("hidden");
    this.handBadge.classList.add("hidden");
    
    // Limpiar canvas y estado de la mano
    this.clearCanvas();
    this.handBadge.classList.remove("detected");
    this.handLabel.textContent = "No se detecta mano";
    
    // Quitar clases de error si existían
    this.placeholder.classList.remove("error");

    // 2. Actualizar textos
    this.placeholderText.textContent = "La cámara aparecerá aquí.";
    this.btnText.textContent = "Iniciar cámara";
    this.btn.setAttribute("aria-label", "Iniciar cámara");
    this.btn.setAttribute("aria-pressed", "false");
    this.btn.classList.remove("active");

    // 3. Restablecer subtítulos
    this.subtitlesText.textContent = "Esperando reconocimiento...";
    this.subtitlesContainer.classList.remove("active");

    // Accesibilidad: Anunciar estado a lectores de pantalla
    this.placeholder.setAttribute("aria-label", "Cámara desactivada. La cámara aparecerá aquí.");
  }

  /**
   * Configura la interfaz para reflejar que la cámara está activa y reproduciendo.
   */
  setCameraActive() {
    // 1. Mostrar video, canvas y badge de estado, ocultar placeholder
    this.video.classList.remove("hidden");
    this.canvas.classList.remove("hidden");
    this.placeholder.classList.add("hidden");
    this.statusBadge.classList.remove("hidden");
    this.handBadge.classList.remove("hidden");
    
    // Limpiar canvas e insignias para iniciar limpias
    this.clearCanvas();
    this.handBadge.classList.remove("detected");
    this.handLabel.textContent = "No se detecta mano";
    
    // Quitar clases de error
    this.placeholder.classList.remove("error");

    // 2. Cambiar estilos y texto del botón
    this.btnText.textContent = "Detener cámara";
    this.btn.setAttribute("aria-label", "Detener cámara");
    this.btn.setAttribute("aria-pressed", "true");
    this.btn.classList.add("active");

    // 3. Estilo de subtítulos listos
    this.subtitlesContainer.classList.add("active");
    this.subtitlesText.textContent = "Esperando señas...";

    // 4. Adaptar tamaño de canvas
    this.resizeCanvas();

    // Accesibilidad: Anunciar que la cámara ya está activa
    this.placeholder.setAttribute("aria-label", "Cámara activa.");
  }

  /**
   * Muestra un estado de error en la UI (permiso denegado o cámara no disponible).
   * @param {string} errorType - Tipo de error ('denied' o 'unavailable').
   */
  setCameraError(errorType) {
    // 1. Asegurar que el video, el canvas y las insignias estén ocultos
    this.video.classList.add("hidden");
    this.canvas.classList.add("hidden");
    this.placeholder.classList.remove("hidden");
    this.statusBadge.classList.add("hidden");
    this.handBadge.classList.add("hidden");
    
    this.clearCanvas();

    // Agregar clase de estilo de error al placeholder
    this.placeholder.classList.add("error");

    // 2. Determinar mensaje según el tipo de error
    let message = "";
    if (errorType === "denied") {
      message = "Necesitamos acceso a la cámara para interpretar señas.";
    } else {
      message = "No fue posible acceder a la cámara.";
    }

    // 3. Actualizar textos
    this.placeholderText.textContent = message;
    this.btnText.textContent = "Iniciar cámara";
    this.btn.setAttribute("aria-label", "Iniciar cámara");
    this.btn.setAttribute("aria-pressed", "false");
    this.btn.classList.remove("active");

    // 4. Restablecer subtítulos
    this.subtitlesText.textContent = "Esperando reconocimiento...";
    this.subtitlesContainer.classList.remove("active");

    // Accesibilidad: Anunciar el error inmediatamente
    this.placeholder.setAttribute("aria-label", `Error: ${message}`);
  }

  /**
   * Actualiza el contenido del contenedor de subtítulos.
   * @param {string} text - El texto traducido por la futura IA.
   */
  updateSubtitles(text) {
    if (!text || text.trim() === "") {
      this.subtitlesText.textContent = "Esperando reconocimiento...";
      this.subtitlesContainer.classList.remove("active");
    } else {
      this.subtitlesText.textContent = text;
      this.subtitlesContainer.classList.add("active");
    }
  }

  /**
   * Adapta el tamaño del lienzo de dibujo (canvas) al tamaño de cuadro del video.
   */
  resizeCanvas() {
    if (this.video.videoWidth) {
      // Sincronizar dimensiones de coordenadas del canvas con los del stream de video
      if (this.canvas.width !== this.video.videoWidth || this.canvas.height !== this.video.videoHeight) {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
      }
    }
  }

  /**
   * Limpia todos los dibujos del lienzo.
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Actualiza el indicador visual de si se detecta una mano o no.
   * @param {boolean} detected
   */
  setHandDetected(detected) {
    if (detected) {
      this.handBadge.classList.add("detected");
      this.handLabel.textContent = "Mano detectada";
    } else {
      this.handBadge.classList.remove("detected");
      this.handLabel.textContent = "No se detecta mano";
    }
  }

  /**
   * Renderiza el esqueleto de la mano en el canvas usando el dibujador del detector.
   * @param {Array} landmarks - Puntos clave de la mano.
   * @param {HandDetector} detector - Instancia del detector de manos.
   */
  drawHandResults(landmarks, detector) {
    this.resizeCanvas();
    this.clearCanvas();
    if (landmarks) {
      detector.drawHand(this.ctx, landmarks, this.canvas.width, this.canvas.height);
    }
  }
}
