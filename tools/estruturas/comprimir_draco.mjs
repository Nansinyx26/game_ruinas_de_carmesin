// ECLIPSE ZERO · Comprime com Draco os GLB gerados no Meshy, para guardar no repositório (Git LFS)
// ---------------------------------------------------------------------------
// As peças do Meshy chegam com 40–230 MB (malha densa sem compressão). O jogo não usa esses
// arquivos (usa as versões reduzidas no Blender, assets/models/estruturas/), mas eles são a fonte:
// ficam guardados com a compressão Draco (KHR_draco_mesh_compression; posições em 14 bits, UV em
// 12, normais em 10: diferença invisível perto da redução para 16 mil triângulos), como vieram as
// estruturas enviadas. tools/estruturas/processar.sh já tira o Draco numa cópia antes do Blender.
// O original sem compressão vai para <pasta_dos_originais> (fora do repositório). Mesmas
// bibliotecas temporárias do descomprimir_draco.mjs:
//   NODE_PATH=/tmp/gltf/node_modules node tools/estruturas/comprimir_draco.mjs <pasta_dos_originais> <a.glb ...>
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(path.join(process.env.NODE_PATH || '.', 'x.js'));
const { NodeIO } = req('@gltf-transform/core');
const { ALL_EXTENSIONS, KHRDracoMeshCompression } = req('@gltf-transform/extensions');
const draco3d = req('draco3dgltf');

const [originais, ...arquivos] = process.argv.slice(2);
fs.mkdirSync(originais, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
for (const a of arquivos) {
  const doc = await io.read(a);
  if (doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === 'KHR_draco_mesh_compression')) { console.log(`${path.basename(a)}: já tem Draco`); continue; }
  doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({
    method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER, encodeSpeed: 5, decodeSpeed: 5,
    quantizationBits: { POSITION: 14, NORMAL: 10, TEXCOORD: 12, COLOR: 8, GENERIC: 12 } });
  const antes = fs.statSync(a).size, bak = path.join(originais, path.basename(a));
  fs.copyFileSync(a, bak);
  fs.writeFileSync(a + '.tmp', await io.writeBinary(doc));   // (GLB binário num arquivo só: io.write escolheria o formato pela extensão)
  fs.renameSync(a + '.tmp', a);
  console.log(`${path.basename(a)}: ${antes >> 20} MB → ${fs.statSync(a).size >> 20} MB (original em ${bak})`);
}
