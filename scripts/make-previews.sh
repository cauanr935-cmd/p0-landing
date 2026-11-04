#!/usr/bin/env bash
# Gera a prévia de uma ilha da home: um clipe curto, mudo e leve (loop) e uma capa.
#
# Uso:  scripts/make-previews.sh <video> <id> <inicio> [duracao]
# Ex.:  scripts/make-previews.sh ~/reels/r01_mvp_morreu.mp4 ig-podcast-mvp 00:00:03 7
#
# Saída: public/previews/<id>.mp4 (sem áudio, ~540px no lado menor, < 1 MB)
#        public/previews/<id>.jpg (capa, primeiro frame do trecho)
# Depois preencha "previa" e "capa" do item em public/data/conteudos.json:
#   "previa": "/previews/<id>.mp4", "capa": "/previews/<id>.jpg"
set -euo pipefail

if [ $# -lt 3 ]; then
  sed -n '2,10p' "$0"
  exit 1
fi

input="$1"
id="$2"
start="$3"
duration="${4:-7}"
out_dir="$(dirname "$0")/../public/previews"
mkdir -p "$out_dir"

# Lado menor em 540px, mantendo a proporção (vertical ou horizontal).
scale="scale='if(gt(iw,ih),-2,540)':'if(gt(iw,ih),540,-2)'"

ffmpeg -y -loglevel error -ss "$start" -t "$duration" -i "$input" \
  -an -vf "$scale,fps=24" \
  -c:v libx264 -preset veryfast -crf 33 -profile:v main -pix_fmt yuv420p \
  -movflags +faststart \
  "$out_dir/$id.mp4"

ffmpeg -y -loglevel error -ss "$start" -i "$input" -frames:v 1 \
  -vf "$scale" -q:v 4 \
  "$out_dir/$id.jpg"

size=$(du -k "$out_dir/$id.mp4" | cut -f1)
echo "ok: public/previews/$id.mp4 (${size} KB) e public/previews/$id.jpg"
