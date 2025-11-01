import * as Blockly from "blockly";
import * as BlocklyJS from "blockly/javascript";
import { minify } from "terser";

import {
  getProject,
  BASE_WIDTH,
  BASE_HEIGHT,
  resizeCanvas,
  calculateBubblePosition,
} from "../scripts/editor";
import { runCodeWithFunctions } from "./runCode";
import { promiseWithAbort } from "./utils";
import { createThreadSystem } from "./threads";

async function minifyScript(code) {
  const RESERVED_GLOBALS = [
    "PIXI",
    "PIXIJS",
    "Blockly",
    "BlocklyJS",
    "PROJECT",
    "window",
    "document",
    "fetch",
    "btoa",
    "atob",
    "JSON",
    "Promise",
    "Array",
    "Map",
    "Set",
    "Audio",
    "Image",
    "console",
    "XMLHttpRequest",
  ];

  const result = await minify(code, {
    ecma: 2018,
    compress: {
      passes: 3,
      drop_console: true,
      drop_debugger: true,
      reduce_funcs: true,
      dead_code: true,
      unused: true,
      unsafe: false,
    },
    mangle: {
      toplevel: false,
      properties: false,
      reserved: RESERVED_GLOBALS,
    },
    format: {
      comments: false,
      beautify: false,
      inline_script: true,
    },
    keep_fnames: false,
    keep_classnames: false,
  });

  return result.code;
}

