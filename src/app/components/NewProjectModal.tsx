"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
  projectsFilePath: string;
}

export function NewProjectModal({ isOpen, onClose, onProjectCreated, projectsFilePath }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [template, setTemplate] = useState("Empty");
  const [templatesList, setTemplatesList] = useState<string[]>(["Empty"]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const templateFolderPath = localStorage.getItem("templateFolderPath") || "";
      invoke<string[]>("get_templates", { templateDir: templateFolderPath })
        .then((fetchedTemplates) => {
          if (fetchedTemplates && fetchedTemplates.length > 0) {
            setTemplatesList(fetchedTemplates);
            setTemplate(fetchedTemplates[0]);
          } else {
            setTemplatesList(["Empty"]);
            setTemplate("Empty");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch templates:", err);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!template || template === "Empty" || !isOpen) {
      setPdfUrl(null);
      return;
    }
    
    let isMounted = true;
    let urlToRevoke: string | null = null;
    setIsLoadingPdf(true);
    setPdfUrl(null);

    const templateFolderPath = localStorage.getItem("templateFolderPath") || "";
    invoke<number[]>("get_template_pdf", { template, templateDir: templateFolderPath })
      .then((bytes) => {
        if (!isMounted) return;
        const arrayBuffer = new Uint8Array(bytes).buffer;
        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        urlToRevoke = url;
        setPdfUrl(url);
      })
      .catch((err) => {
        console.error("Failed to fetch template preview:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPdf(false);
      });

    return () => {
      isMounted = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [template, isOpen]);

  const handleSelectFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
      });
      if (selectedPath) {
        setPath(selectedPath as string);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    setError("");
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    if (!path.trim()) {
      setError("Project location is required");
      return;
    }

    setIsCreating(true);
    try {
      const templateFolderPath = localStorage.getItem("templateFolderPath") || "";
      const fullPath = await invoke<string>("create_project", {
        name: name.trim(),
        path: path.trim(),
        template,
        templateDir: templateFolderPath,
      });

      const newProject = {
        id: Date.now().toString(),
        name: name.trim(),
        path: fullPath,
        template,
        createdAt: new Date().toISOString()
      };
      
      let projects: any[] = [];
      try {
        const content = await invoke<string>("read_projects_file", { path: projectsFilePath });
        const data = JSON.parse(content);
        if (data.projects) {
          projects = data.projects;
        }
      } catch (err) {
        console.warn("Could not read projects file", err);
      }
      
      projects.push(newProject);
      await invoke("write_projects_file", { 
        path: projectsFilePath, 
        content: JSON.stringify({ projects }, null, 2) 
      });

      await invoke("open_in_antigravity", { projectPath: fullPath });
      
      onProjectCreated();
      onClose();
    } catch (err) {
      setError(err as string);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="w-full max-w-5xl rounded-xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex overflow-hidden h-[80vh] min-h-[600px]"
          >
            {/* Left side: Form */}
            <div className="w-[400px] p-6 flex flex-col border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto shrink-0">
              <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Create New Project</h2>
        
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="e.g. my-latex-doc"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Template
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {templatesList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={path}
                readOnly
                className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 cursor-not-allowed"
                placeholder="Select a folder..."
              />
              <button
                onClick={handleSelectFolder}
                className="flex items-center justify-center rounded-lg bg-zinc-200 px-3 py-2 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                title="Browse..."
              >
                <FolderOpen className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Project
          </button>
        </div>
            </div>

            {/* Right side: Preview */}
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-950/50 flex flex-col hidden md:flex">
              <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 shrink-0 bg-white dark:bg-zinc-900">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Template Preview</h3>
              </div>
              <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
                {isLoadingPdf ? (
                  <div className="flex flex-col items-center gap-3 text-zinc-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">Loading preview...</span>
                  </div>
                ) : pdfUrl ? (
                  <iframe 
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full rounded-md shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white"
                  />
                ) : (
                  <div className="text-center text-zinc-400 flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50">
                      <FolderOpen className="h-6 w-6 opacity-50" />
                    </div>
                    <p className="text-sm">No preview available for "{template}"</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
