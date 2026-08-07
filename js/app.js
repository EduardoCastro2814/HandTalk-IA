/**
 * HandTalk IA - Orquestador Principal de la Aplicación
 * 
 * Este archivo inicializa y coordina los controladores de la cámara, de la
 * interfaz de usuario (UI), el detector de manos y el reconocedor de señas.
 */

import { CameraController } from "./camera.js";
import { UIController } from "./ui.js";
import { HandDetector } from "./handDetector.js";
import { SignRecognizer } from "./recognizer.js";

// Instancias globales de controladores e IA
let ui;
let camera;
let detector;
let recognizer;
let animationFrameId = null;

/**
 * Inicializa la aplicación, asocia eventos de escucha y realiza la precarga del modelo de IA.
 */
async function init() {
  ui = new UIController();
  
  // Registrar el controlador de la cámara apuntando al elemento de vídeo
  camera = new CameraController(ui.video);

  // Inicializar clases de detección y clasificación de señas
  detector = new HandDetector();
  recognizer = new SignRecognizer();

  // Restablecer la interfaz a su estado predeterminado
  ui.setInitialState();

  // Deshabilitar botón temporalmente mientras se descarga el modelo de IA (aprox. 5.6 MB)
  ui.btn.disabled = true;
  ui.btnText.textContent = "Cargando IA...";
  ui.updateSubtitles("Cargando detector de manos (MediaPipe)...");

  try {
    // Inicializar el detector de manos descargando el modelo de CDN
    await detector.initialize();
    
    // Habilitar botón una vez listo
    ui.btn.disabled = false;
    ui.btnText.textContent = "Iniciar cámara";
    ui.updateSubtitles("Esperando reconocimiento...");
  } catch (error) {
    console.error("No se pudo precargar la inteligencia artificial:", error);
    ui.btnText.textContent = "Error de IA";
    ui.updateSubtitles("Error al cargar la IA. Verifique su conexión a Internet.");
  }

  // Escuchar el clic del botón de control para encender/detener la cámara
  ui.btn.addEventListener("click", handleCameraToggle);

  // Escuchar el clic del botón para cambiar de cámara (v0.3)
  ui.switchBtn.addEventListener("click", handleCameraSwitch);
}

/**
 * Maneja la lógica de encendido y apagado de la cámara al presionar el botón.
 */
async function handleCameraToggle() {
  // Desactivar temporalmente el botón durante la transición para evitar múltiples clics
  ui.btn.disabled = true;

  if (!camera.isActive) {
    try {
      // Intentar iniciar la cámara
      await camera.start();
      ui.setCameraActive(camera.facingMode);
      
      // Consultar si hay múltiples cámaras disponibles para mostrar/ocultar el botón switch
      const hasMultiple = await camera.hasMultipleCameras();
      ui.showSwitchCameraButton(hasMultiple);
      
      // Iniciar el bucle de procesamiento de fotogramas en tiempo real
      startDetectionLoop();
    } catch (error) {
      console.error("Error al acceder a la cámara:", error);
      
      // Clasificación de errores según especificaciones de la API del navegador
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        ui.setCameraError("denied");
      } else {
        ui.setCameraError("unavailable");
      }
    }
  } else {
    // Si la cámara ya estaba encendida, detener el procesamiento y apagar la cámara
    try {
      stopDetectionLoop();
      camera.stop();
      ui.setInitialState();
    } catch (error) {
      console.error("Error al detener la cámara:", error);
    }
  }

  // Volver a habilitar el botón después de procesar
  ui.btn.disabled = false;
}

/**
 * Inicia el bucle recursivo de requestAnimationFrame para inferencia en tiempo real.
 */
function startDetectionLoop() {
  if (animationFrameId) return;

  const processFrame = () => {
    if (!camera.isActive) return;

    try {
      // Registrar marca de tiempo exacta del frame para MediaPipe
      const timestamp = performance.now();
      const results = detector.detect(ui.video, timestamp);

      if (results && results.landmarks && results.landmarks.length > 0) {
        // Mano detectada (Extraer los landmarks de la mano principal)
        const handLandmarks = results.landmarks[0];
        
        // 1. Actualizar el estado visual del badge superior a "Mano detectada"
        ui.setHandDetected(true);
        
        // 2. Renderizar los puntos articulados y el esqueleto de líneas sobre el canvas
        ui.drawHandResults(handLandmarks, detector);

        // 3. Enviar landmarks al reconocedor para clasificar el signo
        const textResult = recognizer.recognize(handLandmarks);
        
        if (textResult) {
          ui.updateSubtitles(textResult);
        } else {
          /* ========================================================================
             🔮 PUNTO DE INTEGRACIÓN FUTURA: RECONOCIMIENTO ACTIVO
             ========================================================================
             Cuando la mano esté detectada pero el clasificador en `recognizer.recognize`
             aún no tenga una predicción segura, mantendremos este estado.
             En la v0.3 aquí se acumularán las letras deletreadas o palabras detectadas.
             ======================================================================== */
          ui.updateSubtitles("Mano detectada. Esperando seña...");
        }
      } else {
        // No se detecta ninguna mano en pantalla
        ui.setHandDetected(false);
        ui.drawHandResults(null, detector); // Limpia el canvas
        ui.updateSubtitles("Esperando señas...");
        recognizer.reset();
      }
    } catch (error) {
      console.error("Error al procesar el cuadro de vídeo:", error);
    }

    // Continuar el bucle recursivamente en el siguiente ciclo de refresco del navegador
    animationFrameId = requestAnimationFrame(processFrame);
  };

  animationFrameId = requestAnimationFrame(processFrame);
}

/**
 * Detiene el bucle de animación y limpia el canvas de dibujo.
 */
function stopDetectionLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  ui.setHandDetected(false);
  ui.clearCanvas();
  if (recognizer) {
    recognizer.reset();
  }
}

/**
 * Detiene temporalmente el stream actual, rota la cámara frontal/trasera y reactiva la cámara.
 */
async function handleCameraSwitch() {
  // Deshabilitar botones durante la rotación de cámara
  ui.btn.disabled = true;
  ui.switchBtn.disabled = true;
  ui.switchBtn.classList.add("active"); // Estado visual temporal de carga

  try {
    // 1. Detener procesamiento en tiempo real
    stopDetectionLoop();

    // 2. Rotar el modo de cámara (user <-> environment)
    camera.switchFacingMode();

    // 3. Detener la cámara actual físicamente
    camera.stop();

    // 4. Iniciar la cámara con el nuevo modo
    await camera.start();

    // 5. Configurar interfaz para la nueva cámara y mirroring
    ui.setCameraActive(camera.facingMode);

    // 6. Reiniciar procesamiento en tiempo real
    startDetectionLoop();
  } catch (error) {
    console.error("Error al cambiar de cámara:", error);
    ui.setCameraError("unavailable");
  } finally {
    // Restaurar estado de botones
    ui.btn.disabled = false;
    ui.switchBtn.disabled = false;
    ui.switchBtn.classList.remove("active");
  }
}

// Iniciar la app al cargar el DOM completamente
document.addEventListener("DOMContentLoaded", init);

