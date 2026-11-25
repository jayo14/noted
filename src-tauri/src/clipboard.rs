use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardItemPayload {
    pub content_type: String,
    pub content_text: String,
    pub content_html: Option<String>,
    pub image_path: Option<String>,
    pub image_width: Option<u32>,
    pub image_height: Option<u32>,
    pub content_hash: String,
}

pub struct ClipboardState {
    pub paused: Arc<AtomicBool>,
    pub ignore_hash: Arc<Mutex<Option<String>>>,
    pub images_dir: PathBuf,
}

impl ClipboardState {
    pub fn new(app: &AppHandle) -> Self {
        let app_data = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| std::env::temp_dir().join("noted"));
        let images_dir = app_data.join("clipboard_images");
        let _ = fs::create_dir_all(&images_dir);

        Self {
            paused: Arc::new(AtomicBool::new(false)),
            ignore_hash: Arc::new(Mutex::new(None)),
            images_dir,
        }
    }
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let result = hasher.finalize();
    result.iter().map(|b| format!("{:02x}", b)).collect()
}

fn save_rgba_as_png(
    images_dir: &Path,
    width: usize,
    height: usize,
    rgba_bytes: &[u8],
) -> Result<(String, String), String> {
    let mut hash_input = Vec::with_capacity(16 + rgba_bytes.len());
    hash_input.extend_from_slice(&(width as u64).to_le_bytes());
    hash_input.extend_from_slice(&(height as u64).to_le_bytes());
    hash_input.extend_from_slice(rgba_bytes);
    let hash = sha256_hex(&hash_input);

    let file_path = images_dir.join(format!("{}.png", hash));
    if !file_path.exists() {
        let img_buf: image::ImageBuffer<image::Rgba<u8>, Vec<u8>> =
            image::ImageBuffer::from_raw(width as u32, height as u32, rgba_bytes.to_vec())
                .ok_or_else(|| "Failed to build RGBA image buffer".to_string())?;
        img_buf
            .save_with_format(&file_path, image::ImageFormat::Png)
            .map_err(|e| format!("Failed to save clipboard PNG: {}", e))?;
    }

    Ok((file_path.to_string_lossy().to_string(), hash))
}

pub fn start_clipboard_watcher(app: AppHandle, state: &ClipboardState) {
    let paused = Arc::clone(&state.paused);
    let ignore_hash = Arc::clone(&state.ignore_hash);
    let images_dir = state.images_dir.clone();

    thread::spawn(move || {
        let mut last_hash = String::new();

        loop {
            thread::sleep(Duration::from_millis(450));

            if paused.load(Ordering::Relaxed) {
                continue;
            }

            let Ok(mut clipboard) = arboard::Clipboard::new() else {
                continue;
            };

            // 1. Check for image first (screenshots / copied images)
            if let Ok(img) = clipboard.get_image() {
                if img.width > 0 && img.height > 0 && !img.bytes.is_empty() {
                    if let Ok((path_str, hash)) =
                        save_rgba_as_png(&images_dir, img.width, img.height, &img.bytes)
                    {
                        if hash != last_hash {
                            let should_ignore = {
                                let mut guard = ignore_hash.lock().unwrap();
                                if guard.as_deref() == Some(hash.as_str()) {
                                    *guard = None;
                                    true
                                } else {
                                    false
                                }
                            };
                            last_hash = hash.clone();

                            if !should_ignore {
                                let payload = ClipboardItemPayload {
                                    content_type: "image".to_string(),
                                    content_text: format!("Image ({}x{})", img.width, img.height),
                                    content_html: None,
                                    image_path: Some(path_str),
                                    image_width: Some(img.width as u32),
                                    image_height: Some(img.height as u32),
                                    content_hash: hash,
                                };
                                let _ = app.emit("clipboard://new-item", payload);
                            }
                        }
                        continue;
                    }
                }
            }

            // 2. Check for text / rich HTML
            let text_opt = clipboard.get_text().ok().filter(|t| !t.trim().is_empty());
            let html_opt = clipboard
                .get()
                .html()
                .ok()
                .filter(|h| !h.trim().is_empty());

            if let Some(text) = text_opt {
                let hash = if let Some(ref html) = html_opt {
                    sha256_hex(format!("html:{}:{}", text, html).as_bytes())
                } else {
                    sha256_hex(format!("text:{}", text).as_bytes())
                };

                if hash != last_hash {
                    let should_ignore = {
                        let mut guard = ignore_hash.lock().unwrap();
                        if guard.as_deref() == Some(hash.as_str()) {
                            *guard = None;
                            true
                        } else {
                            false
                        }
                    };
                    last_hash = hash.clone();

                    if !should_ignore {
                        let content_type = if html_opt.is_some() { "html" } else { "text" };
                        let payload = ClipboardItemPayload {
                            content_type: content_type.to_string(),
                            content_text: text,
                            content_html: html_opt,
                            image_path: None,
                            image_width: None,
                            image_height: None,
                            content_hash: hash,
                        };
                        let _ = app.emit("clipboard://new-item", payload);
                    }
                }
            }
        }
    });
}

