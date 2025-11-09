use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
struct ExecuteRequest {
    code: String,
    language: String,
    #[serde(default)]
    timeout: u64,
}

#[derive(Debug, Serialize)]
struct ExecuteResponse {
    stdout: String,
    stderr: String,
    exit_code: i32,
    execution_time: f64,
}

#[derive(Debug, Serialize)]
struct ServiceInfo {
    service: String,
    status: String,
    version: String,
}

#[derive(Debug, Serialize)]
struct HealthCheck {
    status: String,
    service: String,
}

async fn root() -> impl Responder {
    HttpResponse::Ok().json(ServiceInfo {
        service: "execution-service".to_string(),
        status: "running".to_string(),
        version: "0.1.0".to_string(),
    })
}

async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthCheck {
        status: "healthy".to_string(),
        service: "execution-service".to_string(),
    })
}

async fn execute_code(req: web::Json<ExecuteRequest>) -> impl Responder {
    log::info!("Executing {} code ({} bytes)", req.language, req.code.len());
    
    let start_time = std::time::Instant::now();
    let timeout = if req.timeout > 0 { req.timeout } else { 10 };
    
    let result = match req.language.as_str() {
        "python" => execute_python(&req.code, timeout).await,
        "javascript" | "typescript" => execute_javascript(&req.code, timeout).await,
        "rust" => execute_rust(&req.code, timeout).await,
        "go" => execute_go(&req.code, timeout).await,
        "cpp" | "c++" => execute_cpp(&req.code, timeout).await,
        "java" => execute_java(&req.code, timeout).await,
        "c" => execute_c(&req.code, timeout).await,
        "zig" => execute_zig(&req.code, timeout).await,
        "elixir" => execute_elixir(&req.code, timeout).await,
        "vlang" | "v" => execute_vlang(&req.code, timeout).await,
        _ => Err(format!("Unsupported language: {}", req.language)),
    };
    
    let execution_time = start_time.elapsed().as_secs_f64() * 1000.0;
    
    match result {
        Ok((stdout, stderr, exit_code)) => {
            HttpResponse::Ok().json(ExecuteResponse {
                stdout,
                stderr,
                exit_code,
                execution_time,
            })
        }
        Err(error) => {
            HttpResponse::Ok().json(ExecuteResponse {
                stdout: String::new(),
                stderr: error,
                exit_code: 1,
                execution_time,
            })
        }
    }
}

async fn execute_python(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::process::{Command, Stdio};
    
    let child = Command::new("python3")
        .arg("-c")
        .arg(code)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Python: {}", e))?;
    
    // Wait with timeout
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

async fn execute_javascript(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::process::{Command, Stdio};
    
    let child = Command::new("node")
        .arg("-e")
        .arg(code)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Node.js: {}", e))?;
    
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

async fn execute_rust(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::fs;
    use std::process::{Command, Stdio};
    use uuid::Uuid;
    
    // Create temp directory for Rust code
    let temp_id = Uuid::new_v4().to_string();
    let temp_dir = format!("/tmp/rust_{}", temp_id);
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    let source_file = format!("{}/main.rs", temp_dir);
    fs::write(&source_file, code).map_err(|e| format!("Failed to write source: {}", e))?;
    
    // Compile
    let compile = Command::new("rustc")
        .args(&[&source_file, "-o", &format!("{}/main", temp_dir)])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    let compile_output = match compile {
        Ok(output) => output,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Rust compiler not available: {}", e));
        }
    };
    
    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr).to_string();
        let _ = fs::remove_dir_all(&temp_dir);
        return Ok((String::new(), format!("Compilation error:\n{}", stderr), 1));
    }
    
    // Execute
    let child = Command::new(format!("{}/main", temp_dir))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();
    
    let child = match child {
        Ok(c) => c,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Failed to execute: {}", e));
        }
    };
    
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    let _ = fs::remove_dir_all(&temp_dir);
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

