// Open-weight models the app can download. Sizes and SHA-256 come from the Hugging Face API
// (LFS oid) so every download is checked. See docs/models.md for licences.

export type ModelFileSpec = { name: string; url: string; sha256: string; bytes: number };
export type ModelSpec = {
  id: string;
  title: string;
  /** which phone may download it: Gemma never goes to the elder phone */
  role: 'family' | 'elder';
  kind: 'vision-llm' | 'decision';
  /** total RAM the phone should have to run it (GB) */
  minRamGb: number;
  licence: string;
  files: ModelFileSpec[];
};

const HF = 'https://huggingface.co';

export const MODELS: ModelSpec[] = [
  {
    id: 'gemma-3-4b-it-q4km',
    title: 'Gemma 3 4B (vision) · Q4_K_M',
    role: 'family',
    kind: 'vision-llm',
    minRamGb: 6,
    licence: 'Gemma Terms of Use',
    files: [
      {
        name: 'gemma-3-4b-it-Q4_K_M.gguf',
        url: `${HF}/ggml-org/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf`,
        sha256: '882e8d2db44dc554fb0ea5077cb7e4bc49e7342a1f0da57901c0802ea21a0863',
        bytes: 2_489_757_856,
      },
      {
        name: 'mmproj-gemma-3-4b-f16.gguf',
        url: `${HF}/ggml-org/gemma-3-4b-it-GGUF/resolve/main/mmproj-model-f16.gguf`,
        sha256: '8c0fb064b019a6972856aaae2c7e4792858af3ca4561be2dbf649123ba6c40cb',
        bytes: 851_251_104,
      },
    ],
  },
  {
    id: 'smolvlm-500m-q8',
    title: 'SmolVLM 500M (small vision, for weaker phones)',
    role: 'family',
    kind: 'vision-llm',
    minRamGb: 3,
    licence: 'Apache-2.0',
    files: [
      {
        name: 'SmolVLM-500M-Instruct-Q8_0.gguf',
        url: `${HF}/ggml-org/SmolVLM-500M-Instruct-GGUF/resolve/main/SmolVLM-500M-Instruct-Q8_0.gguf`,
        sha256: '9d4612de6a42214499e301494a3ecc2be0abdd9de44e663bda63f1152fad1bf4',
        bytes: 436_806_912,
      },
      {
        name: 'mmproj-SmolVLM-500M-Instruct-Q8_0.gguf',
        url: `${HF}/ggml-org/SmolVLM-500M-Instruct-GGUF/resolve/main/mmproj-SmolVLM-500M-Instruct-Q8_0.gguf`,
        sha256: 'd1eb8b6b23979205fdf63703ed10f788131a3f812c7b1f72e0119d5d81295150',
        bytes: 108_783_360,
      },
    ],
  },
];

export const totalBytes = (m: ModelSpec) => m.files.reduce((s, f) => s + f.bytes, 0);
export const formatGb = (bytes: number) => `${(bytes / 1e9).toFixed(2)} GB`;
