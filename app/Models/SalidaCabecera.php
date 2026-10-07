<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalidaCabecera extends Model
{
    use HasFactory;

    protected $table = 'salidas_cabecera';

    protected $fillable = [
        'personal_id',
        'destino_cliente',
        'tipo_salida',
        'numero_referencia',
        'fecha_emision',
        'observaciones',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_emision' => 'datetime',
        ];
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'personal_id');
    }

    public function salidasDetalle(): HasMany
    {
        return $this->hasMany(SalidaDetalle::class, 'salida_cabecera_id');
    }
}