async fn execute_go(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::fs;
    use std::process::{Command, Stdio};
    use uuid::Uuid;
    
    let temp_id = Uuid::new_v4().to_string();
    let temp_dir = format!("/tmp/go_{}", temp_id);
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    let source_file = format!("{}/main.go", temp_dir);
    fs::write(&source_file, code).map_err(|e| format!("Failed to write source: {}", e))?;
    
    // Run go code directly
    let child = Command::new("go")
        .args(&["run", &source_file])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();
    
    let child = match child {
        Ok(c) => c,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Go compiler not available: {}", e));
        }
    };
    
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    let _ = fs::remove_dir_all(&temp_dir);
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

async fn execute_cpp(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::fs;
    use std::process::{Command, Stdio};
    use uuid::Uuid;
    
    let temp_id = Uuid::new_v4().to_string();
    let temp_dir = format!("/tmp/cpp_{}", temp_id);
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    let source_file = format!("{}/main.cpp", temp_dir);
    let binary_file = format!("{}/main", temp_dir);
    fs::write(&source_file, code).map_err(|e| format!("Failed to write source: {}", e))?;
    
    // Compile with g++
    let compile = Command::new("g++")
        .args(&[&source_file, "-o", &binary_file, "-std=c++17"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    let compile_output = match compile {
        Ok(output) => output,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("C++ compiler not available: {}", e));
        }
    };
    
    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr).to_string();
        let _ = fs::remove_dir_all(&temp_dir);
        return Ok((String::new(), format!("Compilation error:\n{}", stderr), 1));
    }
    
    // Execute
    let child = Command::new(&binary_file)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();
    
    let child = match child {
        Ok(c) => c,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Failed to execute: {}", e));
        }
    };
    
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    let _ = fs::remove_dir_all(&temp_dir);
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

async fn execute_java(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::fs;
    use std::process::{Command, Stdio};
    use uuid::Uuid;
    
    let temp_id = Uuid::new_v4().to_string();
    let temp_dir = format!("/tmp/java_{}", temp_id);
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    // Extract class name from code
    let class_name = extract_java_class_name(code).unwrap_or("Main".to_string());
    let source_file = format!("{}/{}.java", temp_dir, class_name);
    fs::write(&source_file, code).map_err(|e| format!("Failed to write source: {}", e))?;
    
    // Compile
    let compile = Command::new("javac")
        .arg(&source_file)
        .current_dir(&temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    let compile_output = match compile {
        Ok(output) => output,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Java compiler not available: {}", e));
        }
    };
    
    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr).to_string();
        let _ = fs::remove_dir_all(&temp_dir);
        return Ok((String::new(), format!("Compilation error:\n{}", stderr), 1));
    }
    
    // Execute
    let child = Command::new("java")
        .arg(&class_name)
        .current_dir(&temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();
    
    let child = match child {
        Ok(c) => c,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Failed to execute: {}", e));
        }
    };
    
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    let _ = fs::remove_dir_all(&temp_dir);
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

async fn execute_c(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::fs;
    use std::process::{Command, Stdio};
    use uuid::Uuid;
    
    let temp_id = Uuid::new_v4().to_string();
    let temp_dir = format!("/tmp/c_{}", temp_id);
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    let source_file = format!("{}/main.c", temp_dir);
    let binary_file = format!("{}/main", temp_dir);
    fs::write(&source_file, code).map_err(|e| format!("Failed to write source: {}", e))?;
    
    // Compile with gcc
    let compile = Command::new("gcc")
        .args(&[&source_file, "-o", &binary_file])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    let compile_output = match compile {
        Ok(output) => output,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("C compiler not available: {}", e));
        }
    };
    
    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr).to_string();
        let _ = fs::remove_dir_all(&temp_dir);
        return Ok((String::new(), format!("Compilation error:\n{}", stderr), 1));
    }
    
    // Execute
    let child = Command::new(&binary_file)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();
    
    let child = match child {
        Ok(c) => c,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Failed to execute: {}", e));
        }
    };
    
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    let _ = fs::remove_dir_all(&temp_dir);
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

fn extract_java_class_name(code: &str) -> Option<String> {
    // Simple regex to extract public class name
    for line in code.lines() {
        if line.contains("public class") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(idx) = parts.iter().position(|&x| x == "class") {
                if let Some(class_name) = parts.get(idx + 1) {
                    return Some(class_name.trim_matches(|c| c == '{' || c == ' ').to_string());
                }
            }
        }
    }
    None
}

