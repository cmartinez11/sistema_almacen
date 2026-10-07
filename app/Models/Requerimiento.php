<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Requerimiento extends Model
{
    use HasFactory;

    protected $table = 'requerimientos';

    protected $fillable = [
        'correlativo',
        'personal_id',
        'proveedor_id',
        'area',
        'fecha_solicitud',
        'prioridad',
        'estado',
        'observaciones',
    ];

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'personal_id');
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(RequerimientoDetalle::class, 'requerimiento_id');
    }
}
