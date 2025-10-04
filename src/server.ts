#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_PATH = path.join(__dirname, '..', 'catalog', 'diseases.json');
const DATA_PATH = path.join(__dirname, '..', 'data');
const INSTRUCTIONS_PATH = '/Users/arifur/Documents/thesis/dataset/idea.md';

interface DiseaseTracker {
  usedDiseases: Set<string>;
  diseases: string[];
}

const diseaseTracker: DiseaseTracker = {
  usedDiseases: new Set(),
  diseases: []
};

async function loadDiseases(): Promise<void> {
  try {
    const data = await fs.readFile(CATALOG_PATH, 'utf-8');
    diseaseTracker.diseases = JSON.parse(data);
  } catch (error) {
    console.error('Error loading diseases:', error);
    diseaseTracker.diseases = [];
  }
}

async function getNextFileId(): Promise<string> {
  try {
    const files = await fs.readdir(DATA_PATH);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    
    if (txtFiles.length === 0) {
      return '000001';
    }
    
    const ids = txtFiles
      .map(f => parseInt(f.replace('.txt', ''), 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => b - a);
    
    const nextId = (ids[0] || 0) + 1;
    return nextId.toString().padStart(6, '0');
  } catch (error) {
    return '000001';
  }
}

const server = new Server(
  {
    name: 'disease-description-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_next_disease',
        description: 'Get the next disease name from the catalog',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'submit_description',
        description: 'Submit a disease description in Bengali',
        inputSchema: {
          type: 'object',
          properties: {
            disease: {
              type: 'string',
              description: 'The disease name',
            },
            description_bn: {
              type: 'string',
              description: 'The disease description in Bengali (450-500 words)',
            },
          },
          required: ['disease', 'description_bn'],
        },
      },
      {
        name: 'get_instructions',
        description: 'Get instructions for creating disease descriptions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_next_disease': {
      if (diseaseTracker.diseases.length === 0) {
        await loadDiseases();
      }

      const availableDiseases = diseaseTracker.diseases.filter(
        d => !diseaseTracker.usedDiseases.has(d)
      );

      if (availableDiseases.length === 0) {
        diseaseTracker.usedDiseases.clear();
        const disease = diseaseTracker.diseases[0];
        diseaseTracker.usedDiseases.add(disease);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ disease }),
            },
          ],
        };
      }

      const disease = availableDiseases[0];
      diseaseTracker.usedDiseases.add(disease);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ disease }),
          },
        ],
      };
    }

    case 'submit_description': {
      const { disease, description_bn } = args as {
        disease: string;
        description_bn: string;
      };

      if (!disease || !description_bn) {
        throw new Error('Both disease and description_bn are required');
      }

      const fileId = await getNextFileId();
      const filePath = path.join(DATA_PATH, `${fileId}.txt`);
      
      await fs.writeFile(filePath, description_bn, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, message: 'done' }),
          },
        ],
      };
    }

    case 'get_instructions': {
      try {
        const instructions = await fs.readFile(INSTRUCTIONS_PATH, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: instructions,
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to read instructions: ${error}`);
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  await loadDiseases();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Disease Description MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});