#[tauri::command]
pub fn is_linux_clipboard_supported() -> bool {
    true
}

#[tauri::command]
pub fn clipboard_set_paused(
    app: AppHandle,
    state: State<'_, ClipboardState>,
    paused: bool,
) -> bool {
    state.paused.store(paused, Ordering::Relaxed);
    let _ = app.emit("clipboard://paused-changed", paused);
    paused
}

#[tauri::command]
pub fn clipboard_is_paused(state: State<'_, ClipboardState>) -> bool {
    state.paused.load(Ordering::Relaxed)
}

#[tauri::command]
pub fn clipboard_write_item(
    state: State<'_, ClipboardState>,
    content_type: String,
    content_text: String,
    content_html: Option<String>,
    image_path: Option<String>,
) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|e| format!("Clipboard unavailable: {}", e))?;

    if content_type == "image" {
        let path = image_path.ok_or_else(|| "Missing image path".to_string())?;
        let dyn_img =
            image::open(&path).map_err(|e| format!("Failed to open clipboard image: {}", e))?;
        let rgba = dyn_img.to_rgba8();
        let (w, h) = rgba.dimensions();
        let raw = rgba.into_raw();

        let mut hash_input = Vec::with_capacity(16 + raw.len());
        hash_input.extend_from_slice(&(w as u64).to_le_bytes());
        hash_input.extend_from_slice(&(h as u64).to_le_bytes());
        hash_input.extend_from_slice(&raw);
        let hash = sha256_hex(&hash_input);
        *state.ignore_hash.lock().unwrap() = Some(hash);

        clipboard
            .set_image(arboard::ImageData {
                width: w as usize,
                height: h as usize,
                bytes: std::borrow::Cow::Owned(raw),
            })
            .map_err(|e| format!("Failed to write image to clipboard: {}", e))?;
        return Ok(());
    }

    if content_type == "html" {
        if let Some(ref html) = content_html {
            let hash = sha256_hex(format!("html:{}:{}", content_text, html).as_bytes());
            *state.ignore_hash.lock().unwrap() = Some(hash);
            clipboard
                .set_html(html, Some(&content_text))
                .map_err(|e| format!("Failed to write HTML to clipboard: {}", e))?;
            return Ok(());
        }
    }

    let hash = sha256_hex(format!("text:{}", content_text).as_bytes());
    *state.ignore_hash.lock().unwrap() = Some(hash);
    clipboard
        .set_text(content_text)
        .map_err(|e| format!("Failed to write text to clipboard: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn clipboard_delete_image(image_path: String) -> Result<(), String> {
    let path = PathBuf::from(&image_path);
    if path.exists() {
        fs::remove_file(path).map_err(|e| format!("Failed to delete clipboard image: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn clipboard_clear_images(
    state: State<'_, ClipboardState>,
    keep_paths: Vec<String>,
) -> Result<(), String> {
    let keep_set: HashSet<String> = keep_paths.into_iter().collect();
    if let Ok(entries) = fs::read_dir(&state.images_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let path_str = path.to_string_lossy().to_string();
            if !keep_set.contains(&path_str) {
                let _ = fs::remove_file(path);
            }
        }
    }
    Ok(())
}
