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
    
    this.btn = document.getElementById("toggleCameraButton");
    this.btnText = document.getElementById("btnText");
    
    this.subtitlesContainer = document.getElementById("subtitlesContainer");
    this.subtitlesText = document.getElementById("subtitlesText");
  }

  /**
   * Restablece la interfaz al estado inicial con la cámara desactivada.
   */
  setInitialState() {
    // 1. Mostrar/Ocultar elementos de video y placeholder
    this.video.classList.add("hidden");
    this.placeholder.classList.remove("hidden");
    this.statusBadge.classList.add("hidden");
    
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
    // 1. Mostrar video y badge de estado, ocultar placeholder
    this.video.classList.remove("hidden");
    this.placeholder.classList.add("hidden");
    this.statusBadge.classList.remove("hidden");
    
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

    // Accesibilidad: Anunciar que la cámara ya está activa
    this.placeholder.setAttribute("aria-label", "Cámara activa.");
  }

  /**
   * Muestra un estado de error en la UI (permiso denegado o cámara no disponible).
   * @param {string} errorType - Tipo de error ('denied' o 'unavailable').
   */
  setCameraError(errorType) {
    // 1. Asegurar que el video y el badge estén ocultos
    this.video.classList.add("hidden");
    this.placeholder.classList.remove("hidden");
    this.statusBadge.classList.add("hidden");

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
}
