use std::fs;
use std::path::Path;

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

fn get_template_base_dir() -> std::path::PathBuf {
    let mut dir = std::env::current_dir().unwrap_or_default().join("template");
    if !dir.exists() {
        dir = std::env::current_dir()
            .unwrap_or_default()
            .join("..")
            .join("template");
    }
    dir
}

#[tauri::command]
fn get_templates() -> Result<Vec<String>, String> {
    let mut templates = Vec::new();
    let template_dir = get_template_base_dir();

    if template_dir.exists() && template_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(template_dir) {
            for entry in entries.flatten() {
                if let Ok(ty) = entry.file_type() {
                    if ty.is_dir() {
                        if let Ok(name) = entry.file_name().into_string() {
                            templates.push(name);
                        }
                    }
                }
            }
        }
    }

    Ok(templates)
}

#[tauri::command]
fn create_project(name: String, path: String, template: String) -> Result<String, String> {
    let project_dir = std::path::Path::new(&path).join(&name);
    if project_dir.exists() {
        return Err("Directory already exists".to_string());
    }

    let template_dir = get_template_base_dir().join(&template);

    if template_dir.exists() && template_dir.is_dir() {
        copy_dir_all(&template_dir, &project_dir)
            .map_err(|e| format!("Failed to copy template: {}", e))?;
    } else {
        std::fs::create_dir_all(&project_dir).map_err(|e| e.to_string())?;
        let main_tex_path = project_dir.join("main.tex");
        std::fs::write(&main_tex_path, "").map_err(|e| e.to_string())?;
    }

    Ok(project_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_project(project_path: String) -> Result<(), String> {
    let path = std::path::Path::new(&project_path);
    if path.exists() {
        std::fs::remove_dir_all(path).map_err(|e| format!("Failed to delete project: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn open_in_antigravity(project_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "antigravity-ide", &project_path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("antigravity-ide")
            .arg(&project_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn get_template_pdf(template: String) -> Result<Vec<u8>, String> {
    let template_dir = get_template_base_dir().join(&template);
    if template_dir.exists() && template_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(template_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("pdf") {
                    if let Ok(bytes) = std::fs::read(&path) {
                        return Ok(bytes);
                    }
                }
            }
        }
    }
    Err("No PDF preview found".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            create_project,
            open_in_antigravity,
            get_templates,
            delete_project,
            get_template_pdf
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
