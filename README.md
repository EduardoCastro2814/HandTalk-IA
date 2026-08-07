# HandTalk IA — Traducción de Lengua de Señas en Tiempo Real

**HandTalk IA** es una herramienta web estática diseñada para interpretar el lenguaje de señas mediante inteligencia artificial y convertirlo en subtítulos legibles en tiempo real. 

Esta primera versión (v0.1) se centra en establecer una base sólida y modular, una interfaz moderna y accesible para múltiples dispositivos (escritorio y móviles), y el acceso a la cámara mediante APIs web estándar.

---

## 🚀 Arquitectura del Proyecto

El proyecto está diseñado para funcionar como un sitio web estático tradicional, compatible con GitHub Pages sin necesidad de un backend de renderizado o base de datos. Para mantener la mantenibilidad a medida que crece el proyecto, el código JavaScript está modularizado mediante **ES6 Modules**.

La estructura de archivos es la siguiente:

```text
HandTalkIA/
│
├── index.html          # Estructura semántica, maquetado HTML5 y marcado ARIA.
├── README.md           # Documentación e instrucciones de integración.
│
├── styles/
│   └── main.css        # Estilos visuales del sistema (minimalista, responsivo, animaciones).
│
├── js/
│   ├── app.js          # Orquestador y punto de entrada de la aplicación.
│   ├── camera.js       # Manejo de hardware y flujos de vídeo (navigator.mediaDevices).
│   └── ui.js           # Renderizado de componentes en pantalla y gestión del DOM.
│
└── assets/
    └── logo.svg        # Logotipo tecnológico vectorizado ("Las manos hablan").
```

---

## 🎨 Diseño y Usabilidad

El diseño visual está inspirado en estéticas de marcas como **Apple, Stripe y Linear**:
- **Paleta de Colores**: Principal azul (#0F52BA) para destacar acciones clave; fondos neutros (#F8FAFC, #1F2937, #6B7280) que transmiten limpieza y modernidad.
- **Tipografía y Espaciado**: Generoso espacio en blanco, bordes muy redondeados (`12px` a `24px`), y micro-interacciones suaves en botones y transiciones de carga.
- **Accesibilidad (a11y)**: Marcado HTML semántico, uso de `aria-live` para subtítulos y actualizaciones de estado del sistema, navegación fluida mediante tabulación de teclado con indicadores de enfoque visualmente claros.

---

## 💻 Ejecución en Entorno Local

Debido a que el navegador restringe las solicitudes de módulos ES6 desde rutas del sistema local (`file://`), **debes servir los archivos a través de un servidor web local** para ejecutar el proyecto en tu máquina de desarrollo.

Puedes hacerlo de varias maneras sencillas:

### Opción A: Extensión de VS Code (Recomendado)
Instala la extensión **Live Server** de VS Code, abre la carpeta raíz de este proyecto y haz clic en **Go Live** en la esquina inferior derecha.

### Opción B: Usando Python
Si tienes Python instalado, ejecuta en tu terminal dentro del directorio del proyecto:
```bash
python -m http.server 8000
```
Luego abre `http://localhost:8000` en tu navegador.

### Opción C: Usando Node.js
Si tienes Node.js, ejecuta:
```bash
npx http-server .
```
o bien:
```bash
npx serve .
```

---

## 🧠 Hoja de Ruta para Integración de Inteligencia Artificial

Este código está estructurado estratégicamente para que la lógica de reconocimiento de señas se pueda implementar en fases posteriores sin reescribir la interfaz. A continuación se describe cómo realizar la integración de IA en los diferentes archivos:

### 1. Detección de Manos (`js/camera.js`)
Para procesar las imágenes de la cámara, en la versión 2.0 se puede integrar **MediaPipe Hands** o la biblioteca de detección de pose de **TensorFlow.js**.
- **Punto de integración**: En `camera.js`, dentro del stream activo del elemento `<video>`, se puede capturar cada cuadro mediante `requestAnimationFrame` o procesar el stream enviándolo a un canvas oculto.
- **Implementación**:
  ```javascript
  // Ejemplo futuro en js/camera.js
  async function processFrames(videoElement, onHandsDetected) {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    hands.onResults((results) => {
      // Envía las coordenadas de los nodos de la mano
      onHandsDetected(results.multiHandLandmarks);
    });
    
    // Bucle de procesamiento
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({image: videoElement});
      },
      width: 640,
      height: 480
    });
    camera.start();
  }
  ```

### 2. Clasificación de Lenguaje de Señas (`js/app.js`)
Una vez obtenidas las coordenadas tridimensionales de las manos (los 21 landmarks de MediaPipe), debes interpretarlas como señas específicas (letras, palabras o gestos completos).
- **Punto de integración**: En `app.js`, crear un procesador que traduzca las posiciones espaciales.
- **Tecnología**: Puedes importar un modelo personalizado de TensorFlow.js (`tf.model`) entrenado previamente, o bien utilizar algoritmos matemáticos sencillos de distancias entre nodos para letras estáticas (como la A, B, C en lengua de señas).
- **Implementación**:
  ```javascript
  // Ejemplo futuro en js/app.js
  function predictGesture(landmarks) {
    // 1. Preprocesar coordenadas (normalizar respecto a la muñeca)
    const inputTensor = preprocessLandmarks(landmarks);
    
    // 2. Ejecutar inferencia en el modelo cargado de TensorFlow.js
    const prediction = model.predict(inputTensor);
    const gestureId = prediction.argMax(-1).dataSync()[0];
    
    // 3. Traducir ID a texto
    const textResult = GESTURE_DICTIONARY[gestureId];
    
    // 4. Actualizar la interfaz
    UI.updateSubtitles(textResult);
  }
  ```

### 3. Sistema de Subtítulos Inteligentes (`js/ui.js`)
Para evitar el parpadeo en las palabras detectadas y hacer que los subtítulos parezcan fluidos:
- **Punto de integración**: En `ui.js`, crear una cola de palabras y un filtro de estabilización que mantenga el texto y agrupe palabras en oraciones utilizando modelos de lenguaje natural ligeros en cliente (o simplemente lógica de retraso temporal para formar frases).
