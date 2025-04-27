# AR NFT & AR/VR Game Blueprint

**מטרה:** לספק תשתית ראשונית לפיתוח משחק NFT בעל שכבות AR/VR ו-2D/3D רכיבים קומפוזיציוניים.

## 1. סקירת דרישות
- יצירת NFTs מגנרטיביים עם 6 שכבות AR (GLB/GLTF) ו-attributes ב-json
- הפרדה ל-UI 2D, סצינת 3D ותמיכה ב-VR באמצעות WebXR או Unity
- מערך שרת לקריאה לבלוקצ'יין ולהנפקת tokenURI
- אחסון נכסים ב-IPFS/Arweave, הפניה דרך ה-json metadata

## 2. מבנה פרויקט מוצע

```
root/
├─ contracts/               # חוזי Solidity (ERC-721/1155/998)
│  └─ NFTCollectible.sol
├─ metadata/
│  └─ schema.json          # תבנית metadata עם 6 layers
├─ scripts/
│  └─ generateNFT.js       # סקריפט node.js ל-generate+upload ל-IPFS
├─ server/
│  └─ index.js             # Express + Pi Network SDK לקריאות לבלוקצ'יין
├─ frontend/
│  ├─ public/
│  └─ src/
│     ├─ ui/               # React 2D components
│     ├─ scene/            # Three.js scene setup
│     └─ xr/               # React-XR/WebXR integration
├─ .env.example            # סביבות פיתוח ו-prod
└─ README.md
```

## 3. JSON Metadata Schema (`metadata/schema.json`)
```json
{
  "name": "string",
  "description": "string",
  "image": "ipfs://<CID>/thumbnail.png",
  "attributes": [
    {"trait_type": "Layer1", "value": "BaseModel", "url": "ipfs://<CID>/base.glb"},
    ... (6 layers)
  ]
}
```

## 4. סקריפט גנרטיביות (`scripts/generateNFT.js`)
- מגדיר מערכי traits עם rarity
- מייצר שילובים אקראיים
- יוצר JSON ומעלה נכסים ל-IPFS
- מדפיס או כותב ל-csv את tokenURI לכל tokenId

## 5. שרת וחוזים חכמים
- **Pi Network SDK**: משתמשים ב-Pi Network SDK ל-mint NFT ישירות ברשת Pi
- Express API: `/mint` לקבלת בקשות, לקרוא ל-Pi Network SDK ולהנפיק mint ל-wallet

## 6. Frontend
1. React App עם npm/Yarn
2. state: `mode: '2d' | '3d' | 'vr'`
3. רכיבים:
   - `<UI2D />` (Canvas + HUD)
   - `<Scene3D />` (React-Three-Fiber)
   - `<XRExperience />` (React-XR/WebXR)
4. Load tokenURI via Pi Network SDK → fetch JSON → render layers על גבי scene

## 7. צעדים ראשונים
1. Initialize repos:
   ```bash
   cd root
   npm init -y # לתיקיות server/frontend
   ```
2. התקנת חבילות: Pi Network SDK, express, react, three, @react-three/fiber, @react-three/xr
3. פיתוח PoC: mint חוזה בסיסי + fetch metadata + render BaseModel ב-3D
4. הוספת שאר השכבות
5. הטמעת WebXR / Unity for VR