async fn execute_zig(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::fs;
    use std::process::{Command, Stdio};
    use uuid::Uuid;
    
    // Create a temporary directory for Zig code
    let temp_dir = format!("/tmp/zig_{}", Uuid::new_v4());
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let file_path = format!("{}/main.zig", temp_dir);
    fs::write(&file_path, code)
        .map_err(|e| {
            let _ = fs::remove_dir_all(&temp_dir);
            format!("Failed to write Zig file: {}", e)
        })?;
    
    // Compile Zig code
    let compile_output = Command::new("zig")
        .args(&["build-exe", "main.zig"])
        .current_dir(&temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    
    let compile_result = match compile_output {
        Ok(output) => output,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Failed to compile Zig code: {}", e));
        }
    };
    
    if !compile_result.status.success() {
        let stderr = String::from_utf8_lossy(&compile_result.stderr).to_string();
        let _ = fs::remove_dir_all(&temp_dir);
        return Err(format!("Zig compilation error:\n{}", stderr));
    }
    
    // Execute the compiled binary
    let exe_path = format!("{}/main", temp_dir);
    let child = match Command::new(&exe_path)
        .current_dir(&temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Failed to execute Zig binary: {}", e));
        }
    };
    
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    let _ = fs::remove_dir_all(&temp_dir);
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

async fn execute_elixir(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::fs;
    use std::process::{Command, Stdio};
    use uuid::Uuid;
    
    // Create a temporary directory for Elixir code
    let temp_dir = format!("/tmp/elixir_{}", Uuid::new_v4());
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let file_path = format!("{}/main.exs", temp_dir);
    fs::write(&file_path, code)
        .map_err(|e| {
            let _ = fs::remove_dir_all(&temp_dir);
            format!("Failed to write Elixir file: {}", e)
        })?;
    
    // Execute Elixir script
    let child = match Command::new("elixir")
        .arg("main.exs")
        .current_dir(&temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Failed to execute Elixir: {}", e));
        }
    };
    
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    let _ = fs::remove_dir_all(&temp_dir);
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

async fn execute_vlang(code: &str, timeout: u64) -> Result<(String, String, i32), String> {
    use std::fs;
    use std::process::{Command, Stdio};
    use uuid::Uuid;
    
    // Create a temporary directory for V code
    let temp_dir = format!("/tmp/vlang_{}", Uuid::new_v4());
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let file_path = format!("{}/main.v", temp_dir);
    fs::write(&file_path, code)
        .map_err(|e| {
            let _ = fs::remove_dir_all(&temp_dir);
            format!("Failed to write V file: {}", e)
        })?;
    
    // Execute V code directly (V can run scripts without explicit compilation step)
    let child = match Command::new("v")
        .args(&["run", "main.v"])
        .current_dir(&temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Failed to execute V: {}", e));
        }
    };
    
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(timeout),
        tokio::task::spawn_blocking(move || child.wait_with_output()),
    )
    .await;
    
    let _ = fs::remove_dir_all(&temp_dir);
    
    match result {
        Ok(Ok(Ok(output))) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let exit_code = output.status.code().unwrap_or(1);
            Ok((stdout, stderr, exit_code))
        }
        Ok(Ok(Err(e))) => Err(format!("Process error: {}", e)),
        Ok(Err(e)) => Err(format!("Task error: {}", e)),
        Err(_) => Err(format!("Execution timeout ({}s)", timeout)),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    
    let port = env::var("PORT").unwrap_or_else(|_| "8004".to_string());
    let bind_address = format!("0.0.0.0:{}", port);
    
    log::info!("Starting Execution Service on {}", bind_address);
    
    HttpServer::new(|| {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);
        
        App::new()
            .wrap(cors)
            .route("/", web::get().to(root))
            .route("/health", web::get().to(health))
            .route("/execute", web::post().to(execute_code))
    })
    .bind(&bind_address)?
    .run()
    .await
}
