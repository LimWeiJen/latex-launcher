# Development Plan: Latex Launcher

## Project Context
We are building a lightweight desktop project manager and launcher using **Tauri**, **Next.js**, and **TypeScript**. This application serves strictly as a **Launcher App**. It scans a dedicated local directory for LaTeX projects, allows the user to create new projects from templates, delete projects, and triggers a system command to open the project folder directly in the Antigravity editor environment.

**Target Environment:** Local desktop application: Windows.
**Tech Stack:**
- **Frontend (UI):** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React (Icons).
- **Backend (Desktop Core):** Rust (Tauri native commands for file system access and shell execution).

---

## Phase 1: Environment & Architecture Setup

### 1.1 Initialization
- Initialize a new Tauri project using the official CLI, selecting **Next.js** as the frontend recipe and **TypeScript** as the language package.
- Ensure the Rust toolchain (`rustc`, `cargo`) is updated locally.
- Structure the repository cleanly:
  - `/src-tauri` (Rust backend logic, desktop configurations).
  - `/src` or `/app` (Next.js frontend views, components, and styles).

### 1.2 Tauri Configuration (`tauri.conf.json`)
- Configure permissions to allow scoped file system reading/writing and shell execution (`shell` and `fs` plugins).
- Set up the application window properties (e.g., minimum dimensions suited for a sidebar manager, single-window instance configuration).

---

## Phase 2: Rust Backend Integration (Tauri Commands)

Instead of relying on a separate Python server, the app uses native Rust functions (`#[tauri::command]`) exposed to the JavaScript frontend.

### 2.1 File System Interfacing
Write Rust functions to handle project directories within a specified root workspace folder:
- `list_projects`: Scans the root directory, reads subfolders, checks for the presence of `.tex` files, and returns a JSON array of project names, paths, and metadata (e.g., last modified date).
- `create_project`: Accepts a new project name, creates a new subfolder, and populates it with a boilerplate `main.tex` template.
- `delete_project`: Accepts a project name and folder path, deletes the corresponding subfolder and all its contents.

### 2.2 Shell Execution (The Launcher Trigger)
Write a Rust function to invoke the external environment:
- `open_in_antigravity(project_path: String)`: Spawns a system shell command to pass the absolute path of the selected folder to the Antigravity editor executable or CLI command (e.g., executing `antigravity <path>` or its respective invocation script).

---

## Phase 3: Next.js Frontend Construction

### 3.1 UI & Layout Design
Build a clean, minimalist, single-page desktop dashboard using Tailwind CSS:
- **Header:** Workspace configuration settings (allows the user to pick or change their primary LaTeX workspace directory).
- **Project Grid / List View:** Displays cards or rows representing individual projects discovered by the Rust backend. Shows details like title, path, and a quick-action trigger.
- **"New Project" Modal:** A simple input prompt to name a new project and select a baseline template (e.g., Blank, Article, Report, Resume).

### 3.2 Frontend-to-Backend Bridge (`@tauri-apps/api`)
- Use Tauri’s `invoke` wrapper to call the Rust commands reactively.
- Fetch the list of projects on component mount using a React `useEffect` hook.
- Implement an optimistic UI update when creating a project so the dashboard populates instantly.

---

## Phase 4: Workflow Integration & Polish

### 4.1 The Launch Pipeline
- Bind the click event of a project card to the `open_in_antigravity` Tauri command.
- Provide clear loading states or visual cues to show that the editor environment is booting up.

### 4.2 Error Handling & Resilience
- Gracefully handle cases where the workspace directory is empty or missing permissions.
- Validate project naming inputs to prevent file-system-illegal characters (e.g., slashes, wildcards).
- Fall back to opening the folder in the OS native file explorer (Finder/Explorer) if the specified editor command fails to execute.