export async function generateStandaloneHTML() {
  async function fetchSvgDataURL(path) {
    const svgText = await (await fetch(path)).text();
    const base64 = btoa(svgText);
    return `data:image/svg+xml;base64,${base64}`;
  }

  const project = getProject();
  project.sprites.forEach((sprite) => {
    const tempWorkspace = new Blockly.Workspace();
    BlocklyJS.javascriptGenerator.init(tempWorkspace);

    const xmlText =
      sprite.code ||
      '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
    const xmlDom = Blockly.utils.xml.textToDom(xmlText);
    Blockly.Xml.domToWorkspace(xmlDom, tempWorkspace);

    sprite.code = BlocklyJS.javascriptGenerator.workspaceToCode(tempWorkspace);
    tempWorkspace.dispose();
  });

  const pixiMinJs = await (
    await fetch(
      "https://cdn.jsdelivr.net/npm/pixi.js-legacy@7.4.3/dist/pixi-legacy.min.js"
    )
  ).text();

  const scriptContent = await minifyScript(`
  (async function () {
    const PROJECT = ${JSON.stringify(project)};
    const stageContainer = document.getElementById("stage");
    const wrapper = document.getElementById("stage-wrapper");
    const fullscreenButton = document.getElementById("fullscreen-button");
    const keysPressed = {};
    const mouseButtonsPressed = {};
    const playingSounds = new Map();
    const flagEvents = [];
    const runningScripts = [];
    let currentRunId = 0;
    let currentRunController = null;
    window.shouldStop = false;
    const BASE_WIDTH = ${BASE_WIDTH};
    const BASE_HEIGHT = ${BASE_HEIGHT};
    const app = new PIXI.Application({
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      backgroundColor: 0xffffff,
      powerPreference: "high-performance",
    });
    app.stageWidth = BASE_WIDTH;
    app.stageHeight = BASE_HEIGHT;
    ${resizeCanvas.toString()}
    resizeCanvas();
    window.addEventListener("resize", () => {resizeCanvas()});
    const allowedKeys = new Set([
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      " ",
      "Enter",
      "Escape",
      ..."abcdefghijklmnopqrstuvwxyz0123456789",
      ..."abcdefghijklmnopqrstuvwxyz".toUpperCase(),
    ]);
    window.addEventListener("keydown", (e) => {
      const key = e.key;
      if (allowedKeys.has(key)) {
        keysPressed[key] = true;
      }
    });
    window.addEventListener("keyup", (e) => {
      const key = e.key;
      if (allowedKeys.has(key)) {
        keysPressed[key] = false;
      }
    });
    window.addEventListener("blur", () => {
      for (const key in keysPressed) {
        keysPressed[key] = false;
      }
    });
    window.addEventListener("mousedown", (e) => {
      mouseButtonsPressed[e.button] = true;
    });
    window.addEventListener("mouseup", (e) => {
      mouseButtonsPressed[e.button] = false;
    });
    stageContainer.appendChild(app.view);
    const penGraphics = new PIXI.Graphics();
    penGraphics.clear();
    app.stage.addChildAt(penGraphics, 0);
    const sprites = [];
    if (PROJECT.variables) window.projectVariables = PROJECT.variables;
    PROJECT.sprites.forEach((entry, i) => {
      if (!entry || typeof entry !== "object") return;
      const spriteData = {
        id: entry.id || \`sprite-\${i}\`,
        code: entry.code || "",
        costumes: [],
        sounds: [],
        data: {
          x: entry?.data?.x ?? 0,
          y: entry?.data?.y ?? 0,
          scale: {
            x: entry?.data?.scale?.x ?? 1,
            y: entry?.data?.scale?.y ?? 1,
          },
          angle: entry?.data?.angle ?? 0,
          rotation: entry?.data?.rotation ?? 0,
          currentCostume: entry?.data?.currentCostume,
        },
      };
      if (Array.isArray(entry.costumes)) {
        entry.costumes.forEach((c) => {
          if (!c?.data || !c.name) return;
          try {
            const texture = PIXI.Texture.from(c.data);
            spriteData.costumes.push({ name: c.name, texture });
          } catch (err) {
            console.warn(\`Failed to load costume: \${c.name}\`, err);
          }
        });
      }
      if (Array.isArray(entry.sounds)) {
        entry.sounds.forEach((s) => {
          if (!s?.name || !s?.data) return;
          spriteData.sounds.push({ name: s.name, dataURL: s.data });
        });
      }
      let sprite;
      if (spriteData.costumes.length > 0) {
        sprite = new PIXI.Sprite(spriteData.costumes[0].texture);
      } else {
        sprite = new PIXI.Sprite();
      }
      sprite.anchor.set(0.5);
      sprite.x = spriteData.data.x;
      sprite.y = spriteData.data.y;
      sprite.scale.x = spriteData.data.scale.x;
      sprite.scale.y = spriteData.data.scale.y;
      if (entry?.data?.angle !== null) sprite.angle = spriteData.data.angle;
      else sprite.rotation = spriteData.data.rotation;
      const cc = spriteData.data.currentCostume;
      if (typeof cc === "number" && spriteData.costumes[cc]) {
        sprite.texture = spriteData.costumes[cc].texture;
      }
      spriteData.pixiSprite = sprite;
      spriteData.pixiSprite.scale._parentScaleEvent = sprite;
      app.stage.addChild(sprite);
      sprites.push(spriteData);
    });
    const Thread = (${createThreadSystem.toString()})();
    ${calculateBubblePosition.toString()}
    ${promiseWithAbort.toString()}
    function stopAllScripts() {
      window.shouldStop = true;
    
      if (currentRunController) {
        try {
          currentRunController.abort();
        } catch (e) {}
        currentRunController = null;
      }
      currentRunId++;
    
      runningScripts.forEach((i) => {
        if (i.type === "timeout") clearTimeout(i.id);
        else if (i.type === "interval") clearInterval(i.id);
        else if (i.type === "raf") cancelAnimationFrame(i.id);
      });
      runningScripts.length = 0;
    
      flagEvents.length = 0;
    
      Object.keys(keysPressed).forEach((k) => delete keysPressed[k]);
      Object.keys(mouseButtonsPressed).forEach(
        (k) => delete mouseButtonsPressed[k]
      );
    
      sprites.forEach((spriteData) => {
        if (spriteData.currentBubble) {
          try {
            app.stage.removeChild(spriteData.currentBubble);
          } catch (e) {}
          spriteData.currentBubble = null;
        }
        if (spriteData.sayTimeout != null) {
          clearTimeout(spriteData.sayTimeout);
          spriteData.sayTimeout = null;
        }
      });
    
      for (const spriteSounds of playingSounds.values()) {
        for (const audio of spriteSounds.values()) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
      playingSounds.clear();
    }
    ${runCodeWithFunctions.toString()}
    async function runCode() {
      console.log('oops');
      stopAllScripts();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const controller = new AbortController();
      const signal = controller.signal;
      currentRunController = controller;
      let projectStartedTime = Date.now();
      let thisRun = Number(currentRunId);
      sprites.forEach((spriteData) => {
        window.shouldStop = false;
        const code = spriteData.code;
        try {
          runCodeWithFunctions({code,thisRun,currentRunId,projectStartedTime,spriteData,app,flagEvents,mouseButtonsPressed,keysPressed,playingSounds,runningScripts,promiseWithAbort,signal,PIXI,runningScripts,penGraphics});
        } catch (e) {
          console.error(\`Error processing code for sprite \${spriteData.id}:\`, e);
        }
      });
      const eventsForThisRun = flagEvents.filter((e) => e.runId === thisRun);
      for (const e of eventsForThisRun) {
        const idx = flagEvents.indexOf(e);
        if (idx !== -1) flagEvents.splice(idx, 1);
      }
      Promise.allSettled(
        eventsForThisRun.map((entry) => promiseWithAbort(entry.cb, signal))
      ).then((results) => {
        results.forEach((res) => {
          if (res.status === "rejected") {
            const e = res.reason;
            if (e?.message === "shouldStop") return;
            console.error(\`Error running flag event:\`, e);
          }
        });
      });
    }
    document.getElementById("run-button").addEventListener("click", runCode);
    document.getElementById("stop-button").addEventListener("click", stopAllScripts);
  })();`);

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Project - Rarry</title>
    <style>
      :root {--dark: #e2e8f0;--dark-light: #c8cdd4;--primary: #3b82f6;--primary-dark: #336ce7;--danger: #f63b3b;--danger-dark: #dd3434;--color1: #262d36;--color2: #2f3741;--color3: #3d4552;--color4: #464f5e;}
      button {font-family: var(--font);font-size: medium;font-weight: 700;padding: 0.5rem 0.9rem;border-radius: 0.5rem;border: none;background-color: var(--dark);color: var(--color1);cursor: pointer;transition: background-color 0.2s;}
      button:hover {background-color: var(--dark-light);}
      #stage-wrapper {position: relative;width: 100%;padding-top: 56.25%;}
      #stage-div {display: flex;flex-direction: column;justify-content: center;position: fixed;top: 0;left: 0;width: 100vw;height: 100vh;margin: 0;padding: 0;z-index: 9999;           background: var(--color1);}
      #stage canvas {position: absolute;top: 0;left: 0;width: 100%;height: 100%;}
      #stage-controls {background-color: var(--color1);padding: 0.5rem;border-bottom: 2px solid var(--color3);display: flex;justify-content: center;gap: 1rem;}
      #stage-controls button {padding: 0.5rem;width: 2.5rem;height: 2.5rem;border-radius: 25%;background-color: var(--color2);transition: background-color 0.2s;}
      #stage-controls button:hover {background-color: var(--color3);}
      #stage-controls button img {width: 100%;height: 100%;}
    </style>
    <script>
      ${pixiMinJs}
    </script>
  </head>
  <body>
    <div id="stage-div">
      <div id="stage-controls">
        <button id="run-button">
          <img src="${await fetchSvgDataURL("icons/flag.svg")}">
        </button>
        <button id="stop-button">
          <img src="${await fetchSvgDataURL("icons/stop.svg")}">
        </button>
      </div>
      <div id="stage-wrapper">
        <div id="stage"></div>
      </div>
    </div>
  
    <script>
      ${scriptContent}
    </script>
  </body>
  </html>`;
}

export async function downloadStandaloneHTML(filename = "rarryProject") {
  try {
    const html = await generateStandaloneHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".html";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export failed:", err);
    alert("Export failed (see console).");
  }
}