## 8. Advanced Metadata & NFT 2.0
- **Multi-Asset Fields**: beyond `image`, include `animation_url`, `model_url`, `usdz_url`, `audio_url`, `video_url`.
- **AR-Ready Standard**: follow [SDA NFT 2.0](https://sda.studio/index.php/nft-proposal): add fields **`ar_model_url`** (GLB/GLTF), **`ar_anchor`** (pose defaults).
- **Composable NFTs (ERC-998)**: enable parent-child ownership (e.g., character NFT holds weapon NFT) via nested token lists.
- **On-chain Pointers**: store minimal metadata on-chain, host JSON on IPFS/Arweave with **CIDv1** and versioning.

## 9. WebXR Layers & Performance
- **Composition Layers API**: use **WebXR Layers** (immersive-web/layers) to separate:
  - `world` layer (main scene)
  - `ui` layer (HUD, text)
  - `video` layer (camera feed)
  - `overlay` layer (effects)
- **Benefits**: native refresh-rate reprojection, independent resolutions, reduced latency, lower power.
- **Implementation** (Three.js + `@react-three/xr`):
  ```js
  const session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['layers'] });
  renderer.xr.setSession(session);
  const layer = new XRWebGLOverlayLayer(session, { space: xrReferenceSpace, origin: [0,0,0] });
  session.updateRenderState({ layers: [worldLayer, uiLayer, layer] });
  ```

## 10. Caching, CDN & Lazy Loading
- **Pinning Services**: Pinata or Infura for IPFS; use gateways + fallback.
- **CDN Edge**: wrap IPFS assets with Cloudflare/IPFS Gateway for global low-latency.
- **Client Caching**: Service Workers cache JSON metadata and assets; use TTL headers.
- **Progressive LOD**: serve low-poly models first, swap to high-poly when idle.

## 11. Advanced Rendering Techniques
- **Instancing & Batching**: group repeated meshes (e.g., particles) to reduce draw calls.
- **Texture Atlasing**: pack layer textures into atlases; reduces texture binds.
- **Shader Variants**: use feature flags in GLSL/ShaderMaterial for color swaps & effects.
- **Frame Budget**: enforce sub-11ms per layer; use **offscreenCanvas** for UI layers.

## 12. Indexing & Analytics
- **GraphQL Subgraph**: index minted NFTs, traits by TheGraph or Pi Network indexer.
- **Event Tracking**: emit mint/interact events; collect with analytics.js + dashboard.

## 13. Example Pi Network Mint API (`server/index.js`)
```js
import express from 'express';
import { PiClient } from 'pi-network-sdk';
import fs from 'fs';

const app = express();
app.use(express.json());

// Initialize Pi client (ensure PI_API_KEY in .env)
const pi = new PiClient({ apiKey: process.env.PI_API_KEY });

// Load ABI/schema if needed
const schema = JSON.parse(fs.readFileSync('metadata/schema.json'));

app.post('/mint', async (req, res) => {
  const { toPublicKey, metadataURI } = req.body;
  try {
    const tx = await pi.mintNFT({
      to: toPublicKey,
      metadataURI,
      namespace: 'ARCollectible'
    });
    await tx.waitConfirmation();
    res.json({ txId: tx.id, status: 'confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Pi mint API listening on port 3001'));
```

## 14. Sample Generate Script (`scripts/generateNFT.js`)
```js
import { create } from 'ipfs-http-client';
import fs from 'fs';
const client = create({ url: 'https://ipfs.infura.io:5001/api/v0' });

// define trait pools
const layers = {
  base: ['human.glb','alien.glb'],
  armor: ['steel.glb','gold.glb'],
  weapon: ['sword.glb','axe.glb'],
  effects: ['fire.glb','ice.glb'],
  particles: ['smoke.glb','sparkle.glb'],
  ui: ['overlay1.glb','overlay2.glb']
};

async function uploadAsset(path) {
  const file = fs.readFileSync(`assets/${path}`);
  const { cid } = await client.add(file);
  return `ipfs://${cid.toString()}/${path}`;
}

async function generateToken(id) {
  const attrs = await Promise.all(
    Object.entries(layers).map(async ([key,pool]) => {
      const pick = pool[Math.floor(Math.random()*pool.length)];
      const url = await uploadAsset(pick);
      return { trait_type:key, value:pick, url };
    })
  );
  const meta = { name:`AR #${id}`, description:'', attributes:attrs };
  const { cid } = await client.add(JSON.stringify(meta));
  return `ipfs://${cid.toString()}`;
}

(async()=>{
  for(let i=1;i<=100;i++){
    const uri = await generateToken(i);
    console.log(i,uri);
  }
})();
```

## 15. Express API Snippet (`server/index.js`)
```js
import express from 'express';
import { PiClient } from 'pi-network-sdk';
import fs from 'fs';

const app=express(); app.use(express.json());

const pi = new PiClient({ apiKey: process.env.PI_API_KEY });

