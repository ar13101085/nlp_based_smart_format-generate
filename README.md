# MCP Disease Description Server

An MCP server for managing disease descriptions in Bengali.

## Installation

```bash
npm install
npm run build
```

## Usage

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "disease-server": {
      "command": "node",
      "args": ["/path/to/mcp-disease-server/dist/server.js"],
      "cwd": "/path/to/mcp-disease-server"
    }
  }
}
```

## Tools

1. **get_next_disease**: Returns the next disease name from the catalog
2. **submit_description**: Saves a disease description to a numbered text file
3. **get_instructions**: Returns instructions for creating disease descriptions from /Users/arifur/Documents/thesis/dataset/idea.md

## Structure

- `catalog/diseases.json`: List of 60+ diseases in Bengali
- `data/`: Stores numbered text files (000001.txt, 000002.txt, etc.)
- Each file contains only the Bengali description text (450-500 words)