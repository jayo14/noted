#[cfg(target_os = "linux")]
mod clipboard;

#[cfg(not(target_os = "linux"))]
#[tauri::command]
fn is_linux_clipboard_supported() -> bool {
    false
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(target_os = "linux")]
fn show_and_focus_main(app: &tauri::AppHandle, open_clipboard: bool) {
    use tauri::{Emitter, Manager};
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
    if open_clipboard {
        let _ = app.emit("clipboard://open-view", ());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        use tauri::Manager;
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }));

    #[cfg(target_os = "linux")]
    let builder = {
        use std::sync::atomic::Ordering;
        use tauri::menu::{Menu, MenuItem};
        use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
        use tauri::{Manager, WindowEvent};
        use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

        builder
            .plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(|app, shortcut, event| {
                        if event.state() == ShortcutState::Pressed
                            && shortcut.matches(Modifiers::SUPER, Code::KeyV)
                        {
                            show_and_focus_main(app, true);
                        }
                    })
                    .build(),
            )
            .setup(|app| {
                let handle = app.handle().clone();
                let cb_state = clipboard::ClipboardState::new(&handle);
                clipboard::start_clipboard_watcher(handle.clone(), &cb_state);
                app.manage(cb_state);

                // Register Super+V global shortcut (gracefully log if compositor reserves it)
                let super_v = Shortcut::new(Some(Modifiers::SUPER), Code::KeyV);
                if let Err(err) = app.global_shortcut().register(super_v) {
                    eprintln!("[Noted] Could not register Super+V global shortcut: {}", err);
                }

                // Build Linux System Tray menu
                let open_clipboard_item =
                    MenuItem::with_id(app, "open_clipboard", "Open Clipboard", true, None::<&str>)?;
                let open_noted_item =
                    MenuItem::with_id(app, "open_noted", "Open Noted", true, None::<&str>)?;
                let toggle_pause_item = MenuItem::with_id(
                    app,
                    "toggle_pause",
                    "Pause Clipboard Capture",
                    true,
                    None::<&str>,
                )?;
                let quit_item = MenuItem::with_id(app, "quit", "Quit Noted", true, None::<&str>)?;

                let menu = Menu::with_items(
                    app,
                    &[
                        &open_clipboard_item,
                        &open_noted_item,
                        &toggle_pause_item,
                        &quit_item,
                    ],
                )?;

                let icon = app
                    .default_window_icon()
                    .cloned()
                    .unwrap_or_else(|| {
                        tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))
                            .expect("valid tray icon")
                    });

                let pause_item_clone = toggle_pause_item.clone();
                TrayIconBuilder::with_id("noted-tray")
                    .icon(icon)
                    .tooltip("Noted — Clipboard & Notes")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(move |app, event| match event.id.as_ref() {
                        "open_clipboard" => show_and_focus_main(app, true),
                        "open_noted" => show_and_focus_main(app, false),
                        "toggle_pause" => {
                            let state = app.state::<clipboard::ClipboardState>();
                            let next = !state.paused.load(Ordering::Relaxed);
                            state.paused.store(next, Ordering::Relaxed);
                            let label = if next {
                                "Resume Clipboard Capture"
                            } else {
                                "Pause Clipboard Capture"
                            };
                            let _ = pause_item_clone.set_text(label);
                            use tauri::Emitter;
                            let _ = app.emit("clipboard://paused-changed", next);
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            show_and_focus_main(tray.app_handle(), false);
                        }
                    })
                    .build(app)?;

                Ok(())
            })
            .on_window_event(|window, event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    if window.label() == "main" {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
            })
            .invoke_handler(tauri::generate_handler![
                greet,
                clipboard::is_linux_clipboard_supported,
                clipboard::clipboard_set_paused,
                clipboard::clipboard_is_paused,
                clipboard::clipboard_write_item,
                clipboard::clipboard_delete_image,
                clipboard::clipboard_clear_images,
            ])
    };

    #[cfg(not(target_os = "linux"))]
    let builder = builder.invoke_handler(tauri::generate_handler![
        greet,
        is_linux_clipboard_supported,
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
