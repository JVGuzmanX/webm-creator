import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.15";
import { toBlobURL } from "https://esm.sh/@ffmpeg/util@0.12.2";

const imageInput = document.querySelector("#image-input");
const fileName = document.querySelector("#file-name");
const convertButton = document.querySelector("#convert");
const status = document.querySelector("#status");
const logs = document.querySelector("#logs");
const resultPanel = document.querySelector("#result-panel");
const result = document.querySelector("#result");
const download = document.querySelector("#download");
let ffmpeg;
let outputURL;

function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`;
}

function addLog(message) {
    logs.hidden = false;
    logs.textContent += `${message}\n`;
    logs.scrollTop = logs.scrollHeight;
}

function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

async function imageAsJpeg(file) {
    const image = await createImageBitmap(file);
    const originalWidth = image.width;
    const originalHeight = image.height;
    const longestSide = Math.max(originalWidth, originalHeight);
    const scale = Math.min(1, 1280 / longestSide);
    const width = Math.max(2, Math.floor(originalWidth * scale / 2) * 2);
    const height = Math.max(2, Math.floor(originalHeight * scale / 2) * 2);
    addLog(`Image dimensions: ${originalWidth}x${originalHeight} → ${width}x${height}`);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(image, 0, 0, width, height);
    image.close();
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error("The browser could not encode the image.")), "image/jpeg", 0.92);
    });
    return new Uint8Array(await blob.arrayBuffer());
}

async function loadFFmpeg() {
    if (ffmpeg) return;
    const instance = new FFmpeg();
    const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
    const classWorkerURL = new URL("./worker.js", import.meta.url).href;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    instance.on("log", ({ message }) => addLog(message));
    instance.on("progress", ({ progress }) => {
        status.textContent = `Loading or converting: ${Math.round(progress * 100)}%`;
    });
    try {
        setStatus("Loading FFmpeg single-thread core (about 30 MB)…");
        await instance.load({
            classWorkerURL,
            coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm")
        }, { signal: controller.signal });
        ffmpeg = instance;
    } catch (error) {
        instance.terminate();
        if (controller.signal.aborted) {
            throw new Error("FFmpeg did not finish loading within 30 seconds. Check that worker.js, const.js, and errors.js are deployed under /v2/.");
        }
        throw new Error(`FFmpeg failed to load: ${getErrorMessage(error)}`);
    } finally {
        clearTimeout(timeoutId);
    }
}

imageInput.addEventListener("change", () => {
    const [file] = imageInput.files;
    convertButton.disabled = !file;
    fileName.textContent = file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "No image selected.";
    resultPanel.hidden = true;
    setStatus(file ? "Ready to convert." : "Ready.");
    logs.hidden = true;
    logs.textContent = "";
});

convertButton.addEventListener("click", async () => {
    const [file] = imageInput.files;
    if (!file) return;
    convertButton.disabled = true;
    resultPanel.hidden = true;
    logs.hidden = true;
    logs.textContent = "";
    try {
        await loadFFmpeg();
        setStatus("Preparing image…");
        await ffmpeg.writeFile("input.jpg", await imageAsJpeg(file));
        addLog("Running: -loop 1 -i input.jpg -t 2 -r 30 -c:v libvpx -threads 1 -pix_fmt yuv420p -an output.webm");
        setStatus("Converting image to a 2-second WebM…");
        await ffmpeg.exec(["-loop", "1", "-i", "input.jpg", "-t", "2", "-r", "30", "-c:v", "libvpx", "-threads", "1", "-pix_fmt", "yuv420p", "-an", "output.webm"]);
        const data = await ffmpeg.readFile("output.webm");
        if (outputURL) URL.revokeObjectURL(outputURL);
        outputURL = URL.createObjectURL(new Blob([data.buffer], { type: "video/webm" }));
        result.src = outputURL;
        download.href = outputURL;
        resultPanel.hidden = false;
        setStatus("Success. Your 2-second WebM is ready.", "success");
    } catch (error) {
        console.error(error);
        setStatus(`Conversion failed: ${getErrorMessage(error)}`, "error");
    } finally {
        convertButton.disabled = false;
    }
});
