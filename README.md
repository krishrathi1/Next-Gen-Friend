<div align="center">

<img src="assets/logo.png" alt="IRIS Logo" width="220" />

# IRIS: The Neural Forge
### Autonomous Operating System Layer & Intelligence Forge

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?style=for-the-badge)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-39.x-47848F.svg?style=for-the-badge)](https://www.electronjs.org/)

---

<img src="assets/hero_banner.png" alt="IRIS Dashboard" width="100%" />

</div>

## 🌌 Executive Philosophy

**IRIS** (Intelligent Real-time Integrated System) is a **Neural OS Layer**. It abstracts the traditional GUI into a **Neural Command Plane**, allowing high-level intent to be decomposed into deterministic system execution.

---

## 🏗️ Deep Architecture: The Multi-Process Core

<img src="assets/architecture_3d.png" alt="IRIS 3D Architecture" width="100%" />

### 1. Process Topology & Security
IRIS utilizes a **Multi-Process Architecture** to ensure that unprivileged UI code cannot directly execute system-level exploits.

```mermaid
graph TD
    subgraph "External World"
        AD[Active Directory]
        Net[Public Internet]
    end

    subgraph "Renderer Process (Unprivileged)"
        Dashboard[React Dashboard]
        Widgets[Floating Widgets]
        STT[WebSocket Audio Stream]
    end

    subgraph "Preload (Context Bridge)"
        API[Selective IPC Exposure]
        Sanitizer[Input Sanitization]
    end

    subgraph "Main Process (Privileged)"
        Kernel[OS API Access]
        Router[Neural Router / LLM]
        Vault[SafeStorage Vault]
        Scanner[File Crawler / ADB]
    end

    Dashboard -- "Secure Invoke" --> API
    API --> Sanitizer
    Sanitizer --> Router
    Router --> Kernel
    Router --> Vault
    Kernel --> AD
    Router --> Net
```

---

## 🔬 Neural Pipelines (System Low-Level)

### 2. Voice-First Command Routing
How IRIS transforms biological audio waves into deterministic computer code.

```mermaid
sequenceDiagram
    participant U as User (Biological)
    participant R as Renderer (React)
    participant M as Main (Electron)
    participant L as LLM (Gemini/Groq)
    participant OS as Operating System

    U->>R: Voice Command ("Open Spotify")
    R->>R: Web Audio Stream (PCM)
    R->>M: IPC: audio-buffer-push
    M->>L: Multimodal Ingestion (Frame + Audio)
    L-->>M: Thought: Launch Process (Spotify)
    M->>OS: spawn("Spotify.exe")
    OS-->>M: Process PID: 1240
    M-->>R: UI State: "System Online"
```

### 3. Vision-First Screen Ingestion (The Peeler)
IRIS captures and "understands" your desktop content every 2 seconds.

```mermaid
graph LR
    subgraph "Capture Loop"
        Src[desktopCapturer] --> Buffer[PNG Buffer]
        Buffer --> Sharp[Image Resizing]
    end

    subgraph "NLU Pipeline"
        Sharp --> OCR[Tesseract.js OCR]
        Sharp --> Vision[Gemini Pro Vision]
        OCR --> Text[Contextual Strings]
        Vision --> Objects[UI Element Mapping]
    end

    subgraph "Execution"
        Text --> LLM[Router]
        Objects --> Clicker[Coordinate Targeting]
    end
```

### 4. Mobile Telekinesis (ADB Protocol)
Direct remote control of connected Android devices via the Android Debug Bridge.

```mermaid
graph TD
    subgraph "System PC"
        IPC[Renderer Request] --> ADB[Main: ADB Client]
        ADB --> Shell[execAsync('adb shell')]
    end

    subgraph "Android Device"
        Shell --> Battery[dumpsys battery]
        Shell --> Notifs[notification --noredact]
        Shell --> Control[input tap/swipe]
    end

    Battery --> Telemetry[Telemetry UI]
    Notifs --> Alerts[Desktop Toast]
```

---

## 🧠 Local Memory & Hybrid RAG

IRIS maintains a **Neural Forge** of local knowledge that never leaves the machine.

```mermaid
graph TD
    subgraph "Indexing"
        Files[Local .md / .ts / .pdf] --> Embeds[Transformers.js]
        Embeds --> Vector[LanceDB Local Index]
    end

    subgraph "Retrieval Loop"
        Query[User Input] --> EmbedQuery[Vector Query]
        EmbedQuery --> DB{LanceDB}
        DB -- "Top K Matches" --> Context[RAG Prompt]
        Context --> LLM[Neural Response]
    end
```

---

## 🔒 Security & Vault Locking

IRIS uses a **Zero-Trust Lockdown Flow** to protect your API credentials.

```mermaid
graph LR
    subgraph "Storage"
        Disk[iris_secure_vault.json]
    end

    subgraph "Decryption"
        Main[Main Process] --> DPAPI[safeStorage / Keychain]
        DPAPI --> Key[In-Memory Key]
    end

    subgraph "Usage"
        Key --> Request[AI Provider Request]
        Request --> Network[HTTPS/TLS]
    end

    Disk --> Main
```

---

## 🛠️ Developer API Reference (Full IPC Table)

| Call Key | Payload Schema | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `index-folder` | `{ folderPath: string }` | `Promise<string>` | Vectorizes a directory. |
| `adb-tap` | `{ xPercent: number, yPercent: number }` | `Promise<{success}>` | Remote Android touch. |
| `run-terminal` | `{ command: string }` | `Promise<string>` | Kernel shell execution. |
| `hack-website` | `{ url: string, mode: string }` | `Promise<{success}>` | DOM Hijacking / Emerald Theme. |
| `secure-save-keys`| `{ groqKey, geminiKey }` | `Promise<{success}>` | Encrypted keychain write. |

---

## 🚀 Deployment & Installation

### Requirements
- **Hardware**: Windows (Primary), Android Device (Optional for Telekinesis).
- **Environment**: `adb` must be in system PATH.

### Full Setup
```bash
# Clone the Forge
git clone 
npm install
npm run dev
```

---

<div align="center">

### 🛡️ Disclaimer
IRIS possesses deep system privileges. High-level automation carries risk.

**Crafted by [Team WinHAiJi]**  
*Engineered for the next generation of biological-digital interaction.*

</div>
