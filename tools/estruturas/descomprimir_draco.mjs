// ECLIPSE ZERO · Tira a compressão Draco de GLB enviados (ferramenta de produção, não do jogo)
// ---------------------------------------------------------------------------
// O Blender desta máquina não traz o módulo Draco, e 37 dos GLB de estruturas_ambiente vêm com
// KHR_draco_mesh_compression. Este script lê cada um com o glTF-Transform e o decodificador
// Draco oficial e grava uma cópia SEM a compressão (a geometria e as texturas iguais) numa pasta
// de trabalho fora do repositório; o original não muda. As bibliotecas NÃO entram no projeto:
// ficam numa pasta temporária, instaladas só para rodar isto:
//   mkdir /tmp/gltf && cd /tmp/gltf && npm init -y && \
//     npm i @gltf-transform/core@4.1.1 @gltf-transform/extensions@4.1.1 draco3dgltf@1.5.7
//   NODE_PATH=/tmp/gltf/node_modules node tools/estruturas/descomprimir_draco.mjs <saida> <a.glb ...>
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(path.join(process.env.NODE_PATH || '.', 'x.js'));
const { NodeIO } = req('@gltf-transform/core');
const { ALL_EXTENSIONS } = req('@gltf-transform/extensions');
const draco3d = req('draco3dgltf');

const [saida, ...arquivos] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
for (const a of arquivos) {
  const destino = path.join(saida, path.basename(a));
  const doc = await io.read(a);
  const ext = doc.getRoot().listExtensionsUsed().find((e) => e.extensionName === 'KHR_draco_mesh_compression');
  if (ext) ext.dispose();   // decodificada na leitura; gravada sem a compressão
  await io.write(destino, doc);
  console.log(`${path.basename(a)}: ${ext ? 'Draco removido' : 'sem Draco (copiado)'} → ${fs.statSync(destino).size >> 20} MB`);
}