app.post('/mint', async (req,res)=>{
  const { toPublicKey, metadataURI } = req.body;
  try {
    const tx = await pi.mintNFT({
      to: toPublicKey,
      metadataURI,
      namespace: 'ARCollectible'
    });
    await tx.waitConfirmation();
    res.json({ txId: tx.id, status: 'confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001);
```

## 16. React Three.js Renderer (`frontend/src/scene/Scene3D.jsx`)
```jsx
import React, { useRef, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function Layer({ url }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
}

export default function Scene3D({ layers }) {
  return (
    <Canvas>
      {layers.map(l=> <Layer key={l.trait_type} url={l.url} />)}
    </Canvas>
  );
}
```

## 17. WebXR Integration (`frontend/src/xr/XRExperience.jsx`)
```jsx
import React from 'react';
import { XRCanvas, DefaultXRControllers } from '@react-three/xr';

export default function XRExperience({ layers }) {
  return (
    <XRCanvas sessionInit={{ optionalFeatures:['layers','hit-test'] }}>
      {layers.map(l=> <primitive key={l.trait_type} object={l.object} />)}
      <DefaultXRControllers />
    </XRCanvas>
  );
}
```

## 18. Deep Dive: WebXR Layers API
1. **Layer Types**
   - *Projection Layer*: main 3D view rendered via WebGL.
   - *Quad Layer*: 2D planes (HUD, video) that sit in 3D space.
   - *Cylinder/Cube Layer*: wrap texture around geometry (360 video).
2. **Layer Creation & State**
   ```js
   const session = await navigator.xr.requestSession('immersive-ar', {
     requiredFeatures: ['layers']
   });
   const layers = session.renderState.layers || [];
   const quadLayer = new XRQuadLayer(session, { space, width:1, height:0.5 });
   layers.push(quadLayer);
   session.updateRenderState({ layers });
   ```
3. **Pose & Alignment**
   - *space*: `local`, `viewer` or `unbounded` reference.
   - *uvTransform*: transforms texture UVs per-frame for dynamic content.
4. **Dynamic Updates**
   - Update layer textures offscreen (via `OffscreenCanvas`) and call `quadLayer.needsRedraw = true`.

## 19. Advanced Optimization & Best Practices
- **Frame Budget**: budget ~11ms per eye at 90Hz → aggregate GPU+CPU.
- **Multi-Resolution Shading**: render peripheral regions at lower res.
- **Reprojection**: leverage compositor reprojection by keeping static layers.
- **Pipeline Stages**: perform heavy computation (culling, LOD) in Web Worker.
- **Texture Streaming**: stream GLTF buffers via `EXT_mesh_gpu_instancing`.
- **Memory Pools**: reuse buffers (arrays, canvases) between frames.

## 20. Future Standards & NFT 2.0
- **NFT AR Metadata Extensions** (proposed):
  - `xr_anchor_matrix`: 4x4 float array for initial placement.
  - `lighting_environment`: specify HDRI/CubeMap URLs.
  - `physics_properties`: mass, collision shape for physics engines.
- **Interoperability**: align metadata with Khronos glTF VRM spec and CryptoAvatars.
  - Use `KHR_materials_unlit` and `KHR_texture_transform` extensions.

## 21. Infrastructure & DevOps
### 1.1 Docker & Cross-Machine Deployment
- Use `docker-compose.yml` (see root) to bundle API, frontend, IPFS node into containers.
- Each container includes all dependencies; no host installs needed → runs identically on any machine.
- Benefits:
  - Isolation: avoid missing libraries or conflicting versions on client machines.
  - Portability: share the `docker-compose.yml` or built images via registry (Docker Hub, GHCR).
  - Versioning: tag images (e.g., `safearena/api:1.0.0`) to control rollout.
- Updates & Testing on Closed Systems:
  - CI builds and pushes new images on each commit/tag.
  - Use tools like Watchtower or GitHub Actions self-hosted runners to auto-pull new images on schedule.
  - Healthchecks in Compose (`depends_on.healthcheck`) and readiness probes to verify container is up.
  - Smoke tests: run `docker-compose run api-server npm test` against a fresh container.
- Handling Legacy Environments:
  - Provide fallback images based on older tags (e.g., `:stable` channel).
  - Include sidecar container for dependency shim (e.g., Alpine glibc compatibility).
  - Document environment variables and supported host OS versions in `README.md`.

---
*הרחבה זו כוללת פירוט על WebXR Layers API, שיטות אופטימיזציה מתקדמות וסטנדרטים עתידיים לפיתוח AR/VR NFT.*
