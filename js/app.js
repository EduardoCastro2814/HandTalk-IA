/**
 * HandTalk IA - Orquestador Principal de la Aplicación
 * 
 * Este archivo inicializa y coordina los controladores de la cámara y de la
 * interfaz de usuario (UI), gestionando el flujo general de la aplicación.
 */

import { CameraController } from "./camera.js";
import { UIController } from "./ui.js";

// Instancias globales del controlador de interfaz y cámara
let ui;
let camera;

/**
 * Inicializa la aplicación, asocia eventos de escucha y establece el estado base.
 */
async function init() {
  ui = new UIController();
  
  // Registrar el controlador de la cámara apuntando al elemento de vídeo
  camera = new CameraController(ui.video);

  // Restablecer la interfaz a su estado predeterminado
  ui.setInitialState();

  // Escuchar el clic del botón de control para encender/detener la cámara
  ui.btn.addEventListener("click", handleCameraToggle);

  /* ========================================================================
     🔮 PUNTO DE INTEGRACIÓN FUTURA: CARGA DE MODELOS DE IA (TensorFlow.js / MediaPipe)
     ========================================================================
     En esta fase de inicialización es altamente recomendable cargar los modelos
     de IA en segundo plano de manera asíncrona para que estén listos cuando 
     el usuario decida encender la cámara.
     
     Pasos de implementación sugeridos:
     1. Importar las dependencias necesarias de MediaPipe Hands o TF.js
        mediante scripts CDN en index.html o imports si se usa bundler:
        import { Hands } from '@mediapipe/hands';
     2. Crear una variable global `let handsModel = null;`
     3. Llamar a una función de carga:
        
        async function loadAIModels() {
          ui.updateSubtitles("Cargando inteligencia artificial...");
          
          handsModel = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          });
          
          await handsModel.initialize();
          
          ui.updateSubtitles("IA Cargada. Lista para traducir.");
          setTimeout(() => ui.updateSubtitles(""), 3000);
        }
        
        loadAIModels();
     ======================================================================== */
}

/**
 * Maneja la lógica de encendido y apagado de la cámara al presionar el botón.
 */
async function handleCameraToggle() {
  // Desactivar temporalmente el botón durante la transición para evitar múltiples pulsaciones accidentales
  ui.btn.disabled = true;

  if (!camera.isActive) {
    try {
      // Intentar iniciar la cámara
      await camera.start();
      ui.setCameraActive();
      
      /* ========================================================================
         🔮 PUNTO DE INTEGRACIÓN FUTURA: CONECTAR LA CÁMARA CON EL CLASIFICADOR
         =======================================================================
         Una vez que la cámara tiene éxito al iniciar (camera.isActive === true):
         
         1. Iniciar la inferencia del modelo en vivo.
         2. Enviar las predicciones a la UI utilizando `ui.updateSubtitles(textoTraducido)`.
         
         Ejemplo:
         camera.startProcessing((landmarks) => {
             const palabra = classifer.predict(landmarks);
             ui.updateSubtitles(palabra);
         });
         ======================================================================== */
         
    } catch (error) {
      console.error("Error al acceder a la cámara:", error);
      
      // Clasificación de errores según especificaciones de la API del navegador
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        // El usuario denegó explícitamente el permiso de cámara
        ui.setCameraError("denied");
      } else {
        // Cámara dañada, desconectada, o utilizada por otra pestaña/aplicación
        ui.setCameraError("unavailable");
      }
    }
  } else {
    // Si la cámara ya estaba encendida, detenerla y restablecer la interfaz
    try {
      camera.stop();
      ui.setInitialState();
    } catch (error) {
      console.error("Error al detener la cámara:", error);
    }
  }

  // Volver a habilitar el botón después de procesar
  ui.btn.disabled = false;
}

// Iniciar la app al cargar el DOM completamente
document.addEventListener("DOMContentLoaded", init);
