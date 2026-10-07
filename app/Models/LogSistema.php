<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogSistema extends Model
{
    use HasFactory;

    protected $table = 'logs_sistema';

    protected $fillable = [
        'personal_id',
        'accion',
        'tabla_afectada',
        'registro_id',
        'detalle_json',
        'ip_origen',
    ];

    protected function casts(): array
    {
        return [
            'detalle_json' => 'array',
        ];
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'personal_id');
    }
}
