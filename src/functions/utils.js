import * as Blockly from "blockly";

let currentPopup;

export function showNotification({
  message = "",
  duration = 5000,
  closable = true,
}) {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.innerHTML = `
    ${message}
    ${closable
      ? '<button class="notification-close"><i class="fa-solid fa-xmark"></i></button>'
      : ""
    }
  `;

  let container = document.querySelector(".notification-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  container.appendChild(notification);

  function hide() {
    notification.classList.add("hide");
    setTimeout(() => notification.remove(), 300);
  }

  if (closable) {
    notification
      .querySelector(".notification-close")
      ?.addEventListener("click", hide);
  }

  setTimeout(hide, duration);

  return notification;
}

export function showPopup({
  innerHTML = "",
  title = "",
  rows = [],
  noAnimation = false,
}) {
  const popup = document.createElement("div");
  popup.className = "popup";
  if (noAnimation) popup.classList.add("no-animation");

  if (currentPopup) currentPopup.remove();
  currentPopup = popup;

  const rowsHTML = rows
    .map((row, rowIndex) => {
      const rowHTML = row
        .map((item, colIndex) => {
          if (typeof item === "string") {
            if (item === "") return;
            return `<span class="popup-label">${item}</span>`;
          }

          switch (item.type) {
            case "custom":
              return item.html || "";
            case "button":
              return `<button
                class="${item.className || ""}"
                data-row="${rowIndex}" data-col="${colIndex}"
                ${item.disabled ? "disabled" : ""}
              >${item.label}</button>`;
            case "input":
              return `<input
                type="${item.inputType || "text"}" 
                placeholder="${item.placeholder || ""}"
                value="${item.value || ""}" 
                class="${item.className || ""}"
                data-row="${rowIndex}" data-col="${colIndex}"
              />`;
            case "checkbox":
              return `<input
                type="checkbox"
                class="${item.className || ""}"
                data-row="${rowIndex}" data-col="${colIndex}"
                ${item.checked ? "checked" : ""}
              />`;
            case "textarea":
              return `<textarea
                placeholder="${item.placeholder || ""}"
                rows="${item.rows || 3}"
                cols="${item.cols || 30}"
                class="${item.className || ""}"
                data-row="${rowIndex}" data-col="${colIndex}"
              >${item.value || ""}</textarea>`;
            case "label":
              return `<span class="popup-label">${item.text}</span>`;
            case "menu":
              return `<select
                class="${item.className || ""}"
                data-row="${rowIndex}" data-col="${colIndex}"
              >
                ${item.options
                  .map(
                    opt =>
                      `<option value="${opt.value}" ${opt.value === item.value ? "selected" : ""
                      }>${opt.label}</option>`
                  )
                  .join("")}
              </select>`;
            case "color":
              return `<input
    type="color"
    value="${item.value || "#ffffff"}"
    class="${item.className || ""}"
    data-row="${rowIndex}" data-col="${colIndex}"
  />`;
            default:
              return "";
          }
        })
        .join("");
      return `<div class="popup-row">${rowHTML}</div>`;
    })
    .join("");

  popup.innerHTML = `
    <div class="popup-content">
      <header>
        <h2>${title}</h2>
        <button class="popup-close danger">
          <i class="fa-solid fa-xmark stay"></i>
        </button>
      </header>
      <div class="popup-body">
        ${rowsHTML}
        ${innerHTML}
      </div>
    </div>`;

  document.body.appendChild(popup);

  popup.querySelector(".popup-close").addEventListener("click", () => {
    currentPopup = null;
    popup.remove();
  });

  rows.forEach((row, rowIndex) => {
    row.forEach((item, colIndex) => {
      const el = popup.querySelector(
        `[data-row="${rowIndex}"][data-col="${colIndex}"]`
      );
      if (!el) return;

      if (item.type === "button" && item.onClick) {
        el.addEventListener("click", () => item.onClick(popup));
      }
      if (item.type === "input" && item.onInput) {
        el.addEventListener("input", e => item.onInput(e.target.value, popup));
      }
      if (item.type === "checkbox" && item.onChange) {
        el.addEventListener("change", e =>
          item.onChange(e.target.checked, popup)
        );
      }
      if (item.type === "textarea" && item.onInput) {
        el.addEventListener("input", e => item.onInput(e.target.value, popup));
      }
      if (item.type === "menu" && item.onChange) {
        el.addEventListener("change", e =>
          item.onChange(e.target.value, popup)
        );
      }
      if (item.type === "color" && item.onChange) {
        el.addEventListener("input", e => item.onChange(e.target.value, popup));
      }
    });
  });

  return popup;
}

export function promiseWithAbort(promiseOrFn, signal) {
  try {
    const p = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
    if (!(p instanceof Promise)) return Promise.resolve(p);

    if (signal.aborted) return Promise.reject(new Error("shouldStop"));

    return Promise.race([
      p,
      new Promise((_, rej) => {
        signal.addEventListener("abort", () => rej(new Error("shouldStop")), {
          once: true,
        });
      }),
    ]);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function encodeOggWithMediaRecorder(dataURL) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const base64 = dataURL.split(",")[1];
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const buffer = await audioCtx.decodeAudioData(raw.buffer);

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;

  const dest = audioCtx.createMediaStreamDestination();
  src.connect(dest);

  const recorder = new MediaRecorder(dest.stream, {
    mimeType: "audio/ogg",
  });

  const chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);

  return new Promise(resolve => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/ogg" });
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    };

    recorder.start();
    src.start();
    src.onended = () => recorder.stop();
  });
}

