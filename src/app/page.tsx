"use client";

import { useState, useEffect } from "react";
import { Plus, Folder, Calendar, Trash2 } from "lucide-react";
import { NewProjectModal } from "./components/NewProjectModal";
import { LazyStore } from "@tauri-apps/plugin-store";
import { ask } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";

const store = new LazyStore("projects.json");

interface Project {
  id: string;
  name: string;
  path: string;
  template: string;
  createdAt: string;
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const loadProjects = async () => {
    try {
      const savedProjects = await store.get<Project[]>("projects");
      if (savedProjects) {
        setProjects(savedProjects);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleOpenProject = async (path: string) => {
    try {
      await invoke("open_in_antigravity", { projectPath: path });
    } catch (err) {
      console.error(err);
      alert(`Failed to open project: ${err}`);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    try {
      const confirmed = await ask(`Are you sure you want to completely delete "${project.name}" and all of its contents?`, {
        title: "Delete Project",
        kind: "warning",
      });

      if (confirmed) {
        await invoke("delete_project", { projectPath: project.path });
        
        let savedProjects = await store.get<Project[]>("projects");
        if (savedProjects) {
          savedProjects = savedProjects.filter(p => p.id !== project.id);
          await store.set("projects", savedProjects);
          await store.save();
          setProjects(savedProjects);
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to delete project: ${err}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          LaTeX Launcher
        </h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm hover:shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          New Project
        </motion.button>
      </motion.header>

      <main className="flex-1 p-8">
        {projects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex h-full flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400"
          >
            <p className="mb-4 text-lg">No projects found.</p>
            <p className="text-sm">Click "New Project" to create your first LaTeX document.</p>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            <AnimatePresence>
              {projects.map((project) => (
                <motion.div 
                  key={project.id} 
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    show: { opacity: 1, y: 0, scale: 1 }
                  }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-lg transition-shadow dark:border-zinc-800 dark:bg-zinc-900 cursor-pointer"
                  onClick={() => handleOpenProject(project.path)}
                >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                      {project.name}
                    </h3>
                    <button 
                      onClick={(e) => handleDeleteProject(e, project)}
                      className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Folder className="h-3 w-3" />
                    <span className="truncate" title={project.path}>{project.path}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {project.template}
                  </span>
                  <button className="text-sm font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
                    Open in IDE →
                  </button>
                </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <NewProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onProjectCreated={loadProjects}
      />
    </div>
  );
}
