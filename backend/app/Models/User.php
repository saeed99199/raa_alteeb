<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes, HasApiTokens;

    protected $fillable = [
        'name', 'email', 'password', 'role_id', 'branch_id',
        'phone', 'avatar', 'locale', 'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        'is_active'         => 'boolean',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function employee()
    {
        return $this->hasOne(Employee::class);
    }

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'user_permissions');
    }

    public function permissionNames(): array
    {
        $rolePermissions = $this->role?->permissions?->pluck('name')->toArray() ?? [];
        $directPermissions = $this->permissions()->pluck('name')->toArray();

        return array_values(array_unique(array_merge($rolePermissions, $directPermissions)));
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin() || $this->role?->name === 'admin') {
            return true;
        }

        return in_array($permission, $this->permissionNames(), true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role?->name === 'super_admin';
    }
}
