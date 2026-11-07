#!/usr/bin/env bash
# ECLIPSE ZERO · Lote das estruturas e plantas enviadas: para cada GLB, tira o Draco (se tiver,
# numa cópia temporária), reduz no Blender (tools/blender/cenario/estruturas.py) e apaga a cópia.
# Uso: NODE_PATH=/tmp/gltf/node_modules tools/estruturas/processar.sh <pasta_temporaria> <arquivo.glb ...>
set -u
TMP="$1"; shift
mkdir -p "$TMP"
for f in "$@"; do
  if head -c 600000 "$f" | grep -aq KHR_draco_mesh_compression; then
    node tools/estruturas/descomprimir_draco.mjs "$TMP" "$f" >/dev/null 2>&1 || { echo "ERRO draco $f"; continue; }
    d="$TMP/$(basename "$f")"
    python3 tools/blender/cenario/estruturas.py "$d" --fonte-original "$f" 2>&1 | grep -E "^ESTRUTURA|^ERRO" | cut -c1-400
    rm -f "$d"
  else
    python3 tools/blender/cenario/estruturas.py "$f" 2>&1 | grep -E "^ESTRUTURA|^ERRO" | cut -c1-400
  fi
done
