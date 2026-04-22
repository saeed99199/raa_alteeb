<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeTask;
use Illuminate\Http\Request;

class EmployeeTaskController extends Controller
{
    private function canManageAllTasks($user): bool
    {
        $roleName = $user->role?->name;

        return $user->isSuperAdmin()
            || $user->hasPermission('tasks.manage_all')
            || in_array($roleName, ['admin', 'branch_manager', 'hr_manager'], true);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;
        $canManageAll = $this->canManageAllTasks($user);

        $tasksQuery = EmployeeTask::with(['assignee.user', 'creator'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderByDesc('id');

        if ($canManageAll) {
            $tasksQuery->when($request->assigned_to, fn($q) => $q->where('assigned_to', $request->assigned_to));
        } else {
            if (! $employee) {
                return response()->json([
                    'data' => [],
                    'links' => [
                        'first' => null,
                        'last' => null,
                        'prev' => null,
                        'next' => null,
                    ],
                    'meta' => [
                        'current_page' => 1,
                        'from' => null,
                        'last_page' => 1,
                        'path' => $request->url(),
                        'per_page' => (int) $request->input('per_page', 50),
                        'to' => null,
                        'total' => 0,
                    ],
                ]);
            }
            $tasksQuery->where('assigned_to', $employee->id);
        }

        $tasks = $tasksQuery->paginate($request->input('per_page', 50));

        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        if (! $this->canManageAllTasks($request->user())) {
            return response()->json(['message' => 'Only managers/admin can assign tasks.'], 403);
        }

        $data = $request->validate([
            'assigned_to' => 'required|exists:employees,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:todo,in_progress,review,done',
            'priority' => 'nullable|in:low,medium,high',
            'due_date' => 'nullable|date',
        ]);

        $employee = Employee::findOrFail($data['assigned_to']);

        $task = EmployeeTask::create([
            'branch_id' => $employee->branch_id,
            'assigned_to' => $data['assigned_to'],
            'created_by' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'todo',
            'priority' => $data['priority'] ?? 'medium',
            'due_date' => $data['due_date'] ?? null,
        ]);

        return response()->json($task->load('assignee.user', 'creator'), 201);
    }

    public function update(Request $request, EmployeeTask $task)
    {
        if (! $this->canManageAllTasks($request->user())) {
            return response()->json(['message' => 'Only managers/admin can edit tasks.'], 403);
        }

        $data = $request->validate([
            'assigned_to' => 'nullable|exists:employees,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:todo,in_progress,review,done',
            'priority' => 'nullable|in:low,medium,high',
            'due_date' => 'nullable|date',
        ]);

        if (isset($data['assigned_to'])) {
            $employee = Employee::findOrFail($data['assigned_to']);
            $data['branch_id'] = $employee->branch_id;
        }

        $task->update($data);

        return response()->json($task->load('assignee.user', 'creator'));
    }

    public function destroy(EmployeeTask $task)
    {
        if (! $this->canManageAllTasks(request()->user())) {
            return response()->json(['message' => 'Only managers/admin can delete tasks.'], 403);
        }

        $task->delete();

        return response()->json(null, 204);
    }
}
