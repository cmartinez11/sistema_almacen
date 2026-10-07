<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Proveedor extends Model
{
    use HasFactory;

    protected $table = 'proveedores';

    protected $fillable = [
        'ruc',
        'razon_social',
        'telefono',
        'email',
        'direccion',
        'estado',
    ];

    public function entradasCabecera(): HasMany
    {
        return $this->hasMany(EntradaCabecera::class, 'proveedor_id');
    }
}