export async function compressAudio(dataURL) {
  if (window.MediaRecorder && MediaRecorder.isTypeSupported("audio/ogg")) {
    try {
      return await encodeOggWithMediaRecorder(dataURL);
    } catch (e) {
      console.warn("OGG recording failed, falling back:", e);
    }
  }

  return dataURL;
}

export async function compressImage(dataURL) {
  if (!dataURL || typeof dataURL !== "string") return null;
  if (dataURL.startsWith("data:image/webp")) return dataURL;

  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/webp", 0.9));
    };
    img.src = dataURL;
  });
}

export class DuplicateOnDragWithType {
  constructor(block, outputTypes = null) {
    this.block = block;
    this.outputTypes = outputTypes;
  }

  isMovable() {
    return true;
  }

  startDrag(e) {
    const ws = this.block.workspace;
    const data = this.block.toCopyData();

    data.blockState = {
      ...(data.blockState ?? {}),
      type: this.block.type,
    };

    if (this.block.saveExtraState) {
      data.blockState.extraState = this.block.saveExtraState();
    }

    this.copy = Blockly.clipboard.paste(data, ws);
    this.copy.setShadow(false);
    if (this.outputTypes && this.copy.outputConnection) {
      this.copy.setOutput(true, this.outputTypes);
    }
    this.baseStrat = new Blockly.dragging.BlockDragStrategy(this.copy);
    this.copy.setDragStrategy(this.baseStrat);
    this.baseStrat.startDrag(e);
  }

  drag(e) {
    this.block.workspace
      .getGesture(e)
      .getCurrentDragger()
      .setDraggable(this.copy);
    this.baseStrat.drag(e);
  }

  endDrag(e) {
    this.baseStrat?.endDrag(e);
  }

  revertDrag(e) {
    this.copy?.dispose();
  }
}

export const tweenEasing = {
  InLinear: (t) => t,
  OutLinear: (t) => t,
  InOutLinear: (t) => t,
  InSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  OutSine: (t) => Math.sin((t * Math.PI) / 2),
  InOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  InQuad: (t) => t * t,
  OutQuad: (t) => 1 - (1 - t) * (1 - t),
  InOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  InCubic: (t) => t * t * t,
  OutCubic: (t) => 1 - Math.pow(1 - t, 3),
  InOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  InQuart: (t) => t * t * t * t,
  OutQuart: (t) => 1 - Math.pow(1 - t, 4),
  InOutQuart: (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  InQuint: (t) => t * t * t * t * t,
  OutQuint: (t) => 1 - Math.pow(1 - t, 5),
  InOutQuint: (t) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  InExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  OutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  InOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  InCirc: (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  OutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  InOutCirc: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  InBack: (t) => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  OutBack: (t) => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  InOutBack: (t) => {
    const c1 = 1.70158,
      c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (2 * t - 2) + c2) + 2) / 2;
  },
  InElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  OutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  InOutElastic: (t) => {
    const c5 = (2 * Math.PI) / 4.5;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
  InBounce: (t) => 1 - tweenEasing.OutBounce(1 - t),
  OutBounce: (t) => {
    const n1 = 7.5625,
      d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  InOutBounce: (t) =>
    t < 0.5
      ? (1 - tweenEasing.OutBounce(1 - 2 * t)) / 2
      : (1 + tweenEasing.OutBounce(2 * t - 1)) / 2,
};
