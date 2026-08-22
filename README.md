# WebM Video Creator for GitHub Pages

A mobile-friendly slideshow creator that runs in the browser using FFmpeg WebAssembly. Photos are processed on the device and are not uploaded by this project.

## Publish from an iPhone

1. Create a **public** GitHub repository, such as `webm-creator`.
2. Extract this ZIP in the iPhone Files app.
3. In the repository, choose **Add file** and upload all five project files to the repository root.
4. Commit the files to the `main` branch.
5. Open the repository in a browser and go to **Settings > Pages**.
6. Under **Build and deployment**, select **Deploy from a branch**.
7. Select the `main` branch and `/ (root)`, then save.
8. After GitHub publishes the site, open the Pages address shown in Settings > Pages.

The main page must remain named `index.html`.

## Files

- `index.html` - app interface
- `style.css` - mobile styling
- `app.js` - photo preparation and WebM rendering
- `manifest.json` - installable web app metadata
- `service-worker.js` - caches the local app shell

## iPhone tips

- Start with 480p or 720p and a small number of photos.
- JPG, PNG, and WebP images are supported by the file picker.
- Keep the page open while rendering.
- The FFmpeg engine is downloaded from a CDN when first needed, so an internet connection is required for the first render.
- If a render fails, reduce the number of photos or choose 480p.

## Technology

This project uses `@ffmpeg/ffmpeg`, `@ffmpeg/util`, and the single-thread FFmpeg core loaded from public CDNs. No backend or paid hosting is required for the project itself.

## License

MIT
