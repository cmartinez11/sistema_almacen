<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class Personal extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'personal';

    protected $fillable = [
        'dni',
        'documento_identidad',
        'nombres',
        'apellidos',
        'cargo',
        'area',
        'email',
        'telefono',
        'estado',
        'rol_id',
        'password',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function rol(): BelongsTo
    {
        return $this->belongsTo(Rol::class, 'rol_id');
    }

    public function entradasCabecera(): HasMany
    {
        return $this->hasMany(EntradaCabecera::class, 'personal_id');
    }

    public function salidasCabecera(): HasMany
    {
        return $this->hasMany(SalidaCabecera::class, 'personal_id');
    }
}
