# FlytBase Sentinel · Autonomous Aerial Intelligence

![FlytBase Sentinel Interface Prototype](src/assets/sentinel-map-overhaul.png)

## Overview

**FlytBase Sentinel** is a prototype of an autonomous drone intelligence orchestration platform, built over two weeks for a product design portfolio. 

The core premise of the system rests on **Human-in-the-Loop AI Collaboration**. Sentinel (powered by an underlying AI brain called **TALON**) rapidly processes multispectral drone telemetrics during emergency scenarios, formulating response plans. The role of the human operator is no longer to manually path-find drones, but to _authorize, override, and execute_ high-level, AI-generated strategies.

## 📖 In-Depth UX Case Study

For a comprehensive breakdown of the design decisions, interface architecture, and problem-solving journey that birthed this prototype, please read the full case study:

👉 **[Read the FlytBase Sentinel Case Study](https://rudrakshsingh.page/projects/sentinel/casestudy)**

## Key Prototype Features

- 🚁 **Autonomous Staging Flow**: Guided, linear progression from initial anomaly scanning to executing a full residential evacuation.
- 🎨 **Adaptive Density Architecture**: The interface strips away peripheral data intelligently as the situation escalates, shifting focus strictly to what the operator needs to make split-second safety commitments. 
- 🎙️ **Operator Overrides (`Voice-to-TALON`)**: Operators can override recommended response plans by issuing conversational voice corrections to the system in the `Action Brief` modals.
- 📉 **Degraded Modes**: Fully integrated UI handling for localized fail-states like drone signal loss or operational timeouts, preserving operator confidence even when data streams break down.

## Tech Stack

This prototype is a purely local graphical simulation representing the front-end user experience of the theoretical software.

- **Framework**: React + Vite (TypeScript)
- **Styling**: Vanilla CSS Modules with custom utility logic
- **Components**: Radix UI + Custom `sentinel` logic layers
- **Data**: Live-simulated mock payloads transitioning across 4 distinct operational modes (`Scan`, `Verify`, `Contain`, `Rescue`)

## Running Locally

To run this simulation environment locally and explore the UX flows:

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Navigate to `http://localhost:5173` (or the port specified by Vite) and click "Begin Scenario" to experience the interactive product simulation.

---

*Designed and Developed as a showcase piece by Rudra.*