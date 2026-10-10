import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  Building,
  CheckSquare,
  Square,
  Sparkles,
  Receipt,
  LayoutGrid,
  List,
  GripVertical,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Columns,
  GitPullRequest,
  ChevronDown,
  Layers
} from 'lucide-react';
import { api } from '../lib/api';
import { useNotificationStore } from '../store/useNotificationStore';
import { useCurrencyStore } from '../store/useCurrencyStore';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useNotificationStore();
  const { currency, format } = useCurrencyStore();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isAddingChangeOrder, setIsAddingChangeOrder] = useState(false);
  const [isBillingMilestone, setIsBillingMilestone] = useState(false);

  // Layout View Mode: 'workspace' (full-width focused) | 'split' (side-by-side) | 'portfolio' (grid of all)
  const [workspaceLayout, setWorkspaceLayout] = useState('workspace');
  // Workspace Active Tab: 'tasks' (Kanban) | 'milestones' | 'scope_orders'
  const [projectTab, setProjectTab] = useState('tasks');

  // Search and status filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in_progress' | 'completed'

  // Task Management: Kanban & Drag-and-drop
  const [taskView, setTaskView] = useState('kanban'); // 'kanban' | 'list'
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // New task form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskHours, setNewTaskHours] = useState(4);
  const [newTaskCol, setNewTaskCol] = useState('todo');

  // Change request form state
  const [crDesc, setCrDesc] = useState('');
  const [crHours, setCrHours] = useState(10);
  const [crCost, setCrCost] = useState(500);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getProjects();
        if (res?.projects) {
          setProjects(res.projects);
          if (res.projects.length > 0) setSelectedProject(res.projects[0]);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    }
    load();
  }, []);

  // Helper: Extract normalized status
  const getTaskStatus = (t) => {
    if (t.status) return t.status;
    return t.completed ? 'done' : 'todo';
  };

  const handleToggleTask = async (taskId) => {
    if (!selectedProject) return;
    const updatedTasks = (selectedProject.tasks || []).map(t => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          status: nextCompleted ? 'done' : 'todo',
        };
      }
      return t;
    });

    try {
      const res = await api.updateProject(selectedProject.id, { tasks: updatedTasks });
      if (res?.project) {
        setSelectedProject(res.project);
        setProjects(prev => prev.map(p => p.id === res.project.id ? res.project : p));
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Task Update Failed', message: err.message || 'Failed to update task' });
    }
  };

  // Move task to a new Kanban status (drag-and-drop or button)
  const handleMoveTask = async (taskId, targetStatus) => {
    if (!selectedProject) return;
    const targetTask = (selectedProject.tasks || []).find(t => t.id === taskId);
    if (!targetTask) return;

    const currentStatus = getTaskStatus(targetTask);
    if (currentStatus === targetStatus) return;

    const updatedTasks = (selectedProject.tasks || []).map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: targetStatus,
          completed: targetStatus === 'done',
        };
      }
      return t;
    });

    try {
      const res = await api.updateProject(selectedProject.id, { tasks: updatedTasks });
      if (res?.project) {
        setSelectedProject(res.project);
        setProjects(prev => prev.map(p => p.id === res.project.id ? res.project : p));
        const colNames = { todo: 'To Do', in_progress: 'In Progress', done: 'Completed' };
        showToast({
          type: 'success',
          title: 'Task Status Updated',
          message: `"${targetTask.title}" moved to ${colNames[targetStatus]}`,
        });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Move Failed', message: err.message || 'Could not update task status' });
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    setDragOverCol(colKey);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e, colKey) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      handleMoveTask(taskId, colKey);
    }
    setDraggedTaskId(null);
  };

  // Add Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProject) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      status: newTaskCol,
      completed: newTaskCol === 'done',
      estimatedHours: Number(newTaskHours) || 0,
      actualHours: 0,
    };

    const updatedTasks = [...(selectedProject.tasks || []), newTask];

    try {
      const res = await api.updateProject(selectedProject.id, { tasks: updatedTasks });
      if (res?.project) {
        setSelectedProject(res.project);
        setProjects(prev => prev.map(p => p.id === res.project.id ? res.project : p));
        setIsAddingTask(false);
        setNewTaskTitle('');
        setNewTaskHours(4);
        showToast({
          type: 'success',
          title: 'Task Added',
          message: `Added "${newTask.title}" to project plan.`,
        });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Task Creation Failed', message: err.message || 'Failed to add task' });
    }
  };

  // Delete Task
  const handleDeleteTask = (taskId, taskTitle) => {
    showConfirm({
      title: 'Delete Task?',
      message: `Are you sure you want to remove "${taskTitle}" from this project?`,
      confirmText: 'Delete Task',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        const updatedTasks = (selectedProject.tasks || []).filter(t => t.id !== taskId);
        try {
          const res = await api.updateProject(selectedProject.id, { tasks: updatedTasks });
          if (res?.project) {
            setSelectedProject(res.project);
            setProjects(prev => prev.map(p => p.id === res.project.id ? res.project : p));
            showToast({
              type: 'success',
              title: 'Task Removed',
              message: `Task "${taskTitle}" deleted.`,
            });
          }
        } catch (err) {
          showToast({ type: 'error', title: 'Delete Failed', message: err.message || 'Failed to delete task' });
        }
      },
    });
  };

  const handleCreateChangeOrder = async (e) => {
    e.preventDefault();
    if (!crDesc.trim() || !selectedProject) return;

    try {
      const res = await api.addChangeRequest(selectedProject.id, {
        description: crDesc,
        impactHours: Number(crHours),
        impactCost: Number(crCost),
      });
      if (res?.project) {
        setSelectedProject(res.project);
        setProjects(prev => prev.map(p => p.id === res.project.id ? res.project : p));
        setIsAddingChangeOrder(false);
        setCrDesc('');
        showToast({
          type: 'success',
          title: 'Change Request Created',
          message: 'Scope change order registered and ready for client approval.',
        });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Request Failed', message: err.message || 'Failed to create change request' });
    }
  };

  const handleApproveChangeOrder = async (crId) => {
    if (!selectedProject) return;
    try {
      const res = await api.approveChangeRequest(selectedProject.id, crId);
      if (res?.project) {
        setSelectedProject(res.project);
        setProjects(prev => prev.map(p => p.id === res.project.id ? res.project : p));
        showToast({
          type: 'success',
          title: 'Change Order Approved',
          message: 'Contract value adjusted and scope confirmed.',
        });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Approval Failed', message: err.message || 'Failed to approve change request' });
    }
  };

  const handleBillMilestone = async (m) => {
    if (!selectedProject) return;
    setIsBillingMilestone(true);
    try {
      const res = await api.createInvoice({
        clientId: selectedProject.clientId,
        projectId: selectedProject.id,
        lineItems: [
          {
            description: `${selectedProject.title} - ${m.title}`,
            quantity: 1,
            unitPrice: Number(m.amount) || 25000,
          },
        ],
        dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : new Date(Date.now() + 15 * 86400000).toISOString(),
        paymentTerms: 'Payment due upon milestone milestone achievement',
      });
      if (res?.invoice) {
        showToast({
          type: 'success',
          title: 'Milestone Invoiced',
          message: `Invoice ${res.invoice.invoiceNumber} generated! Redirecting to Invoices...`,
        });
        navigate('/invoices');
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Invoice Failed', message: err.message || 'Failed to create invoice for milestone' });
    } finally {
      setIsBillingMilestone(false);
    }
  };

  const totalContractValue = projects.reduce((acc, p) => acc + (p.contractValue || 0), 0);
  const activeProjectsCount = projects.filter(p => p.status === 'in_progress').length;
  const completedProjectsCount = projects.filter(p => p.status === 'completed').length;
  
  const allTasks = projects.flatMap(p => p.tasks || []);
  const totalTasksCount = allTasks.length;
  const completedTasksCount = allTasks.filter(t => t.completed || t.status === 'done').length;
  const overallTaskPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  
  const totalChangeOrders = projects.reduce((acc, p) => acc + (p.changeRequests?.length || 0), 0);

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      p.title?.toLowerCase().includes(q) ||
      p.client?.name?.toLowerCase().includes(q) ||
      p.client?.company?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const currentProject = selectedProject || filteredProjects[0] || projects[0] || null;

  const renderMilestonesSection = (project) => {
    const milestones = project?.milestones || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-charcoal-100">
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
              Project Milestones & Billing
            </h3>
            <p className="text-[11px] text-charcoal-500 mt-0.5">
              Generate tax invoices against completed deliverables without double-charging.
            </p>
          </div>
          <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
            {milestones.filter(m => m.status === 'completed').length} of {milestones.length} Completed
          </span>
        </div>

        {milestones.length === 0 ? (
          <div className="p-6 bg-charcoal-50 rounded-xl text-center text-charcoal-400 text-xs">
            No milestones configured for this project.
          </div>
        ) : (
          <div className="space-y-2.5">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="p-3.5 bg-charcoal-50 hover:bg-charcoal-100/60 border border-charcoal-200/80 rounded-xl flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${m.status === 'completed' ? 'text-emerald-600' : 'text-charcoal-300'}`} />
                  <div>
                    <div className="font-bold text-charcoal-800 text-xs">{m.title}</div>
                    <div className="text-[11px] text-charcoal-500 mt-0.5">Target Due: {m.dueDate}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="font-bold text-charcoal-900 text-xs">{format(m.amount)}</span>
                    <div className="text-[10px] text-charcoal-400 capitalize">{m.status}</div>
                  </div>
                  <button
                    onClick={() => handleBillMilestone(m)}
                    disabled={isBillingMilestone}
                    title="Generate tax invoice for this milestone"
                    className="px-3 py-1.5 bg-white border border-charcoal-200 hover:border-brand-500 hover:text-brand-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5 text-brand-600" />
                    <span>Bill Milestone</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTasksSection = (project) => {
    const tasks = project?.tasks || [];
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-charcoal-100">
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-2">
              <span>Task Management</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200">
                {tasks.length} Total
              </span>
            </h3>
            <p className="text-[11px] text-charcoal-500 mt-0.5">
              Drag cards between columns to update status, or switch to list view.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Pills */}
            <div className="inline-flex items-center p-0.5 bg-charcoal-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setTaskView('kanban')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  taskView === 'kanban'
                    ? 'bg-white text-charcoal-900 shadow-xs'
                    : 'text-charcoal-500 hover:text-charcoal-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskView('list')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  taskView === 'list'
                    ? 'bg-white text-charcoal-900 shadow-xs'
                    : 'text-charcoal-500 hover:text-charcoal-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Inline Add Task Form */}
        {isAddingTask && (
          <form onSubmit={handleAddTask} className="p-4 mb-4 bg-brand-50/40 border border-brand-200 rounded-xl space-y-3 animate-slide-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-900">Create New Project Task</span>
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="text-xs text-charcoal-400 hover:text-charcoal-700"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement Stripe webhook listener and test events"
                  className="input-field text-xs"
                  required
                  autoFocus
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Est. Hours</label>
                <input
                  type="number"
                  value={newTaskHours}
                  onChange={(e) => setNewTaskHours(e.target.value)}
                  className="input-field text-xs"
                  min="1"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Starting Column</label>
                <select
                  value={newTaskCol}
                  onChange={(e) => setNewTaskCol(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button type="submit" className="btn-primary text-xs py-1.5 px-3">
                Save Task
              </button>
            </div>
          </form>
        )}

        {/* View 1: KANBAN DRAG & DROP BOARD */}
        {taskView === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {[
              { key: 'todo', title: 'To Do', badgeClass: 'bg-charcoal-100 text-charcoal-700', borderClass: 'border-charcoal-200' },
              { key: 'in_progress', title: 'In Progress', badgeClass: 'bg-amber-100 text-amber-800', borderClass: 'border-amber-300' },
              { key: 'done', title: 'Completed', badgeClass: 'bg-emerald-100 text-emerald-800', borderClass: 'border-emerald-300' },
            ].map((col) => {
              const colTasks = tasks.filter((t) => getTaskStatus(t) === col.key);
              const isHovered = dragOverCol === col.key;

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`rounded-xl border p-3.5 flex flex-col transition-all min-h-[260px] ${
                    isHovered
                      ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                      : 'bg-charcoal-50/60 border-charcoal-200/80'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-charcoal-200/70">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-charcoal-800">{col.title}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${col.badgeClass}`}>
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskCol(col.key);
                        setIsAddingTask(true);
                      }}
                      className="p-1 rounded text-charcoal-400 hover:text-charcoal-800 hover:bg-charcoal-200/60"
                      title={`Add task to ${col.title}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Task Cards Container */}
                  <div className="space-y-2 flex-1">
                    {colTasks.length === 0 ? (
                      <div className="h-full min-h-[140px] flex items-center justify-center border-2 border-dashed border-charcoal-200 rounded-lg p-4 text-center">
                        <span className="text-[11px] text-charcoal-400">
                          Drag tasks here
                        </span>
                      </div>
                    ) : (
                      colTasks.map((t) => (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          className="bg-white p-3 rounded-lg border border-charcoal-200/90 shadow-subtle hover:shadow-card hover:border-brand-400 transition-all cursor-grab active:cursor-grabbing group relative"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              <GripVertical className="w-3.5 h-3.5 text-charcoal-300 group-hover:text-charcoal-500 shrink-0 mt-0.5" />
                              <span className={`text-xs font-semibold leading-snug break-words ${
                                col.key === 'done' ? 'line-through text-charcoal-400' : 'text-charcoal-900'
                              }`}>
                                {t.title}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(t.id, t.title)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-charcoal-400 hover:text-rose-600 rounded transition-all shrink-0"
                              title="Delete task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-charcoal-100 flex items-center justify-between text-[11px]">
                            <span className="text-charcoal-500 font-mono text-[10px] bg-charcoal-50 px-1.5 py-0.5 rounded border border-charcoal-200/60">
                              {t.estimatedHours || 0} hrs
                            </span>

                            {/* Quick Move Step Controls */}
                            <div className="flex items-center gap-1">
                              {col.key !== 'todo' && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveTask(t.id, col.key === 'done' ? 'in_progress' : 'todo')}
                                  className="p-1 rounded text-charcoal-400 hover:text-charcoal-800 hover:bg-charcoal-100"
                                  title="Move left"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              {col.key !== 'done' && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveTask(t.id, col.key === 'todo' ? 'in_progress' : 'done')}
                                  className="p-1 rounded text-charcoal-400 hover:text-charcoal-800 hover:bg-charcoal-100"
                                  title="Move right"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View 2: TRADITIONAL LIST VIEW */
          <div className="divide-y divide-charcoal-100 border border-charcoal-200 rounded-xl overflow-hidden bg-white">
            {tasks.map((t) => {
              const status = getTaskStatus(t);
              return (
                <div
                  key={t.id}
                  className="px-4 py-3 flex items-center justify-between text-xs hover:bg-charcoal-50/70 transition-colors"
                >
                  <div
                    onClick={() => handleToggleTask(t.id)}
                    className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                  >
                    {status === 'done' ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-charcoal-400 shrink-0" />
                    )}
                    <span className={`font-semibold ${status === 'done' ? 'line-through text-charcoal-400' : 'text-charcoal-900'}`}>
                      {t.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      status === 'done'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-charcoal-100 text-charcoal-700'
                    }`}>
                      {status?.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-charcoal-500 font-mono">
                      {t.estimatedHours || 0}h
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(t.id, t.title)}
                      className="p-1 text-charcoal-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderChangeOrdersSection = (project) => {
    const changeRequests = project?.changeRequests || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-charcoal-100">
          <div>
            <h3 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
              Scope Change Orders
            </h3>
            <p className="text-[11px] text-charcoal-500 mt-0.5">
              Never silently expand scope. Quantify added hours & billable cost.
            </p>
          </div>
          <button
            onClick={() => setIsAddingChangeOrder(!isAddingChangeOrder)}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Change Request</span>
          </button>
        </div>

        {/* Form to add change order */}
        {isAddingChangeOrder && (
          <form onSubmit={handleCreateChangeOrder} className="p-4 mb-3 bg-brand-50/50 border border-brand-200 rounded-xl space-y-3 animate-slide-in">
            <div>
              <label className="block text-[11px] font-bold text-charcoal-700 mb-1">
                Requested Scope Addition / Feature
              </label>
              <input
                type="text"
                value={crDesc}
                onChange={(e) => setCrDesc(e.target.value)}
                placeholder="e.g. Add custom export to Excel with multiple date range filters"
                className="input-field text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Additional Effort (Hours)</label>
                <input
                  type="number"
                  value={crHours}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setCrHours(h);
                    setCrCost(h * 50);
                  }}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-charcoal-700 mb-1">Impact Cost ({currency})</label>
                <input
                  type="number"
                  value={crCost}
                  onChange={(e) => setCrCost(Number(e.target.value))}
                  className="input-field text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingChangeOrder(false)}
                className="btn-secondary text-xs py-1 px-3"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs py-1 px-3">
                Submit Change Order
              </button>
            </div>
          </form>
        )}

        {/* Change orders list */}
        <div className="space-y-2.5">
          {changeRequests.length === 0 ? (
            <div className="text-xs text-charcoal-400 p-6 bg-charcoal-50 rounded-xl text-center">
              No change requests filed. Scope is strictly aligned to contract.
            </div>
          ) : (
            changeRequests.map((cr) => (
              <div key={cr.id} className="p-3.5 bg-charcoal-50 border border-charcoal-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-charcoal-800">{cr.description}</div>
                  <div className="text-[11px] text-charcoal-500 mt-0.5">
                    +{cr.impactHours} hours • +{format(cr.impactCost)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                    cr.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {cr.status?.replace('_', ' ')}
                  </span>
                  {cr.status !== 'approved' && (
                    <button
                      onClick={() => handleApproveChangeOrder(cr.id)}
                      className="btn-primary text-[11px] py-1 px-2.5"
                    >
                      Approve Order
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-charcoal-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal-900">
            Project Management & Scope Tracking
          </h1>
          <p className="text-sm text-charcoal-500">
            Track active deliverables, milestone billings, interactive Kanban tasks, and client change-orders.
          </p>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-6 bg-gradient-to-br from-white to-charcoal-50/50">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Contract Value</span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-charcoal-900 mt-2">
            {format(totalContractValue)}
          </div>
          <div className="text-xs text-charcoal-400 mt-1 flex items-center gap-1">
            <span>{projects.length} total client projects</span>
          </div>
        </div>

        <div className="card-premium p-6 bg-gradient-to-br from-white to-brand-50/30">
          <div className="flex items-center justify-between text-brand-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-950 mt-2">
            {activeProjectsCount}
          </div>
          <div className="text-xs text-brand-700/80 mt-1 flex items-center gap-1">
            <span>{completedProjectsCount} completed • {projects.length - activeProjectsCount - completedProjectsCount} other</span>
          </div>
        </div>

        <div className="card-premium p-6 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Task Completion</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-950 mt-2">
            {overallTaskPercent}%
          </div>
          <div className="text-xs text-emerald-700/80 mt-1 flex items-center gap-1">
            <span>{completedTasksCount} of {totalTasksCount} tasks completed</span>
          </div>
        </div>

        <div className="card-premium p-6 bg-gradient-to-br from-white to-brand-50/30">
          <div className="flex items-center justify-between text-brand-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Scope Integrity</span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-charcoal-900 mt-2">
            {totalChangeOrders}
          </div>
          <div className="text-xs text-charcoal-400 mt-1 flex items-center gap-1">
            <span>Documented client change orders</span>
          </div>
        </div>
      </div>

      {/* Search, Status Filters & Layout Switcher Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white border border-charcoal-200/80 rounded-xl shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title or client name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-charcoal-50 border border-charcoal-200 rounded-lg text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: 'all', label: 'All Projects', count: projects.length },
              { id: 'in_progress', label: 'In Progress', count: activeProjectsCount },
              { id: 'completed', label: 'Completed', count: completedProjectsCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
                    : 'text-charcoal-600 hover:bg-charcoal-50 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? 'bg-brand-100 text-brand-800' : 'bg-charcoal-100 text-charcoal-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Layout Mode Switcher */}
          <div className="inline-flex items-center p-0.5 bg-charcoal-100 rounded-lg text-xs shrink-0">
            <button
              type="button"
              onClick={() => setWorkspaceLayout('workspace')}
              title="Full-Width Project Workspace"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                workspaceLayout === 'workspace'
                  ? 'bg-white text-charcoal-900 shadow-xs'
                  : 'text-charcoal-500 hover:text-charcoal-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Workspace</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceLayout('split')}
              title="Split Studio View"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                workspaceLayout === 'split'
                  ? 'bg-white text-charcoal-900 shadow-xs'
                  : 'text-charcoal-500 hover:text-charcoal-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceLayout('portfolio')}
              title="All Projects Portfolio Grid"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                workspaceLayout === 'portfolio'
                  ? 'bg-white text-charcoal-900 shadow-xs'
                  : 'text-charcoal-500 hover:text-charcoal-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portfolio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Views Rendering based on workspaceLayout */}

      {/* VIEW 1: FULL-WIDTH FOCUSED WORKSPACE (Default) */}
      {workspaceLayout === 'workspace' && (
        <div>
          {!currentProject ? (
            <div className="card-premium p-12 text-center text-charcoal-400">
              <FolderGit2 className="w-10 h-10 mx-auto mb-3 opacity-40 text-charcoal-400" />
              <h3 className="text-sm font-bold text-charcoal-700">No Projects Found</h3>
              <p className="text-xs text-charcoal-400 mt-1">Accept a proposal to launch a client project or adjust your search filter.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Project Selector & Header Summary */}
              <div className="card-premium p-5 shadow-xs bg-white">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Project Quick Switcher Dropdown */}
                      {projects.length > 1 && (
                        <div className="relative inline-block">
                          <select
                            value={currentProject.id}
                            onChange={(e) => {
                              const p = projects.find(item => item.id === e.target.value);
                              if (p) setSelectedProject(p);
                            }}
                            className="bg-charcoal-50 hover:bg-charcoal-100 border border-charcoal-200 text-charcoal-800 text-xs font-bold rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
                          >
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>
                                Switch: {p.title}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-charcoal-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      )}

                      <span className="badge-brand text-[10px] uppercase font-bold tracking-wider">
                        {currentProject.status?.replace('_', ' ')}
                      </span>

                      <span className="text-xs font-medium text-charcoal-500 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-charcoal-400" />
                        <span>{currentProject.client?.company || currentProject.client?.name || 'Client'}</span>
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
                      {currentProject.title}
                    </h2>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="flex items-center gap-4 sm:gap-6 text-xs text-charcoal-600 bg-charcoal-50/80 p-3 rounded-xl border border-charcoal-200/80 shrink-0">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider block">Contract Value</span>
                      <span className="font-bold text-charcoal-900 text-sm">{format(currentProject.contractValue)}</span>
                    </div>
                    <div className="h-8 w-px bg-charcoal-200" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider block">Target Due</span>
                      <span className="font-semibold text-charcoal-800">{new Date(currentProject.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="h-8 w-px bg-charcoal-200" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider block">Task Progress</span>
                      <span className="font-semibold text-charcoal-800">
                        {(currentProject.tasks || []).filter(t => t.completed || t.status === 'done').length}/{(currentProject.tasks || []).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workspace Tabs */}
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-charcoal-100 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setProjectTab('tasks')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                      projectTab === 'tasks'
                        ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
                        : 'text-charcoal-600 hover:bg-charcoal-50 border border-transparent'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Interactive Tasks & Kanban</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-charcoal-100 text-charcoal-600 font-mono">
                      {(currentProject.tasks || []).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProjectTab('milestones')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                      projectTab === 'milestones'
                        ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
                        : 'text-charcoal-600 hover:bg-charcoal-50 border border-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Milestones & Invoicing</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-charcoal-100 text-charcoal-600 font-mono">
                      {(currentProject.milestones || []).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProjectTab('scope_orders')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                      projectTab === 'scope_orders'
                        ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-xs'
                        : 'text-charcoal-600 hover:bg-charcoal-50 border border-transparent'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Scope Change Orders</span>
                    {(currentProject.changeRequests || []).length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                        {(currentProject.changeRequests || []).length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Active Tab Panel */}
              <div className="card-premium p-6 shadow-xs bg-white">
                {projectTab === 'tasks' && renderTasksSection(currentProject)}
                {projectTab === 'milestones' && renderMilestonesSection(currentProject)}
                {projectTab === 'scope_orders' && renderChangeOrdersSection(currentProject)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PORTFOLIO GRID (All Projects Cards) */}
      {workspaceLayout === 'portfolio' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full card-premium p-12 text-center text-charcoal-400">
              <FolderGit2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-charcoal-600">No projects found.</p>
              <p className="text-[11px] text-charcoal-400 mt-1">Accept a proposal to launch a client project or adjust your filters.</p>
            </div>
          ) : (
            filteredProjects.map(p => {
              const pTasks = p.tasks || [];
              const pDone = pTasks.filter(t => t.completed || t.status === 'done').length;
              const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
              const pMilestones = p.milestones || [];

              return (
                <div
                  key={p.id}
                  className="card-premium p-5 flex flex-col justify-between hover:border-brand-400 hover:shadow-card transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-charcoal-600 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-charcoal-400" />
                        <span>{p.client?.company || p.client?.name || 'Client'}</span>
                      </span>
                      <span className="badge-brand text-[10px] capitalize">
                        {p.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-charcoal-900 line-clamp-1 mb-3">
                      {p.title}
                    </h3>

                    {/* Task progress bar */}
                    <div className="space-y-1.5 mb-4 bg-charcoal-50 p-3 rounded-lg border border-charcoal-100">
                      <div className="flex items-center justify-between text-[11px] text-charcoal-500">
                        <span className="font-semibold text-charcoal-700">Tasks Completed</span>
                        <span className="font-bold text-charcoal-900">{pDone}/{pTasks.length} ({pPct}%)</span>
                      </div>
                      <div className="w-full bg-charcoal-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${pPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-charcoal-100 mb-4">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 block">Contract</span>
                        <span className="font-bold text-charcoal-900">{format(p.contractValue)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 block">Due Date</span>
                        <span className="font-medium text-charcoal-700">{new Date(p.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-charcoal-500">
                      {pMilestones.length} Milestones
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProject(p);
                        setWorkspaceLayout('workspace');
                      }}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Open Workspace</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 3: SPLIT STUDIO (Side-by-side list & inspector) */}
      {workspaceLayout === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Project Cards */}
          <div className="lg:col-span-5 space-y-3">
            {filteredProjects.length === 0 ? (
              <div className="card-premium p-8 text-center text-charcoal-400">
                <FolderGit2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-charcoal-600">No projects found.</p>
                <p className="text-[11px] text-charcoal-400 mt-1">Accept a proposal to launch a client project.</p>
              </div>
            ) : (
              filteredProjects.map(p => {
                const pTasks = p.tasks || [];
                const pDone = pTasks.filter(t => t.completed || t.status === 'done').length;
                const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    className={`card-premium p-6 cursor-pointer text-left transition-all relative ${
                      currentProject?.id === p.id
                        ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/20 shadow-xs'
                        : 'hover:border-charcoal-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-charcoal-600 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-charcoal-400" />
                        <span>{p.client?.company || p.client?.name || 'Client'}</span>
                      </span>
                      <span className="badge-brand text-[10px] capitalize">
                        {p.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-charcoal-900 mt-2 truncate">
                      {p.title}
                    </h2>

                    {/* Task progress bar */}
                    {pTasks.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-charcoal-500 mb-1">
                          <span>Task Progress</span>
                          <span className="font-semibold text-charcoal-800">{pDone}/{pTasks.length} ({pPct}%)</span>
                        </div>
                        <div className="w-full bg-charcoal-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${pPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-3.5 pt-2.5 border-t border-charcoal-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Contract:</span>
                        <div className="font-bold text-charcoal-900">
                          {format(p.contractValue)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Due Date:</span>
                        <div className="font-medium text-charcoal-700">
                          {new Date(p.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Detailed Project Operations in Split mode */}
          <div className="lg:col-span-7">
            {currentProject ? (
              <div className="card-premium p-6 space-y-6 shadow-xs">
                {/* Project Header */}
                <div className="pb-5 border-b border-charcoal-100">
                  <div className="flex items-center justify-between">
                    <span className="badge-brand text-xs uppercase">{currentProject.status?.replace('_', ' ')}</span>
                    <span className="text-xs text-charcoal-500">
                      Client: <strong className="text-charcoal-800">{currentProject.client?.company || currentProject.client?.name}</strong>
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-charcoal-900 mt-2">
                    {currentProject.title}
                  </h2>
                  <div className="mt-3 flex items-center gap-6 text-xs text-charcoal-600">
                    <span>Contract Value: <strong className="text-charcoal-900 font-bold">{format(currentProject.contractValue)}</strong></span>
                    <span>Target Due: <strong>{new Date(currentProject.dueDate).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                {/* Sub-sections */}
                {renderMilestonesSection(currentProject)}
                {renderTasksSection(currentProject)}
                {renderChangeOrdersSection(currentProject)}
              </div>
            ) : (
              <div className="card-premium p-12 text-center text-charcoal-400">
                <FolderGit2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Select a project to review milestones, tasks, and change orders.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
